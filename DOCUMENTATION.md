# 🔮 4Cast on Arc Network — Product & Technical Documentation

> **Predict opinions that matter to you. Trade with confidence.**  
> *Live Deployment: [https://4cast-ebon.vercel.app](https://4cast-ebon.vercel.app)*

---

## 🌟 1. Executive Summary

**4Cast** is a next-generation, decentralized prediction market and opinion trading platform built on **Arc Network Testnet**. 4Cast enables users to predict tomorrow's outcomes and trade position shares (`YES` / `NO`) on real-world events spanning Cryptocurrency, Macroeconomics, Geopolitics, Equities, and Arc Ecosystem milestones.

By combining **Circle Passkey Web3 Wallets**, **Arc Network's sub-second finality**, **Optimistic Oracle V2 resolution**, and a **sleek Deep Royal Violet design system**, 4Cast removes Web3 friction to deliver a web2-like prediction experience.

---

## 🚀 2. Key Product Features

### 🛡️ 1. Seamless Passkey Onboarding (Circle Modular Wallet)
- **Zero-Friction Authentication**: Users can log in using TouchID, FaceID, or device Passkeys via the **Circle Modular SDK**.
- **No Seed Phrases or Extension Required**: Users create a secure smart contract wallet instantly without downloading browser extensions or managing private key phrases.
- **EVM Wallet Support**: Fully compatible with traditional Web3 wallets including MetaMask, Rabby, Coinbase Wallet, and Brave.

### ⚡ 2. High-Performance Arc Network Trading
- **Sub-Second Finality**: Orders, positions, and claims settle in under 1 second.
- **Native USDC Collateral**: All market pools, bets, and payouts are collateralized in native USDC.
- **Zero Gas Friction**: Gas-sponsored transactions provide smooth trading.

### ⚖️ 3. Trustless Optimistic Oracle V2 Resolution
- **On-Chain Settlement**: Market outcomes are adjudicated trustlessly via the Optimistic Oracle V2 architecture.
- **Propose & Dispute Console**: Anyone can propose an outcome (YES/NO) with an on-chain bond, triggering a liveness challenge window before automated smart contract settlement.
- **Transparent Solidity Code Viewer**: Users can inspect the exact deployed smart contract code for every market directly inside the app.

### 🗣️🔥 4. Marquee Social Feature: Live Market Comments & 𝕏 (Twitter) Integration
- **Direct 𝕏 (Twitter) Commenting & Intent**: Users can express opinions and immediately broadcast their market calls straight to **𝕏 (Twitter)** with 1-click **"Post to 𝕏"** buttons. Pre-filled tweets include the exact market title, their active position (`YES`/`NO`), and custom viral hashtags (`#4Cast #ArcNetwork #PredictionMarkets`).
- **Persistent Discussion Sidebar**: A dedicated social feed is embedded right next to the prediction market grid on desktop and stacked seamlessly on mobile screens.
- **Position Sentiment Badges**: Every comment is tagged with the user's stance (`🟢 YES`, `🔴 NO`, `⚪ Neutral`), creating an instant crowd-sentiment pulse on every prediction.
- **Subscribe to Top Predictors**: Follow top traders' rationale, upvote commentary, and get real-time market activity alerts.

### 🏆 5. Complete Trader Suite
- **Market Directory**: Filter by 6 categories (*Arc Network, Crypto, Economy, Equities, Commodities, Geopolitics*) and sort by Volume, Pool Size, or Closing Date.
- **Permissionless Market Creation**: Users can deploy custom binary prediction markets with tailored liveness and collateral rewards.
- **My Bets Dashboard**: Monitor active positions, claim payouts on resolved markets, and review verified transactions on ArcScan.
- **Leaderboard**: Rank top predictors by total profit, win rate %, and badge tier (*Legendary 🥇, Elite 🥈, Pro 🥉, Rising ⭐️*).

---

## 🎨 3. Design System & User Interface

4Cast implements a **Deep Royal Violet** design language:

| Design Element | Token / Color Code | Purpose |
| :--- | :--- | :--- |
| **Primary Accent** | `#2e1052` (`--teal`) | Action buttons, active navigation, search borders |
| **Light Tint Accent** | `#f3eafc` (`--teal-light`) | YES/NO button base, active tab fills, badge backdrops |
| **Dark Mode Base** | `#0e0b16` (`--bg-0`) | Deep midnight background in dark mode |
| **Dark Mode Accent** | `#a855f7` (`--teal`) | Electric violet highlights in dark mode |
| **Card Surfaces** | `#ffffff` / `#181324` | Crisp white cards with soft violet border accents |
| **Action Buttons** | `#f3eafc` ➔ `#2e1052` | Soft light purple default state, turning dark royal violet on hover |

---

## 🛠️ 4. Technical Architecture & Tech Stack

### Frontend & Application Layer
- **Framework**: Next.js / Vite + React 18 + TypeScript
- **Styling**: Modern Vanilla CSS tokens (`src/4cast.css`), Framer Motion micro-animations, Lucide React icons
- **State & Web3 Management**: Viem + Wagmi v2 + TanStack React Query

### Web3 & Infrastructure
- **Network**: Arc Network Testnet (Chain ID: `5042002`)
- **Authentication**: Circle Modular Wallet SDK (`https://modular-sdk.circle.com/v1/rpc/w3s/buidl`)
- **Oracle**: Optimistic Oracle V2 (`0x0000000000000000000000000000000000000000`)
- **Block Explorer**: ArcScan (`https://testnet.arcscan.app`)
- **Hosting / CI/CD**: Vercel Production (`4cast-ebon.vercel.app`)

---

## 🔄 5. User Journey & Workflow

1. **Connect Wallet**: Click **Connect Wallet** to sign in with Circle Passkey (biometric) or MetaMask.
2. **Explore Markets**: Browse predictions on the main directory or filter by category.
3. **Analyze & Discuss**: View probability odds (e.g., `YES 68% | NO 32%`), inspect contract code, or read community thoughts on the right sidebar.
4. **Place Position**: Click **YES** or **NO** on a market card, select an amount (USDC), and confirm the position.
5. **Share on 𝕏**: Click **Post to 𝕏** to share your prediction and position directly with your X followers.
6. **Settle & Claim**: When the market expires, proposal liveness concludes, and winning position holders claim payouts on the **My Bets** page.

---

## 📦 6. Deployment & Environment Setup

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=TEST_CLIENT_KEY:8eafb8ce0550ac230cb87b4c97861211:bf92c4cf9cfd104a51c66b5c1295232e
```

### Local Development Commands
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run production build check
npm run build
```

---

© 2026 4Cast Team. Built for Arc Network.
