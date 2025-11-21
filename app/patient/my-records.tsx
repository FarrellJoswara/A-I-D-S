// app/patient/my-records.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Client } from "xrpl";
import { useWallet } from "../context/WalletContext";

(global as any).Buffer = Buffer;

type Document = {
  txHash: string;
  metadataCID: string;
  timestamp: number;
};

export default function MyRecordsPage() {
  const { wallet } = useWallet();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const client = new Client("wss://s.altnet.rippletest.net:51233");
        await client.connect();

        const resp = await client.request({
          command: "account_tx",
          account: wallet.classicAddress,
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 50,
        });

        const txs = resp.result.transactions || [];
        const docs: Document[] = [];

        txs.forEach((txItem: any) => {
          const tx = txItem.tx || {};
          if (!tx.Memos || !Array.isArray(tx.Memos)) return;

          tx.Memos.forEach((memoEntry: any) => {
            try {
              const memoHex = memoEntry?.Memo?.MemoData;
              if (!memoHex) return;

              const memoStr = Buffer.from(memoHex, "hex").toString();
              const memoObj = JSON.parse(memoStr);

              if (memoObj.metadataCID) {
                docs.push({
                  txHash: tx.hash,
                  metadataCID: memoObj.metadataCID,
                  timestamp: memoObj.timestamp || Math.floor(Date.now() / 1000),
                });
              }
            } catch {
              // skip invalid memo
            }
          });
        });

        setDocuments(docs);
        await client.disconnect();
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to fetch documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [wallet]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "My Records" }} />

      {loading ? (
        <Text style={{ marginTop: 40 }}>Loading...</Text>
      ) : documents.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No documents found</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.txHash}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cid}>CID: {item.metadataCID}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.timestamp * 1000).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999", marginTop: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  cid: { fontSize: 14, fontWeight: "500", color: "#0b1b3b" },
  timestamp: { fontSize: 12, color: "#666", marginTop: 4 },
});
