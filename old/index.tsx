import * as Linking from "expo-linking";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { connectWallet } from "../app/patient/walletConnect";

export default function ConnectScreen() {
  const [wcUri, setWcUri] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  async function onPressConnect() {
    const { uri, approval } = await connectWallet();

    setWcUri(uri);

    // open MetaMask mobile automatically
    const metamask = `metamask://wc?uri=${encodeURIComponent(uri)}`;
    Linking.openURL(metamask);

    const sessionData = await approval();
    setSession(sessionData);
  }

  return (
    <View style={{ flex: 1, padding: 30, justifyContent: "center" }}>
      {session ? (
        <>
          <Text style={{ fontSize: 20 }}>Connected!</Text>
          <Text>{JSON.stringify(session.namespaces.eip155.accounts)}</Text>
        </>
      ) : (
        <>
          <TouchableOpacity
            onPress={onPressConnect}
            style={{
              backgroundColor: "black",
              padding: 15,
              borderRadius: 10,
              marginBottom: 20
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Connect Wallet
            </Text>
          </TouchableOpacity>

          {wcUri && (
            <>
              <Text style={{ marginBottom: 10 }}>Scan with MetaMask</Text>
              <QRCode value={wcUri} size={220} />
            </>
          )}
        </>
      )}
    </View>
  );
}
