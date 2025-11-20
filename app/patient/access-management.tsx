// app/plus.tsx
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Button,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Example types
type Doctor = {
  address: string;
  name: string; // from IPFS profile
};

export default function PlusScreen() {
  const [ipfsCID, setIpfsCID] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [doctorAddress, setDoctorAddress] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientRecords, setPatientRecords] = useState<any[]>([]); // replace with proper type

  // Fetch doctors list or patient records (mocked here)
  useEffect(() => {
    async function fetchDoctors() {
      // TODO: fetch from on-chain or off-chain index
      setDoctors([
        { address: "0xABC123...", name: "Dr. Alice" },
        { address: "0xDEF456...", name: "Dr. Bob" },
      ]);
    }

    async function fetchRecords() {
      // TODO: fetch records for this patient via contract
      setPatientRecords([]);
    }

    fetchDoctors();
    fetchRecords();
  }, []);

  // Add new medical record
  const handleAddRecord = async () => {
    // Call your contract's addRecord function
    console.log("Adding record", ipfsCID, fileHash);
  };

  // Grant access to a doctor
  const handleGrantAccess = async (doctorAddr: string) => {
    console.log("Granting access to", doctorAddr);
    // call grantAccess(recordId, doctorAddr)
  };

  // Revoke access from a doctor
  const handleRevokeAccess = async (doctorAddr: string) => {
    console.log("Revoking access from", doctorAddr);
    // call revokeAccess(recordId, doctorAddr)
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Manage Records" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Add New Record</Text>
        <TextInput
          style={styles.input}
          placeholder="IPFS CID"
          value={ipfsCID}
          onChangeText={setIpfsCID}
        />
        <TextInput
          style={styles.input}
          placeholder="File hash (SHA-256)"
          value={fileHash}
          onChangeText={setFileHash}
        />
        <Button title="Add Record" onPress={handleAddRecord} />

        <Text style={[styles.title, { marginTop: 30 }]}>Your Records</Text>
        <FlatList
          data={patientRecords}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <Text>Record ID: {item.id}</Text>
              <Text>IPFS CID: {item.ipfsCID}</Text>
              <Text>Granted Doctors:</Text>
              {item.grantedDoctors?.map((d: Doctor) => (
                <View key={d.address} style={styles.doctorRow}>
                  <Text>{d.name}</Text>
                  <TouchableOpacity onPress={() => handleRevokeAccess(d.address)}>
                    <Text style={styles.revoke}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={styles.input}
                placeholder="Doctor Address"
                value={doctorAddress}
                onChangeText={setDoctorAddress}
              />
              <Button title="Grant Access" onPress={() => handleGrantAccess(doctorAddress)} />
            </View>
          )}
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
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#ff0b75",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
  recordCard: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  doctorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  revoke: {
    color: "red",
    fontWeight: "600",
  },
});
