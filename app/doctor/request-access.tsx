// app/doctor/request-access.tsx
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Client, Payment } from "xrpl";
import { useWallet } from "../context/WalletContext";

export default function RequestAccessPage() {
  const router = useRouter();
  const { wallet } = useWallet();
  const cameraRef = useRef<any>(null);

  const [searchAddress, setSearchAddress] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [searchResults, setSearchResults] = useState<{ id: string; name?: string }[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const handleSearch = async (address: string) => {
    if (!wallet || !address || address.length < 10) {
      setSearchResults([]);
      return;
    }
    
    setLoadingSearch(true);

    try {
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      // Verify the address exists on XRPL
      await client.request({ 
        command: "account_info", 
        account: address,
        ledger_index: "validated"
      });
      
      setSearchResults([{ id: address, name: "XRPL Patient" }]);

      await client.disconnect();
    } catch (err: any) {
      console.log("Address validation error:", err.message);
      if (err.data?.error === "actNotFound") {
        Alert.alert("Not Found", "This wallet address doesn't exist on XRPL testnet.");
      }
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchAddress.length > 0) {
        handleSearch(searchAddress);
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [searchAddress]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setSearchAddress(data);
    setScanning(false);
  };

  const handleRequestAccess = async (address: string) => {
    if (!wallet) {
      Alert.alert("Error", "No wallet connected");
      return;
    }

    setRequesting(true);
    progressAnim.setValue(0);

    // Animate button progress
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000, // fallback duration for animation
      useNativeDriver: false,
    }).start();

    try {
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      const tx: Payment = {
        TransactionType: "Payment",
        Account: wallet.classicAddress,
        Destination: address,
        Amount: "1",
        Memos: [
          {
            Memo: {
              MemoData: Buffer.from(
                JSON.stringify({ 
                  type: "accessRequest",
                  requester: wallet.classicAddress,
                  timestamp: Math.floor(Date.now() / 1000),
                  message: "Doctor requesting access to medical records"
                })
              ).toString("hex"),
            },
          },
        ],
      };

      const prepared = await client.autofill(tx);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
        const meta = result.result.meta as any;
        if (meta.TransactionResult === "tesSUCCESS") {
          Alert.alert(
            "Access Requested",
            `Successfully sent access request to:\n${address.slice(0, 10)}...${address.slice(-8)}`,
            [
              {
                text: "OK",
                onPress: () => {
                  setSearchAddress("");
                  setSearchResults([]);
                }
              }
            ]
          );
        } else {
          throw new Error(`Transaction failed: ${meta.TransactionResult}`);
        }
      }

      await client.disconnect();
    } catch (err: any) {
      console.error("Request access error:", err);
      Alert.alert(
        "Error", 
        err.message || "Failed to request access. Check console for details."
      );
    } finally {
      setRequesting(false);
    }
  };

  if (!wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>No wallet connected</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0b7cff" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.permissionText}>Camera permission needed to scan QR codes</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.grantButton}>
            <Text style={styles.grantButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Request Access", headerShown: true }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Request Patient Access</Text>
        <Text style={styles.headerSubtitle}>
          Enter patient's wallet address or scan their QR code
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter patient wallet address (r...)"
          value={searchAddress}
          onChangeText={setSearchAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.qrButton} onPress={() => setScanning(true)}>
          <Ionicons name="qr-code" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loadingSearch && (
        <ActivityIndicator size="large" color="#0b7cff" style={{ marginTop: 20 }} />
      )}

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const progressWidth = progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            });

            return (
              <View style={styles.resultCard}>
                <View style={styles.resultInfo}>
                  <Ionicons name="person-circle-outline" size={40} color="#7b5cff" />
                  <View style={styles.resultDetails}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultAddress}>
                      {item.id.slice(0, 10)}...{item.id.slice(-8)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.requestButton, requesting && styles.disabledButton]}
                  onPress={() => handleRequestAccess(item.id)}
                  disabled={requesting}
                >
                  {requesting ? (
                    <>
                      <Animated.View style={[styles.buttonProgress, { width: progressWidth }]} />
                      <ActivityIndicator size="small" color="#fff" style={{ position: 'absolute' }} />
                    </>
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.requestButtonText}>Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {!loadingSearch && searchAddress.length > 0 && searchResults.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.empty}>
            No patient found with this address on XRPL testnet
          </Text>
        </View>
      )}

      {!searchAddress && (
        <View style={styles.emptyContainer}>
          <Ionicons name="qr-code-outline" size={64} color="#ccc" />
          <Text style={styles.empty}>
            Enter a wallet address or scan QR code to search
          </Text>
        </View>
      )}

      <Modal visible={scanning} animationType="slide">
        <View style={styles.modalContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
          />
          <View style={styles.qrOverlay}>
            <Text style={styles.qrText}>Scan Patient's Wallet QR Code</Text>
            <TouchableOpacity onPress={() => setScanning(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen loading modal */}
      <Modal transparent visible={requesting} animationType="fade">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingOverlayText}>Sending request...</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  header: { padding: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1e3a5f", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#666" },
  searchContainer: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, alignItems: "center" },
  searchInput: { flex: 1, backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: "#d1d5db" },
  qrButton: { marginLeft: 12, backgroundColor: "#7b5cff", padding: 12, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  listContainer: { padding: 20 },
  resultCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 },
  resultInfo: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  resultDetails: { marginLeft: 12, flex: 1 },
  resultName: { fontSize: 16, fontWeight: "600", color: "#1e3a5f" },
  resultAddress: { fontSize: 14, color: "#666", marginTop: 2 },
  requestButton: { backgroundColor: "#7b5cff", paddingVertical: 12, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, overflow: 'hidden' },
  disabledButton: { opacity: 0.5 },
  requestButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  buttonProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.3)' },
  button: { backgroundColor: "#7b5cff", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16, textAlign: "center" },
  empty: { fontSize: 16, color: "#999", textAlign: "center", marginTop: 16 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorText: { fontSize: 18, color: "#666", marginTop: 16, marginBottom: 24 },
  modalContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  qrOverlay: { position: "absolute", bottom: 50, width: "100%", alignItems: "center" },
  qrText: { fontSize: 20, fontWeight: "600", color: "#fff", marginBottom: 12 },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  permissionText: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 16, marginBottom: 24 },
  grantButton: { backgroundColor: "#7b5cff", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  grantButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  cancelButton: { backgroundColor: "#FF5555", paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  cancelButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666", textAlign: "center" },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loadingOverlayText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 },
});
