import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function DoctorPatientsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [patients, setPatients] = useState([
    { id: "1", name: "Alice Johnson", lastAccessed: null },
    { id: "2", name: "Bob Smith", lastAccessed: null },
    { id: "3", name: "Charlie Lee", lastAccessed: null },
    { id: "4", name: "David Brown", lastAccessed: null },
    { id: "5", name: "Eva Green", lastAccessed: null },
  ]);

  const [searchText, setSearchText] = useState("");
  const [sortAscending, setSortAscending] = useState(true); // for A-Z / Z-A
  const [sortMode, setSortMode] = useState<"alphabetical" | "recent">(
    "alphabetical"
  );
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter + sort
  const filteredPatients = useMemo(() => {
    const filtered = patients.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortMode === "alphabetical") {
        return sortAscending
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      // sortMode === "recent"
      const aTime = a.lastAccessed ?? 0;
      const bTime = b.lastAccessed ?? 0;
      // Most recently accessed first
      return bTime - aTime;
    });
  }, [patients, searchText, sortAscending, sortMode]);

  const handlePatientPress = (item: any) => {
    // update lastAccessed before navigating
    setPatients((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, lastAccessed: Date.now() } : p
      )
    );

    router.push(`/doctor/patients/${encodeURIComponent(item.name)}/dashboard`);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        },
      ]}
      edges={["top", "bottom"]}
    >
      <View style={styles.container}>
        <Text style={styles.header}>Patients You Have Access To</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#555"
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search patients..."
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
        </View>

        {/* Sort controls */}
        <View style={styles.sortRow}>
          {sortMode === "alphabetical" && (
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortAscending(!sortAscending)}
            >
              <Ionicons
                name={sortAscending ? "arrow-down" : "arrow-up"}
                size={18}
                color="#fff"
              />
              <Text style={styles.sortButtonText}>
                Sort {sortAscending ? "A-Z" : "Z-A"}
              </Text>
            </TouchableOpacity>
          )}

          {sortMode === "recent" && (
            <View style={styles.sortModeTag}>
              <Ionicons name="time-outline" size={16} color="#0b7cff" />
              <Text style={styles.sortModeTagText}>Sorted by: Most Recent</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sortButton, styles.sortOptionsButton]}
            onPress={() => setShowSortMenu(true)}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            <Text style={styles.sortButtonText}>Sort options</Text>
          </TouchableOpacity>
        </View>

        {/* Sort options modal */}
        <Modal visible={showSortMenu} transparent animationType="fade">
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowSortMenu(false)}
          >
            <View style={styles.menuBox}>
              <Text style={styles.menuTitle}>Sort by</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setSortMode("alphabetical");
                  setShowSortMenu(false);
                }}
              >
                <Ionicons name="text-outline" size={18} color="#111" />
                <Text style={styles.menuItemText}>
                  Alphabetical (A–Z / Z–A)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setSortMode("recent");
                  setShowSortMenu(false);
                }}
              >
                <Ionicons name="time-outline" size={18} color="#111" />
                <Text style={styles.menuItemText}>Most Recently Accessed</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Patient List */}
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientButton}
              onPress={() => handlePatientPress(item)}
            >
              <Text style={styles.patientText}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#1e3a5f" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No patients found</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1e3a5f",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1e3a5f" },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b7cff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  sortOptionsButton: {
    backgroundColor: "#111827",
  },
  sortButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  sortModeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  sortModeTagText: {
    fontSize: 12,
    color: "#0b7cff",
    fontWeight: "600",
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuBox: {
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    color: "#111827",
  },

  patientButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#1e3a5f",
    marginBottom: 12,
  },
  patientText: { fontSize: 18, fontWeight: "600", color: "#1e3a5f" },
  empty: { fontSize: 16, color: "#777", textAlign: "center", marginTop: 40 },
});
