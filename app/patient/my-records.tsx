// app/patient/my-records.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountTxTransaction, Client } from "xrpl";
import { useWallet } from "../context/WalletContext";

// Example: fetch metadata JSON from IPFS
const fetchMetadataFromCID = async (cid: string) => {
  try {
    const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.log("IPFS fetch error:", err);
    return null;
  }
};

// TypeScript interface for XRPL transaction - match the XRPL library type
type XRPLTx = AccountTxTransaction;

// Fetch all payment transactions to patient wallet
const fetchPatientTransactions = async (patientAddress: string) => {
  const client = new Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();

  try {
    const payments = await client.request({
      command: "account_tx",
      account: patientAddress,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit: 50,
    });

    const rawTxs = payments.result.transactions || [];

    // Just return the transactions as-is, already typed correctly
    return rawTxs;
  } finally {
    await client.disconnect();
  }
};

export default function MyRecordsPage() {
  const { wallet } = useWallet();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    const loadRecords = async () => {
      if (!wallet) {
        Alert.alert("Error", "No wallet connected");
        return;
      }
      setLoading(true);

      try {
        setWalletAddress(wallet.classicAddress);
        
        const txs = await fetchPatientTransactions(wallet.classicAddress);

        const recordData = await Promise.all(
          txs.map(async (tx) => {
            // Safety check for tx existence
            if (!tx.tx) return null;
            
            const transaction = tx.tx as any; // XRPL types can be complex, use any for memo access
            
            if (!transaction.Memos || transaction.Memos.length === 0) return null;

            // Grab first memo's CID
            const memoHex = transaction.Memos[0].Memo.MemoData;
            const memoStr = Buffer.from(memoHex, "hex").toString();
            let metadataCID = "";
            
            try {
              const obj = JSON.parse(memoStr);
              metadataCID = obj.metadataCID;
            } catch (e) {
              console.log("Failed to parse memo:", memoStr);
            }

            if (!metadataCID) return null;

            const metadata = await fetchMetadataFromCID(metadataCID);
            if (!metadata) return null;

            return {
              id: transaction.hash,
              filename: metadata.extra?.original_filename || "Unknown file",
              timestamp: metadata.timestamp,
              institution: metadata.hospital || "Unknown",
              ipfsCID: metadata.ipfs_file_cid,
              metadataCID: metadataCID,
              doctor: metadata.doctor_wallet,
              recordType: metadata.record_type || "Medical Record",
              description: metadata.description || "",
            };
          })
        );

        const validRecords = recordData.filter(Boolean);
        setRecords(validRecords);
        
        if (validRecords.length === 0) {
          Alert.alert("No Records", "No medical records found for this wallet.");
        }
      } catch (err) {
        console.log("Load records error:", err);
        Alert.alert("Error", "Failed to load XRPL records. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [wallet]);

  const copyToClipboard = (cid: string, type: string = "file") => {
    const url = `https://ipfs.io/ipfs/${cid}`;
    Clipboard.setString(url);
    Alert.alert("Copied!", `IPFS ${type} link copied to clipboard.`);
  };

  const openIPFS = async (cid: string) => {
    const url = `https://ipfs.io/ipfs/${cid}`;
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Cannot open IPFS link");
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={24} color="#0b7cff" />
          <Text style={styles.recordTitle}>{item.filename}</Text>
        </View>
        <Pressable 
          onPress={() => copyToClipboard(item.ipfsCID, "file")}
          style={styles.iconButton}
        >
          <Ionicons name="copy-outline" size={22} color="#0b7cff" />
        </Pressable>
      </View>

      <View style={styles.recordDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.recordText}>{item.institution}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="medkit-outline" size={16} color="#666" />
          <Text style={styles.recordText}>{item.recordType}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.recordText}>
            Doctor: {item.doctor.slice(0, 10)}...
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.recordText}>
            {new Date(item.timestamp * 1000).toLocaleString()}
          </Text>
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => openIPFS(item.ipfsCID)}
        >
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>View File</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => copyToClipboard(item.metadataCID, "metadata")}
        >
          <Ionicons name="information-circle-outline" size={18} color="#0b7cff" />
          <Text style={styles.secondaryButtonText}>Metadata</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: "My Records",
          headerShown: true,
        }} 
      />

      <View style={styles.header}>
        <Text style={styles.walletLabel}>Your Wallet</Text>
        <Text style={styles.walletAddress}>
          {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : "Loading..."}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b7cff" />
          <Text style={styles.loadingText}>Loading your records...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No records found</Text>
          <Text style={styles.emptySubtext}>
            Your medical records will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  walletLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0b1b3b",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1b3b",
    flex: 1,
  },
  iconButton: {
    padding: 4,
  },
  recordDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordText: {
    fontSize: 14,
    color: "#4b5563",
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: "#0b7cff",
  },
  secondaryButton: {
    backgroundColor: "#e8f4ff",
    borderWidth: 1,
    borderColor: "#0b7cff",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButtonText: {
    color: "#0b7cff",
    fontWeight: "600",
    fontSize: 14,
  },
});