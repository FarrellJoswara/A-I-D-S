// app/login.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wallet } from "xrpl";
import { useWallet } from "./context/WalletContext";

// Default seeds for testing
const DEFAULT_SEEDS = {
  patient: "sEdSkAhvagdUJQoZmQPdKckGJAf61ig",  // Patient wallet
  doctor: "sEdTKiG5qXVh3gvS1tdqxrDLUbzFJvz",   // Doctor wallet
};

export default function XRPLLogin() {
  const router = useRouter();
  const { wallet, setWallet, role } = useWallet();
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("");

  // Load default seed based on role
  useEffect(() => {
    if (role) {
      const defaultSeed = DEFAULT_SEEDS[role];
      setSeed(defaultSeed);
      
      // Auto-create wallet from default seed
      try {
        const wallet = Wallet.fromSeed(defaultSeed);
        setWallet(wallet);
        setCurrentAddress(wallet.classicAddress);
      } catch (e) {
        console.log("Failed to create default wallet");
      }
    }
  }, [role, setWallet]);

  // Load last used wallet from device
  useEffect(() => {
    async function loadLastWallet() {
      if (!role) return;
      
      try {
        const storageKey = `lastSeed_${role}`;
        const lastSeed = await AsyncStorage.getItem(storageKey);
        
        if (lastSeed) {
          setSeed(lastSeed);
          const wallet = Wallet.fromSeed(lastSeed);
          setWallet(wallet);
          setCurrentAddress(wallet.classicAddress);
        }
      } catch (err) {
        console.error("Failed to load last wallet:", err);
      }
    }
    loadLastWallet();
  }, [role, setWallet]);

  const isValidSeed = (s: string) => {
    try {
      Wallet.fromSeed(s);
      return true;
    } catch {
      return false;
    }
  };

  async function login() {
    if (!seed) {
      Alert.alert("Error", "Enter a wallet seed.");
      return;
    }

    if (!isValidSeed(seed)) {
      Alert.alert("Error", "Invalid XRPL seed.");
      return;
    }

    try {
      setLoading(true);
      const wallet = Wallet.fromSeed(seed);
      const storageKey = `lastSeed_${role}`;
      await AsyncStorage.setItem(storageKey, seed);
      
      setWallet(wallet);
      
      // Route based on role
      if (role === "patient") {
        router.push("/patient");
      } else {
        router.push("/doctor");
      }
    } finally {
      setLoading(false);
    }
  }

  async function createNewWallet() {
    try {
      setLoading(true);
      const res = await fetch("https://faucet.altnet.rippletest.net/accounts", { 
        method: "POST" 
      });
      const data = await res.json();

      if (!data?.account?.secret || !data?.account?.address) {
        throw new Error("Faucet did not return a valid wallet.");
      }

      const newSeed = data.account.secret;
      setSeed(newSeed);
      
      const storageKey = `lastSeed_${role}`;
      await AsyncStorage.setItem(storageKey, newSeed);

      const wallet = Wallet.fromSeed(newSeed);
      setWallet(wallet);
      setCurrentAddress(wallet.classicAddress);

      Alert.alert(
        "Wallet Created!",
        `Address: ${data.account.address}\nSeed: ${newSeed}\n\nSave this seed securely!`,
        [
          {
            text: "OK",
            onPress: () => {
              if (role === "patient") {
                router.push("/patient");
              } else {
                router.push("/doctor");
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create wallet. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (!role) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF5555" />
          <Text style={styles.errorText}>No role selected</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push("/")}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Ionicons 
            name={role === "patient" ? "person-circle" : "medical"} 
            size={48} 
            color={role === "patient" ? "#0b7cff" : "#7b5cff"} 
          />
          <Text style={styles.header}>
            {role === "patient" ? "Patient" : "Doctor"} Login
          </Text>
          <Text style={styles.subHeader}>XRPL Testnet</Text>
        </View>

        {currentAddress && (
          <View style={[
            styles.walletInfo,
            role === "doctor" && styles.walletInfoDoctor
          ]}>
            <Text style={styles.walletLabel}>Current Wallet:</Text>
            <Text style={styles.walletAddress}>
              {currentAddress.slice(0, 8)}...{currentAddress.slice(-6)}
            </Text>
            <Text style={styles.walletNote}>
              ✓ Wallet loaded and ready
            </Text>
          </View>
        )}

        <TextInput
          placeholder="Paste Wallet Seed or use default"
          value={seed}
          onChangeText={setSeed}
          style={styles.input}
          autoCapitalize="none"
          multiline
        />

        <TouchableOpacity
          style={[
            styles.button,
            role === "doctor" && styles.doctorButton
          ]}
          onPress={login}
          disabled={loading || !seed}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {currentAddress ? "Continue to App" : "Login"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.orText}>OR</Text>

        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={createNewWallet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create New Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.copyButton]}
          onPress={() => seed && Clipboard.setString(seed)}
          disabled={!seed}
        >
          <Ionicons name="copy-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Copy Seed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.push("/")}
        >
          <Ionicons name="arrow-back" size={16} color="#666" />
          <Text style={styles.backLinkText}>Change Role</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 12,
    color: "#1e3a5f",
  },
  subHeader: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  walletInfo: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  walletInfoDoctor: {
    backgroundColor: "#f3e5f5",
    borderColor: "#7b5cff",
  },
  walletLabel: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "600",
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1b5e20",
    marginBottom: 4,
  },
  walletNote: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d3dbe3",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "white",
    fontSize: 14,
  },
  button: {
    width: "100%",
    backgroundColor: "#0b7cff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  doctorButton: {
    backgroundColor: "#7b5cff",
  },
  createButton: {
    backgroundColor: "#4CAF50",
  },
  copyButton: {
    backgroundColor: "#2196F3",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  orText: {
    textAlign: "center",
    marginVertical: 8,
    fontSize: 14,
    color: "#666",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 6,
  },
  backLinkText: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
  },
});