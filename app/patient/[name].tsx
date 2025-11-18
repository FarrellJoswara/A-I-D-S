import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function PatientPage() {
  console.log("PATIENT PAGE LOADED");

  const { name } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1e3a5f" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Large Patient Name Header */}
      <Text style={styles.header}>Patient: {name}</Text>

      {/* Centered Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/patient/${name}/view`)}
        >
          <Text style={styles.buttonText}>View Records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/patient/${name}/add`)}
        >
          <Text style={styles.buttonText}>Add Records</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backText: {
    marginLeft: 6,
    fontSize: 16,
    color: "#1e3a5f",
    fontWeight: "600",
  },

  header: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 40,
    color: "#1e3a5f",
  },

  buttonContainer: {
    marginTop: 40,
  },

  button: {
    backgroundColor: "white",
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#1e3a5f",
    marginBottom: 20,
  },

  buttonText: {
    textAlign: "center",
    color: "#1e3a5f",
    fontSize: 18,
    fontWeight: "600",
  }
});

