import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { walletKit } from "./wallet";

export default function LoginScreen() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    // Listen for approval
    walletKit.on("session_proposal", async (proposal) => {
      const { id, params } = proposal;

      const namespaces = {
        eip155: {
          methods: ["eth_sendTransaction", "personal_sign"],
          chains: ["eip155:1"],
          events: ["accountsChanged", "chainChanged"],
          accounts: ["eip155:1:0x0000000000000000000000000000000000000000"],
        },
      };

      await walletKit.approveSession({
        id,
        namespaces,
      });

      const session = walletKit.session;

      if (session) {
        const acct = session.namespaces.eip155.accounts[0];
        const extracted = acct.split(":")[2];
        setAddress(extracted);
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      const uri = await walletKit.connect({
        requiredNamespaces: {
          eip155: {
            methods: ["eth_sendTransaction", "personal_sign"],
            chains: ["eip155:1"],
            events: ["accountsChanged", "chainChanged"],
          },
        },
      });

      if (uri) {
        // This opens MetaMask Mobile or other wallet
        walletKit.open(uri);
      }
    } catch (err) {
      console.log("Connect error:", err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Login</Text>

      {address ? (
        <Text style={styles.address}>Connected: {address}</Text>
      ) : (
        <Pressable style={styles.button} onPress={connectWallet}>
          <Text style={styles.buttonText}>Connect Wallet</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    padding: 12,
    backgroundColor: "#4e44ce",
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
  },
  address: {
    color: "#4ef066",
    fontSize: 18,
    marginTop: 20,
  },
});
