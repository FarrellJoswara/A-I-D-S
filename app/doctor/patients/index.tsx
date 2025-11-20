import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function DoctorPatientsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState([
    { id: "1", name: "Alice Johnson" },
    { id: "2", name: "Bob Smith" },
    { id: "3", name: "Charlie Lee" },
    { id: "4", name: "David Brown" },
    { id: "5", name: "Eva Green" },
  ]);

  const [searchText, setSearchText] = useState("");
  const [sortAscending, setSortAscending] = useState(true);

  // Filter + sort
  const filteredPatients = useMemo(() => {
    const filtered = patients.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );
    return filtered.sort((a, b) => (sortAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [patients, searchText, sortAscending]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Patients You Have Access To</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#555" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search patients..."
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
      </View>

      {/* Sort */}
      <TouchableOpacity style={styles.sortButton} onPress={() => setSortAscending(!sortAscending)}>
        <Ionicons name={sortAscending ? "arrow-down" : "arrow-up"} size={18} color="#fff" />
        <Text style={styles.sortButtonText}>Sort {sortAscending ? "A-Z" : "Z-A"}</Text>
      </TouchableOpacity>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.patientButton}
            onPress={() =>
              router.push(`/doctor/patients/${encodeURIComponent(item.name)}/dashboard`)
            }
          >
            <Text style={styles.patientText}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#1e3a5f" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No patients found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f7fa" },
  header: { fontSize: 28, fontWeight: "700", marginBottom: 20, color: "#1e3a5f" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: "#d1d5db" },
  searchInput: { flex: 1, fontSize: 14, color: "#1e3a5f" },
  sortButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#0b7cff", padding: 10, borderRadius: 12, marginBottom: 20, gap: 6, alignSelf: "flex-start" },
  sortButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  patientButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, borderWidth: 2, borderColor: "#1e3a5f", marginBottom: 12 },
  patientText: { fontSize: 18, fontWeight: "600", color: "#1e3a5f" },
  empty: { fontSize: 16, color: "#777", textAlign: "center", marginTop: 40 },
});
