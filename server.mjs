/**
 * Standalone Express API server for 4Cast Vite build.
 * Replaces the Next.js /api/create-market and /api/markets route handlers.
 *
 * Run alongside Vite dev server:  node server.mjs
 * Vite proxies /api/* → http://localhost:3001
 */

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  stringToHex,
} from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";

// Load .env.local
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
// Chain config (mirrors lib/chain.ts)
// ──────────────────────────────────────────────
const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
  testnet: true,
};

// ──────────────────────────────────────────────
// Market parameters
// ──────────────────────────────────────────────
const PROPOSER_REWARD = parseEther("10");
const MARKET_LIVENESS = 60n;
const PROPOSER_BOND = parseEther("100");
const AMM_FEE_BPS = 200n;
const SEED_LIQUIDITY = parseEther("1000");

// ──────────────────────────────────────────────
// Minimal ABIs
// ──────────────────────────────────────────────
const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "ownerAddress", type: "address" }, { name: "value", type: "uint256" }], name: "allocateTo", outputs: [], stateMutability: "nonpayable", type: "function" },
];

const MARKET_INIT_ABI = [
  { inputs: [], name: "initializeMarket", outputs: [], stateMutability: "nonpayable", type: "function" },
];

const AMM_INIT_ABI = [
  { inputs: [{ name: "_initialLiquidity", type: "uint256" }], name: "initialize", outputs: [], stateMutability: "nonpayable", type: "function" },
];

// ──────────────────────────────────────────────
// Artifact loader
// ──────────────────────────────────────────────
function loadArtifact(contractPath) {
  const fullPath = path.resolve(__dirname, "artifacts", "contracts", contractPath);
  const artifact = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  return { abi: artifact.abi, bytecode: artifact.bytecode };
}

// ──────────────────────────────────────────────
// Markets JSON persistence
// ──────────────────────────────────────────────
const MARKETS_FILE = path.resolve(__dirname, "data", "markets.json");

function readMarkets() {
  try {
    const data = fs.readFileSync(MARKETS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMarkets(markets) {
  fs.mkdirSync(path.dirname(MARKETS_FILE), { recursive: true });
  fs.writeFileSync(MARKETS_FILE, JSON.stringify(markets, null, 2) + "\n");
}

function waitForTx(publicClient, hash) {
  return publicClient.waitForTransactionReceipt({ hash, pollingInterval: 2_000, timeout: 120_000 });
}

// ──────────────────────────────────────────────
// GET /api/markets
// ──────────────────────────────────────────────
app.get("/api/markets", (_req, res) => {
  const markets = readMarkets();
  res.json(markets);
});

// ──────────────────────────────────────────────
// POST /api/create-market
// ──────────────────────────────────────────────
app.post("/api/create-market", async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const trimmedTitle = title.trim();
    const privateKey = process.env.PRIVATE_KEY?.trim();
    if (!privateKey) {
      return res.status(500).json({ error: "Server not configured: missing PRIVATE_KEY in .env.local" });
    }

    const arctAddress = process.env.NEXT_PUBLIC_ARCT_ADDRESS;
    const finderAddress = process.env.NEXT_PUBLIC_FINDER_ADDRESS;
    const timerAddress = process.env.NEXT_PUBLIC_TIMER_ADDRESS;

    if (!arctAddress || !finderAddress || !timerAddress) {
      return res.status(500).json({
        error: "Contract addresses not configured. Run `npm run deploy` first to set NEXT_PUBLIC_ARCT_ADDRESS, NEXT_PUBLIC_FINDER_ADDRESS, NEXT_PUBLIC_TIMER_ADDRESS in .env.local.",
      });
    }

    const pairName = trimmedTitle.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10).toUpperCase();
    const formattedKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
    const account = privateKeyToAccount(formattedKey, { nonceManager });
    const rpcUrl = "https://rpc.testnet.arc.network";

    const publicClient = createPublicClient({ chain: arcTestnet, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(rpcUrl) });

    // Load compiled artifacts
    const marketArtifact = loadArtifact("EventBasedPredictionMarket.sol/EventBasedPredictionMarket.json");
    const ammArtifact = loadArtifact("PredictionMarketAMM.sol/PredictionMarketAMM.json");

    // Mint ARCT if needed
    const totalNeeded = PROPOSER_REWARD + SEED_LIQUIDITY;
    const balance = await publicClient.readContract({ address: arctAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] });
    if (balance < totalNeeded) {
      const mintHash = await walletClient.writeContract({ address: arctAddress, abi: ERC20_ABI, functionName: "allocateTo", args: [account.address, totalNeeded - balance + parseEther("100")] });
      await waitForTx(publicClient, mintHash);
    }

    // Deploy market
    const marketHash = await walletClient.deployContract({
      abi: marketArtifact.abi,
      bytecode: marketArtifact.bytecode,
      args: [pairName, arctAddress, stringToHex(trimmedTitle), finderAddress, timerAddress, PROPOSER_REWARD, MARKET_LIVENESS, PROPOSER_BOND],
    });
    const { contractAddress: marketAddress } = await waitForTx(publicClient, marketHash);
    if (!marketAddress) return res.status(500).json({ error: "Market deployment failed" });

    // Approve + initialize market
    await waitForTx(publicClient, await walletClient.writeContract({ address: arctAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, PROPOSER_REWARD] }));
    await waitForTx(publicClient, await walletClient.writeContract({ address: marketAddress, abi: MARKET_INIT_ABI, functionName: "initializeMarket" }));

    // Deploy AMM
    const ammHash = await walletClient.deployContract({ abi: ammArtifact.abi, bytecode: ammArtifact.bytecode, args: [marketAddress, AMM_FEE_BPS] });
    const { contractAddress: ammAddress } = await waitForTx(publicClient, ammHash);
    if (!ammAddress) return res.status(500).json({ error: "AMM deployment failed" });

    // Approve + initialize AMM
    await waitForTx(publicClient, await walletClient.writeContract({ address: arctAddress, abi: ERC20_ABI, functionName: "approve", args: [ammAddress, SEED_LIQUIDITY] }));
    await waitForTx(publicClient, await walletClient.writeContract({ address: ammAddress, abi: AMM_INIT_ABI, functionName: "initialize", args: [SEED_LIQUIDITY] }));

    // Persist
    const markets = readMarkets();
    const newMarket = {
      id: `user-${Date.now()}`,
      address: marketAddress,
      ammAddress,
      title: trimmedTitle,
      category: category || "Crypto",
      createdAt: new Date().toISOString(),
    };
    markets.unshift(newMarket);
    writeMarkets(markets);

    res.json({ success: true, market: newMarket });
  } catch (err) {
    console.error("Market creation error:", err);
    res.status(500).json({ error: `Market creation failed: ${err.message || err}` });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`  ✅ 4Cast API server running on http://localhost:${PORT}`);
  console.log(`     POST /api/create-market`);
  console.log(`     GET  /api/markets`);
});
