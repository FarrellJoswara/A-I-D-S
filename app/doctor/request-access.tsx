// app/patient/request-access.tsx
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
  const cameraRef = useRef(null);

  const [searchAddress, setSearchAddress] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [searchResults, setSearchResults] = useState<{ id: string; name?: string }[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Search XRPL account dynamically
  const handleSearch = async (address: string) => {
    if (!wallet || !address) return;
    setLoadingSearch(true);

    try {
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      // Fetch account info to verify existence
      await client.request({ command: "account_info", account: address });

      // If account exists, show result
      setSearchResults([{ id: address, name: "Unknown Patient" }]);
      await client.disconnect();
    } catch (err) {
      console.log("Address not found on XRPL:", err);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  useEffect(() => {
    if (searchAddress.length > 0) handleSearch(searchAddress);
    else setSearchResults([]);
  }, [searchAddress]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setSearchAddress(data);
    setScanning(false);
  };

  const handleRequestAccess = async (address: string) => {
    if (!wallet) return;

    try {
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      const tx: Payment = {
        TransactionType: "Payment",
        Account: wallet.classicAddress,
        Destination: address,
        Amount: "1", // 1 drop for testnet
        Memos: [
          {
            Memo: {
              MemoData: Buffer.from(
                JSON.stringify({ requestAccess: true, requester: wallet.classicAddress })
              ).toString("hex"),
            },
          },
        ],
      } as any; // ⚡ cast to any to satisfy TypeScript

      const prepared = await client.autofill(tx);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      console.log("Transaction result:", result);
      Alert.alert("Access Requested", `Successfully requested access from ${address}`);

      await client.disconnect();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to request access. Check console for details.");
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>
          We need camera permission to scan QR codes
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.grantButton}>
          <Text style={styles.grantButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Request Access",
          headerShown: true,
        }}
      />

      {/* Search by wallet address */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by wallet address"
          value={searchAddress}
          onChangeText={setSearchAddress}
        />
        <TouchableOpacity style={styles.qrButton} onPress={() => setScanning(true)}>
          <Ionicons name="qr-code" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loadingSearch ? (
        <ActivityIndicator size="large" color="#0b7cff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleRequestAccess(item.id)}
            >
              <Text style={styles.buttonText}>{item.id}</Text>
              <Ionicons name="arrow-forward" size={20} color="#1e3a5f" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchAddress ? "No patient found on XRPL." : "Enter a wallet address to search."}
            </Text>
          }
        />
      )}

      {/* QR Scanner Modal */}
      <Modal visible={scanning} animationType="slide">
        <View style={styles.modalContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
          />
          <View style={styles.qrOverlay}>
            <Text style={styles.qrText}>Scan Wallet QR Code</Text>
            <TouchableOpacity onPress={() => setScanning(false)} style={styles.grantButton}>
              <Text style={styles.grantButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa", padding: 20 },
  searchContainer: { flexDirection: "row", marginBottom: 16, alignItems: "center" },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  qrButton: {
    marginLeft: 12,
    backgroundColor: "#0b7cff",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#1e3a5f",
    marginBottom: 16,
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#1e3a5f" },
  empty: { fontSize: 16, color: "#777", textAlign: "center", marginTop: 40 },
  modalContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  qrOverlay: { position: "absolute", bottom: 50, width: "100%", alignItems: "center" },
  qrText: { fontSize: 20, fontWeight: "600", color: "#fff", marginBottom: 12 },
  permissionText: { fontSize: 16, color: "#333", textAlign: "center", marginBottom: 20 },
  grantButton: { backgroundColor: "#0b7cff", padding: 12, borderRadius: 12 },
  grantButtonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
