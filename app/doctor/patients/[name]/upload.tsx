import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { uploadFileToPinata, uploadRecordMetadata } from "../../../../utils/pinata";

export default function AddRecord() {
  const { address } = useLocalSearchParams(); // patient wallet
  const router = useRouter();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

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
      console.log("Document error:", err);
      Alert.alert("Error picking file", String(err));
    }
  }

  async function uploadFile() {
    if (!file) return;

    try {
      setUploading(true);

      // 1️⃣ Read file content as base64
      const fileContent = await readAsStringAsync(file.uri, {
        encoding: "base64",
      });
      
      // 2️⃣ Hash the file content
      const fileHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // 3️⃣ Upload file using uploadFileToPinata utility
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
        doctor_wallet: "0xABC_DOCTOR_WALLET", // replace with dynamic if needed
        record_type: "Blood Test Report",
        timestamp: Math.floor(Date.now() / 1000),
        ipfs_file_cid: fileCID,
        hospital: "KU Medical Center",
        description: "Routine blood work results.",
        hash_of_file: fileHash,
        version: 1,
        extra: {
          file_format: file.mimeType || "unknown",
          size_bytes: file.size || 0,
          tags: ["blood-panel", "annual-check"],
          original_filename: file.name,
        },
      };

      // 5️⃣ Upload metadata via utils
      const metadataRes = await uploadRecordMetadata(metadata);
      const metadataCID = metadataRes.IpfsHash;
      console.log("Metadata CID:", metadataCID);

      Alert.alert(
        "Upload Successful!", 
        `File CID: ${fileCID}\nMetadata CID: ${metadataCID}`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      console.log("Upload error:", err);
      Alert.alert("Upload Failed", String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Upload Record</Text>
      <Text style={styles.subHeader}>Patient: {address}</Text>

      <TouchableOpacity style={styles.fileButton} onPress={pickFile}>
        <Ionicons name="cloud-upload-outline" size={24} color="#1e3a5f" />
        <Text style={styles.fileText}>
          {file ? file.name : "Choose PDF or image"}
        </Text>
      </TouchableOpacity>

      {file && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoText}>Selected: {file.name}</Text>
          <Text style={styles.fileInfoText}>
            Size: {((file.size || 0) / 1024).toFixed(2)} KB
          </Text>
          <Text style={styles.fileInfoText}>Type: {file.mimeType}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.uploadButton, (!file || uploading) && styles.disabledButton]}
        disabled={!file || uploading}
        onPress={uploadFile}
      >
        {uploading && <Ionicons name="sync" size={20} color="white" style={styles.spinner} />}
        <Text style={styles.uploadText}>
          {uploading ? "Uploading..." : "Upload to IPFS"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 24, 
    paddingTop: 50, 
    backgroundColor: "#f5f7fa" 
  },
  backButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20 
  },
  backText: { 
    fontSize: 16, 
    marginLeft: 4, 
    color: "#1e3a5f", 
    fontWeight: "600" 
  },
  header: { 
    fontSize: 26, 
    fontWeight: "700", 
    color: "#1e3a5f", 
    marginBottom: 8 
  },
  subHeader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  fileButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d3dbe3",
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: 12,
  },
  fileInfoText: {
    fontSize: 14,
    color: "#1e3a5f",
    marginVertical: 2,
  },
  uploadButton: {
    marginTop: 40,
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
    fontWeight: "700" 
  },
  spinner: {
    marginRight: 8,
  },
});