import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";

const walletManager = new WalletManager({
  wallets: [
    WalletId.DEFLY,
    WalletId.PERA,
    WalletId.EXODUS,
    {
      id: WalletId.WALLETCONNECT,
      options: { projectId: "2acd95086e53e4a7cc9c4880b68190dc" },
    },
    {
      id: WalletId.LUTE,
      options: { siteName: "POMA MVP" },
    },
    { id: WalletId.MNEMONIC, options: { persistToStorage: true } },
  ],
  network: NetworkId.TESTNET,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </StrictMode>
);
