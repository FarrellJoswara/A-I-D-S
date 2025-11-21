import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function DoctorMainPage() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Doctor",
        }}
      />

      <View style={styles.container}>
        <Text style={styles.appTitle}>Doctor Dashboard</Text>

        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.welcomeSub}>
            Choose an action to manage your patients.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {/* VIEW PATIENTS */}
          <Link href="/doctor/patients" asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.iconBubble}>
                  <Ionicons name="people" size={24} color="#0b7cff" />
                </View>
                <Text style={styles.cardText}>View Patients</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#555" />
            </Pressable>
          </Link>

          {/* REQUEST ACCESS */}
          <Link href="/doctor/request-access" asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.iconBubble}>
                  <Ionicons name="lock-closed-outline" size={24} color="#ff0b75" />
                </View>
                <Text style={styles.cardText}>Request Access</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#555" />
            </Pressable>
          </Link>
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0b1b3b",
  },
  welcomeBanner: {
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0b1b3b",
  },
  welcomeSub: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 4,
  },
  cardsContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
});
