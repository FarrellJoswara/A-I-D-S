// app/patient/manage-permissions.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Client, Payment, xrpToDrops } from "xrpl";
import { useWallet } from "../context/WalletContext";

(global as any).Buffer = Buffer;

type Permission = {
  id: string;
  user: string;
  allowedDocuments: string[];
};

export default function ManagePermissionsPage() {
  const { wallet } = useWallet();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

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
          limit: 50,
        });

        const txs = resp.result.transactions || [];
        const perms: Permission[] = [];

        txs.forEach((txItem: any) => {
          const tx = txItem.tx || {};
          if (!tx.Memos || !Array.isArray(tx.Memos)) return;

          tx.Memos.forEach((memoEntry: any) => {
            try {
              const memoHex = memoEntry?.Memo?.MemoData;
              if (!memoHex) return;

              const memoStr = Buffer.from(memoHex, "hex").toString();
              const memoObj = JSON.parse(memoStr);

              if (memoObj.type === "grantAccess" && memoObj.user) {
                perms.push({
                  id: tx.hash,
                  user: memoObj.user,
                  allowedDocuments: memoObj.documents || [],
                });
              }
            } catch {
              // skip invalid memo
            }
          });
        });

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
                      JSON.stringify({ type: "revokeAccess", user })
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
            Alert.alert("Error", String(err));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Manage Permissions" }} />

      {loading ? (
        <Text style={{ marginTop: 40 }}>Loading...</Text>
      ) : permissions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No users have access yet</Text>
        </View>
      ) : (
        <FlatList
          data={permissions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.user}>{item.user}</Text>
              <Text style={styles.docs}>
                Documents: {item.allowedDocuments.join(", ") || "All"}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePermission(item.id, item.user)}
              >
                <Text style={styles.removeText}>Remove Access</Text>
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
  user: { fontSize: 16, fontWeight: "600", color: "#0b1b3b" },
  docs: { fontSize: 14, color: "#444", marginVertical: 4 },
  removeButton: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  removeText: { color: "#fff", fontWeight: "600" },
});
