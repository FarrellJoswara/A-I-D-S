// app/plus.tsx
import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function PlusScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Add Records" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Add New Record</Text>
        <Text style={styles.text}>
          This page can be used to add new medical records to the wallet.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#ff0b75",
  },
  text: {
    fontSize: 16,
  },
});
