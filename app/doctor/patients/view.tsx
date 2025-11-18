import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ViewRecords() {
  const { name } = useLocalSearchParams();
  const router = useRouter();

  // placeholder example records
  const records = [
    { id: 1, date: "2025-01-11", note: "Routine check-up. Vitals stable." },
    { id: 2, date: "2025-01-03", note: "Follow-up visit. No concerns reported." },
    { id: 3, date: "2024-12-18", note: "Diagnosed with mild seasonal allergies." },
  ];

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Records for {name}</Text>

      <ScrollView style={styles.list}>
        {records.map((r) => (
          <View key={r.id} style={styles.recordCard}>
            <Text style={styles.date}>{r.date}</Text>
            <Text style={styles.note}>{r.note}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 50, backgroundColor: "#f5f7fa" },

  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 20 },

  backText: {
    fontSize: 16,
    marginLeft: 4,
    color: "#1e3a5f",
    fontWeight: "600",
  },

  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 20,
  },

  list: { marginTop: 10 },

  recordCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d3dbe3",
  },

  date: {
    fontSize: 14,
    color: "#5b6b75",
    marginBottom: 6,
  },

  note: {
    fontSize: 16,
    color: "#1e3a5f",
  },
});
