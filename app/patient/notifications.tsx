// app/patient/notifications.tsx
import { Stack } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function NotificationsPage() {
  // placeholder list — you’ll swap this with your real data later
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
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#fff",
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
