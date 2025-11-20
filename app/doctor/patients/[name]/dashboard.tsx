import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PatientDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Correct param name (matches [name] folder)
  const patientName = Array.isArray(params.name) ? params.name[0] : params.name || "Unknown";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `${patientName}'s Dashboard` }} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.header}>{patientName}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Recent Activity:</Text>
          <Text style={styles.summarySubText}>• Viewed Records: 3 days ago</Text>
          <Text style={styles.summarySubText}>• Access Requests: 1 pending</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(`/doctor/patients/${encodeURIComponent(patientName)}/view`)}
          >
            <Ionicons name="document-text-outline" size={24} color="#2e2e2e" />
            <Text style={styles.buttonText}>View Records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(`/doctor/patients/${encodeURIComponent(patientName)}/upload`)}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#0b7cff" />
            <Text style={styles.buttonText}>Upload Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(`/doctor/patients/${encodeURIComponent(patientName)}/request-access`)}
          >
            <Ionicons name="lock-closed-outline" size={24} color="#ff0b75" />
            <Text style={styles.buttonText}>Request Additional Access</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa", paddingHorizontal: 20, paddingTop: 20 },
  header: { fontSize: 28, fontWeight: "700", color: "#1e3a5f", marginBottom: 20 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  summaryText: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  summarySubText: { fontSize: 14, color: "#555" },
  buttonsContainer: { gap: 16 },
  button: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 14, backgroundColor: "#fff", borderRadius: 12, borderWidth: 2, borderColor: "#1e3a5f", gap: 12 },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#1e3a5f" },
});
