import { MessageInstance } from "antd/es/message/interface";
import algosdk, { Transaction } from "algosdk";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, FormInstance, Input, Space } from "antd";
import { MsigAppClient } from "./MsigAppClient";
import { SubmitButton } from "./SubmitButton";
import {
  algodClient,
  closeMessage,
  error,
  generateRandomString,
  openMessage,
  transferTestTokens,
} from "../utils";
import { ALGORAND_ZERO_ADDRESS_STRING } from "../utils";
import { TX_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { WalletAccount } from "@txnlab/use-wallet-react";

/**
 * Component for creating a MultiSig account.
 *
 * @param {Object} props - The component props.
 * @param {MessageInstance} props.messageApi - Ant Design's message API for displaying messages.
 * @param {WalletAccount} props.activeAccount - The currently active wallet account.
 * @param {function} props.transactionSigner - Function to sign transactions.
 */
export const CreateMultiSig = ({
  messageApi,
  activeAccount,
  transactionSigner,
}: {
  messageApi: MessageInstance;
  activeAccount: WalletAccount;
  transactionSigner: (
    txnGroup: Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>;
}) => {
  // Form instance for managing the form state
  const [form] = Form.useForm();
  // Hook to navigate between routes
  const navigate = useNavigate();

  // Layout configuration for form items
  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 4 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 20 },
    },
  };

  // Layout configuration for form items without labels
  const formItemLayoutWithOutLabel = {
    wrapperCol: {
      xs: { span: 24, offset: 0 },
      sm: { span: 20, offset: 4 },
    },
  };

  /**
   * Handles the form submission.
   *
   * @param {FormInstance} form - The form instance.
   */
  const onClick = async (form: FormInstance) => {
    // Get all form values
    const values = await form.getFieldsValue();

    // Validate that at least 2 addresses are provided
    if (values.addresses.length < 2) {
      error(
        messageApi,
        "At least 2 addresses required to create a multisig account"
      );
      return;
    }

    // Validate that the number of required signatures does not exceed the number of addresses
    if (values.signaturesRequired > values.addresses.length) {
      error(
        messageApi,
        "Signatures required cannot exceed number of addresses"
      );
      return;
    }

    // Validate that at least 1 signature is required
    if (values.signaturesRequired < 1) {
      error(
        messageApi,
        "At least 1 signature required to create a multisig account"
      );
      return;
    }

    // Generate a random key for the message
    const key = generateRandomString(10);
    openMessage(messageApi, key, "Deploying a new Multisig Contract...");

    try {
      // Generate the multisig address
      const msig_addr = algosdk.multisigAddress({
        version: 1,
        threshold: Number(values.signaturesRequired),
        addrs: values.addresses,
      });
      console.log("msig_addr", msig_addr);

      // Initialize the Multisig App Client
      const appClient = new MsigAppClient(
        {
          resolveBy: "id",
          id: 0,
        },
        algodClient
      );

      // Deploy the contract
      const deployment = await appClient.create.deploy(
        {
          admin: ALGORAND_ZERO_ADDRESS_STRING,
        },
        {
          sender: {
            signer: transactionSigner,
            addr: activeAccount.address,
          },
        }
      );
      const app_id = deployment.appId;

      // Set up the Multisig contract
      openMessage(messageApi, key, "Setting up Multisig Contract...");
      const setup = await appClient.arc55Setup(
        {
          threshold: Number(values.signaturesRequired),
          addresses: values.addresses,
        },
        {
          sender: {
            addr: activeAccount.address,
            signer: transactionSigner,
          },
        }
      );
      console.log(deployment.appId);

      // Transfer test tokens to the contract and multisig addresses
      await transferTestTokens(deployment.appAddress);
      await transferTestTokens(msig_addr);

      // Display a success message and navigate to the multisig details page
      closeMessage(
        messageApi,
        key,
        "success",
        "Multisig Contract Deployed",
        () => {
          window.open(`${TX_URL}${setup.transaction.txID()}`, "_blank");
        }
      );
      navigate(`/multisig/${app_id}`);
    } catch (e: any) {
      // Display an error message if something goes wrong
      closeMessage(messageApi, key, "error", e.message);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Form
        name="dynamic_form_item"
        form={form}
        {...formItemLayoutWithOutLabel}
        style={{ minWidth: "600px" }}
        initialValues={{ addresses: [""], signaturesRequired: 1 }}
      >
        <Form.List
          name="addresses"
          rules={[
            {
              validator: async (_, names) => {
                if (!names || names.length < 2) {
                  return Promise.reject(new Error("At least 2 addresses"));
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Form.Item
                  {...(index === 0
                    ? formItemLayout
                    : formItemLayoutWithOutLabel)}
                  label={index === 0 ? "Addresses" : ""}
                  required={false}
                  key={field.key}
                >
                  <Form.Item
                    {...field}
                    validateTrigger={["onChange", "onBlur"]}
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
                    ]}
                    noStyle
                  >
                    <Input
                      placeholder="2JAZQO6Z5BCXFMPVW2CACK2........"
                      style={{ width: "60%" }}
                    />
                  </Form.Item>
                  {fields.length > 1 ? (
                    <MinusCircleOutlined
                      className="dynamic-delete-button"
                      onClick={() => remove(field.name)}
                    />
                  ) : null}
                </Form.Item>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  style={{ width: "60%" }}
                  icon={<PlusOutlined />}
                >
                  Add Another Address
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item
          label="No of Signatures Required"
          name="signaturesRequired"
          rules={[
            {
              validator: async (_, value) => {
                if (value < 1) {
                  return Promise.reject(
                    new Error(
                      "Atleast 1 signature required to create a multisig account"
                    )
                  );
                }
                return Promise.resolve();
              },
            },
            {
              validator: async (_, value) => {
                const addresses = form.getFieldValue("addresses");
                if (value > addresses.length) {
                  return Promise.reject(
                    new Error(
                      "Signatures required cannot exceed number of addresses"
                    )
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            type="number"
            placeholder="Number of signatures required"
            style={{ width: "60%" }}
          />
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
