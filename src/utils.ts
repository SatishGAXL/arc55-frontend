import { MessageInstance } from "antd/es/message/interface";
import algosdk, { Transaction } from "algosdk";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import {
  ALGOD_PORT,
  ALGOD_TOKEN,
  ALGOD_URL,
  INDEXER_PORT,
  INDEXER_TOKEN,
  INDEXER_URL,
  MASTER_WALLET_MNEMONIC,
} from "./config";
/**
 * Displays a success message using Ant Design's message API.
 * @param {MessageInstance} messageApi - The message API instance from Ant Design.
 * @param {string} msg - The message to display.
 * @param {() => void} onclick - Optional callback function to execute when the message is clicked.
 */
export const success = (
  messageApi: MessageInstance,
  msg: string,
  onclick: () => void = () => {}
) => {
  messageApi.open({
    type: "success",
    content: msg,
    onClick: onclick,
  });
};

// Algorand zero address string
export const ALGORAND_ZERO_ADDRESS_STRING =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

/**
 * Transfers test tokens from the master wallet to a specified receiver.
 * @param {string} reciever - The Algorand address of the receiver.
 */
export const transferTestTokens = async (reciever: string) => {
  const account = algosdk.mnemonicToSecretKey(MASTER_WALLET_MNEMONIC);
  const suggestedParams = await algodClient.getTransactionParams().do();
  const xferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: reciever,
    suggestedParams,
    amount: 500000,
  });
  const signedXferTxn = xferTxn.signTxn(account.sk);
  await algodClient.sendRawTransaction(signedXferTxn).do();
  await algosdk.waitForConfirmation(algodClient, xferTxn.txID().toString(), 3);
};

/**
 * Displays an error message using Ant Design's message API.
 * @param {MessageInstance} messageApi - The message API instance from Ant Design.
 * @param {string} msg - The error message to display.
 */
export const error = (messageApi: MessageInstance, msg: string) => {
  messageApi.open({
    type: "error",
    content: msg,
  });
};

/**
 * Displays a warning message using Ant Design's message API.
 * @param {MessageInstance} messageApi - The message API instance from Ant Design.
 * @param {string} msg - The warning message to display.
 */
export const warning = (messageApi: MessageInstance, msg: string) => {
  messageApi.open({
    type: "warning",
    content: msg,
  });
};

/**
 * Opens a loading message using Ant Design's message API.
 * @param {MessageInstance} messageApi - The message API instance from Ant Design.
 * @param {string} key - The key for the message instance.
 * @param {string} msg - The loading message to display.
 */
export const openMessage = (
  messageApi: MessageInstance,
  key: string,
  msg: string
) => {
  messageApi.open({
    key,
    type: "loading",
    content: msg,
    duration: 0,
  });
};

/**
 * Closes a message and displays a success or error message using Ant Design's message API.
 * @param {MessageInstance} messageApi - The message API instance from Ant Design.
 * @param {string} key - The key for the message instance.
 * @param {"success" | "error"} type - The type of message to display ("success" or "error").
 * @param {string} msg - The message to display.
 * @param {() => void} onclick - Optional callback function to execute when the message is clicked.
 */
export const closeMessage = (
  messageApi: MessageInstance,
  key: string,
  type: "success" | "error",
  msg: string,
  onclick: () => void = () => {}
) => {
  //call hook in a function
  messageApi.open({
    key,
    type: type,
    content: msg,
    onClick: onclick,
    duration: 5,
  });
};

/**
 * Generates a random string of a specified length.
 * @param {number} length - The length of the random string to generate.
 * @returns {string} - The generated random string.
 */
export function generateRandomString(length: number) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset[randomIndex];
  }

  return randomString;
}

// Indexer client for querying the Algorand blockchain
export const indexerClient = new algosdk.Indexer(
  INDEXER_TOKEN,
  INDEXER_URL,
  INDEXER_PORT
);

// Algod client for interacting with the Algorand blockchain
export const algodClient = new algosdk.Algodv2(
  ALGOD_TOKEN,
  ALGOD_URL,
  ALGOD_PORT
);

/**
 * Returns a signing function for Defly Wallet.
 * @param {DeflyWalletConnect} deflyWallet - The Defly Wallet connector instance.
 * @param {string} accountAddress - The Algorand address of the account.
 * @returns {(txnGroup: Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>} - A function that signs a group of transactions using Defly Wallet.
 */
export const deflyWalletSigner = (
  deflyWallet: DeflyWalletConnect,
  accountAddress: string
) => {
  if (!deflyWallet.isConnected) {
    throw new Error("Pera Wallet not connected");
  }
  return async (txnGroup: Transaction[], indexesToSign: number[]) => {
    return await deflyWallet.signTransaction([
      txnGroup.map((txn: Transaction, index: number) => {
        if (indexesToSign.includes(index)) {
          return {
            txn,
            signers: [accountAddress],
          };
        }

        return {
          txn,
          signers: [],
        };
      }),
    ]);
  };
};
