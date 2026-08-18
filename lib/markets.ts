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

import { MARKET_ADDRESS, AMM_ADDRESS } from "./contracts";

export interface MarketCardData {
  id: string;
  address: string;
  ammAddress?: string;
  title: string;
  icon: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  category: string;
  isReal?: boolean;
  outcome?: "YES" | "NO" | "Undetermined" | null;
}

export interface DynamicMarket {
  id: string;
  address: string;
  ammAddress: string;
  title: string;
  category: string;
  createdAt: string;
}

export function dynamicToCardData(m: DynamicMarket): MarketCardData {
  return {
    id: m.id,
    address: m.address,
    ammAddress: m.ammAddress,
    title: m.title,
    icon: "🔮",
    yesPrice: 0.5,
    noPrice: 0.5,
    volume: "$0 USDC",
    category: m.category,
    isReal: true,
  };
}

// Note: For real markets (isReal: true), yesPrice/noPrice/volume are fallback
// values only. The MarketCard component fetches live on-chain data when available.

// The real deployed contract market + Arc Mainnet live markets + active market grid
export const MARKETS: MarketCardData[] = [
  // ── Arc Mainnet Live Prediction Markets ─────────────────────────────
  {
    id: "arc-mainnet-q4",
    address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    title: "Arc Mainnet launches before Q4 2026?",
    icon: "⚡",
    yesPrice: 0.68,
    noPrice: 0.32,
    volume: "$142.5K",
    category: "Arc Network",
    isReal: true,
  },
  {
    id: "arc-mainnet-tvl",
    address: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
    title: "Arc Mainnet TVL reaches $100M within 30 days of launch?",
    icon: "🌐",
    yesPrice: 0.54,
    noPrice: 0.46,
    volume: "$98.5K",
    category: "Arc Network",
    isReal: true,
  },
  {
    id: "circle-usdc-arc-mainnet",
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    title: "Circle USDC native bridge volume > 50M USDC on Arc Mainnet in 2026?",
    icon: "🔵",
    yesPrice: 0.79,
    noPrice: 0.21,
    volume: "$215.0K",
    category: "Arc Network",
    isReal: true,
  },

  // ── On-Chain Deployed Testnet Market ────────────────────────────────
  {
    id: "btc-100k",
    address: MARKET_ADDRESS,
    ammAddress: AMM_ADDRESS,
    title: "Bitcoin above $100,000 by end of 2026?",
    icon: "₿",
    yesPrice: 0.74,
    noPrice: 0.26,
    volume: "$48.2K",
    category: "Crypto",
    isReal: true,
  },

  // ── Featured Live Interactive Markets ──────────────────────────────
  {
    id: "fed-rate-cut",
    address: "0x0000000000000000000000000000000000000003",
    title: "Fed cuts interest rates before July 2026?",
    icon: "$",
    yesPrice: 0.71,
    noPrice: 0.29,
    volume: "$89.1K",
    category: "Economy",
    isReal: true,
  },
  {
    id: "sp500-6000",
    address: "0x0000000000000000000000000000000000000004",
    title: "S&P 500 above 6,000 by end of 2026?",
    icon: "📈",
    yesPrice: 0.55,
    noPrice: 0.45,
    volume: "$72.4K",
    category: "Equities",
    isReal: true,
  },
  {
    id: "us-recession",
    address: "0x0000000000000000000000000000000000000005",
    title: "US enters recession in 2026?",
    icon: "📉",
    yesPrice: 0.32,
    noPrice: 0.68,
    volume: "$104K",
    category: "Economy",
    isReal: true,
  },
  {
    id: "btc-etf-100b",
    address: "0x0000000000000000000000000000000000000007",
    title: "Bitcoin spot ETFs exceed $100B AUM in 2026?",
    icon: "₿",
    yesPrice: 0.74,
    noPrice: 0.26,
    volume: "$56.9K",
    category: "Crypto",
    isReal: true,
  },
  {
    id: "china-taiwan-sanctions",
    address: "0x0000000000000000000000000000000000000009",
    title: "New US sanctions on China before 2027?",
    icon: "🇺🇸",
    yesPrice: 0.67,
    noPrice: 0.33,
    volume: "$61.2K",
    category: "Geopolitics",
    isReal: true,
  },
  {
    id: "eth-10k",
    address: "0x0000000000000000000000000000000000000001",
    title: "Ethereum above $10,000 by December 2026?",
    icon: "Ξ",
    yesPrice: 0.24,
    noPrice: 0.76,
    volume: "$31.5K",
    category: "Crypto",
    isReal: true,
  },
  {
    id: "sol-500",
    address: "0x0000000000000000000000000000000000000002",
    title: "Solana above $500 by end of 2026?",
    icon: "◎",
    yesPrice: 0.18,
    noPrice: 0.82,
    volume: "$12.8K",
    category: "Crypto",
    isReal: true,
  },
  {
    id: "gold-3000",
    address: "0x0000000000000000000000000000000000000006",
    title: "Gold above $3,000/oz by end of 2026?",
    icon: "🥇",
    yesPrice: 0.48,
    noPrice: 0.52,
    volume: "$18.7K",
    category: "Commodities",
    isReal: true,
  },
];
