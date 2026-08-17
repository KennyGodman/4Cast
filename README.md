# 4Cast — Prediction Market on Arc Network

**4Cast** is a decentralized prediction market web application built with **React + Vite** and deployed on **Arc Testnet**, utilizing **UMA's Optimistic Oracle V2** for decentralized market settlement and **Circle Modular Smart Wallets (Passkeys)** for smooth onboarding.

![4Cast Banner](public/hero.png)

---

## 🌟 Key Features

- **Decentralized Prediction Markets**: Trade on future outcomes with real-time YES / NO probability pricing.
- **Constant-Product AMM**: Instant on-chain liquidity via dedicated Automated Market Maker pools.
- **Dual Wallet Architecture**:
  - **MetaMask / EVM Injected Wallets** for standard Web3 interactions.
  - **Circle Passkey Smart Accounts (WebAuthn)** for seamless biometric one-touch login without browser extensions.
- **Decentralized Resolution via UMA OO v2**: Trustless optimistic dispute and settlement flow.
- **Custom Market Creation**: Deploy new prediction markets directly on-chain with automated pool seeding.
- **Modern Responsive UI**: Built with dark/light mode toggle, dynamic trading drawers, position tracking, and leaderboard rankings.

---

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Web3 / Blockchain**: Viem, Wagmi, `@circle-fin/modular-wallets-core`
- **Smart Contracts**: Solidity, Hardhat, UMA Protocol Optimistic Oracle V2
- **Network**: Arc Testnet (Chain ID `5042002`, Native Gas: `USDC`)

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
