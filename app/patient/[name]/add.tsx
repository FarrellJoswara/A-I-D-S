import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function AddRecord() {
  const { name } = useLocalSearchParams();
  const router = useRouter();

  const [note, setNote] = useState("");

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Add Record for {name}</Text>

      <TextInput
        style={styles.textArea}
        placeholder="Enter visit notes, symptoms, diagnosis..."
        placeholderTextColor="#8c9aa5"
        multiline
        value={note}
        onChangeText={setNote}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => {
          console.log(`Saving record for ${name}:`, note);
          router.back(); // simulate saving & going back
        }}
      >
        <Text style={styles.saveText}>Save Record</Text>
      </TouchableOpacity>
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

  header: { fontSize: 26, fontWeight: "700", color: "#1e3a5f", marginBottom: 20 },

  textArea: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    height: 200,
    borderWidth: 1,
    borderColor: "#d3dbe3",
    fontSize: 16,
    color: "#1e3a5f",
    textAlignVertical: "top",
  },

  saveButton: {
    marginTop: 30,
    backgroundColor: "#1e3a5f",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: { color: "white", fontSize: 18, fontWeight: "700" },
});
