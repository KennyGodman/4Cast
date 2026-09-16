/**
 * 4CAST — GenLayer Studio Next Intelligent Contract Deployment Script
 *
 * Network: Studio Next
 * RPC: https://studio-next.genlayer.com/api
 * Chain ID: 61997
 * Explorer: https://explorer-studio-dev.genlayer.com/
 *
 * Usage:
 *   node scripts/deploy-genlayer.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient, createAccount, chains, createFeesDistribution } from "genlayer-js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("==================================================================");
  console.log("⚡ 4CAST — Deploying Intelligent Contract to GenLayer Studio Next");
  console.log("==================================================================");

  const STUDIO_NEXT_RPC = process.env.VITE_GENLAYER_RPC_URL || "https://studio-next.genlayer.com/api";
  const CHAIN_ID = 61997;

  // Custom Studio Next chain extending studioDevnet
  const studioNextChain = {
    ...chains.studioDevnet,
    id: CHAIN_ID,
    name: "GenLayer Studio Next",
    rpcUrls: {
      default: { http: [STUDIO_NEXT_RPC] },
    },
    blockExplorers: {
      default: {
        name: "GenLayer Explorer",
        url: "https://explorer-studio-dev.genlayer.com",
      },
    },
  };

  // Read Python Intelligent Contract
  const contractPath = path.resolve(__dirname, "../contracts/prediction_market.py");
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found at: ${contractPath}`);
  }
  const pythonCode = fs.readFileSync(contractPath, "utf-8");
  console.log(`📄 Contract Loaded: ${contractPath} (${pythonCode.length} bytes)`);

  // Load fee profile
  const feeProfilePath = path.resolve(__dirname, "../fee-profile.json");
  const feeProfile = JSON.parse(fs.readFileSync(feeProfilePath, "utf-8"));
  const deployProfile = feeProfile.methods.deploy;
  console.log(`📊 Consensus v0.6 Fee Profile Loaded for deploy:`, deployProfile);

  // Private key configuration
  const privateKey = process.env.GENLAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  let account;
  if (privateKey) {
    account = createAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
    console.log(`🔑 Deployer Account: ${account.address}`);
  } else {
    account = createAccount();
    console.log(`⚠️  No GENLAYER_PRIVATE_KEY found in .env.local.`);
    console.log(`ℹ️  Generated Ephemeral Deployer Account: ${account.address}`);
    console.log(`   (Add GENLAYER_PRIVATE_KEY=<your_key> to .env.local with $GEN funds)`);
  }

  const client = createClient({
    chain: studioNextChain,
    account,
  });

  console.log(`\n🧮 Estimating Consensus v0.6 deployment fees against Studio Next...`);
  const feeEstimate = await client.estimateTransactionFees(deployProfile);
  console.log(`💰 Quoted Deposit Fee: ${feeEstimate.feeValue.toString()} wei (~${(Number(feeEstimate.feeValue) / 1e18).toFixed(4)} GEN)`);

  console.log(`\n🚀 Submitting deployment transaction to ${STUDIO_NEXT_RPC}...`);

  try {
    // Attempt automated RPC deployment with fees attached
    const txHash = await client.deployContract({
      code: pythonCode,
      args: [],
      leaderOnly: false,
      fees: feeEstimate,
    });

    console.log(`✅ Deployment Transaction Hash: ${txHash}`);
    console.log(`⏳ Waiting for receipt and consensus finalization on Studio Next...`);

    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    const contractAddress = receipt.recipient || receipt.contractAddress;

    console.log("\n🎉 ===============================================================");
    console.log(`🎉 CONTRACT SUCCESSFULLY DEPLOYED TO GENLAYER STUDIO NEXT!`);
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🔍 Explorer: https://explorer-studio-dev.genlayer.com/address/${contractAddress}`);
    console.log("===================================================================\n");

    // Update .env.local
    const envPath = path.resolve(__dirname, "../.env.local");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    if (envContent.includes("VITE_GENLAYER_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /VITE_GENLAYER_CONTRACT_ADDRESS=.*/g,
        `VITE_GENLAYER_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nVITE_GENLAYER_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log(`💾 Updated .env.local with VITE_GENLAYER_CONTRACT_ADDRESS=${contractAddress}`);

  } catch (err) {
    console.log("\n⚠️ Automated direct deploy encountered:", err.message || err);
    console.log("\n===================================================================");
    console.log("💡 MANUAL WEB IDE DEPLOYMENT INSTRUCTIONS (STUDIO NEXT)");
    console.log("===================================================================");
    console.log("1. Open the GenLayer Studio Next Web IDE:");
    console.log("   👉 https://studio-next.genlayer.com/");
    console.log("2. Connect your wallet (MetaMask) to Studio Next (Chain 61997).");
    console.log("3. Create a new contract file: `prediction_market.py`.");
    console.log(`4. Paste the entire content of: contracts/prediction_market.py`);
    console.log("5. Click 'Deploy' with standard fee profile preset.");
    console.log("6. Copy the deployed contract address and set in .env.local:");
    console.log("   VITE_GENLAYER_CONTRACT_ADDRESS=<your_deployed_address>");
    console.log("===================================================================\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
