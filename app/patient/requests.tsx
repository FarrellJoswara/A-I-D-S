// app/patient/requests.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Client, Payment, xrpToDrops } from "xrpl";
import { useWallet } from "../context/WalletContext";

// Ensure Buffer is available globally
(global as any).Buffer = Buffer;

type AccessRequest = {
  id: string;
  requester: string;
  timestamp: number;
  message?: string;
};

type RawTransaction = {
  hash: string;
  account: string;
  destination: string;
  amount: string;
  date: number;
  memoType?: string;
  memoData?: any;
  rawMemo?: string;
};

const XRPL_NETWORK = "wss://s.altnet.rippletest.net:51233";

export default function AccessRequestsPage() {
  const { wallet } = useWallet();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);

  const parseMemoData = useCallback((memoHex: string): { success: boolean; data?: any; raw?: string } => {
    try {
      if (!memoHex) {
        return { success: false, raw: '' };
      }

      const memoStr = Buffer.from(memoHex, "hex").toString();
      
      try {
        const memoObj = JSON.parse(memoStr);
        return { success: true, data: memoObj };
      } catch (parseErr) {
        return { success: false, raw: memoStr };
      }
    } catch (err) {
      console.error("Error parsing memo:", err);
      return { success: false, raw: '' };
    }
  }, []);

  const processTransaction = useCallback(async (txItem: any, client: Client, index: number) => {
    console.log(`\n--- Transaction ${index + 1} ---`);
    console.log(`txItem keys:`, Object.keys(txItem));
    console.log(`Hash: ${txItem.hash}`);
    
    // The transaction data is in tx_json field based on your logs
    let tx = txItem.tx_json || txItem.tx || txItem.transaction || null;
    
    if (!tx) {
      console.log(`No transaction data found, trying direct API call...`);
      try {
        const txResponse = await client.request({
          command: 'tx',
          transaction: txItem.hash,
          binary: false,
        });
        tx = txResponse.result;
        console.log(`Successfully fetched from API, keys:`, Object.keys(tx));
      } catch (fetchErr: any) {
        console.error(`  API Error: ${fetchErr.message || fetchErr}`);
        return null;
      }
    } else {
      console.log(`Found transaction data, keys:`, Object.keys(tx));
    }
    
    console.log(`Type: ${tx.TransactionType}`);
    console.log(`From: ${tx.Account}`);
    console.log(`To: ${tx.Destination}`);
    console.log(`Amount: ${tx.Amount}`);
    
    // Handle date conversion - XRPL dates are in Ripple epoch (seconds since Jan 1, 2000)
    let displayDate = 'N/A';
    if (tx.date) {
      const rippleEpochOffset = 946684800; // Seconds between Unix epoch and Ripple epoch
      const unixTimestamp = (tx.date + rippleEpochOffset) * 1000;
      displayDate = new Date(unixTimestamp).toLocaleString();
    } else if (txItem.close_time_iso) {
      displayDate = txItem.close_time_iso;
    }
    console.log(`Date: ${displayDate}`);

    if (!tx?.Memos || !Array.isArray(tx.Memos)) {
      console.log(`No memos found (Memos field: ${tx?.Memos})`);
      return null;
    }

    console.log(`Found ${tx.Memos.length} memo(s)`);

    const transactionData: RawTransaction = {
      hash: tx.hash || txItem.hash,
      account: tx.Account,
      destination: tx.Destination,
      amount: tx.Amount,
      date: tx.date || 0,
    };

    const accessRequests: AccessRequest[] = [];
    const grantedUsers = new Set<string>();

    for (let memoIndex = 0; memoIndex < tx.Memos.length; memoIndex++) {
      const memoEntry = tx.Memos[memoIndex];
      const memoHex = memoEntry?.Memo?.MemoData;
      
      if (!memoHex) {
        console.log(`  Memo ${memoIndex + 1}: Empty memo data`);
        continue;
      }

      const parseResult = parseMemoData(memoHex);
      
      if (parseResult.success && parseResult.data) {
        const memoObj = parseResult.data;
        
        // Update transaction data
        transactionData.memoType = memoObj.type || 'unknown';
        transactionData.memoData = memoObj;

        // Check for grantAccess
        if (memoObj.type === "grantAccess" && memoObj.user) {
          console.log(`  ✅ Found grantAccess for user: ${memoObj.user}`);
          grantedUsers.add(memoObj.user);
        }

        // Check for accessRequest
        if (memoObj.type === "accessRequest" && memoObj.requester) {
          console.log(`  📩 Found accessRequest from: ${memoObj.requester}`);
          accessRequests.push({
            id: tx.hash || txItem.hash || `${Date.now()}-${memoIndex}`,
            requester: memoObj.requester,
            timestamp: memoObj.timestamp || Math.floor(Date.now() / 1000),
            message: memoObj.message,
          });
        }

        // Also check for medicalRecord type which might indicate access was already granted
        if (memoObj.type === "medicalRecord" && memoObj.metadataCID) {
          console.log(`  📄 Found medical record upload`);
          // You might want to track this too for debugging
        }
      } else {
        console.log(`  Memo ${memoIndex + 1}: Not valid JSON`);
        transactionData.memoType = 'non-json';
        transactionData.rawMemo = parseResult.raw?.substring(0, 200);
      }
    }

    return {
      transactionData,
      accessRequests,
      grantedUsers: Array.from(grantedUsers)
    };
  }, [parseMemoData]);

  const fetchRequests = useCallback(async () => {
    if (!wallet?.classicAddress) {
      Alert.alert("Error", "Wallet not available");
      return;
    }

    setLoading(true);
    let client: Client | null = null;

    try {
      client = new Client(XRPL_NETWORK);
      await client.connect();

      const response = await client.request({
        command: "account_tx",
        account: wallet.classicAddress,
        limit: 100,
        ledger_index_min: -1,
        ledger_index_max: -1,
      });

      const txs: any[] = (response.result as any).transactions || [];
      console.log(`\n========================================`);
      console.log(`Fetched ${txs.length} transactions for wallet ${wallet.classicAddress}`);
      console.log(`First transaction structure:`, txs.length > 0 ? Object.keys(txs[0]) : 'none');
      console.log(`========================================\n`);

      const allGrantedUsers = new Set<string>();
      const allAccessRequests: AccessRequest[] = [];
      const rawTxList: RawTransaction[] = [];

      // Process transactions in sequence to avoid rate limiting
      for (let index = 0; index < txs.length; index++) {
        const result = await processTransaction(txs[index], client, index);
        
        if (result) {
          rawTxList.push(result.transactionData);
          allAccessRequests.push(...result.accessRequests);
          result.grantedUsers.forEach(user => allGrantedUsers.add(user));
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`\n========================================`);
      console.log(`Summary:`);
      console.log(`- Total transactions: ${txs.length}`);
      console.log(`- Processed transactions with memos: ${rawTxList.length}`);
      console.log(`- Users with granted access: ${Array.from(allGrantedUsers).join(', ') || 'None'}`);
      console.log(`- Total access requests found: ${allAccessRequests.length}`);
      console.log(`========================================\n`);

      // Filter out already granted requests
      const pendingRequests = allAccessRequests.filter(req => !allGrantedUsers.has(req.requester));
      console.log(`Pending requests after filtering: ${pendingRequests.length}`);

      // Sort by timestamp, newest first
      pendingRequests.sort((a, b) => b.timestamp - a.timestamp);
      
      setRequests(pendingRequests);
      setAllTransactions(rawTxList);
    } catch (err) {
      console.error("Failed to fetch access requests:", err);
      Alert.alert("Error", "Failed to fetch access requests. Please check your connection.");
    } finally {
      if (client) {
        await client.disconnect();
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [wallet, processTransaction]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [fetchRequests]);

const approveRequest = useCallback(async (request: AccessRequest) => {
  if (!wallet) return;

  Alert.alert("Approve Access", `Grant access to ${request.requester}?`, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Approve",
      onPress: async () => {
        setProcessing(request.id);
        let client: Client | null = null;

        try {
          client = new Client(XRPL_NETWORK);
          await client.connect();

          // Generate a unique identifier to make each transaction different
          const uniqueId = Math.random().toString(36).substring(2, 15);
          
          const payment: Payment = {
            TransactionType: "Payment",
            Account: wallet.classicAddress,
            Destination: wallet.classicAddress, // Self-payment to store the grant memo
            Amount: xrpToDrops("0.001"), // Small amount for self-payment
            Memos: [
              {
                Memo: {
                  MemoType: Buffer.from("grantAccess").toString("hex"), // Add MemoType for uniqueness
                  MemoData: Buffer.from(
                    JSON.stringify({
                      type: "grantAccess",
                      user: request.requester,
                      timestamp: Math.floor(Date.now() / 1000),
                      requestId: request.id, // Include the original request ID
                      uniqueId: uniqueId, // Add unique identifier
                    })
                  ).toString("hex"),
                },
              },
            ],
            LastLedgerSequence: undefined, // Let autofill handle this
          };

          const prepared = await client.autofill(payment);
          const signed = wallet.sign(prepared);
          const tx = await client.submitAndWait(signed.tx_blob);

          const txResult = (tx.result.meta as any)?.TransactionResult;
          if (txResult === "tesSUCCESS") {
            setRequests((prev) => prev.filter((r) => r.id !== request.id));
            Alert.alert("Success", `Access granted to ${request.requester}`);
            
            // Refresh the requests list to show the updated state
            setTimeout(() => {
              fetchRequests();
            }, 2000);
          } else {
            throw new Error(`Transaction failed: ${txResult || "Unknown"}`);
          }
        } catch (err: any) {
          console.error("Approval error:", err);
          
          // Check if it's a redundant transaction error
          if (err.message?.includes("temREDUNDANT") || err.message?.includes("redundant")) {
            Alert.alert(
              "Already Processed", 
              "This access request has already been approved. Refreshing...",
              [
                {
                  text: "OK",
                  onPress: () => {
                    // Remove the request and refresh
                    setRequests((prev) => prev.filter((r) => r.id !== request.id));
                    fetchRequests();
                  }
                }
              ]
            );
          } else {
            Alert.alert("Error", `Failed to grant access: ${err.message}`);
          }
        } finally {
          if (client) {
            await client.disconnect();
          }
          setProcessing(null);
        }
      },
    },
  ]);
}, [wallet, fetchRequests]);

  const denyRequest = useCallback((request: AccessRequest) => {
    Alert.alert("Deny Access", `Deny access request from ${request.requester}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deny",
        style: "destructive",
        onPress: () => {
          setRequests((prev) => prev.filter((r) => r.id !== request.id));
        },
      },
    ]);
  }, []);

  const renderRequestItem = useCallback(({ item }: { item: AccessRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <Ionicons name="person-circle-outline" size={28} color="#1e3a5f" />
        <View style={styles.requesterInfo}>
          <Text style={styles.requesterText}>{item.requester}</Text>
          <Text style={styles.timestampText}>
            {new Date(item.timestamp * 1000).toLocaleString()}
          </Text>
        </View>
      </View>

      {item.message && (
        <View style={styles.messageContainer}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color="#666" />
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.approveButton,
            processing === item.id && styles.disabledButton,
          ]}
          onPress={() => approveRequest(item)}
          disabled={processing === item.id}
        >
          {processing === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.denyButton}
          onPress={() => denyRequest(item)}
          disabled={processing === item.id}
        >
          <Ionicons name="close-circle" size={18} color="#ff4d4d" />
          <Text style={styles.denyButtonText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [approveRequest, denyRequest, processing]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-open-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No access requests</Text>
      <Text style={styles.emptySubtext}>
        When someone requests access to your records, it will appear here.
      </Text>
      <Text style={styles.debugInfo}>
        Found {allTransactions.length} transactions with memos
      </Text>
      <TouchableOpacity style={styles.refreshButtonLarge} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#1e3a5f" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
      
      {/* Debug information */}
      <View style={styles.debugSection}>
        <Text style={styles.debugSectionTitle}>Debug Information</Text>
        <Text style={styles.debugText}>
          • Your wallet: {wallet?.classicAddress}
        </Text>
        <Text style={styles.debugText}>
          • Make sure doctors are sending accessRequest memos to your address
        </Text>
        <Text style={styles.debugText}>
          • Check debug mode to see all transaction details
        </Text>
      </View>
    </View>
  ), [allTransactions.length, onRefresh, wallet?.classicAddress]);

  if (debugMode) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Debug: All Transactions" }} />
        
        <View style={styles.debugHeader}>
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setDebugMode(false)}
          >
            <Ionicons name="arrow-back" size={20} color="#1e3a5f" />
            <Text style={styles.debugToggleText}>Back to Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#1e3a5f" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={allTransactions}
          keyExtractor={(item, index) => item.hash || `tx-${index}`}
          contentContainerStyle={styles.debugScroll}
          renderItem={({ item: tx, index }) => (
            <View style={styles.debugCard}>
              <Text style={styles.debugLabel}>Transaction {index + 1}</Text>
              <Text style={styles.debugText}>Hash: {tx.hash}</Text>
              <Text style={styles.debugText}>From: {tx.account}</Text>
              <Text style={styles.debugText}>To: {tx.destination}</Text>
              <Text style={styles.debugText}>Amount: {tx.amount}</Text>
              <Text style={styles.debugText}>
                Date: {tx.date ? new Date(tx.date * 1000 + 946684800000).toLocaleString() : 'N/A'}
              </Text>
              <Text style={styles.debugText}>Memo Type: {tx.memoType || 'N/A'}</Text>
              {tx.memoData && (
                <View style={styles.debugMemoData}>
                  <Text style={styles.debugLabel}>Memo Data:</Text>
                  <Text style={styles.debugText}>
                    {JSON.stringify(tx.memoData, null, 2)}
                  </Text>
                </View>
              )}
              {tx.rawMemo && (
                <View style={styles.debugMemoData}>
                  <Text style={styles.debugLabel}>Raw Memo:</Text>
                  <Text style={styles.debugText}>{tx.rawMemo}</Text>
                </View>
              )}
            </View>
          )}
          ListHeaderComponent={
            <Text style={styles.debugTitle}>
              All Transactions with Memos ({allTransactions.length})
            </Text>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Access Requests" }} />

      <View style={styles.debugToggleContainer}>
        <TouchableOpacity
          style={styles.debugToggleButton}
          onPress={() => setDebugMode(true)}
        >
          <Ionicons name="bug" size={16} color="#666" />
          <Text style={styles.debugToggleButtonText}>Debug Mode</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : { padding: 16 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={renderRequestItem}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  debugToggleContainer: {
    padding: 8,
    alignItems: "flex-end",
  },
  debugToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  debugToggleButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#666",
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  debugToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  debugToggleText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e3a5f",
  },
  debugScroll: {
    padding: 16,
  },
  debugTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 16,
  },
  debugCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a5f",
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: "#444",
    marginBottom: 2,
    fontFamily: "monospace",
  },
  debugMemoData: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  debugInfo: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1e7ff",
  },
  debugSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a5f",
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonLarge: {
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
  requestCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
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
    marginBottom: 12,
  },
  requesterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  requesterText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0b1b3b",
  },
  timestampText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#0b7cff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  denyButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ff4d4d",
  },
  disabledButton: { opacity: 0.5 },
  approveButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  denyButtonText: {
    color: "#ff4d4d",
    fontWeight: "600",
    marginLeft: 6,
  },
});