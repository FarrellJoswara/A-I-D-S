// app/doctor/index.tsx
import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function DoctorHome() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Doctor",
          headerBackTitleVisible: false,
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Doctor Portal</Text>
        <Text style={styles.text}>
          In the future, this is where you can search for patients, scan a QR
          code, or review records that have been shared with you.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  text: { fontSize: 16, color: "#444" },
});
