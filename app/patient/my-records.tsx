// app/patient/my-records.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
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

// Placeholder for actual blockchain/web3 interaction
const fetchPatientRecords = async (): Promise<
  {
    id: number;
    ipfsCID: string;
    fileHash: string;
    timestamp: number;
    institution: string;
  }[]
> => {
  // TODO: Replace with call to smart contract
  return [
    {
      id: 1,
      ipfsCID: "QmXyz123...",
      fileHash: "0xabc123...",
      timestamp: 1699000000,
      institution: "0xDoctorAddress1",
    },
    {
      id: 2,
      ipfsCID: "QmAbc456...",
      fileHash: "0xdef456...",
      timestamp: 1699050000,
      institution: "0xDoctorAddress2",
    },
  ];
};

export default function MyRecordsPage() {
  const [records, setRecords] = useState<
    {
      id: number;
      ipfsCID: string;
      fileHash: string;
      timestamp: number;
      institution: string;
    }[]
  >([]);

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
        <Text style={styles.recordTitle}>Record #{item.id}</Text>
        <Pressable onPress={() => copyToClipboard(item.ipfsCID)}>
          <Ionicons name="copy" size={20} color="#0b7cff" />
        </Pressable>
      </View>
      <Text style={styles.recordText}>IPFS CID: {item.ipfsCID}</Text>
      <Text style={styles.recordText}>File Hash: {item.fileHash}</Text>
      <Text style={styles.recordText}>
        Institution: {item.institution}
      </Text>
      <Text style={styles.recordText}>
        Timestamp: {new Date(item.timestamp * 1000).toLocaleString()}
      </Text>
      <Pressable
        style={styles.viewButton}
        onPress={() =>
          Alert.alert(
            "View Record",
            `Open your IPFS viewer for CID: ${item.ipfsCID}`
          )
        }
      >
        <Text style={styles.viewButtonText}>View on IPFS</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1b3b",
  },
  recordText: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 2,
  },
  viewButton: {
    marginTop: 8,
    backgroundColor: "#0b7cff",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
