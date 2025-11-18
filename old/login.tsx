// WalletLoginScreen.tsx
import { Web3Provider } from "@ethersproject/providers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

export default function WalletLoginScreen() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      // 1. Initialize WalletConnect provider
      const provider = new WalletConnectProvider({
        qrcode: true, // opens MetaMask QR scanner
      });

      // 2. Enable the provider (prompts user to connect MetaMask)
      await provider.enable();

      // 3. Wrap provider with ethers.js Web3Provider
      const web3Provider = new Web3Provider(provider);

      // 4. Get signer and wallet address
      const signer = web3Provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      Alert.alert("Wallet Connected", address);
    } catch (err: any) {
      Alert.alert("Connection Error", err.message);
    }
  };

  const disconnectWallet = async () => {
    setWalletAddress(null);
    Alert.alert("Disconnected", "Wallet connection cleared.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with MetaMask</Text>

      {walletAddress ? (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>Connected Address:</Text>
          <Text style={styles.walletAddress}>{walletAddress}</Text>
          <Pressable style={styles.disconnectButton} onPress={disconnectWallet}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.connectButton} onPress={connectWallet}>
          <Text style={styles.connectText}>Connect MetaMask</Text>
        </Pressable>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#333",
  },
  connectButton: {
    backgroundColor: "#FF9900",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  connectText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  connectedContainer: {
    alignItems: "center",
  },
  connectedText: {
    fontSize: 18,
    marginBottom: 10,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#555",
  },
  disconnectButton: {
    backgroundColor: "#FF5555",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  disconnectText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
