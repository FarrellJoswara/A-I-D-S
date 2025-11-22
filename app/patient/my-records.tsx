import { Ionicons } from "@expo/vector-icons";
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MedicalRecord = {
  id: string;
  recordType: string;
  doctorWallet: string;
  patientWallet: string;
  fileCID: string;
  fileName: string;
  description: string;
  hospital: string;
  metadataCID: string;
};

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export default function MyRecordsPage() {
  const documents: MedicalRecord[] = [
    {
      id: "demo-1",
      recordType: "Blood Test Report",
      doctorWallet: "rDemoDoctor1",
      patientWallet: "rDemoPatient1",
      fileCID: "QmDemoFile1",
      fileName: "blood_test.pdf",
      description: "Test",
      hospital: "KU Medical Center",
      metadataCID: "QmDemoMetadata1",
    }
  ];

  const openIPFS = (cid: string) => {
    const url = `${PINATA_GATEWAY}/${cid}`;
    Linking.openURL(url);
  };

  const viewFile = (fileCID: string) => {
    const url = `${PINATA_GATEWAY}/${fileCID}`;
    Linking.openURL(url);
  };

  const renderRecord = ({ item }: { item: MedicalRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="medical" size={24} color="#1e3a5f" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.recordType}>{item.recordType}</Text>
        </View>
      </View>

      <Text style={styles.infoLabel}>Hospital: {item.hospital}</Text>
      <Text style={styles.infoLabel}>Doctor: {item.doctorWallet}</Text>
      <Text style={styles.infoLabel}>Patient: {item.patientWallet}</Text>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.viewButton} onPress={() => viewFile(item.fileCID)}>
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>View File</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.metadataButton} onPress={() => openIPFS(item.metadataCID)}>
          <Ionicons name="information-circle-outline" size={18} color="#1e3a5f" />
          <Text style={styles.metadataButtonText}>Metadata</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  recordType: { fontSize: 18, fontWeight: "700", color: "#1e3a5f" },
  infoLabel: { fontSize: 14, color: "#666", marginBottom: 4 },
  description: { fontSize: 14, color: "#666", marginTop: 8, marginBottom: 12 },
  buttonContainer: { flexDirection: "row", gap: 8 },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
  },
  buttonText: { color: "white", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  metadataButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  metadataButtonText: { color: "#1e3a5f", fontSize: 14, fontWeight: "600", marginLeft: 6 },
});
