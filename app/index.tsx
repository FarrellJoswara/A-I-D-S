import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function WalletLoginScreen() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Navigate after login
  const navigateAfterLogin = () => {
    router.push("/person-selection");
  };

  // Development bypass login
  const bypassLogin = () => {
    Alert.alert("Development Mode", "Bypassing authentication for testing", [
      { text: "Continue", onPress: navigateAfterLogin },
    ]);
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      const dappUrl = "https://your-app.com"; // Replace with your domain
      const metamaskDeepLink = `https://metamask.app.link/dapp/${dappUrl}`;
      const canOpen = await Linking.canOpenURL(metamaskDeepLink);

      if (canOpen) {
        await Linking.openURL(metamaskDeepLink);

        // Mock wallet connection
        setTimeout(() => {
          const mockAddress = "0x" + Math.random().toString(16).substring(2, 42);
          setWalletAddress(mockAddress);
          Alert.alert("Wallet Connected", `Address: ${mockAddress}`);
          setIsConnecting(false);
          navigateAfterLogin();
        }, 2000);
      } else {
        Alert.alert("MetaMask Not Found", "Install MetaMask?", [
          { text: "Cancel", style: "cancel", onPress: () => setIsConnecting(false) },
          {
            text: "Install",
            onPress: () => {
              const appStoreUrl =
                Platform.OS === "ios"
                  ? "https://apps.apple.com/app/metamask/id1438144202"
                  : "https://play.google.com/store/apps/details?id=io.metamask";
              Linking.openURL(appStoreUrl);
              setIsConnecting(false);
            },
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Connection Error", err.message || "Failed to connect wallet");
      setIsConnecting(false);
    }
  };

  const connectWithWalletConnect = async () => {
    try {
      setIsConnecting(true);
      const wcUri = "wc:00e46b69-d0cc-4b3e-b6a2-cee442f97188@2";
      const metamaskWCUrl = `https://metamask.app.link/wc?uri=${encodeURIComponent(wcUri)}`;
      const canOpen = await Linking.canOpenURL(metamaskWCUrl);

      if (canOpen) {
        await Linking.openURL(metamaskWCUrl);
        setTimeout(() => {
          const mockAddress = "0x" + Math.random().toString(16).substring(2, 42);
          setWalletAddress(mockAddress);
          Alert.alert("Connected via WalletConnect", `Address: ${mockAddress}`);
          setIsConnecting(false);
          navigateAfterLogin();
        }, 2000);
      } else {
        Alert.alert("No Wallet Found", "Please install MetaMask or another wallet", [
          { text: "OK", onPress: () => setIsConnecting(false) },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Connection Error", err.message || "Failed to connect");
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    Alert.alert("Disconnect Wallet", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => setWalletAddress(null),
      },
    ]);
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wallet" size={64} color="#FF9900" />
        <Text style={styles.title}>Connect Your Wallet</Text>
        <Text style={styles.subtitle}>
          Connect with MetaMask to access your account
        </Text>
      </View>

      {walletAddress ? (
        <View style={styles.connectedContainer}>
          <View style={styles.addressCard}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.connectedText}>Connected</Text>
            <View style={styles.addressBadge}>
              <Text style={styles.walletAddress}>{shortenAddress(walletAddress)}</Text>
            </View>
            <Text style={styles.fullAddress}>{walletAddress}</Text>
          </View>

          <Pressable style={styles.disconnectButton} onPress={disconnectWallet}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.connectButton, isConnecting && styles.disabledButton]}
            onPress={connectWallet}
            disabled={isConnecting}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="logo-web-component" size={24} color="#fff" />
              <Text style={styles.connectText}>
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.connectButton,
              styles.walletConnectButton,
              isConnecting && styles.disabledButton,
            ]}
            onPress={connectWithWalletConnect}
            disabled={isConnecting}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="scan" size={24} color="#fff" />
              <Text style={styles.connectText}>
                {isConnecting ? "Connecting..." : "WalletConnect"}
              </Text>
            </View>
          </Pressable>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoText}>
              Your wallet will open to approve the connection
            </Text>
          </View>

          {/* Development Bypass Button */}
          {__DEV__ && (
            <Pressable style={styles.devButton} onPress={bypassLogin}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="bug" size={20} color="#fff" />
                <Text style={styles.devButtonText}>DEV: Skip Login</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  connectButton: {
    backgroundColor: "#FF9900",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletConnectButton: {
    backgroundColor: "#3B99FC",
  },
  connectText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  connectedContainer: {
    alignItems: "center",
    width: "100%",
  },
  addressCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 16,
    color: "#4CAF50",
  },
  addressBadge: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  fullAddress: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  disconnectButton: {
    backgroundColor: "#FF5555",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  disconnectText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  devButton: {
    backgroundColor: "#FF5555",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  devButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
