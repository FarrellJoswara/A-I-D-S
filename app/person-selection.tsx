// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function RoleChooserScreen() {
  // safe area insets for padding on all modern devices
  const insets = useSafeAreaInsets();

  // 👇 grab walletAddress from route params (if passed from login screen)
  const { walletAddress } = useLocalSearchParams<{ walletAddress?: string }>();

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
      {/* Hide header on this first screen only */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Wallet connected badge in top-right corner */}
      {walletAddress && (
        <View
          style={[
            styles.walletBadge,
            { top: insets.top + 8, right: insets.right + 8 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.walletBadgeText}>Wallet Connected</Text>
          {/* If you want to show the short address too, uncomment this: */}
          {/* <Text style={styles.walletBadgeText}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </Text> */}
        </View>
      )}

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
            <Link href="/patient" asChild>
              <Pressable style={[styles.roleButton, styles.patientButton]}>
                <View style={styles.roleLeft}>
                  <View
                    style={[styles.iconBubble, { backgroundColor: "#e3f2ff" }]}
                  >
                    <Ionicons name="person" size={24} color="#0b7cff" />
                  </View>
                  <View>
                    <Text style={styles.roleTitle}>Patient</Text>
                    <Text style={styles.roleDesc}>
                      View and manage your own records.
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>

            {/* Doctor button */}
            <Link href="/doctor" asChild>
              <Pressable style={[styles.roleButton, styles.doctorButton]}>
                <View style={styles.roleLeft}>
                  <View
                    style={[styles.iconBubble, { backgroundColor: "#ede7ff" }]}
                  >
                    <Ionicons name="medical" size={24} color="#7b5cff" />
                  </View>
                  <View>
                    <Text style={styles.roleTitle}>Doctor</Text>
                    <Text style={styles.roleDesc}>
                      Access patients who share records with you.
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Little footer hint */}
        <View style={styles.footer}>
          <Text style={styles.footerText}></Text>
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

  // 🔹 Wallet badge styles
  walletBadge: {
    position: "absolute",
    backgroundColor: "#22c55e",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  walletBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  container: {
    flex: 1,
    paddingTop: 24,
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
    paddingHorizontal: 20,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
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
    gap: 10,
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
