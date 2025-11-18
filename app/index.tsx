// app/login.tsx
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [address, setAddress] = useState("");

  // Deep link to MetaMask mobile
  const openMetaMask = async () => {
    const metamaskDeepLink = "metamask://"; // opens MetaMask app
    const supported = await Linking.canOpenURL(metamaskDeepLink);

    if (supported) {
      Linking.openURL(metamaskDeepLink);
      Alert.alert(
        "MetaMask",
        "Please copy your wallet address and paste it below."
      );
    } else {
      Alert.alert(
        "MetaMask not installed",
        "Please install MetaMask on your device first."
      );
    }
  };

  const handleLogin = () => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      Alert.alert("Invalid Address", "Please enter a valid Ethereum address.");
      return;
    }
    Alert.alert("Logged In", `Welcome!\nYour address: ${address}`);
    // Here you could save the address to your app state or navigate
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with MetaMask</Text>

      <Pressable style={styles.button} onPress={openMetaMask}>
        <Text style={styles.buttonText}>Open MetaMask</Text>
      </Pressable>

      <Text style={styles.or}>or paste your address below:</Text>

      <TextInput
        style={styles.input}
        placeholder="0x..."
        value={address}
        onChangeText={setAddress}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#f6851b",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  or: {
    marginVertical: 20,
    fontSize: 16,
    color: "#555",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: "#4caf50",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
