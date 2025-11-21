// app/patient/notifications.tsx
import { Stack } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsPage() {
  const insets = useSafeAreaInsets();

  // placeholder list — swap with your real data later
  const notifications = [
    {
      id: "1",
      title: "Access Request",
      message: "Dr. Smith is requesting access to your MRI results.",
      time: "2h ago",
    },
    {
      id: "2",
      title: "Record Uploaded",
      message: "Your blood test results were uploaded to your wallet.",
      time: "1d ago",
    },
    {
      id: "3",
      title: "Access Approved",
      message: "You approved access for KU Medical Center.",
      time: "3d ago",
    },
  ];

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
      <Stack.Screen options={{ title: "Notifications" }} />

      <View style={styles.container}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No notifications yet</Text>
          }
        />
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
    paddingTop: 12, // leave room before the first card
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  empty: {
    marginTop: 40,
    textAlign: "center",
    color: "#777",
    fontSize: 14,
  },
});
