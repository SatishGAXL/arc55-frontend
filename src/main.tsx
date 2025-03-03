import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import {
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";
import { NETWORK } from "./config.ts";

// Initialize WalletManager with configurations
const walletManager = new WalletManager({
  wallets: [
    // Enable Mnemonic wallet with persistence
    { id: WalletId.MNEMONIC, options: { persistToStorage: true } },
  ],
  // Set the network to TestNet
  network: NETWORK,
});

// Render the application wrapped with WalletProvider
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Provide the wallet manager to the application */}
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </StrictMode>
);
