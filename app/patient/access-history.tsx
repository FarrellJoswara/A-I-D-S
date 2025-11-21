// app/access-history.tsx
import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function AccessHistoryScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Access History" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Access History</Text>
        <Text style={styles.text}>
          This is where you can show who accessed the records and when.
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
