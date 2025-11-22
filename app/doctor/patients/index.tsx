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
} from "react-native";

export default function DoctorPatientsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState([
    { 
      id: "1", 
      name: "Alice Johnson", 
      address: "rUofX1KCA6crUq9UtpHZhCDkTyzTnDuksv",
      lastVisit: "2024-01-15"
    },
    { 
      id: "2", 
      name: "Bob Smith", 
      address: "rN7nLZVLKt1kFpbW3QhqMhFc6a2wQrk9vE",
      lastVisit: "2024-01-10"
    },
    { 
      id: "3", 
      name: "Charlie Lee", 
      address: "rP9vLq2sXySqyN2mKdLp5nMw7eR8aBc3dF",
      lastVisit: "2024-01-08"
    },
    { 
      id: "4", 
      name: "David Brown", 
      address: "rM8nTqYb5pL2sXwVrN9kFdC6aB3eH7jKqP",
      lastVisit: "2024-01-05"
    },
    { 
      id: "5", 
      name: "Eva Green", 
      address: "rK9vLp3sXyNqyM2nJdLr5nMw8eS9aBc4dG",
      lastVisit: "2024-01-03"
    },
  ]);

  const [searchText, setSearchText] = useState("");
  const [sortAscending, setSortAscending] = useState(true);

  // Filter + sort
  const filteredPatients = useMemo(() => {
    const filtered = patients.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.address.toLowerCase().includes(searchText.toLowerCase())
    );

    return filtered.sort((a, b) =>
      sortAscending
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
  }, [patients, searchText, sortAscending]);

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 4)}`;
  };

  const navigateToPatientDashboard = (patientName: string, patientAddress: string) => {
    router.push({
      pathname: "/doctor/patients/[name]/dashboard",
      params: { 
        name: patientName,
        address: patientAddress
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Patients</Text>
      <Text style={styles.subHeader}>Manage patient records</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#555" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search by name or wallet address..."
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={() => setSortAscending(!sortAscending)}>
          <Ionicons
            name={sortAscending ? "arrow-down" : "arrow-up"}
            size={20}
            color="#1e3a5f"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.patientRow}
            onPress={() => navigateToPatientDashboard(item.name, item.address)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientAddress}>{formatAddress(item.address)}</Text>
              <Text style={styles.lastVisit}>Last Visit: {item.lastVisit}</Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color="#1e3a5f" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    backgroundColor: "#f5f7fa",
  },

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e3a5f",
    marginBottom: 4,
  },

  subHeader: {
    fontSize: 15,
    color: "#4a6375",
    marginBottom: 20,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d1d9e6",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1e3a5f",
  },

  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e6ef",
  },

  patientName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e3a5f",
  },

  patientAddress: {
    fontSize: 13,
    color: "#4a6375",
    marginTop: 2,
  },

  lastVisit: {
    fontSize: 12,
    marginTop: 4,
    color: "#718096",
  },
});
