import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function DoctorHomeScreen() {
  const [name, setName] = useState("");
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Patient Lookup</Text>
      <Text style={styles.subheader}>Search for a patient by name</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter patient name..."
          placeholderTextColor="#5b6b75"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => {
            if (name.trim()) {
              router.push(`/patient/${name}`);
            }
          }}
        >
          <Ionicons name="search" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 70,
    backgroundColor: "#f5f7fa",
  },

  header: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 4,
  },

  subheader: {
    fontSize: 16,
    color: "#5b6b75",
    marginBottom: 30,
  },

  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1e3a5f",
  },

  searchButton: {
    marginLeft: 10,
    backgroundColor: "#1e3a5f",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
