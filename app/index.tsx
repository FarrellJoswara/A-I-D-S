// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWallet } from "./context/WalletContext";

export default function RoleChooserScreen() {
  const router = useRouter();
  const { setRole } = useWallet();

  const handleRoleSelect = (role: "patient" | "doctor") => {
    setRole(role);
    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* Top section */}
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="medkit" size={30} color="#0b7cff" />
          </View>
          <Text style={styles.appTitle}>MedaWallet</Text>
          <Text style={styles.subtitle}>Secure, portable medical records.</Text>
        </View>

        {/* Card asking who they are */}
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>Select Role:</Text>
          <Text style={styles.promptText}>
            Choose how you want to access your medical records.
          </Text>

          <View style={styles.buttonGroup}>
            {/* Patient button */}
            <Pressable
              style={({ pressed }) => [
                styles.roleButton,
                styles.patientButton,
                pressed && styles.roleButtonPressed,
              ]}
              onPress={() => handleRoleSelect("patient")}
            >
              <View style={styles.roleLeft}>
                <View style={[styles.iconBubble, { backgroundColor: "#e3f2ff" }]}>
                  <Ionicons name="person" size={24} color="#0b7cff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.roleTitle}>Patient</Text>
                  <Text style={styles.roleDesc}>
                    View and manage your own records.
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </Pressable>

            {/* Doctor button */}
            <Pressable
              style={({ pressed }) => [
                styles.roleButton,
                styles.doctorButton,
                pressed && styles.roleButtonPressed,
              ]}
              onPress={() => handleRoleSelect("doctor")}
            >
              <View style={styles.roleLeft}>
                <View style={[styles.iconBubble, { backgroundColor: "#ede7ff" }]}>
                  <Ionicons name="medical" size={24} color="#7b5cff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.roleTitle}>Doctor</Text>
                  <Text style={styles.roleDesc}>
                    Access patients who share records with you.
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by XRPL Blockchain
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e3f2ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0b1b3b",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  promptCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  promptText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  buttonGroup: {
    gap: 12,
  },
  roleButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  roleButtonPressed: {
    opacity: 0.8,
  },
  patientButton: {
    backgroundColor: "#e6f7ff",
  },
  doctorButton: {
    backgroundColor: "#f1ecff",
  },
  roleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  roleDesc: {
    fontSize: 13,
    color: "#4b5563",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
