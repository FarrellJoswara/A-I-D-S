// app/patient/my-records.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
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

export default function MyRecordsPage() {
  const { wallet } = useWallet();
  const [documents, setDocuments] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  const fetchDocuments = async () => {
    if (!wallet) return;

    setLoading(true);
    try {
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      const resp = await client.request({
        command: "account_tx",
        account: wallet.classicAddress,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 100,
      });

      const txs = resp.result.transactions || [];
      const docs: MedicalRecord[] = [];

      txs.forEach((txItem: any) => {
        const tx = txItem.tx || {};
        if (!tx.Memos || !Array.isArray(tx.Memos)) return;

        tx.Memos.forEach((memoEntry: any) => {
          try {
            const memoHex = memoEntry?.Memo?.MemoData;
            if (!memoHex) return;

            const memoStr = Buffer.from(memoHex, "hex").toString();
            const memoObj = JSON.parse(memoStr);

            // Only show medical records, not access control transactions
            if (memoObj.type === "medicalRecord" && memoObj.metadataCID) {
              docs.push({
                txHash: tx.hash,
                metadataCID: memoObj.metadataCID,
                timestamp: memoObj.timestamp || tx.date || Math.floor(Date.now() / 1000),
                recordType: memoObj.recordType,
                doctorWallet: tx.Account, // The sender is the doctor
                type: memoObj.type,
              });
            }
          } catch {
            // skip invalid memo
          }
        });
      });

      // Sort by timestamp, newest first
      docs.sort((a, b) => b.timestamp - a.timestamp);

      setDocuments(docs);
      
      // Fetch metadata for each record
      docs.forEach((doc) => fetchMetadata(doc.metadataCID));

      await client.disconnect();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch medical records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMetadata = async (cid: string) => {
    try {
      // Fetch from IPFS gateway
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (response.ok) {
        const data = await response.json();
        setMetadata((prev) => ({ ...prev, [cid]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch metadata for ${cid}:`, err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [wallet]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

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

  const renderRecord = ({ item }: { item: MedicalRecord }) => {
    const meta = metadata[item.metadataCID];
    const recordType = item.recordType || meta?.record_type || "Medical Record";
    const hospital = meta?.hospital || "Unknown Hospital";
    const description = meta?.description || "No description available";
    const fileCID = meta?.ipfs_file_cid;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical" size={24} color="#1e3a5f" />
          <Text style={styles.recordType}>{recordType}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{hospital}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.timestamp * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {item.doctorWallet && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.doctorWallet.substring(0, 20)}...
            </Text>
          </View>
        )}

        {description && (
          <Text style={styles.description}>{description}</Text>
        )}

        <View style={styles.buttonContainer}>
          {fileCID && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => viewFile(fileCID)}
            >
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>View File</Text>
            </TouchableOpacity>
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
          <Text style={styles.cidLabel}>Tx Hash: </Text>
          <Text style={styles.cidText} numberOfLines={1}>
            {item.txHash}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "My Medical Records" }} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Loading your records...</Text>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No medical records found</Text>
          <Text style={styles.emptySubtext}>
            Your medical records uploaded by healthcare providers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.txHash}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderRecord}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
    alignItems: "center",
    marginBottom: 12,
  },
  recordType: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b1b3b",
    marginLeft: 8,
    flex: 1,
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
  description: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 12,
    fontStyle: "italic",
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
  metadataButton: {
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
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  metadataButtonText: {
    color: "#1e3a5f",
    fontWeight: "600",
    marginLeft: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
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