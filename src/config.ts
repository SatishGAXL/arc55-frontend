import { NetworkId } from "@txnlab/use-wallet-react";

// URL for transaction exploration
export const TX_URL = "https://lora.algokit.io/testnet/transaction/";

// Check if environment variables are missing
if (
  !import.meta.env.VITE_ALGOD_PORT ||
  !import.meta.env.VITE_ALGOD_URL ||
  !import.meta.env.VITE_ALGOD_TOKEN ||
  !import.meta.env.VITE_MASTER_WALLET_MNEMONIC ||
  !import.meta.env.VITE_INDEXER_TOKEN ||
  !import.meta.env.VITE_INDEXER_URL ||
  !import.meta.env.VITE_INDEXER_PORT ||
  !import.meta.env.VITE_NETWORK
) {
  // Throw an error if any of the required environment variables are missing
  throw new Error(
    "Missing environment variables. Please make sure to create a .env file in the root directory of the project and add the following variables: VITE_ALGOD_PORT, VITE_ALGOD_URL, VITE_ALGOD_TOKEN, VITE_MASTER_WALLET_MNEMONIC, VITE_INDEXER_TOKEN, VITE_INDEXER_URL, VITE_INDEXER_PORT, VITE_NETWORK"
  );
}

// Export the environment variables
export const ALGOD_PORT = Number(import.meta.env.VITE_ALGOD_PORT);
export const ALGOD_URL = import.meta.env.VITE_ALGOD_URL;
export const ALGOD_TOKEN = import.meta.env.VITE_ALGOD_TOKEN;
export const MASTER_WALLET_MNEMONIC = import.meta.env
  .VITE_MASTER_WALLET_MNEMONIC;
export const INDEXER_TOKEN = import.meta.env.VITE_INDEXER_TOKEN;
export const INDEXER_URL = import.meta.env.VITE_INDEXER_URL;
export const INDEXER_PORT = Number(import.meta.env.VITE_INDEXER_PORT);

// Validate the network ID
if (
  ![NetworkId.MAINNET, NetworkId.TESTNET, NetworkId.LOCALNET].includes(
    import.meta.env.VITE_NETWORK as NetworkId
  )
) {
  throw new Error(
    "Invalid network ID. Please make sure to set the VITE_NETWORK environment variable to either 'mainnet', 'testnet' or 'localnet'."
  );
}

// Export the network ID
export const NETWORK = import.meta.env.VITE_NETWORK as NetworkId;
