/**
 * GenLayer Studio Next Integration & Transaction Kit Configuration
 * Supports Consensus v0.6 and Studio v0.123 release family.
 */

import { createTransactionKit } from "@genlayer/transaction-kit";
import { chains, createClient } from "genlayer-js";
import feeProfile from "../fee-profile.json";

export const STUDIO_NEXT_CHAIN_ID = 61997;
export const STUDIO_NEXT_RPC_URL =
  (typeof process !== "undefined" && process.env?.VITE_GENLAYER_RPC_URL) ||
  "https://studio-next.genlayer.com/api";
export const STUDIO_NEXT_EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";

// Deployed Intelligent Contract on Studio Next
export const GENLAYER_PREDICTION_MARKET_ADDRESS =
  (typeof process !== "undefined" && process.env?.VITE_GENLAYER_CONTRACT_ADDRESS) ||
  "0x30bAF43D32b86005f7c2E2247E2F395e6b2aEC6f"; // Live deployed contract on Studio Next

/**
 * Studio Next chain definition based on studioDevnet with custom RPC & Explorer
 */
export const studioNextChain = {
  ...chains.studioDevnet,
  id: STUDIO_NEXT_CHAIN_ID,
  name: "GenLayer Studio Next",
  rpcUrls: {
    default: {
      http: [STUDIO_NEXT_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: STUDIO_NEXT_EXPLORER_URL,
    },
  },
};

/**
 * Initializes GenLayer v2 client for reading contract views and RPC interactions
 */
export function getGenLayerClient() {
  return createClient({
    chain: studioNextChain,
  });
}

/**
 * Creates an instance of Transaction Kit configured with Studio Next,
 * the user's EIP-1193 provider, and the developer fee profile suggestions.
 */
export function getGenLayerTransactionKit(account: string, provider: any = (window as any).ethereum) {
  if (!provider) {
    throw new Error("No EIP-1193 wallet provider found (window.ethereum is undefined)");
  }

  return createTransactionKit({
    chain: studioNextChain as any,
    provider,
    account: account as any,
    suggestions: feeProfile as any,
  });
}

/**
 * Prompt user's wallet to add/switch to GenLayer Studio Next (Chain 61997)
 */
export async function switchToStudioNext(): Promise<boolean> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return false;

  const hexChainId = "0x" + STUDIO_NEXT_CHAIN_ID.toString(16);

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
    return true;
  } catch (switchError: any) {
    // Error 4902 indicates chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: "GenLayer Studio Next",
              nativeCurrency: {
                name: "GEN Token",
                symbol: "GEN",
                decimals: 18,
              },
              rpcUrls: [STUDIO_NEXT_RPC_URL],
              blockExplorerUrls: [STUDIO_NEXT_EXPLORER_URL],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add GenLayer Studio Next network:", addError);
        return false;
      }
    }
    console.error("Failed to switch to GenLayer Studio Next:", switchError);
    return false;
  }
}
