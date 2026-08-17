import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) from .env.local
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
    // Expose NEXT_PUBLIC_* vars as VITE_* equivalents and also keep process.env
    // for any library that reads it directly
    define: {
      // Map NEXT_PUBLIC_ vars so existing lib/* files that use process.env work unchanged
      "process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL": JSON.stringify(env.NEXT_PUBLIC_ALCHEMY_RPC_URL || ""),
      "process.env.NEXT_PUBLIC_ARCT_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_ARCT_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_MARKET_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_MARKET_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_AMM_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_AMM_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_OO_V2_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_OO_V2_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_FINDER_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_FINDER_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_TIMER_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_TIMER_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS": JSON.stringify(env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS || ""),
      "process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY": JSON.stringify(env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY || ""),
      "process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL": JSON.stringify(env.NEXT_PUBLIC_CIRCLE_CLIENT_URL || ""),
    },
    server: {
      port: 3000,
      open: false,
      // Proxy /api/* calls to the local Express API server on port 3001
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
