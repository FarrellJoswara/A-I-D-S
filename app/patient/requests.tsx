// app/patient/requests.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountTxTransaction, Client } from "xrpl";
import { useWallet } from "../context/WalletContext";

type AccessRequest = {
  id: string;
  requester: string;
  timestamp: number;
  message?: string;
};

export default function AccessRequestsPage() {
  const { wallet } = useWallet();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const client = new Client("wss://s.altnet.rippletest.net:51233");
        await client.connect();

        const response = await client.request({
          command: "account_tx",
          account: wallet.classicAddress,
          limit: 50,
          ledger_index_min: -1,   // earliest
          ledger_index_max: -1,   // latest
        });

        const txs: AccountTxTransaction[] = (response.result as any).transactions || [];

        const requestsList: AccessRequest[] = txs
          .map((txItem) => {
            const tx = (txItem.tx as any) || {};
            if (!tx.Memos || !Array.isArray(tx.Memos)) return null;

            for (const memoEntry of tx.Memos) {
              try {
                const memoHex = memoEntry?.Memo?.MemoData;
                if (!memoHex) continue;

                const memoStr = Buffer.from(memoHex, "hex").toString();
                const memoObj = JSON.parse(memoStr);

                if (memoObj.type === "accessRequest" && memoObj.requester) {
                  return {
                    id: tx.hash || Math.random().toString(), // fallback
                    requester: memoObj.requester,
                    timestamp: memoObj.timestamp || Math.floor(Date.now() / 1000),
                    message: memoObj.message,
                  };
                }
              } catch {
                continue;
              }
            }
            return null;
          })
          .filter(Boolean) as AccessRequest[];

        setRequests(requestsList);
        await client.disconnect();
      } catch (err) {
        console.error("Failed to fetch access requests:", err);
        Alert.alert("Error", "Failed to fetch access requests. Check console.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [wallet]);

  const approveRequest = (request: AccessRequest) => {
    Alert.alert(
      "Approve Access",
      `Grant access to ${request.requester}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => {
            setRequests((prev) => prev.filter((r) => r.id !== request.id));
            Alert.alert("Access Granted");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Access Requests", headerShown: true }} />

      {loading ? (
        <ActivityIndicator size="large" color="#0b7cff" style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-add-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No access requests</Text>
          <Text style={styles.emptySubtext}>
            When someone requests access to your records, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <Text style={styles.requesterText}>{item.requester}</Text>
              {item.message && <Text style={styles.messageText}>{item.message}</Text>}
              <Text style={styles.timestampText}>
                {new Date(item.timestamp * 1000).toLocaleString()}
              </Text>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => approveRequest(item)}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center" },
  requestCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  requesterText: { fontSize: 16, fontWeight: "600", color: "#0b1b3b" },
  messageText: { fontSize: 14, color: "#444", marginTop: 4 },
  timestampText: { fontSize: 12, color: "#666", marginTop: 4 },
  approveButton: {
    marginTop: 8,
    backgroundColor: "#0b7cff",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButtonText: { color: "#fff", fontWeight: "600" },
});
