// app/context/WalletContext.tsx
import { createContext, ReactNode, useContext, useState } from "react";
import { Wallet } from "xrpl";

// 1️⃣ Create context
interface WalletContextType {
  wallet: Wallet | null;
  setWallet: (wallet: Wallet) => void;
  role: "patient" | "doctor" | null;
  setRole: (role: "patient" | "doctor") => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// 2️⃣ Provider component
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [role, setRole] = useState<"patient" | "doctor" | null>(null);

  return (
    <WalletContext.Provider value={{ wallet, setWallet, role, setRole }}>
      {children}
    </WalletContext.Provider>
  );
};

// 3️⃣ Hook for easy access
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
};