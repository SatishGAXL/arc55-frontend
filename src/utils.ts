import { MessageInstance } from "antd/es/message/interface";
import algosdk, { Transaction } from "algosdk";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
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

export const ALGORAND_ZERO_ADDRESS_STRING =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

export const transferTestTokens = async (reciever: string) => {
  const mastet_private =
    "step fury fatigue brick recall more level ignore explain figure diary van opinion antique grief when wild hockey breeze enforce cherry buffalo now ability upset";
  const account = algosdk.mnemonicToSecretKey(mastet_private);
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

export const error = (messageApi: MessageInstance, msg: string) => {
  messageApi.open({
    type: "error",
    content: msg,
  });
};

export const warning = (messageApi: MessageInstance, msg: string) => {
  messageApi.open({
    type: "warning",
    content: msg,
  });
};

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

export const indexerClient = new algosdk.Indexer(
  "a".repeat(64),
  "https://testnet-idx.4160.nodely.dev",
  443
);

export const algodClient = new algosdk.Algodv2(
  "a".repeat(64),
  "https://testnet-api.4160.nodely.dev",
  443
);

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
