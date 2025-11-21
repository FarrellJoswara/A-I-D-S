// app/_layout.tsx
import { Stack } from "expo-router";
import { WalletProvider } from "./context/WalletContext";

export default function RootLayout() {
  return (
    <WalletProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </WalletProvider>
  );
}