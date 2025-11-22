// app/doctor/add-record.tsx (or wherever this file is located)
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Client, Payment, Wallet, xrpToDrops } from "xrpl";

(global as any).Buffer = Buffer;

import { uploadFileToPinata, uploadRecordMetadata } from "../../../../utils/pinata";

export default function AddRecord() {
  const { address } = useLocalSearchParams(); // patient wallet
  const router = useRouter();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordType, setRecordType] = useState("Blood Test Report");
  const [hospital, setHospital] = useState("KU Medical Center");
  const [description, setDescription] = useState("Routine blood work results.");

  // Replace with your actual doctor wallet seed
  // IMPORTANT: In production, NEVER hardcode seeds - use secure key management
  const doctorWallet = Wallet.fromSeed("sEdSkAhvagdUJQoZmQPdKckGJAf61ig");

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Document picker error:", err);
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  }

  async function uploadFile() {
    if (!file || !address) {
      Alert.alert("Error", "Please select a file and ensure patient address is valid.");
      return;
    }

    if (!recordType.trim() || !hospital.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      setUploading(true);

      // 1️⃣ Read file content as base64
      console.log("Reading file...");
      const fileContent = await readAsStringAsync(file.uri, { encoding: "base64" });

      // 2️⃣ Hash the file content
      console.log("Hashing file...");
      const fileHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      console.log("File hash:", fileHash);

      // 3️⃣ Upload file to Pinata
      console.log("Uploading file to IPFS...");
      const fileRes = await uploadFileToPinata({
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name,
      });
      const fileCID = fileRes.IpfsHash;
      console.log("File CID:", fileCID);

      // 4️⃣ Build metadata JSON
      const metadata = {
        patient_wallet: address,
        doctor_wallet: doctorWallet.classicAddress,
        record_type: recordType.trim(),
        timestamp: Math.floor(Date.now() / 1000),
        ipfs_file_cid: fileCID,
        hospital: hospital.trim(),
        description: description.trim(),
        hash_of_file: fileHash,
        version: 1,
        extra: {
          file_format: file.mimeType || "unknown",
          size_bytes: file.size || 0,
          tags: ["medical-record", recordType.toLowerCase().replace(/\s+/g, "-")],
          original_filename: file.name,
        },
      };

      // 5️⃣ Upload metadata to Pinata
      console.log("Uploading metadata to IPFS...");
      const metadataRes = await uploadRecordMetadata(metadata);
      const metadataCID = metadataRes.IpfsHash;
      console.log("Metadata CID:", metadataCID);

      // 6️⃣ Send XRPL payment with metadataCID in Memos
      console.log("Submitting to XRPL...");
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      const payment: Payment = {
        TransactionType: "Payment",
        Account: doctorWallet.classicAddress,
        Destination: address as string,
        Amount: xrpToDrops("0.001"),
        Memos: [
          {
            Memo: {
              MemoData: Buffer.from(
                JSON.stringify({
                  type: "medicalRecord",
                  metadataCID,
                  recordType,
                  timestamp: Math.floor(Date.now() / 1000),
                })
              ).toString("hex"),
            },
          },
        ],
      };

      const prepared = await client.autofill(payment);
      const signed = doctorWallet.sign(prepared);
      const tx = await client.submitAndWait(signed.tx_blob);

      const txResult = (tx.result.meta as any)?.TransactionResult;
      if (txResult !== "tesSUCCESS") {
        throw new Error(`Transaction failed: ${txResult || "Unknown error"}`);
      }

      console.log("XRPL Transaction:", tx.result.tx_json.hash);
      await client.disconnect();

      Alert.alert(
        "Upload Successful! ✅",
        `Record uploaded successfully!\n\nFile CID: ${fileCID}\nMetadata CID: ${metadataCID}\nXRPL Tx: ${tx.result.tx_json.hash}`,
        [
          {
            text: "OK",
            onPress: () => {
              // Reset form
              setFile(null);
              setRecordType("Blood Test Report");
              setDescription("Routine blood work results.");
              router.back();
            },
          },
        ]
      );
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert(
        "Upload Failed",
        err instanceof Error ? err.message : "An unknown error occurred. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Upload Medical Record</Text>
      <Text style={styles.subHeader}>Patient: {address}</Text>

      {/* Record Type Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Record Type *</Text>
        <TextInput
          style={styles.input}
          value={recordType}
          onChangeText={setRecordType}
          placeholder="e.g., Blood Test Report"
          placeholderTextColor="#999"
        />
      </View>

      {/* Hospital Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Hospital/Clinic *</Text>
        <TextInput
          style={styles.input}
          value={hospital}
          onChangeText={setHospital}
          placeholder="e.g., KU Medical Center"
          placeholderTextColor="#999"
        />
      </View>

      {/* Description Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of the medical record"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />
      </View>

      {/* File Picker */}
      <TouchableOpacity style={styles.fileButton} onPress={pickFile}>
        <Ionicons name="cloud-upload-outline" size={24} color="#1e3a5f" />
        <Text style={styles.fileText}>{file ? file.name : "Choose PDF or image *"}</Text>
      </TouchableOpacity>

      {file && (
        <View style={styles.fileInfo}>
          <Ionicons name="document-attach" size={20} color="#1e3a5f" />
          <View style={styles.fileInfoTextContainer}>
            <Text style={styles.fileInfoText}>Selected: {file.name}</Text>
            <Text style={styles.fileInfoText}>
              Size: {((file.size || 0) / 1024).toFixed(2)} KB
            </Text>
            <Text style={styles.fileInfoText}>Type: {file.mimeType}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.uploadButton, (!file || uploading) && styles.disabledButton]}
        disabled={!file || uploading}
        onPress={uploadFile}
      >
        {uploading && (
          <Ionicons name="sync" size={20} color="white" style={styles.spinner} />
        )}
        <Text style={styles.uploadText}>
          {uploading ? "Uploading to IPFS & XRPL..." : "Upload Record"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        * All fields are required. The record will be securely stored on IPFS and registered
        on XRPL blockchain.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    backgroundColor: "#f5f7fa",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
    color: "#1e3a5f",
    fontWeight: "600",
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a5f",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d3dbe3",
    fontSize: 16,
    color: "#0b1b3b",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  fileButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d3dbe3",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  fileText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#1e3a5f",
    fontWeight: "500",
    flex: 1,
  },
  fileInfo: {
    backgroundColor: "#e8f4f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  fileInfoTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  fileInfoText: {
    fontSize: 14,
    color: "#1e3a5f",
    marginVertical: 2,
  },
  uploadButton: {
    marginTop: 20,
    backgroundColor: "#1e3a5f",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  spinner: {
    marginRight: 8,
  },
  note: {
    fontSize: 12,
    color: "#666",
    marginTop: 16,
    marginBottom: 40,
    textAlign: "center",
    fontStyle: "italic",
  },
});