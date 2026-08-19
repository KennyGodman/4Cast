/**
 * Copyright 2026 Circle Internet Group, Inc.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { type Address, type Hex, encodeFunctionData } from "viem";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
} from "wagmi";
import {
  toWebAuthnCredential,
  toCircleSmartAccount,
  WebAuthnMode,
} from "@circle-fin/modular-wallets-core";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { createBundlerClient } from "viem/account-abstraction";
import {
  getPasskeyTransport,
  getModularTransport,
  getCirclePublicClient,
  isCircleConfigured,
  estimateUserOpFees,
} from "@/lib/circle";
import { arcTestnet } from "@/lib/wagmi";

const STORAGE_KEY = "circle-wallet-credential";

interface StoredCredential {
  credentialId: string;
}

export type WalletType = "metamask" | "circle" | null;

interface CircleBundlerClient {
  sendUserOperation: (args: {
    calls: { to: Hex; data: Hex; value?: bigint }[];
    paymaster: true;
  }) => Promise<Hex>;
  waitForUserOperationReceipt: (args: { hash: Hex }) => Promise<{ receipt: { transactionHash: Hex } }>;
}

interface WalletContextValue {
  address: Address | undefined;
  isConnected: boolean;
  walletType: WalletType;
  bundlerClient: CircleBundlerClient | null;
  connectMetaMask: () => void;
  connectCircle: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  circleError: string | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  // Wagmi (MetaMask) state
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { connectAsync: wagmiConnectAsync, isPending: wagmiPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Circle state
  const [circleAddress, setCircleAddress] = useState<Address | undefined>();
  const [bundlerClient, setBundlerClient] = useState<CircleBundlerClient | null>(null);
  const [circleConnecting, setCircleConnecting] = useState(false);
  const [circleError, setCircleError] = useState<string | null>(null);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);
  const restoringRef = useRef(false);

  // Determine active wallet
  const walletType: WalletType = isManuallyDisconnected
    ? null
    : wagmiConnected
      ? "metamask"
      : circleAddress
        ? "circle"
        : null;

  const address = walletType === "metamask" ? wagmiAddress : walletType === "circle" ? circleAddress : undefined;
  const isConnected = walletType !== null && !!address;

  const initCircleAccount = useCallback(
    async (credential: Awaited<ReturnType<typeof toWebAuthnCredential>>) => {
      const owner = toWebAuthnAccount({ credential });

      const smartAccount = await toCircleSmartAccount({
        client: getCirclePublicClient(),
        owner,
      });

      const client = createBundlerClient({
        account: smartAccount,
        chain: arcTestnet,
        transport: getModularTransport(),
        paymaster: true,
        userOperation: {
          estimateFeesPerGas: estimateUserOpFees,
        },
      });

      setCircleAddress(smartAccount.address);
      setBundlerClient(client as unknown as CircleBundlerClient);
    },
    [],
  );

  const connectCircle = useCallback(async () => {
    setIsManuallyDisconnected(false);
    setCircleConnecting(true);
    setCircleError(null);
    try {
      if (!isCircleConfigured()) {
        throw new Error(
          "Circle wallet is not configured. Set NEXT_PUBLIC_CIRCLE_CLIENT_KEY and NEXT_PUBLIC_CIRCLE_CLIENT_URL in .env.local.",
        );
      }
      // Disconnect MetaMask if connected
      if (wagmiConnected) {
        try {
          wagmiDisconnect();
        } catch {}
      }

      let credential: Awaited<ReturnType<typeof toWebAuthnCredential>>;

      const hasStoredCredential = typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY);

      if (hasStoredCredential) {
        try {
          credential = await toWebAuthnCredential({
            transport: getPasskeyTransport(),
            mode: WebAuthnMode.Login,
          });
        } catch (loginErr) {
          console.warn("Passkey login failed, falling back to passkey registration:", loginErr);
          const username = `user_${crypto.randomUUID().slice(0, 8)}`;
          credential = await toWebAuthnCredential({
            transport: getPasskeyTransport(),
            mode: WebAuthnMode.Register,
            username,
          });
        }
      } else {
        const username = `user_${crypto.randomUUID().slice(0, 8)}`;
        credential = await toWebAuthnCredential({
          transport: getPasskeyTransport(),
          mode: WebAuthnMode.Register,
          username,
        });
      }

      await initCircleAccount(credential);

      const stored: StoredCredential = { credentialId: credential.id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
      console.error("Circle wallet connection failed:", err);
      const rawMsg = err instanceof Error ? err.message : "Failed to connect passkey wallet";
      if (rawMsg.includes("Invalid credentials")) {
        setCircleError(
          "Circle API rejected the request (Invalid Credentials). Please ensure '4cast-ebon.vercel.app' is saved under Modular Wallets → Configurator → Passkey in your Circle Console.",
        );
      } else {
        setCircleError(rawMsg);
      }
    } finally {
      setCircleConnecting(false);
    }
  }, [wagmiConnected, wagmiDisconnect, initCircleAccount]);

  const connectMetaMask = useCallback(async () => {
    setIsManuallyDisconnected(false);
    // Clear Circle state if active
    if (circleAddress) {
      setCircleAddress(undefined);
      setBundlerClient(null);
      localStorage.removeItem(STORAGE_KEY);
    }

    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) {
      console.error("No injected EVM wallet found (window.ethereum is undefined)");
      setCircleError("No EVM wallet found. Please install MetaMask or another EVM wallet extension.");
      return;
    }

    try {
      // Directly request accounts — this triggers the wallet popup
      await eth.request({ method: "eth_requestAccounts" });

      // Ensure wallet is switched to Arc Testnet (Chain ID 5042002 -> 0x4cef52)
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x4cef52" }],
        });
      } catch (switchError: any) {
        // If chain is not yet added in wallet, add Arc Testnet
        if (
          switchError.code === 4902 ||
          switchError.message?.includes("Unrecognized chain") ||
          switchError.message?.includes("not found")
        ) {
          try {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x4cef52",
                  chainName: "Arc Testnet",
                  nativeCurrency: {
                    name: "USDC",
                    symbol: "USDC",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc.testnet.arc.network"],
                  blockExplorerUrls: ["https://testnet.arcscan.app"],
                },
              ],
            });
          } catch (addError) {
            console.warn("Failed to add Arc Testnet to wallet:", addError);
          }
        }
      }
    } catch (err) {
      console.error("EVM wallet connection rejected:", err);
      return;
    }

    // Also connect through wagmi so its state stays in sync
    const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (injectedConnector) {
      try {
        await wagmiConnectAsync({ connector: injectedConnector });
      } catch (err) {
        console.warn("Wagmi connectAsync warning:", err);
      }
    }
  }, [circleAddress, wagmiConnectAsync, connectors]);

  const disconnect = useCallback(() => {
    setIsManuallyDisconnected(true);
    setCircleAddress(undefined);
    setBundlerClient(null);
    setCircleError(null);

    try {
      if (typeof wagmiDisconnect === "function") {
        wagmiDisconnect();
      }
      if (connectors && Array.isArray(connectors)) {
        connectors.forEach((c) => {
          try {
            wagmiDisconnect({ connector: c });
          } catch {}
        });
      }
    } catch (err) {
      console.warn("Wagmi disconnect error:", err);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        // Clear wagmi cache in localStorage so it doesn't auto-reconnect on refresh
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("wagmi") || key.includes("recentConnector") || key.includes("wc@")) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith("wagmi") || key.includes("recentConnector")) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Error clearing localStorage:", e);
      }
    }
  }, [wagmiDisconnect, connectors]);

  // Restore Circle session from localStorage on mount
  useEffect(() => {
    if (isManuallyDisconnected) return;
    if (restoringRef.current) return;
    if (!isCircleConfigured()) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || wagmiConnected) return;

    restoringRef.current = true;
    const stored: StoredCredential = JSON.parse(raw);

    (async () => {
      try {
        setCircleConnecting(true);
        const credential = await toWebAuthnCredential({
          transport: getPasskeyTransport(),
          mode: WebAuthnMode.Login,
          credentialId: stored.credentialId,
        });
        await initCircleAccount(credential);
      } catch (err) {
        console.error("Failed to restore Circle session:", err);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setCircleConnecting(false);
        restoringRef.current = false;
      }
    })();
  }, [wagmiConnected, initCircleAccount, isManuallyDisconnected]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        walletType,
        bundlerClient,
        connectMetaMask,
        connectCircle,
        disconnect,
        isConnecting: wagmiPending || circleConnecting,
        circleError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Helper: encode a contract call as a UserOperation call object
export function encodeContractCall(params: {
  address: Address;
  abi: readonly Record<string, unknown>[];
  functionName: string;
  args?: readonly unknown[];
}): { to: Hex; data: Hex; value?: bigint } {
  return {
    to: params.address as Hex,
    data: encodeFunctionData({
      abi: params.abi,
      functionName: params.functionName,
      args: params.args as unknown[],
    }),
  };
}
