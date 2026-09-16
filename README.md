# 4Cast — Prediction Market on GenLayer Studio Next & Arc Network

**4Cast** is an intelligent decentralized prediction market platform built with **React + Vite** and deployed on **GenLayer Studio Next** (Consensus v0.6), featuring autonomous AI consensus resolution, empirical fee profiling, and `@genlayer/transaction-kit` RC2.

![4Cast Banner](public/hero.png)

---

## ⚡ GenLayer Studio Next Deployment (Hackathon Ready)

| Parameter | Value |
| :--- | :--- |
| **Network** | **GenLayer Studio Next** |
| **Chain ID** | `61997` (`0xf22d`) |
| **RPC URL** | [https://studio-next.genlayer.com/api](https://studio-next.genlayer.com/api) |
| **Explorer** | [https://explorer-studio-dev.genlayer.com/](https://explorer-studio-dev.genlayer.com/) |
| **Deployed Contract** | [`0x30bAF43D32b86005f7c2E2247E2F395e6b2aEC6f`](https://explorer-studio-dev.genlayer.com/address/0x30bAF43D32b86005f7c2E2247E2F395e6b2aEC6f) |
| **Deployment Tx Hash** | `0x820a153b4c403999342c4581ebf5dbb7ca94f7f532694630a146528c22c90cf8` (Finalized with `MAJORITY_AGREE`) |
| **Web IDE** | [https://studio-next.genlayer.com/](https://studio-next.genlayer.com/) |
| **Consensus Release** | **Consensus v0.6 Family** (Fees & Non-deterministic Web/LLM Execution) |
| **Transaction Kit** | `@genlayer/transaction-kit@0.1.0-rc.2` & `@genlayer/transaction-kit-react@0.1.0-rc.2` |
| **SDK Version** | `genlayer-js@2.0.0-rc.1` |

---

## 🌟 Key Features

- **Intelligent Contracts on GenVM**: Written in Python (`contracts/prediction_market.py`) leveraging:
  - `gl.nondet.web.render()` for real-time web ground truth extraction.
  - `gl.nondet.exec_prompt()` with multi-validator LLM reasoning.
  - `gl.eq_principle.strict_eq()` for fault-tolerant consensus.
- **Consensus v0.6 Fee Profiling**: Empirical fee policy (`fee-profile.json`) providing test-backed time unit and gas quotes.
- **Transaction Kit RC2 Integration**: Embedded `GenLayerTransactionPanel` modal with fee itemization, preset selection (`low`, `standard`, `high`), price protection caps, and hold-to-sign timeline.
- **Multi-Chain Architecture**: Seamless support for both **GenLayer Studio Next** (native `$GEN`) and **Arc Network** (USDC).
- **Constant-Product AMM & Custom Markets**: Instant on-chain liquidity and custom market creation.
- **Modern Responsive UI**: Cyberpunk-inspired aesthetic with dark/light mode toggle, dynamic trading drawers, position tracking, and leaderboard rankings.

---

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **GenLayer**: `genlayer-js@2.0.0-rc.1`, `@genlayer/transaction-kit@0.1.0-rc.2`, `@genlayer/transaction-kit-react@0.1.0-rc.2`
- **Intelligent Contracts**: Python, GenVM, Consensus v0.6
- **Alternative Chain**: Arc Testnet (Viem, Wagmi, Circle Modular Passkey Wallets)

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
NEXT_PUBLIC_ALCHEMY_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=your_circle_client_key_here
NEXT_PUBLIC_CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
PRIVATE_KEY=your_deployer_private_key_here
```

### 3. Run Locally
Start the development server:
```bash
npm run dev
```

Run the standalone API server (for on-chain market creation):
```bash
npm run server
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Build for Production

```bash
npm run build
```

The production output will be generated in the `dist/` directory, ready for deployment to Vercel, Netlify, or any static host.
