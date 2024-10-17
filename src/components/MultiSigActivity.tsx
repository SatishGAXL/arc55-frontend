import { MessageInstance } from "antd/es/message/interface";
import algosdk, { ABIType, Transaction } from "algosdk";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  algodClient,
  closeMessage,
  error,
  generateRandomString,
  indexerClient,
  openMessage,
} from "../utils";
import { MsigAppClient } from "./MsigAppClient";
import { ShowList } from "./ShowList";
import { Button, Card } from "antd";
import { TX_URL } from "../config";
import { WalletAccount, StorageAdapter } from "@txnlab/use-wallet-react";
import { LOCAL_STORAGE_MNEMONIC_KEY } from "@txnlab/use-wallet";

function combineUint64AndUint8(uint64: number, uint8: number) {
  const uint64buffer = algosdk.bigIntToBytes(uint64, 8);
  const uint8buffer = algosdk.bigIntToBytes(uint8, 1);
  const combinedbuffer = new Uint8Array(9);
  combinedbuffer.set(uint64buffer, 0);
  combinedbuffer.set(uint8buffer, 8);
  return combinedbuffer;
}

function combineAddressAndUint64(address: string, uint64: number) {
  const addressbuffer = algosdk.decodeAddress(address).publicKey;
  const uint64buffer = algosdk.bigIntToBytes(uint64, 8);
  const combinedbuffer = new Uint8Array(40);
  combinedbuffer.set(uint64buffer, 0);
  combinedbuffer.set(addressbuffer, 8);
  return combinedbuffer;
}

function validTill(currentRound: number, lastRound: number) {
  //each block is 2.8 secs calculate the time & return remaining time in human readable format or return expired if currentRound is greater than lastRound
  if (currentRound > lastRound) {
    return -Math.round((currentRound - lastRound) * 2.8);
  }
  return Math.round((lastRound - currentRound) * 2.8);
}

type TransactionDetails = {
  txnBytes: Uint8Array;
  txn: Transaction;
  signatures: {
    index: number;
    address: string;
    sign: Uint8Array | undefined;
  }[];
  validTillTime: number;
  isBroadCasted: boolean;
  group: number;
};

export const MultiSigActivity = ({
  messageApi,
  setCurrent,
  activeAccount,
  transactionSigner,
}: {
  messageApi: MessageInstance;
  setCurrent: React.Dispatch<React.SetStateAction<number>>;
  activeAccount: WalletAccount;
  transactionSigner: (
    txnGroup: Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>;
}) => {
  const { appid } = useParams();
  const [appAddress, setAppAddress] = useState<string>("");
  const [threshold, setThreshold] = useState(0);
  const [addresses, setAddresses] = useState<
    { index: number; address: string }[]
  >([]);
  const [admin, setAdmin] = useState<string>("");
  const [nonce, setNonce] = useState<number>(0);
  const [multiSig, setMultiSig] = useState<string>("");
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const navigate = useNavigate();
  const [txns, setTxns] = useState<TransactionDetails[]>([]);

  useEffect(() => {
    async function appdetails() {
      const appdetails = await indexerClient
        .searchForApplications()
        .index(Number(appid))
        .do();
      if (appdetails.applications.length !== 1) {
        error(messageApi, "MultiSignature not found");
        // redirect to home page
        return navigate("/");
      }
      const appClient = new MsigAppClient(
        {
          resolveBy: "id",
          id: Number(appid),
        },
        algodClient
      );
      const appReference = await appClient.appClient.getAppReference();
      setAppAddress(appReference.appAddress);
      const global = await appClient.getGlobalState();
      if (global.arc55_admin) {
        setAdmin(algosdk.encodeAddress(global.arc55_admin.asByteArray()));
      }
      if (global.arc55_nonce) {
        setNonce(global.arc55_nonce.asNumber());
      }
      if (global.arc55_threshold) {
        setThreshold(global.arc55_threshold.asNumber());
      }
      const rawGlobal = await appClient.appClient.getGlobalState();
      let addresses: { index: number; address: string }[] = [];
      //loop object
      Object.keys(rawGlobal).forEach((key) => {
        const val = rawGlobal[key];
        if (val.keyRaw.length === 8) {
          addresses.push({
            index: Number(algosdk.bytesToBigInt(val.keyRaw)),
            address:
              "valueRaw" in val ? algosdk.encodeAddress(val.valueRaw) : "",
          });
        }
      });
      setAddresses(addresses);
      if (global.arc55_threshold) {
        const orderedAddresses = addresses.sort((a, b) => a.index - b.index);
        const onlyAddresses = orderedAddresses.map((a) => a.address);
        console.log(onlyAddresses, "onlyAddresses");
        const multiSig = algosdk.multisigAddress({
          version: 1,
          threshold: Number(global.arc55_threshold.asNumber()),
          addrs: onlyAddresses,
        });
        setMultiSig(multiSig);
      }
      const txns: TransactionDetails[] = [];
      if (global.arc55_nonce) {
        const currentRound = Number(
          (await algodClient.status().do())["last-round"]
        );
        for (var i = 1; i <= global.arc55_nonce.asNumber(); i++) {
          const key = combineUint64AndUint8(i, 0);
          const txnBytes = await appClient.appClient.getBoxValue(key);
          const txn = algosdk.decodeUnsignedTransaction(txnBytes);
          const signatures: {
            index: number;
            address: string;
            sign: Uint8Array | undefined;
          }[] = [];
          for (let j = 0; j < addresses.length; j++) {
            const key = combineAddressAndUint64(addresses[j].address, i);
            try {
              const sign = (await appClient.appClient.getBoxValueFromABIType(
                key,
                ABIType.from("byte[64][]")
              )) as Uint8Array[];
              console.log(sign, "sign ccc");
              signatures.push({
                index: addresses[j].index,
                address: addresses[j].address,
                sign: sign[0],
              });
            } catch (e: any) {
              signatures.push({
                index: addresses[j].index,
                address: addresses[j].address,
                sign: undefined,
              });
            }
          }
          const validTillTime = validTill(currentRound, txn.lastRound);
          const isBroadCasted =
            (await indexerClient.searchForTransactions().txid(txn.txID()).do())
              .transactions.length === 1;
          txns.push({
            txnBytes,
            txn,
            signatures,
            validTillTime,
            isBroadCasted,
            group: i,
          });
        }
        setTxns(txns);
      }
      console.log(txns);

      setCurrent(1);
    }
    appdetails();
  }, []);

  const getNewGroupId = async () => {
    const appClient = new MsigAppClient(
      {
        resolveBy: "id",
        id: Number(appid),
      },
      algodClient
    );

    const global = await appClient.getGlobalState();
    if (global.arc55_nonce) {
      const nonce = global.arc55_nonce?.asNumber();
      return nonce + 1;
    } else {
      return 1;
    }
  };

  const createTransaction = async () => {
    const key = generateRandomString(10);
    openMessage(messageApi, key, `Creating a new transaction`);
    setIsCreatingTransaction(true);

    try {
      const appClient = new MsigAppClient(
        {
          resolveBy: "id",
          id: Number(appid),
        },
        algodClient
      );
      // based on index the address index should
      // be fetched from the addresses
      const orderedAddresses = addresses.sort((a, b) => a.index - b.index);
      const onlyAddresses = orderedAddresses.map((a) => a.address);
      const multiSig = algosdk.multisigAddress({
        version: 1,
        threshold: threshold,
        addrs: onlyAddresses,
      });
      console.log(multiSig, "multiSig", algosdk.decodeAddress(multiSig));
      const encoder = new TextEncoder();
      const zero_payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: multiSig,
        to: multiSig,
        amount: 0,
        suggestedParams: await algodClient.getTransactionParams().do(),
        note: encoder.encode("Testing ARC-55 works"),
      });
      const txnSize = zero_payment.toByte().length;
      const mbrCost = 2500 + 400 * (9 + txnSize);

      const newGroupId = await getNewGroupId();

      const add_txn_mbr = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAccount.address,
        to: appAddress,
        amount: mbrCost,
        suggestedParams: await algodClient.getTransactionParams().do(),
      });

      let boxes = Array.from({ length: 8 }, () => ({
        appIndex: 0,
        name: combineUint64AndUint8(newGroupId, 0),
      }));
      const final_txn = appClient
        .compose()
        .arc55NewTransactionGroup(
          {},
          {
            sender: {
              signer: transactionSigner,
              addr: activeAccount.address,
            },
          }
        )
        .arc55AddTransaction(
          {
            costs: add_txn_mbr,
            transactionGroup: newGroupId,
            index: 0,
            transaction: zero_payment.toByte(),
          },
          {
            sender: {
              signer: transactionSigner,
              addr: activeAccount.address,
            },
            boxes: boxes,
          }
        );
      console.log(zero_payment.toByte(), "zero_payment");
      const res = await final_txn.execute();
      console.log(`Txn Created: ${res.txIds[1]}\ngroup: ${newGroupId}`);
      closeMessage(messageApi, key, "success", "Transaction Created", () => {
        window.open(`${TX_URL}${res.txIds[1]}`, "_blank");
      });
    } catch (e: any) {
      console.log(e);
      closeMessage(messageApi, key, "error", e.message);
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const decoder = new TextDecoder();
  const [isSigning, setIsSigning] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const makeSign = async (txn: TransactionDetails) => {
    setIsSigning(true);
    const key = generateRandomString(10);
    openMessage(messageApi, key, `Signing Transaction...`);
    try {
      const wallet = StorageAdapter.getItem(LOCAL_STORAGE_MNEMONIC_KEY);
      if (wallet) {
        const account = algosdk.mnemonicToSecretKey(wallet);
        const sign = new Uint8Array(txn.txn.rawSignTxn(account.sk));
        console.log(sign, "sign");
        const sigSize = 2500 + 400 * (40 + 2 + sign.length);
        const set_sig_mbr = algosdk.makePaymentTxnWithSuggestedParamsFromObject(
          {
            from: activeAccount.address,
            to: appAddress,
            amount: sigSize,
            suggestedParams: await algodClient.getTransactionParams().do(),
          }
        );
        const boxes = Array.from({ length: 8 }, () => ({
          appIndex: 0,
          name: combineAddressAndUint64(account.addr, txn.group),
        }));
        const appClient = new MsigAppClient(
          {
            resolveBy: "id",
            id: Number(appid),
          },
          algodClient
        );
        const set_sig = await appClient.arc55SetSignatures(
          {
            costs: set_sig_mbr,
            transactionGroup: txn.group,
            signatures: [sign],
          },
          {
            sender: { addr: activeAccount.address, signer: transactionSigner },
            boxes: boxes,
          }
        );
        closeMessage(messageApi, key, "success", "Uploaded Signature", () => {
          window.open(`${TX_URL}${set_sig.transaction.txID()}`, "_blank");
        });
      } else {
        closeMessage(messageApi, key, "error", "No Wallet Found");
      }
    } catch (e: any) {
      console.log(e);
      closeMessage(messageApi, key, "error", e.message);
    } finally {
      setIsSigning(false);
    }
  };

  const broadcastTransaction = async (txn: TransactionDetails) => {
    setIsBroadcasting(true);
    const key = generateRandomString(10);
    openMessage(messageApi, key, `Broadcasting Transaction...`);
    try {
      const isTreasholdReached =
        txn.signatures.filter((sign) => sign.sign).length >= threshold;
      if (isTreasholdReached) {
        const orderedAddresses = addresses.sort((a, b) => a.index - b.index);
        const onlyAddresses = orderedAddresses.map((a) => a.address);
        let msigTxn = algosdk.createMultisigTransaction(txn.txn, {
          version: 1,
          threshold: threshold,
          addrs: onlyAddresses,
        });
        const orderedSignatures = txn.signatures.sort(
          (a, b) => a.index - b.index
        );
        orderedSignatures.forEach((sign) => {
          if (sign.sign) {
            const { txID, blob } = algosdk.appendSignRawMultisigSignature(
              msigTxn,
              { version: 1, threshold: threshold, addrs: onlyAddresses },
              sign.address,
              new Uint8Array(sign.sign!)
            );
            console.log(txID, "txID");
            msigTxn = blob;
          }
        });
        const broadcast = await algodClient.sendRawTransaction(msigTxn).do();
        console.log(broadcast, "broadcast");
        const res = await algosdk.waitForConfirmation(
          algodClient,
          txn.txn.txID(),
          3
        );
        console.log(res, "res");
        closeMessage(
          messageApi,
          key,
          "success",
          "Transaction Broadcasted",
          () => {
            window.open(`${TX_URL}${txn.txn.txID()}`, "_blank");
          }
        );
      } else {
        closeMessage(messageApi, key, "error", "Threshold not reached");
      }
    } catch (e: any) {
      console.log(e);
      closeMessage(messageApi, key, "error", e.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const renderTxnActivity = (txn: TransactionDetails) => {
    const myAddress = activeAccount.address;
    const isTreasholdReached =
      txn.signatures.filter((sign) => sign.sign).length >= threshold;
    const amISigner = txn.signatures.find((sign) => sign.address === myAddress);
    return (
      <>
        <div
          style={{
            display: "flex",
            flex: "row",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {!txn.isBroadCasted && <h3>Sign This Transaction: </h3>}
          {!txn.isBroadCasted ? (
            txn.validTillTime > 0 ? (
              amISigner ? (
                amISigner.sign ? (
                  <Button disabled>Signed</Button>
                ) : (
                  <Button onClick={(_) => makeSign(txn)} disabled={isSigning}>
                    {isSigning ? "Signing..." : "Sign Transaction"}
                  </Button>
                )
              ) : (
                <Button disabled>Cannot Sign as you are not signer</Button>
              )
            ) : (
              <Button disabled>Transaction Expired</Button>
            )
          ) : (
            <h3>
              Transaction Broadcasted{" "}
              <a target="__blank" href={`${TX_URL}${txn.txn.txID()}`}>
                {txn.txn.txID()}
              </a>
            </h3>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: "row",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {!txn.isBroadCasted && <h3>Broadcast This Transaction: </h3>}
          {!txn.isBroadCasted ? (
            isTreasholdReached ? (
              <Button
                disabled={isBroadcasting}
                onClick={(_) => broadcastTransaction(txn)}
              >
                {isBroadcasting ? "Broadcasting..." : "Broadcast Transaction"}
              </Button>
            ) : (
              <Button disabled>
                waiting for{" "}
                {threshold - txn.signatures.filter((sign) => sign.sign).length}{" "}
                more signatures
              </Button>
            )
          ) : (
            <></>
          )}
        </div>
      </>
    );
  };

  const [expandedCard, setExpandedCard] = useState(-1);

  useEffect(() => {
    setExpandedCard(txns.length - 1);
  }, [txns]);

  return activeAccount ? (
    <div className="section">
      <ShowList
        title="Multisig Details"
        listData={[
          { key: "App ID", value: appid },
          { key: "App Address", value: appAddress },
          { key: "Multisig Address", value: multiSig },
          { key: "Threshold", value: threshold },
          { key: "Admin", value: admin },
          { key: "No.of Txns Created", value: nonce },
          { key: "Addresses", value: addresses },
        ]}
      />
      <div className="center">
        <Button
          onClick={createTransaction}
          disabled={isCreatingTransaction ? true : false}
        >
          {isCreatingTransaction
            ? "Creating Transaction.."
            : "Create New Transaction"}
        </Button>{" "}
      </div>

      <div className="section" style={{ width: "100%" }}>
        <Card title="Transactions">
          {txns.length > 0
            ? txns.map((txn, index) => (
                <Card
                  type="inner"
                  title={`Txn ${index + 1}`}
                  extra={
                    <a
                      onClick={() =>
                        setExpandedCard(index === expandedCard ? -1 : index)
                      }
                    >
                      {index === expandedCard ? "View Less" : "View More"}
                    </a>
                  }
                >
                  <p style={{ fontSize: "14px" }}>
                    <b>Txn ID:</b> {txn.txn.txID()}
                  </p>
                  <p style={{ fontSize: "14px" }}>
                    <b>Valid Till:</b>{" "}
                    {txn.validTillTime > 0
                      ? `${txn.validTillTime} seconds remaining`
                      : `Expired ${txn.validTillTime} seconds ago`}
                  </p>
                  {expandedCard === index && (
                    <>
                      <ShowList
                        title="Transaction Details"
                        listData={[
                          { key: "Type", value: txn.txn.type },
                          { key: "Fee", value: txn.txn.fee },
                          { key: "Amount", value: txn.txn.amount },
                          {
                            key: "From",
                            value: algosdk.encodeAddress(
                              txn.txn.from.publicKey
                            ),
                          },
                          {
                            key: "To",
                            value: algosdk.encodeAddress(txn.txn.to.publicKey),
                          },
                          { key: "Note", value: decoder.decode(txn.txn.note) },
                        ]}
                      />
                      <br />
                      <ShowList
                        title="Signatures"
                        listData={txn.signatures.map((sign) => ({
                          key: sign.address,
                          value: sign.sign ? "Signed" : "Not Signed",
                        }))}
                      />
                      <br />
                      <div className="center">{renderTxnActivity(txn)}</div>
                    </>
                  )}
                </Card>
              ))
            : "No Transactions Found"}
        </Card>
      </div>
    </div>
  ) : null;
};
