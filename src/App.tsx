import "./App.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { CreateMultiSig } from "./components/CreateMultiSig";
import { MultiSigActivity } from "./components/MultiSigActivity";
import { useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  DownOutlined,
  CheckCircleTwoTone,
  DisconnectOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Dropdown, Space, Steps, Button, message } from "antd";
import { error } from "./utils";

function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [current, setCurrent] = useState(0);
  const { wallets, activeWallet, activeAccount, transactionSigner } =
    useWallet();

  const wlist = wallets.map((wallet) => ({
    label: wallet.isConnected ? (
      <>
        <Space style={{ color: "#52c41a" }}>
          {wallet.metadata.name}
          {`[${wallet.activeAccount?.address.slice(
            0,
            3
          )}...${wallet.activeAccount?.address.slice(-3)}]`}
          <CheckCircleTwoTone twoToneColor="#52c41a" />
          <Button
            onClick={async () => {
              const r = wallet.disconnect();
              console.log(r);
            }}
            type="dashed"
            danger={true}
            icon={<DisconnectOutlined />}
          />
        </Space>
      </>
    ) : (
      wallet.metadata.name
    ),
    key: wallet.id,
    onClick: async () => {
      if (wallet.isConnected) {
        wallet.setActive();
      } else {
        try {
          const account = await wallet.connect();
          console.log(account);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          error(messageApi, e.message);
          console.log(e);
        }
      }
    },
  }));
  const items: MenuProps["items"] = [
    ...wlist,
    {
      type: "divider",
    },
    {
      label:
        activeWallet && activeWallet.activeAccount ? (
          <>
            <Space>
              <b>
                {`Active wallet: `}
                <span style={{ color: "#52c41a" }}>
                  {activeWallet.metadata.name}
                </span>
              </b>
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            </Space>
          </>
        ) : (
          <>No Wallet Connected</>
        ),
      disabled: activeWallet ? false : true,
      key: "999",
    },
    activeAccount && {
      label: (
        <>
          <Space
            onClick={async (_) => {
              await navigator.clipboard.writeText(activeAccount.address);
              messageApi.success("Address to clipboard");
            }}
          >
            <b>
              {`Active account: `}
              <span style={{ color: "#52c41a" }}>
                {activeAccount.address.slice(0, 3)}...
                {activeAccount.address.slice(-3)}
              </span>
            </b>
          </Space>
        </>
      ),
      key: "999",
    },
  ];

  return (
    <>
      <Router>
        <div className="navbar">
          <Dropdown menu={{ items }}>
            <Button>
              <Space>
                {activeAccount
                  ? `Connected as ${activeAccount.address.slice(
                      0,
                      3
                    )}...${activeAccount.address.slice(-3)}`
                  : "Connect Wallet"}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </div>
        <div className="mainWrapper">
          <Steps
            current={current}
            items={[
              {
                title: "MultiSig Account",
                description: "Create a New MultiSig Account & Contract",
              },
              {
                title: "Transaction",
                description: "Create a New Transaction & Sign",
              },
            ]}
          />

          {activeAccount ? (
            <main>
              <Routes>
                <Route
                  path="/"
                  element={
                    <CreateMultiSig
                      messageApi={messageApi}
                      activeAccount={activeAccount}
                      transactionSigner={transactionSigner}
                    />
                  }
                />
                <Route
                  path="/multisig/:appid"
                  element={
                    <MultiSigActivity
                      messageApi={messageApi}
                      transactionSigner={transactionSigner}
                      activeAccount={activeAccount}
                      setCurrent={setCurrent}
                    />
                  }
                />
              </Routes>
            </main>
          ) : (
            <div className="center">Please Connect Wallet First</div>
          )}
          {contextHolder}
        </div>
      </Router>
    </>
  );
}

export default App;
