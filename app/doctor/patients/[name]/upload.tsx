// app/doctor/add-record.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { uploadFileToPinata, uploadRecordMetadata } from "../../../../utils/pinata";

(global as any).Buffer = Buffer;

// ----- Constants -----
const PATIENT_ADDRESS = "rUofX1KCA6crUq9UtpHZhCDkTyzTnDuksv";
const DOCTOR_SEED = "sEdSkAhvagdUJQoZmQPdKckGJAf61ig";
const PATIENT_NAME = "Alice Johnson";
const PATIENT_AGE = 34;
const PATIENT_LAST_VISIT = "2024-01-15";

// Multiple endpoints for better reliability
const XRPL_ENDPOINTS = [
  "wss://s.altnet.rippletest.net:51233", // Primary
  "wss://testnet.xrpl-labs.com", // Fallback 1
  "wss://s.devnet.rippletest.net:51233" // Fallback 2
];

// ----- Helper Functions -----
const generateRandomId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result + Date.now();
};

const formatAddress = (addr: string) => (addr.length > 12 ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : addr);

// Store transaction locally as fallback
const storeTransactionLocally = async (metadata: any, fileHash: string, fileCID: string, recordType: string, hospital: string) => {
  try {
    const transactionData = {
      type: "medicalRecord",
      version: "2.0",
      metadataCID: metadata.IpfsHash,
      fileCID: fileCID,
      recordType: recordType.trim(),
      timestamp: Math.floor(Date.now() / 1000),
      patient: PATIENT_ADDRESS,
      fileHash: fileHash,
      uniqueId: generateRandomId(),
      hospital: hospital.trim(),
      status: "pending_blockchain",
      local_timestamp: new Date().toISOString(),
    };

    // Store in AsyncStorage
    const existing = await AsyncStorage.getItem('pending_medical_transactions');
    const transactions = existing ? JSON.parse(existing) : [];
    transactions.push(transactionData);
    await AsyncStorage.setItem('pending_medical_transactions', JSON.stringify(transactions));

    return {
      success: true,
      txHash: `local_${generateRandomId()}`,
      local: true
    };
  } catch (error) {
    console.error("Local storage failed:", error);
    return { success: false, error: "Local storage failed" };
  }
};

// ----- Main Component -----
export default function AddRecord() {
  const router = useRouter();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [recordType, setRecordType] = useState("");
  const [hospital, setHospital] = useState("KU Medical Center");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

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

  // ----- Pick File -----
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        multiple: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) setFile(result.assets[0]);
    } catch (err) {
      console.error("Document picker error:", err);
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  // ----- Enhanced XRPL Submission with Multiple Fallbacks -----
  const submitToXRPL = async (metadata: any, fileHash: string, fileCID: string) => {
    // Try to import xrpl dynamically to avoid initial bundle issues
    let xrpl;
    try {
      xrpl = await import("xrpl");
    } catch (importError) {
      console.warn("XRPL package not available, using local storage");
      return await storeTransactionLocally(metadata, fileHash, fileCID, recordType, hospital);
    }

    const { Client, Wallet, xrpToDrops } = xrpl;

    // Try multiple endpoints
    for (const endpoint of XRPL_ENDPOINTS) {
      let client: any = null;
      try {
        console.log(`Trying XRPL endpoint: ${endpoint}`);
        client = new Client(endpoint);
        
        // Set longer timeout for mobile networks
        await Promise.race([
          client.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("XRPL connection timeout")), 15000)
          ),
        ]);
        console.log("✅ Connected to XRPL testnet:", endpoint);

        const doctorWallet = Wallet.fromSeed(DOCTOR_SEED);

        const memoData = {
          type: "medicalRecord",
          version: "2.0",
          metadataCID: metadata.IpfsHash,
          fileCID: fileCID,
          recordType: recordType.trim(),
          timestamp: Math.floor(Date.now() / 1000),
          doctor: doctorWallet.classicAddress,
          patient: PATIENT_ADDRESS,
          fileHash: fileHash,
          uniqueId: generateRandomId(),
          hospital: hospital.trim(),
        };

        const payment = {
          TransactionType: "Payment",
          Account: doctorWallet.classicAddress,
          Destination: PATIENT_ADDRESS,
          Amount: xrpToDrops("0.001"),
          Memos: [
            {
              Memo: {
                MemoType: Buffer.from("medical/record/v2").toString("hex"),
                MemoData: Buffer.from(JSON.stringify(memoData)).toString("hex"),
                MemoFormat: Buffer.from("application/json").toString("hex"),
              },
            },
          ],
        };

        const prepared = await client.autofill(payment);
        const signed = doctorWallet.sign(prepared);
        const submitResponse = await client.submitAndWait(signed.tx_blob);

        // Safe result extraction
        const txHash = submitResponse.result.hash;
        const engineResult = (submitResponse.result as any)?.engine_result;
        const transactionResult = (submitResponse.result as any)?.meta?.TransactionResult;

        console.log("Transaction result:", { engineResult, transactionResult, txHash });

        if (engineResult === "tesSUCCESS" || transactionResult === "tesSUCCESS") {
          console.log("✅ XRPL Transaction successful!");
          return { success: true, txHash };
        } else {
          throw new Error(`Transaction failed: ${engineResult || transactionResult || "unknown"}`);
        }

      } catch (error: any) {
        console.warn(`❌ Failed with endpoint ${endpoint}:`, error.message);
        
        // Clean up connection
        if (client) {
          try {
            await client.disconnect();
          } catch (e) {
            console.warn("Failed to disconnect from XRPL");
          }
        }
        
        // Continue to next endpoint
        continue;
      }
    }

    // All XRPL endpoints failed, use local storage
    console.log("All XRPL endpoints failed, using local storage fallback");
    return await storeTransactionLocally(metadata, fileHash, fileCID, recordType, hospital);
  };

  // ----- Upload File -----
  const uploadFile = async () => {
    if (!file || !recordType || !hospital || !description) {
      Alert.alert("Error", "Please fill in all fields and select a file.");
      return;
    }
    
    if (file.size && file.size > 10 * 1024 * 1024) {
      Alert.alert("Error", "File too large (max 10MB).");
      return;
    }

    try {
      setUploading(true);

      // Read & hash file
      const fileContent = await readAsStringAsync(file.uri, { encoding: "base64" });
      const fileHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, 
        fileContent, 
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Upload file to IPFS
      const fileRes = await uploadFileToPinata({ 
        uri: file.uri, 
        type: file.mimeType || "application/octet-stream", 
        name: file.name 
      });
      const fileCID = fileRes.IpfsHash;

      // Create and upload metadata
      const metadata = {
        patient_wallet: PATIENT_ADDRESS,
        patient_name: PATIENT_NAME,
        doctor_wallet: "rDoctorWalletAddress", // Would be actual in production
        doctor_name: "Dr. Smith",
        record_type: recordType.trim(),
        timestamp: Math.floor(Date.now() / 1000),
        ipfs_file_cid: fileCID,
        hospital: hospital.trim(),
        description: description.trim(),
        hash_of_file: fileHash,
        version: 2,
        extra: {
          file_format: file.mimeType || "unknown",
          size_bytes: file.size || 0,
          tags: ["medical-record", recordType.toLowerCase().replace(/\s+/g, "-")],
          original_filename: file.name,
          patient_age: PATIENT_AGE,
          upload_timestamp: new Date().toISOString(),
        },
      };
      const metadataRes = await uploadRecordMetadata(metadata);

      // Submit to XRPL with fallback
      const xrplResult = await submitToXRPL(metadataRes, fileHash, fileCID);

      // ----- Handle Results Safely -----
      if (xrplResult.success) {
        if ("local" in xrplResult && xrplResult.local) {
          Alert.alert(
            "Upload Successful! 📱", 
            `Medical record stored locally for ${PATIENT_NAME}. Blockchain temporarily unavailable.\n\n• File: ${file.name}\n• Type: ${recordType}\n• IPFS: ${fileCID}`,
            [
              { 
                text: "Upload Another", 
                onPress: () => {
                  setFile(null);
                  setRecordType("");
                  setDescription("");
                } 
              },
              { text: "Done", onPress: () => router.back() }
            ]
          );
        } else {
          Alert.alert(
            "Upload Successful! ✅", 
            `Medical record uploaded successfully for ${PATIENT_NAME}.\n\n• File: ${file.name}\n• Type: ${recordType}\n• IPFS: ${fileCID}\n• XRPL: ${xrplResult.txHash?.slice(0,16)}...`,
            [
              { 
                text: "Upload Another", 
                onPress: () => {
                  setFile(null);
                  setRecordType("");
                  setDescription("");
                } 
              },
              { text: "Done", onPress: () => router.back() }
            ]
          );
        }
      } else {
        const errorMsg = "error" in xrplResult ? xrplResult.error : "Unknown blockchain error";
        Alert.alert(
          "Partial Success ⚠️", 
          `Medical record stored on IPFS but blockchain registration failed.\n\n• File: ${file.name}\n• Type: ${recordType}\n• IPFS File: ${fileCID}\n• Error: ${errorMsg}`,
          [
            {
              text: "View IPFS Details",
              onPress: () => {
                Alert.alert(
                  "IPFS Details",
                  `File CID: ${fileCID}\nMetadata CID: ${metadataRes.IpfsHash}\n\nShare the Metadata CID with the patient to access this record.`
                );
              },
            },
            { text: "OK", onPress: () => router.back() }
          ]
        );
      }

    } catch (err: any) {
      console.error("Upload error:", err);
      Alert.alert(
        "Upload Failed", 
        "Failed to upload medical record. Please check your connection and try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back to Patients</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Upload Medical Record</Text>

      {/* Patient Card */}
      <View style={styles.patientCard}>
        <View style={styles.patientHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#1e3a5f" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{PATIENT_NAME}</Text>
            <Text style={styles.patientDetail}>Age: {PATIENT_AGE}</Text>
            <Text style={styles.patientDetail}>Last Visit: {PATIENT_LAST_VISIT}</Text>
            <Text style={styles.patientAddress}>{formatAddress(PATIENT_ADDRESS)}</Text>
          </View>
        </View>
      </View>

      {/* Record Type */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Record Type *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Blood Test Report" 
          value={recordType} 
          onChangeText={setRecordType} 
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTypesContainer}>
          {quickRecordTypes.map((type) => (
            <TouchableOpacity key={type} style={styles.quickTypeButton} onPress={() => setRecordType(type)}>
              <Text style={styles.quickTypeText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Hospital */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Hospital/Clinic *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="KU Medical Center" 
          value={hospital} 
          onChangeText={setHospital} 
        />
      </View>

      {/* Description */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description *</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Brief description of findings, recommendations..." 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          numberOfLines={4} 
          textAlignVertical="top" 
        />
      </View>

      {/* File */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Medical File *</Text>
        <TouchableOpacity style={styles.fileButton} onPress={pickFile}>
          <Ionicons name="cloud-upload-outline" size={24} color="#1e3a5f" />
          <Text style={styles.fileText}>
            {file ? file.name : "Choose PDF, image, or document"}
          </Text>
        </TouchableOpacity>
        
        {file && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileInfoText}>
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </Text>
          </View>
        )}
      </View>

      {/* Upload Button */}
      <TouchableOpacity 
        style={[
          styles.uploadButton, 
          (!file || uploading || !recordType || !description) && styles.disabledButton
        ]} 
        onPress={uploadFile} 
        disabled={!file || uploading || !recordType || !description}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Upload Medical Record</Text>
        )}
      </TouchableOpacity>

      {uploading && (
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>Securely uploading to decentralized storage...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8f9fa" },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backText: { marginLeft: 8, color: "#1e3a5f", fontWeight: "600" },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 16, color: "#1e3a5f" },

  patientCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e1e5e9" },
  patientHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#e8f4f8", justifyContent: "center", alignItems: "center", marginRight: 12 },
  patientInfo: { flex: 1 },
  patientName: { fontWeight: "700", fontSize: 16, color: "#1e3a5f" },
  patientDetail: { fontSize: 14, color: "#666", marginTop: 2 },
  patientAddress: { fontSize: 12, color: "#888", marginTop: 4, fontFamily: "monospace" },

  inputContainer: { marginBottom: 20 },
  label: { fontWeight: "600", marginBottom: 8, color: "#1e3a5f" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16 },

  textArea: { height: 100 }, // added missing textArea
  quickTypesContainer: { marginTop: 8 }, // added missing quickTypesContainer
  quickTypeButton: { backgroundColor: "#e1e5eb", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  quickTypeText: { color: "#1e3a5f", fontSize: 14 }, // added missing quickTypeText

  fileButton: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, backgroundColor: "#fff" },
  fileText: { marginLeft: 8, color: "#1e3a5f" },
  fileInfo: { marginTop: 6 },
  fileInfoText: { fontSize: 12, color: "#666" }, // added missing fileInfoText

  uploadButton: { backgroundColor: "#1e3a5f", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 16 },
  disabledButton: { backgroundColor: "#94a3b8" },
  uploadButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  progressInfo: { marginTop: 12 },
  progressText: { fontSize: 14, color: "#555" },
});
