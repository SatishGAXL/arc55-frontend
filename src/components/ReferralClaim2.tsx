import { useState, useEffect } from "react";
import "../assets/TokenTransfer.css";
import algosdk, { Transaction } from "algosdk";
import type { FormInstance } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { Form, Input, Button, Space, Spin } from "antd";
import { BACKEND_URL, POMA_TOKEN_ID, TX_URL } from "../config";
import {
  generateRandomString,
  openMessage,
  closeMessage,
  indexerClient,
  algodClient,
} from "../utils";
import { WalletAccount } from "@txnlab/use-wallet-react";

export const ReferralClaim2 = ({
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

  const [form] = Form.useForm();
  const [showOptin, setShowOptin] = useState(false);
  const values = Form.useWatch([], form);
  const [reward, setReward] = useState<number>(0);

  useEffect(() => {
    if (values) {
      if (Object.keys(values).includes("quantity")) {
        console.log(values.quantity);
        if (values.quantity !== undefined) {
          setReward(values.quantity * 0.1);
          return;
        }
      }
    }
    setReward(0);
  }, [values, form]);

  useEffect(() => {
    if (activeAccount) {
      form.setFieldsValue({ receiver: activeAccount.address });
      form.validateFields(["receiver"]);
    }
  }, [activeAccount, form]);

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

  const onClick = async (form: FormInstance) => {
    const key = generateRandomString(10);
    openMessage(messageApi, key, "Processing...");
    const values = form.getFieldsValue();
    const result = await fetch(BACKEND_URL + "/token-transfer-3", {
      method: "POST",
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await result.json();
    if (result.status === 200) {
      closeMessage(messageApi, key, "success", data.message, () => {
        window.open(`${TX_URL}${data.txId}`, "_blank");
      });
    } else {
      closeMessage(messageApi, key, "error", data.message);
    }
  };

  return (
    <div className="formContainer">
      <Form
        form={form}
        name="trigger"
        style={{ minWidth: 460 }}
        layout="vertical"
        autoComplete="off"
      >
        {/* <Alert message="Use 'max' rule, continue type chars to see it" /> */}

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
              message: `Address Doesn't Optin to POMA Token (${POMA_TOKEN_ID})`,
              required: true,
              validator: async (_, value) => {
                const res = await indexerClient.lookupAccountAssets(value).do();
                console.log(res);
                const assets = res.assets;
                refreshOptinStatus(assets, POMA_TOKEN_ID);
                for (let i = 0; i < assets.length; i++) {
                  const asset = assets[i];
                  if (Number(asset["asset-id"]) === POMA_TOKEN_ID) {
                    return;
                  }
                }
                throw new Error("Address Doesn't Optin to POMA Token");
              },
            },
          ]}
        >
          <Input placeholder="2JAZQO6Z5BCXFMPVW2CACK2........" />
        </Form.Item>

        {showOptin ? (
          <Form.Item style={{ paddingTop: "20px" }}>
            <Button onClick={() => initialOptin(POMA_TOKEN_ID)}>
              Optin to POMA Token
            </Button>
          </Form.Item>
        ) : null}

        <Form.Item
          hasFeedback
          label="Number of On-Chain Transactions"
          name="quantity"
          extra={`Reward: ${reward} POMA`}
          validateDebounce={400}
          required
          rules={[
            {
              type: "method",
              required: true,
              message: "Invalid Number of On-Chain Transactions",
              validator: async (_, value) => {
                if (value <= 0 || value === undefined) {
                  throw new Error("Invalid Referral Count");
                }
              },
            },
          ]}
        >
          <Input type="number" placeholder="42" />
        </Form.Item>

        <Form.Item style={{ paddingTop: "22px" }}>
          <Space>
            <SubmitButton form={form} onClick={onClick}>
              Submit
            </SubmitButton>
            <Button danger htmlType="reset">
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
