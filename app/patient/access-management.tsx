// app/patient/manage-permissions.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
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
import { Client, Payment, xrpToDrops } from "xrpl";
import { useWallet } from "../context/WalletContext";

(global as any).Buffer = Buffer;

type Permission = {
  id: string;
  user: string;
  allowedDocuments: string[];
  timestamp?: number;
};

export default function ManagePermissionsPage() {
  const { wallet } = useWallet();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;

    const fetchPermissions = async () => {
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
        const permsMap = new Map<string, Permission>();

        // Process transactions in order to track grants and revocations
        txs.forEach((txItem: any) => {
          const tx = txItem.tx || {};
          if (!tx.Memos || !Array.isArray(tx.Memos)) return;

          tx.Memos.forEach((memoEntry: any) => {
            try {
              const memoHex = memoEntry?.Memo?.MemoData;
              if (!memoHex) return;

              const memoStr = Buffer.from(memoHex, "hex").toString();
              const memoObj = JSON.parse(memoStr);

              // Grant access
              if (memoObj.type === "grantAccess" && memoObj.user) {
                permsMap.set(memoObj.user, {
                  id: tx.hash,
                  user: memoObj.user,
                  allowedDocuments: memoObj.documents || [],
                  timestamp: memoObj.timestamp || tx.date,
                });
              }

              // Revoke access
              if (memoObj.type === "revokeAccess" && memoObj.user) {
                permsMap.delete(memoObj.user);
              }
            } catch {
              // skip invalid memo
            }
          });
        });

        // Convert map to array
        const perms = Array.from(permsMap.values());
        setPermissions(perms);
        await client.disconnect();
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to fetch permissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [wallet]);

  const removePermission = async (permId: string, user: string) => {
    if (!wallet) return;
    
    Alert.alert("Remove Access", `Remove access for ${user}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          setRevoking(permId);
          try {
            const client = new Client("wss://s.altnet.rippletest.net:51233");
            await client.connect();

            const payment: Payment = {
              TransactionType: "Payment",
              Account: wallet.classicAddress,
              Destination: wallet.classicAddress, // send to self
              Amount: xrpToDrops("0.001"),
              Memos: [
                {
                  Memo: {
                    MemoData: Buffer.from(
                      JSON.stringify({
                        type: "revokeAccess",
                        user,
                        timestamp: Math.floor(Date.now() / 1000),
                      })
                    ).toString("hex"),
                  },
                },
              ],
            };

            const prepared = await client.autofill(payment);
            const signed = wallet.sign(prepared);
            const tx = await client.submitAndWait(signed.tx_blob);

            const txResult = (tx.result.meta as any)?.TransactionResult;
            if (txResult === "tesSUCCESS") {
              setPermissions((prev) => prev.filter((p) => p.id !== permId));
              Alert.alert("Success", `Access revoked for ${user}`);
            } else {
              throw new Error(`Transaction failed: ${txResult || "Unknown"}`);
            }

            await client.disconnect();
          } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to revoke access. Please try again.");
          } finally {
            setRevoking(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Manage Permissions" }} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      ) : permissions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No users have access yet</Text>
          <Text style={styles.emptySubtext}>
            Approved access requests will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={permissions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#1e3a5f" />
                <Text style={styles.user}>{item.user}</Text>
              </View>
              <Text style={styles.docs}>
                Documents:{" "}
                {item.allowedDocuments.length > 0
                  ? item.allowedDocuments.join(", ")
                  : "All documents"}
              </Text>
              {item.timestamp && (
                <Text style={styles.timestamp}>
                  Granted: {new Date(item.timestamp * 1000).toLocaleDateString()}
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.removeButton,
                  revoking === item.id && styles.disabledButton,
                ]}
                onPress={() => removePermission(item.id, item.user)}
                disabled={revoking === item.id}
              >
                {revoking === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#fff" />
                    <Text style={styles.removeText}>Remove Access</Text>
                  </>
                )}
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
    marginBottom: 12,
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
    marginBottom: 8,
  },
  user: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0b1b3b",
    marginLeft: 8,
    flex: 1,
  },
  docs: {
    fontSize: 14,
    color: "#444",
    marginVertical: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  removeButton: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  removeText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
});