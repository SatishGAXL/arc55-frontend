import { useState, useEffect } from "react";
import "../assets/TokenTransfer.css";
import { Steps } from "antd";
import type { FormInstance } from "antd";
import { Button, Form, Spin, Input, Space, Alert } from "antd";
// import algosdk from "algosdk";
import {
  generateRandomString,
  openMessage,
  closeMessage,
  indexerClient,
  algodClient,
} from "../utils";
import { MessageInstance } from "antd/es/message/interface";
import { ASSET_URL, BACKEND_URL, TX_URL } from "../config";
import algosdk, { Transaction } from "algosdk";
import { WalletAccount } from "@txnlab/use-wallet-react";
// import * as algokit from "@algorandfoundation/algokit-utils";

export const NFTClaim = ({
  messageApi,
  activeAccount,
  transactionSigner,
}: {
  messageApi: MessageInstance;
  activeAccount: WalletAccount | null;
  transactionSigner: (
    txnGroup: Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>;
}) => {
  const [current, setCurrent] = useState(0);

  const [assetId, setAssetId] = useState<number>(0);

  const [isClaimed, setIsClaimed] = useState(false);
  const [claimedBy, setClaimedBy] = useState<string>("");
  const [txId, setTxId] = useState<string>("");

  const [form] = Form.useForm();
  const [showOptin, setShowOptin] = useState(false);

  useEffect(() => {
    if (activeAccount) {
      form.setFieldsValue({ receiver: activeAccount.address });
      form.validateFields(["receiver"]);
    }
  }, [activeAccount, form, assetId]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshOptinStatus = (assets: any, tokenId: number) => {
    if (activeAccount) {
      const receiver = form.getFieldValue("receiver");
      if (
        algosdk.isValidAddress(receiver) &&
        receiver === activeAccount.address
      ) {
        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i];
          if (Number(asset["asset-id"]) === tokenId) {
            setShowOptin(false);
            return;
          }
        }
        setShowOptin(true);
        return;
      }
    }
    setShowOptin(false);
  };

  const initialOptin = async (tokenId: number) => {
    const key = generateRandomString(10);
    openMessage(messageApi, key, "Building Transaction...");
    if (activeAccount) {
      try {
        const atc = new algosdk.AtomicTransactionComposer();
        const suggestedParams = await algodClient.getTransactionParams().do();

        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: activeAccount.address,
          amount: 0,
          assetIndex: tokenId,
          suggestedParams,
        });
        openMessage(messageApi, key, "Waiting For Signature...");

        atc.addTransaction({ txn, signer: transactionSigner });

        await atc.gatherSignatures();

        openMessage(
          messageApi,
          key,
          "Signature Received, Sending Transaction..."
        );

        await atc.execute(algodClient, 4);

        form.validateFields(["receiver"]);

        closeMessage(
          messageApi,
          key,
          "success",
          "Optin Transaction Sent",
          () => {
            window.open(`${TX_URL}${txn.txID()}`, "_blank");
          }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        closeMessage(messageApi, key, "error", e.message);
      }
    } else {
      closeMessage(messageApi, key, "error", "No Active Account Found");
    }
  };

  interface SubmitButtonProps {
    form: FormInstance;
    onClick: (form: FormInstance) => Promise<void>;
  }

  const SubmitButton: React.FC<React.PropsWithChildren<SubmitButtonProps>> = ({
    form,
    onClick,
    children,
  }) => {
    const [submittable, setSubmittable] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Watch all values
    const values = Form.useWatch([], form);

    useEffect(() => {
      form
        .validateFields({ validateOnly: true })
        .then(() => setSubmittable(true))
        .catch(() => setSubmittable(false));
    }, [form, values]);

    const onClickInternal = async () => {
      setIsSubmitting(true);
      await onClick(form);
      setIsSubmitting(false);
    };

    return (
      <Button
        type="primary"
        htmlType="submit"
        onClick={onClickInternal}
        disabled={!submittable || isSubmitting}
      >
        <Spin size="small" spinning={isSubmitting}>
          {children}
        </Spin>
      </Button>
    );
  };

  const mintNFT = async (form: FormInstance) => {
    console.log(form.getFieldsValue());
    const key = generateRandomString(10);
    openMessage(messageApi, key, "Minting NFT...");
    const result = await fetch(BACKEND_URL + "/mint-nft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await result.json();
    if (result.status === 200) {
      closeMessage(messageApi, key, "success", data.message, () => {
        window.open(`${ASSET_URL}${data.assetId}`, "_blank");
      });
      setAssetId(data.assetId);
      setCurrent(1);
    } else {
      closeMessage(messageApi, key, "error", data.message);
    }
  };

  const claimNFT = async (form: FormInstance) => {
    const key = generateRandomString(10);
    openMessage(messageApi, key, "Claiming NFT...");
    const values = form.getFieldsValue();
    const result = await fetch(BACKEND_URL + "/claim-nft", {
      method: "POST",
      body: JSON.stringify({ ...values, assetId }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await result.json();
    if (result.status === 200) {
      closeMessage(messageApi, key, "success", data.message, () => {
        window.open(`${TX_URL}${data.txId}`, "_blank");
      });
      setIsClaimed(true);
      setClaimedBy(values.receiver);
      setTxId(data.txId);
    } else {
      closeMessage(messageApi, key, "error", data.message);
    }
  };

  return (
    <div className="formContainer">
      <Steps
        style={{ width: "60%" }}
        current={current}
        items={[
          {
            title: "Mint NFT",
            description: "Creates a New NFT",
          },
          {
            title: "Claim NFT",
            description: "Claim the NFT to Wallet",
          },
        ]}
      />

      {current === 0 && (
        <>
          <SubmitButton form={form} onClick={() => mintNFT(form)}>
            Mint NFT
          </SubmitButton>
        </>
      )}

      {current === 1 && assetId && (
        <>
          <Form
            form={form}
            name="trigger"
            style={{ minWidth: 460 }}
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              layout="horizontal"
              style={{ marginBottom: "0px" }}
              label="Asset ID"
            >
              <b>{assetId}</b>
            </Form.Item>
            <Form.Item>
              <span>Please Optin to the above Asset ID</span>
            </Form.Item>

            <Form.Item
              hasFeedback
              label="Receiver Address"
              name="receiver"
              validateDebounce={400}
              required
              rules={[
                {
                  type: "method",
                  message: "Invalid Address",
                  required: true,
                  validator: async (_, value) => {
                    if (!algosdk.isValidAddress(value)) {
                      throw new Error("Invalid Address");
                    }
                  },
                },
                {
                  type: "method",
                  message: `Address Doesn't Optin to NFT (${assetId})`,
                  required: true,
                  validator: async (_, value) => {
                    const res = await indexerClient
                      .lookupAccountAssets(value)
                      .do();
                    console.log(res);
                    const assets = res.assets;
                    refreshOptinStatus(assets, assetId);
                    for (let i = 0; i < assets.length; i++) {
                      const asset = assets[i];
                      if (Number(asset["asset-id"]) === assetId) {
                        return;
                      }
                    }
                    throw new Error("Address Doesn't Optin to Token");
                  },
                },
              ]}
            >
              <Input placeholder="2JAZQO6Z5BCXFMPVW2CACK2........" />
            </Form.Item>
            {showOptin ? (
              <Form.Item style={{ paddingTop: "20px" }}>
                <Button onClick={() => initialOptin(assetId)}>
                  Optin to NFT ({assetId})
                </Button>
              </Form.Item>
            ) : null}
            {!isClaimed ? (
              <Form.Item style={{ paddingTop: "22px" }}>
                <Space>
                  <SubmitButton form={form} onClick={claimNFT}>
                    Submit
                  </SubmitButton>
                  <Button danger htmlType="reset">
                    Reset
                  </Button>
                </Space>
              </Form.Item>
            ) : (
              <Form.Item>
                <Space>
                  <Alert
                    type="success"
                    message={
                      <>
                        NFT Claimed by <b>{claimedBy}</b>
                        <br></br>
                        <a href={TX_URL + txId} target="_blank">
                          Click Here
                        </a>{" "}
                        for Transaction.
                      </>
                    }
                  />
                </Space>
              </Form.Item>
            )}
          </Form>
        </>
      )}
    </div>
  );
};
