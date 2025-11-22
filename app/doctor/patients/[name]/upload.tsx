// app/doctor/add-record.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

// Hardcoded patient data
const PATIENT_ADDRESS = "rUofX1KCA6crUq9UtpHZhCDkTyzTnDuksv";
const PATIENT_NAME = "Alice Johnson";
const PATIENT_AGE = 34;
const PATIENT_LAST_VISIT = "2024-01-15";

export default function AddRecord() {
  const router = useRouter();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordType, setRecordType] = useState("");
  const [hospital, setHospital] = useState("KU Medical Center");
  const [description, setDescription] = useState("");

  const doctorWallet = Wallet.fromSeed("sEdSkAhvagdUJQoZmQPdKckGJAf61ig");

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr || "N/A";
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 4)}`;
  };

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
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
    if (!file) {
      Alert.alert("Error", "Please select a file.");
      return;
    }

    if (!recordType.trim() || !hospital.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (file.size && file.size > 10 * 1024 * 1024) {
      Alert.alert("Error", "File size too large. Please select a file smaller than 10MB.");
      return;
    }

    try {
      setUploading(true);

      console.log("Reading file...");
      const fileContent = await readAsStringAsync(file.uri, { encoding: "base64" });

      console.log("Hashing file...");
      const fileHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      console.log("File hash:", fileHash);

      console.log("Uploading file to IPFS...");
      const fileRes = await uploadFileToPinata({
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name,
      });
      const fileCID = fileRes.IpfsHash;
      console.log("File CID:", fileCID);

      const metadata = {
        patient_wallet: PATIENT_ADDRESS,
        patient_name: PATIENT_NAME,
        doctor_wallet: doctorWallet.classicAddress,
        doctor_name: "Dr. Smith",
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
          patient_age: PATIENT_AGE,
          upload_timestamp: new Date().toISOString(),
        },
      };

      console.log("Uploading metadata to IPFS...");
      const metadataRes = await uploadRecordMetadata(metadata);
      const metadataCID = metadataRes.IpfsHash;
      console.log("Metadata CID:", metadataCID);

      console.log("Submitting to XRPL...");
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      // Generate unique identifiers to prevent redundant transactions
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const timestamp = Math.floor(Date.now() / 1000);
      
      const payment: Payment = {
        TransactionType: "Payment",
        Account: doctorWallet.classicAddress,
        Destination: PATIENT_ADDRESS,
        Amount: xrpToDrops("0.001"),
        Memos: [
          {
            Memo: {
              MemoType: Buffer.from("medicalRecord").toString("hex"), // Add MemoType for uniqueness
              MemoData: Buffer.from(
                JSON.stringify({
                  type: "medicalRecord",
                  metadataCID,
                  recordType: recordType.trim(),
                  timestamp: timestamp,
                  doctor: doctorWallet.classicAddress,
                  fileHash: fileHash.substring(0, 16), // Include part of file hash
                  uniqueId: uniqueId, // Add unique identifier
                })
              ).toString("hex"),
            },
          },
        ],
      };

      const prepared = await client.autofill(payment);
      const signed = doctorWallet.sign(prepared);
      const tx = await client.submitAndWait(signed.tx_blob);

      // Safe extraction of tx hash
      const txHashRaw = (tx.result && (tx.result as any).tx_json && (tx.result as any).tx_json.hash) || "";
      const txHash = String(txHashRaw);
      const txHashShort = txHash ? `${txHash.slice(0, 16)}...` : "unknown";

      console.log("XRPL Transaction:", txHash);
      await client.disconnect();

      Alert.alert(
        "Upload Successful! ✅",
        `Medical record uploaded successfully for ${PATIENT_NAME}.\n\n• File: ${file.name}\n• Type: ${recordType}\n• Transaction: ${txHashShort}`,
        [
          {
            text: "View Details",
            onPress: () => {
              console.log("Transaction details:", txHash);
            },
          },
          {
            text: "Upload Another",
            style: "default",
            onPress: () => {
              setFile(null);
              setRecordType("");
              setDescription("");
            },
          },
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      
      let errorMessage = "An unknown error occurred. Please try again.";
      if (err.message?.includes("temREDUNDANT")) {
        errorMessage = "This transaction appears to be a duplicate. The record may have already been uploaded. Please try again with a different file or record type.";
      } else if (err.message?.includes("tecUNFUNDED")) {
        errorMessage = "Insufficient funds in doctor wallet. Please add XRP to continue.";
      } else if (err.message?.includes("tecNO_DST")) {
        errorMessage = "Patient wallet address not found. Please verify the address is correct.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setUploading(false);
    }
  }

  const quickRecordTypes = [
    "Blood Test Report",
    "X-Ray Results",
    "MRI Scan",
    "CT Scan",
    "Prescription",
    "Lab Results",
    "Doctor's Notes",
    "Surgical Report",
    "Vaccination Record",
    "Allergy Test",
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back to Patients</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Upload Medical Record</Text>
      
      <View style={styles.patientCard}>
        <View style={styles.patientHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#1e3a5f" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{PATIENT_NAME}</Text>
            <View style={styles.patientDetails}>
              <Text style={styles.patientDetail}>Age: {PATIENT_AGE}</Text>
              <Text style={styles.patientDetail}>Last Visit: {PATIENT_LAST_VISIT}</Text>
            </View>
            <View style={styles.addressContainer}>
              <Ionicons name="wallet-outline" size={14} color="#666" />
              <Text style={styles.patientAddress}>{formatAddress(PATIENT_ADDRESS)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Record Type *</Text>
        <TextInput
          style={styles.input}
          value={recordType}
          onChangeText={setRecordType}
          placeholder="e.g., Blood Test Report, X-Ray Results"
          placeholderTextColor="#999"
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTypesContainer}>
          {quickRecordTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.quickTypeButton}
              onPress={() => setRecordType(type)}
            >
              <Text style={styles.quickTypeText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of the medical record, findings, and recommendations..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Medical File *</Text>
        <TouchableOpacity style={styles.fileButton} onPress={pickFile}>
          <Ionicons name="cloud-upload-outline" size={24} color="#1e3a5f" />
          <Text style={styles.fileText}>
            {file ? file.name : "Choose PDF, image, or document"}
          </Text>
          <Ionicons name="folder-open-outline" size={20} color="#1e3a5f" />
        </TouchableOpacity>

        {file && (
          <View style={styles.fileInfo}>
            <Ionicons name="document-attach" size={20} color="#1e3a5f" />
            <View style={styles.fileInfoTextContainer}>
              <Text style={styles.fileInfoText}>Selected: {file.name}</Text>
              <Text style={styles.fileInfoText}>
                Size: {((file.size || 0) / 1024).toFixed(1)} KB • Type: {file.mimeType || "Unknown"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setFile(null)}>
              <Ionicons name="close-circle" size={20} color="#ff4d4d" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.uploadButton, (!file || uploading || !recordType || !description) && styles.disabledButton]}
        disabled={!file || uploading || !recordType || !description}
        onPress={uploadFile}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color="white" style={styles.spinner} />
            <Text style={styles.uploadText}>Uploading to IPFS & XRPL...</Text>
          </>
        ) : (
          <>
            <Ionicons name="medical" size={20} color="white" />
            <Text style={styles.uploadText}>Upload Medical Record</Text>
          </>
        )}
      </TouchableOpacity>

      {uploading && (
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>Securely uploading to decentralized storage...</Text>
          <Text style={styles.progressSubtext}>This may take a moment</Text>
        </View>
      )}

      <Text style={styles.note}>
        * All fields are required. The record will be securely stored on IPFS and registered
        on XRPL blockchain. Patient will be able to access this record immediately.
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
    marginBottom: 16,
  },
  patientCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e8f4f8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#1e3a5f",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 4,
  },
  patientDetails: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    color: "#666",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  patientAddress: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
  quickTypesContainer: {
    marginTop: 8,
  },
  quickTypeButton: {
    backgroundColor: "#e8f4f8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  quickTypeText: {
    fontSize: 12,
    color: "#1e3a5f",
    fontWeight: "500",
  },
  fileButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d3dbe3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileText: {
    fontSize: 16,
    color: "#1e3a5f",
    fontWeight: "500",
    flex: 1,
    marginHorizontal: 10,
  },
  fileInfo: {
    backgroundColor: "#e8f4f8",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  fileInfoTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  fileInfoText: {
    fontSize: 14,
    color: "#1e3a5f",
    marginVertical: 1,
  },
  uploadButton: {
    marginTop: 10,
    backgroundColor: "#1e3a5f",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  progressInfo: {
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#1e3a5f",
    fontWeight: "500",
    textAlign: "center",
  },
  progressSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  note: {
    fontSize: 12,
    color: "#666",
    marginTop: 20,
    marginBottom: 40,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 16,
  },
});