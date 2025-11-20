// app/General.tsx
import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function GeneralScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "General Info" }} />
      <View style={styles.container}>
        <Text style={styles.title}>General Information</Text>
        <Text style={styles.text}>
          This is the General page. You can put basic patient info here.
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
