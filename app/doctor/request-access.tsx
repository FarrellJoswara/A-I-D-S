import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RequestAccessPage() {
  const router = useRouter();
  const cameraRef = useRef(null);
  
  const [patientsWithoutAccess, setPatientsWithoutAccess] = useState([
    { id: "0x1234...abcd", name: "Alice Johnson" },
    { id: "0x5678...efgh", name: "Bob Smith" },
    { id: "0x9abc...ijkl", name: "Charlie Lee" },
  ]);
  
  const [searchAddress, setSearchAddress] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const requestAccess = (address: string) => {
    Alert.alert(
      "Access Requested",
      `You have requested access to ${address}'s records.`
    );
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setSearchAddress(data);
    setScanning(false);
  };

  const filteredPatients = patientsWithoutAccess.filter((p) =>
    p.id.toLowerCase().includes(searchAddress.toLowerCase())
  );

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
        <Button onPress={requestPermission} title="Grant Permission" />
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
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setScanning(true)}
        >
          <Ionicons name="qr-code" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.button}
            onPress={() => requestAccess(item.id)}
          >
            <Text style={styles.buttonText}>{item.id}</Text>
            <Ionicons name="arrow-forward" size={20} color="#1e3a5f" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No patients available to request access.
          </Text>
        }
      />

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
            <Button title="Cancel" onPress={() => setScanning(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    padding: 20,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
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
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e3a5f",
  },
  empty: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  qrOverlay: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
  },
  qrText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
});