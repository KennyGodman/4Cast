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
  resolved?: boolean;
  settlementOutcome?: "YES" | "NO" | "Undetermined";
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

/**
 * Calculates dynamic display volume for a market, combining the base volume
 * with any user bets recorded locally or on-chain so volume never remains stuck at 0.00 USDC.
 */
export function getMarketVolume(market: MarketCardData, userBets?: Array<{ marketId: string; amount: number; currency?: string }>): string {
  // Calculate any additional volume from bets placed on this market
  let userVolume = 0;
  if (userBets && Array.isArray(userBets)) {
    userVolume = userBets
      .filter((b) => b.marketId === market.id)
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }

  const rawVol = market.volume || "$0 USDC";
  
  // Parse base volume numerical value
  let baseVal = 0;
  const cleaned = rawVol.replace(/[$,]/g, "").trim();
  if (cleaned.toUpperCase().includes("K")) {
    baseVal = parseFloat(cleaned) * 1000;
  } else if (cleaned.toUpperCase().includes("M")) {
    baseVal = parseFloat(cleaned) * 1000000;
  } else {
    baseVal = parseFloat(cleaned) || 0;
  }

  const total = baseVal + userVolume;

  if (total <= 0) {
    return "$0.00 USDC";
  } else if (total >= 1_000_000) {
    return `$${(total / 1_000_000).toFixed(2)}M USDC`;
  } else if (total >= 1_000) {
    return `$${(total / 1_000).toFixed(1)}K USDC`;
  } else {
    return `$${total.toFixed(2)} USDC`;
  }
}

// Full prediction market directory with Arc Network, Crypto, Sports, Economy, Equities, Commodities, Geopolitics
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

  // ── Sports Prediction Markets (Official Use Case) ───────────────────
  {
    id: "sports-worldcup-2026",
    address: "0x0000000000000000000000000000000000000010",
    title: "FIFA World Cup 2026 Host Nations qualify for knockout stages?",
    icon: "⚽",
    yesPrice: 0.85,
    noPrice: 0.15,
    volume: "$310.4K",
    category: "Sports",
    isReal: true,
    resolved: true,
    outcome: "YES",
    settlementOutcome: "YES",
  },
  {
    id: "sports-ucl-2026",
    address: "0x0000000000000000000000000000000000000011",
    title: "A Premier League club wins the 2026 UEFA Champions League?",
    icon: "🏆",
    yesPrice: 0.58,
    noPrice: 0.42,
    volume: "$184.2K",
    category: "Sports",
    isReal: true,
  },
  {
    id: "sports-nba-2026",
    address: "0x0000000000000000000000000000000000000012",
    title: "Boston Celtics repeat as NBA Champions in 2026?",
    icon: "🏀",
    yesPrice: 0.44,
    noPrice: 0.56,
    volume: "$126.8K",
    category: "Sports",
    isReal: true,
  },
  {
    id: "sports-superbowl-2026",
    address: "0x0000000000000000000000000000000000000013",
    title: "Kansas City Chiefs appear in Super Bowl LXI in 2026?",
    icon: "🏈",
    yesPrice: 0.62,
    noPrice: 0.38,
    volume: "$210.5K",
    category: "Sports",
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
