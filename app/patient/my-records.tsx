// app/patient/my-records.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Client } from "xrpl";
import { useWallet } from "../context/WalletContext";

(global as any).Buffer = Buffer;

type MedicalRecord = {
  txHash: string;
  metadataCID: string;
  timestamp: number;
  recordType?: string;
  doctorWallet?: string;
  type: string;
};

const XRPL_NETWORK = "wss://s.altnet.rippletest.net:51233";

export default function MyRecordsPage() {
  const { wallet } = useWallet();
  const [documents, setDocuments] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  const fetchMetadata = useCallback(async (cid: string) => {
    try {
      console.log(`Fetching metadata for CID: ${cid}`);
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched metadata for ${cid}:`, data);
        setMetadata((prev) => ({ ...prev, [cid]: data }));
      } else {
        console.error(`Failed to fetch metadata for ${cid}: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to fetch metadata for ${cid}:`, err);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!wallet?.classicAddress) {
      Alert.alert("Error", "Wallet not available");
      return;
    }

    setLoading(true);
    let client: Client | null = null;

    try {
      client = new Client(XRPL_NETWORK);
      await client.connect();

      const resp = await client.request({
        command: "account_tx",
        account: wallet.classicAddress,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 100,
      });

      const txs = (resp.result as any).transactions || [];
      console.log(`Found ${txs.length} total transactions`);
      
      const docs: MedicalRecord[] = [];

      for (const txItem of txs) {
        // The transaction data is in tx_json field based on the doctor's upload structure
        const tx = txItem.tx_json || txItem.tx || {};
        
        console.log(`Processing transaction:`, {
          hash: tx.hash || txItem.hash,
          type: tx.TransactionType,
          from: tx.Account,
          to: tx.Destination,
          hasMemos: !!tx.Memos
        });

        if (!tx.Memos || !Array.isArray(tx.Memos)) {
          console.log(`No memos found in transaction ${tx.hash}`);
          continue;
        }

        console.log(`Found ${tx.Memos.length} memo(s) in transaction ${tx.hash}`);

        for (const memoEntry of tx.Memos) {
          try {
            const memoHex = memoEntry?.Memo?.MemoData;
            if (!memoHex) {
              console.log(`Empty memo data in transaction ${tx.hash}`);
              continue;
            }

            const memoStr = Buffer.from(memoHex, "hex").toString();
            console.log(`Raw memo string: ${memoStr.substring(0, 100)}...`);

            let memoObj;
            try {
              memoObj = JSON.parse(memoStr);
              console.log(`Parsed memo object:`, memoObj);
            } catch (parseErr) {
              console.log(`Memo is not valid JSON, skipping`);
              continue;
            }

            // Only show medical records, not access control transactions
            if (memoObj.type === "medicalRecord" && memoObj.metadataCID) {
              console.log(`✅ Found medical record with metadataCID: ${memoObj.metadataCID}`);
              
              const record: MedicalRecord = {
                txHash: tx.hash || txItem.hash,
                metadataCID: memoObj.metadataCID,
                timestamp: memoObj.timestamp || tx.date || Math.floor(Date.now() / 1000),
                recordType: memoObj.recordType,
                doctorWallet: tx.Account, // The sender is the doctor
                type: memoObj.type,
              };

              docs.push(record);
              
              // Fetch metadata for this record
              await fetchMetadata(memoObj.metadataCID);
            } else {
              console.log(`Skipping memo type: ${memoObj.type}`);
            }
          } catch (err) {
            console.error(`Error processing memo in transaction ${tx.hash}:`, err);
          }
        }
      }

      // Sort by timestamp, newest first
      docs.sort((a, b) => b.timestamp - a.timestamp);

      console.log(`Total medical records found: ${docs.length}`);
      setDocuments(docs);
      
    } catch (err) {
      console.error("Failed to fetch medical records:", err);
      Alert.alert("Error", "Failed to fetch medical records. Please check your connection.");
    } finally {
      if (client) {
        await client.disconnect();
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [wallet, fetchMetadata]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments();
  }, [fetchDocuments]);

  const openIPFS = (cid: string) => {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open IPFS link")
    );
  };

  const viewFile = (fileCID: string) => {
    if (!fileCID) {
      Alert.alert("Error", "File CID not found");
      return;
    }
    const url = `https://gateway.pinata.cloud/ipfs/${fileCID}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open file")
    );
  };

  const downloadFile = async (fileCID: string, fileName: string) => {
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${fileCID}`;
      const response = await fetch(url);
      const blob = await response.blob();
      
      // For React Native, you might need a different approach for actual file download
      // This is a simplified version - in a real app, you'd use a file system library
      console.log(`Downloading file: ${fileName} from ${fileCID}`);
      Alert.alert("Download", `File ${fileName} would be downloaded in a real app.`);
    } catch (err) {
      console.error("Download error:", err);
      Alert.alert("Error", "Failed to download file");
    }
  };

  const renderRecord = useCallback(({ item }: { item: MedicalRecord }) => {
    const meta = metadata[item.metadataCID];
    const recordType = item.recordType || meta?.record_type || "Medical Record";
    const hospital = meta?.hospital || "Unknown Hospital";
    const description = meta?.description || "No description available";
    const fileCID = meta?.ipfs_file_cid;
    const fileName = meta?.extra?.original_filename || "document";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical" size={24} color="#1e3a5f" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.recordType}>{recordType}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{hospital}</Text>
        </View>

        {item.doctorWallet && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              Doctor: {item.doctorWallet}
            </Text>
          </View>
        )}

        {description && (
          <View style={styles.descriptionContainer}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.description}>{description}</Text>
          </View>
        )}

        {meta?.hash_of_file && (
          <View style={styles.infoRow}>
            <Ionicons name="finger-print-outline" size={16} color="#666" />
            <Text style={styles.hashText} numberOfLines={1}>
              Hash: {meta.hash_of_file.substring(0, 20)}...
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {fileCID && (
            <>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => viewFile(fileCID)}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => downloadFile(fileCID, fileName)}
              >
                <Ionicons name="download-outline" size={18} color="#1e3a5f" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.metadataButton}
            onPress={() => openIPFS(item.metadataCID)}
          >
            <Ionicons name="information-circle-outline" size={18} color="#1e3a5f" />
            <Text style={styles.metadataButtonText}>Metadata</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.cidLabel}>Tx: </Text>
          <Text style={styles.cidText} numberOfLines={1}>
            {item.txHash}
          </Text>
        </View>
        
        {item.metadataCID && (
          <View style={styles.footer}>
            <Text style={styles.cidLabel}>Metadata: </Text>
            <Text style={styles.cidText} numberOfLines={1}>
              {item.metadataCID}
            </Text>
          </View>
        )}
      </View>
    );
  }, [metadata]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No medical records found</Text>
      <Text style={styles.emptySubtext}>
        Your medical records uploaded by healthcare providers will appear here
      </Text>
      
      {/* Debug information */}
      <View style={styles.debugSection}>
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugText}>
          • Your wallet: {wallet?.classicAddress}
        </Text>
        <Text style={styles.debugText}>
          • Make sure doctors are sending medicalRecord transactions to your address
        </Text>
        <Text style={styles.debugText}>
          • Check that transactions contain medicalRecord memos with metadataCID
        </Text>
      </View>
      
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#1e3a5f" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  ), [wallet?.classicAddress, onRefresh]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "My Medical Records" }} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Loading your records...</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.txHash}
          contentContainerStyle={documents.length === 0 ? styles.emptyContainer : { padding: 16 }}
          renderItem={renderRecord}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    marginBottom: 20,
  },
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1e7ff",
    width: "100%",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a5f",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#1e3a5f",
    marginBottom: 4,
  },
  refreshButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4f8",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e3a5f",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  recordType: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b1b3b",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
    flex: 1,
  },
  hashText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    flex: 1,
    fontFamily: "monospace",
  },
  descriptionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
    fontStyle: "italic",
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    backgroundColor: "#1e3a5f",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButton: {
    flex: 1,
    backgroundColor: "#e8f4f8",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  metadataButton: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  downloadButtonText: {
    color: "#1e3a5f",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  metadataButtonText: {
    color: "#666",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cidLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  cidText: {
    fontSize: 11,
    color: "#999",
    flex: 1,
    fontFamily: "monospace",
  },
});