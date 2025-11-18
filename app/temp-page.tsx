// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function RoleChooserScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Hide header on this first screen only */}
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
            <Link href="/patient" asChild>
              <Pressable style={[styles.roleButton, styles.patientButton]}>
                <View style={styles.roleLeft}>
                  <View style={[styles.iconBubble, { backgroundColor: "#e3f2ff" }]}>
                    <Ionicons name="person" size={24} color="#0b7cff" />
                  </View>
                  <View>
                    <Text style={styles.roleTitle}>Patient</Text>
                    <Text style={styles.roleDesc}>
                      View and manage your own records.
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#555" />
              </Pressable>
            </Link>

            {/* Doctor button */}
            <Link href="/doctor" asChild>
              <Pressable style={[styles.roleButton, styles.doctorButton]}>
                <View style={styles.roleLeft}>
                  <View style={[styles.iconBubble, { backgroundColor: "#ede7ff" }]}>
                    <Ionicons name="medical" size={24} color="#7b5cff" />
                  </View>
                  <View>
                    <Text style={styles.roleTitle}>Doctor</Text>
                    <Text style={styles.roleDesc}>
                      Access patients who share records with you.
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#555" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Little footer hint */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            
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
