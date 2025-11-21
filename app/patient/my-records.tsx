// app/patient/my-records.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Placeholder blockchain + IPFS fetch
// Later this should call your smart contract + IPFS metadata
const fetchPatientRecords = async () => {
  return [
    {
      id: 1,
      ipfsCID: "QmXyz123...",
      filename: "Blood Test - Oct 2025.pdf", // placeholder for actual file name
      timestamp: 1699000000,
      institution: "KU Medical Center",
    },
    {
      id: 2,
      ipfsCID: "QmAbc456...",
      filename: "MRI Results - Nov 2025.pdf",
      timestamp: 1699050000,
      institution: "Lawrence General Hospital",
    },
  ];
};

export default function MyRecordsPage() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const loadRecords = async () => {
      const data = await fetchPatientRecords();
      setRecords(data);
    };
    loadRecords();
  }, []);

  const copyToClipboard = (cid: string) => {
    Clipboard.setString(`https://ipfs.io/ipfs/${cid}`);
    Alert.alert("Copied!", "IPFS link copied to clipboard.");
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordTitle}>{item.filename}</Text>

        <Pressable onPress={() => copyToClipboard(item.ipfsCID)}>
          <Ionicons name="copy" size={20} color="#0b7cff" />
        </Pressable>
      </View>

      <Text style={styles.recordText}>Institution: {item.institution}</Text>

      <Text style={styles.recordText}>
        Timestamp: {new Date(item.timestamp * 1000).toLocaleString()}
      </Text>

      <Pressable
        style={styles.viewButton}
        onPress={() =>
          Alert.alert(
            "View Record",
            `Open your IPFS viewer for CID:\n${item.ipfsCID}`
          )
        }
      >
        <Text style={styles.viewButtonText}>View on IPFS</Text>
      </Pressable>

      {/* Placeholder for future blockchain metadata */}
      <View style={{ marginTop: 10 }}>
        <Text style={styles.placeholderTitle}>Blockchain Metadata</Text>
        <Text style={styles.placeholderText}>
          (Example) Doctor Signature: Pending...
        </Text>
        <Text style={styles.placeholderText}>
          (Example) On-chain verification: Loading...
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "My Records" }} />

      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    alignItems: "center",
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1b3b",
    flexShrink: 1,
    marginRight: 10,
  },
  recordText: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 2,
  },
  viewButton: {
    marginTop: 10,
    backgroundColor: "#0b7cff",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  placeholderTitle: {
    marginTop: 10,
    fontWeight: "700",
    color: "#0b1b3b",
    fontSize: 14,
  },
  placeholderText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
