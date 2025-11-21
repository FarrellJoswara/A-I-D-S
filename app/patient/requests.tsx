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
  id: string; // tx hash
  requester: string; // wallet that requested access
  timestamp: number;
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
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 50,
        });

        const txs: AccountTxTransaction[] = response.result.transactions || [];

        const requestsList: AccessRequest[] = txs
          .map((txItem) => {
            const tx = txItem.tx as any;

            // Skip transactions without memos
            if (!tx.Memos || !Array.isArray(tx.Memos) || tx.Memos.length === 0) {
              return null;
            }

            try {
              const memoHex = tx.Memos[0]?.Memo?.MemoData;
              if (!memoHex) return null;

              const memoStr = Buffer.from(memoHex, "hex").toString();
              const memoObj = JSON.parse(memoStr);

              if (memoObj.requestAccess && memoObj.requester) {
                return {
                  id: tx.hash,
                  requester: memoObj.requester,
                  timestamp: tx.date || Math.floor(Date.now() / 1000),
                };
              }
            } catch (err) {
              console.warn("Skipping invalid memo:", err);
              return null;
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
        { text: "Approve", onPress: () => Alert.alert("Access Granted") },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Access Requests",
          headerShown: true,
        }}
      />

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
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <Text style={styles.requesterText}>{item.requester}</Text>
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
