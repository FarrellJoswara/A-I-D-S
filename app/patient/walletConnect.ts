import SignClient from "@walletconnect/sign-client";

let client: SignClient | null = null;

export async function initWalletConnect() {
  if (client) return client;

  client = await SignClient.init({
    projectId: "YOUR_PROJECT_ID", // get from cloud.walletconnect.com
    relayUrl: "wss://relay.walletconnect.com",
    metadata: {
      name: "My RN App",
      description: "WalletConnect RN Example",
      url: "https://example.com",
      icons: ["https://walletconnect.com/_next/static/media/logo_mark.84dd852d.svg"]
    }
  });

  return client;
}

export async function connectWallet() {
  const client = await initWalletConnect();

  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      eip155: {
        methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
        chains: ["eip155:1"],
        events: ["accountsChanged", "chainChanged"]
      }
    }
  });

  return { uri, approval };
}
