import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Globe,
  Cpu,
  Layers,
  ArrowRight,
  RotateCw,
  X,
} from "lucide-react";
import { type Address, formatUnits } from "viem";
import { MarketAddressProvider } from "@/contexts/MarketAddressContext";
import { useMarketState, useTokenBalances, useSettlePosition } from "@/hooks/useMarket";
import { useWallet } from "@/contexts/WalletContext";
import { useBalance } from "wagmi";
import { COLLATERAL_DECIMALS } from "@/lib/contracts/addresses";
import { type MarketCardData } from "@/lib/markets";
import { getUserBets, type UserBet, type GenLayerPrediction, updateUserBet } from "@/lib/bets";
import { STUDIO_NEXT_EXPLORER_URL } from "@/lib/genlayer";

interface MyBetsProps {
  bets: UserBet[];
  markets: MarketCardData[];
  onClaimPayout: (betId: string, marketAddress: string) => Promise<void>;
  onSettleBet?: (betId: string, outcome: "YES" | "NO") => void;
  onGoToMarkets?: () => void;
}

export function MyBets({ bets: propBets, markets, onClaimPayout, onSettleBet, onGoToMarkets }: MyBetsProps) {
  const { address, isConnected } = useWallet();

  // Filter state: "all" | "arc" | "genlayer"
  const [networkFilter, setNetworkFilter] = useState<"all" | "arc" | "genlayer">("all");

  // Keep state reactive to localStorage & event updates
  const [localBets, setLocalBets] = useState<UserBet[]>(() => {
    return propBets.length > 0 ? propBets : getUserBets();
  });

  // Modal for AI consensus settlement simulation
  const [settlingBet, setSettlingBet] = useState<UserBet | null>(null);

  useEffect(() => {
    if (propBets.length > 0) {
      setLocalBets(propBets);
    } else {
      setLocalBets(getUserBets());
    }
  }, [propBets]);

  useEffect(() => {
    const handleUpdate = () => {
      setLocalBets(getUserBets());
    };
    window.addEventListener("4cast_bets_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("4cast_bets_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const allBets = localBets;

  // Filtered bets
  const bets = allBets.filter((b) => {
    if (networkFilter === "all") return true;
    if (networkFilter === "arc") return b.network === "arc" || !b.network;
    if (networkFilter === "genlayer") return b.network === "genlayer";
    return true;
  });

  // Fetch user's native USDC balance
  const { data: usdcBalance } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  const walletBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals))
    : 0;

  const totalInvested = bets.reduce((s, b) => s + (b.amount || 0), 0);
  const openBets = bets.filter((b) => b.status === "open");
  const settledBets = bets.filter((b) => b.status === "settled");

  // Sum up estimated payout
  const totalPayout = settledBets.reduce((s, b) => {
    const market = markets.find((m) => m.id === b.marketId);
    if (b.outcome === b.side || market?.outcome === b.side) {
      return s + (b.amount * 2);
    }
    return s;
  }, 0);

  const pnl = totalPayout - settledBets.reduce((s, b) => s + (b.amount || 0), 0);

  if (allBets.length === 0) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
        <div
          className="font-mono"
          style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "var(--teal)", marginBottom: "0.5rem" }}
        >
          {"// MY PORTFOLIO"}
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-0)", letterSpacing: "-0.02em", marginBottom: "2rem" }}
        >
          MY BETS
        </h1>
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "4.5rem 2rem",
            background: "var(--bg-1)",
            border: "1.5px solid var(--border-1)",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--teal-light)",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={28} color="var(--teal)" />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.5rem" }}>
            No Bets in History Yet
          </h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--text-2)", maxWidth: "420px", margin: "0 auto 1.75rem", lineHeight: 1.5 }}>
            Pick a market, place your YES or NO prediction with Arc USDC or GenLayer $GEN, and your position history with transaction verification will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header & Network Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div
            className="font-mono"
            style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "var(--teal)", marginBottom: "0.5rem" }}
          >
            {"// MY PORTFOLIO"}
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-0)", letterSpacing: "-0.025em", margin: 0 }}>
            MY BETS ({bets.length})
          </h1>
        </div>

        {/* Network & Currency Filter Toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-2)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-pill)",
            padding: "3px",
            gap: "3px",
          }}
        >
          <button
            onClick={() => setNetworkFilter("all")}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "var(--r-pill)",
              border: "none",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer",
              background: networkFilter === "all" ? "var(--teal)" : "transparent",
              color: networkFilter === "all" ? "#ffffff" : "var(--text-2)",
              transition: "all 0.15s ease",
            }}
          >
            All ({allBets.length})
          </button>
          <button
            onClick={() => setNetworkFilter("arc")}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "var(--r-pill)",
              border: "none",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer",
              background: networkFilter === "arc" ? "#2563eb" : "transparent",
              color: networkFilter === "arc" ? "#ffffff" : "var(--text-2)",
              transition: "all 0.15s ease",
            }}
          >
            🔵 Arc (USDC)
          </button>
          <button
            onClick={() => setNetworkFilter("genlayer")}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "var(--r-pill)",
              border: "none",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer",
              background: networkFilter === "genlayer" ? "#9333ea" : "transparent",
              color: networkFilter === "genlayer" ? "#ffffff" : "var(--text-2)",
              transition: "all 0.15s ease",
            }}
          >
            ⚡ GenLayer ($GEN)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="portfolio-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.85rem" }}>
        {[
          {
            icon: DollarSign,
            label: "USDC WALLET BALANCE",
            value: isConnected ? `${walletBalance.toFixed(2)} USDC` : "Connect Wallet",
            color: "var(--teal)",
          },
          {
            icon: Activity,
            label: "TOTAL WAGERED",
            value: `${totalInvested.toLocaleString()} ${networkFilter === "genlayer" ? "$GEN" : "COLLATERAL"}`,
            color: "var(--text-0)",
          },
          {
            icon: Clock,
            label: "OPEN POSITIONS",
            value: openBets.length.toString(),
            color: "var(--resolving)",
          },
          {
            icon: TrendingUp,
            label: "TOTAL P&L",
            value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)} ${networkFilter === "genlayer" ? "$GEN" : "USDC"}`,
            color: pnl >= 0 ? "var(--yes-green)" : "var(--no-red)",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            style={{
              padding: "1.1rem",
              background: "var(--bg-1)",
              border: "1.5px solid var(--border-1)",
              borderRadius: "14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Icon size={14} color={color} />
              <span
                className="font-mono"
                style={{ fontSize: "0.65rem", color: "var(--text-3)", letterSpacing: "0.08em", fontWeight: 600 }}
              >
                {label}
              </span>
            </div>
            <div className="font-display" style={{ fontSize: "1.25rem", fontWeight: 800, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Open Bets */}
      {openBets.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-0)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Open Predictions</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                ({openBets.length})
              </span>
            </h2>
            <span style={{ fontSize: "0.72rem", color: "var(--teal)", fontFamily: "var(--font-mono)" }}>
              ⚡ Fast AI Settlement Simulator Available
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {openBets.map((bet) => {
              const market = markets.find((m) => m.id === bet.marketId);
              return (
                <MarketAddressProvider
                  key={bet.id}
                  marketAddress={(market?.address || "0x0000000000000000000000000000000000000000") as Address}
                  ammAddress={(market?.ammAddress || "0x0000000000000000000000000000000000000000") as Address}
                >
                  <OpenBetRow
                    bet={bet}
                    market={market}
                    onSettleTrigger={() => setSettlingBet(bet)}
                  />
                </MarketAddressProvider>
              );
            })}
          </div>
        </div>
      )}

      {/* Settled Bets */}
      {settledBets.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-0)", marginBottom: "1rem" }}>
            Resolved Positions ({settledBets.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {settledBets.map((bet) => {
              const market = markets.find((m) => m.id === bet.marketId);
              return (
                <MarketAddressProvider
                  key={bet.id}
                  marketAddress={(market?.address || "0x0000000000000000000000000000000000000000") as Address}
                  ammAddress={(market?.ammAddress || "0x0000000000000000000000000000000000000000") as Address}
                >
                  <SettledBetRow
                    bet={bet}
                    market={market}
                    onClaimPayout={onClaimPayout}
                  />
                </MarketAddressProvider>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive AI Consensus Settlement Modal */}
      {settlingBet && (
        <AISettlementModal
          bet={settlingBet}
          onClose={() => setSettlingBet(null)}
          onFinalize={(outcome) => {
            if (onSettleBet) {
              onSettleBet(settlingBet.id, outcome);
            } else {
              updateUserBet(settlingBet.id, { status: "settled", outcome });
            }
            setSettlingBet(null);
          }}
        />
      )}
    </div>
  );
}

function OpenBetRow({
  bet,
  market,
  onSettleTrigger,
}: {
  bet: UserBet;
  market: MarketCardData | undefined;
  onSettleTrigger: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { longTokenAddress, shortTokenAddress } = useMarketState();
  const { longBalance, shortBalance } = useTokenBalances(longTokenAddress, shortTokenAddress);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(bet.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tokenSymbol = bet.currency === "GEN" || bet.network === "genlayer" ? "$GEN" : "USDC";
  const estimatedPayout = (bet.amount * 2).toFixed(2);

  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1.5px solid var(--border-1)",
        borderRadius: "14px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
      }}
    >
      {/* Top Header: Market Title & Badges */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-0)", lineHeight: 1.4, marginBottom: "0.25rem" }}>
            {bet.marketTitle}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)" }}>
            Placed on {new Date(bet.placedAt).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          {/* Network badge */}
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "var(--r-pill)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              fontWeight: 700,
              background: bet.network === "genlayer" ? "rgba(168,85,247,0.12)" : "rgba(37,99,235,0.1)",
              color: bet.network === "genlayer" ? "#a855f7" : "#2563eb",
              border: `1px solid ${bet.network === "genlayer" ? "rgba(168,85,247,0.3)" : "rgba(37,99,235,0.25)"}`,
            }}
          >
            {bet.network === "genlayer" ? "⚡ GenLayer ($GEN)" : "🔵 Arc (USDC)"}
          </span>

          {/* Side badge */}
          <span
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "var(--r-pill)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "0.75rem",
              background: bet.side === "YES" ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)",
              color: bet.side === "YES" ? "var(--yes-green)" : "var(--no-red)",
              border: `1.5px solid ${bet.side === "YES" ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}`,
            }}
          >
            {bet.side === "YES" ? "📈 YES" : "📉 NO"}
          </span>

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              color: "var(--teal)",
              padding: "0.25rem 0.6rem",
              background: "var(--teal-light)",
              border: "1px solid var(--border-teal)",
              borderRadius: "var(--r-pill)",
              fontWeight: 700,
            }}
          >
            OPEN
          </span>
        </div>
      </div>

      {/* Position Metrics Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          background: "var(--bg-2)",
          padding: "0.875rem 1rem",
          borderRadius: "10px",
          border: "1px solid var(--border-0)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: "0.15rem" }}>
            WAGER AMOUNT
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-0)" }}>
            {bet.amount} {tokenSymbol}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: "0.15rem" }}>
            ESTIMATED RETURN
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, color: "var(--yes-green)" }}>
            ~{estimatedPayout} {tokenSymbol}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: "0.15rem" }}>
            CURRENCY & NETWORK
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: bet.network === "genlayer" ? "#a855f7" : "var(--teal)" }}>
            {bet.network === "genlayer" ? "GenLayer Studio Next" : "Arc Testnet"}
          </div>
        </div>
      </div>

      {/* GenLayer AI Consensus Prediction Card */}
      {bet.genlayerPrediction && (
        <GenLayerPredictionDisplay prediction={bet.genlayerPrediction} network={bet.network} />
      )}

      {/* Bottom Row: Transaction Hash, Explorer Link, and Fast Settlement Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          borderTop: "1px solid var(--border-0)",
          paddingTop: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            TX:
          </span>
          <code
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--text-1)",
              background: "var(--bg-3)",
              padding: "0.2rem 0.5rem",
              borderRadius: "6px",
              fontSize: "0.72rem",
              border: "1px solid var(--border-1)",
            }}
          >
            {bet.txHash ? `${bet.txHash.slice(0, 10)}...${bet.txHash.slice(-8)}` : "Pending"}
          </code>
          <button
            onClick={handleCopy}
            title="Copy Transaction Hash"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.2rem",
              color: copied ? "var(--yes-green)" : "var(--text-3)",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
              fontSize: "0.68rem",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Fast AI Settlement Button */}
          <button
            onClick={onSettleTrigger}
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.35rem 0.85rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7928ca 0%, #a855f7 100%)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              boxShadow: "0 2px 8px rgba(168,85,247,0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <Sparkles size={13} />
            <span>⚡ Settle via AI Jury (Demo)</span>
          </button>

          {bet.txHash && (
            <a
              href={
                bet.network === "genlayer"
                  ? `${STUDIO_NEXT_EXPLORER_URL}/address/0x30bAF43D32b86005f7c2E2247E2F395e6b2aEC6f`
                  : `https://testnet.arcscan.app/tx/${bet.txHash}`
              }
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.75rem",
                color: bet.network === "genlayer" ? "#a855f7" : "var(--teal)",
                textDecoration: "none",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                background: bet.network === "genlayer" ? "rgba(168,85,247,0.1)" : "var(--teal-light)",
                border: `1px solid ${bet.network === "genlayer" ? "rgba(168,85,247,0.3)" : "var(--border-teal)"}`,
                transition: "all 0.15s ease",
              }}
            >
              <span>{bet.network === "genlayer" ? "GenLayer Explorer" : "ArcScan Explorer"}</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SettledBetRow({
  bet,
  market,
  onClaimPayout,
}: {
  bet: UserBet;
  market: MarketCardData | undefined;
  onClaimPayout: (betId: string, marketAddress: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const { longTokenAddress, shortTokenAddress, receivedSettlementPrice, settlementPrice } = useMarketState();
  const { longBalance, shortBalance } = useTokenBalances(longTokenAddress, shortTokenAddress);
  const settlePositionHook = useSettlePosition();
  const [claiming, setClaiming] = useState(false);

  let won = false;
  if (bet.outcome) {
    won = bet.outcome === bet.side;
  } else if (receivedSettlementPrice && settlementPrice !== undefined) {
    const p = formatUnits(settlementPrice, 18);
    const winOutcome = p === "1" ? "YES" : p === "0" ? "NO" : "Undetermined";
    won = winOutcome === bet.side;
  } else if (market) {
    won = market.outcome === bet.side;
  }

  const isClaimed = bet.claimed === true;
  const tokenSymbol = bet.currency === "GEN" || bet.network === "genlayer" ? "$GEN" : "USDC";

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claiming) return;
    setClaiming(true);
    try {
      if (settlePositionHook && (longBalance || shortBalance)) {
        settlePositionHook.settle(longBalance || 0n, shortBalance || 0n);
      }
      await onClaimPayout(bet.id, market?.address || "");
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(bet.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1.5px solid var(--border-1)",
        borderRadius: "14px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
        opacity: isClaimed ? 0.75 : 1,
        boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "220px" }}>
          {won ? <CheckCircle size={24} color="var(--yes-green)" /> : <XCircle size={24} color="var(--no-red)" />}
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-0)", marginBottom: "0.2rem" }}>
              {bet.marketTitle}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Side: <span style={{ fontWeight: 700, color: bet.side === "YES" ? "var(--yes-green)" : "var(--no-red)" }}>{bet.side}</span> · Amount: {bet.amount} {tokenSymbol} · Network: {bet.network === "genlayer" ? "⚡ GenLayer" : "🔵 Arc"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <span
            className="font-mono"
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: won ? "var(--yes-green)" : "var(--text-3)",
            }}
          >
            {won ? `+${(bet.amount * 2).toFixed(0)} ${tokenSymbol}` : `-${bet.amount} ${tokenSymbol}`}
          </span>

          {won && (
            isClaimed ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  color: "var(--yes-green)",
                  padding: "0.3rem 0.75rem",
                  background: "rgba(22,163,74,0.1)",
                  border: "1px solid rgba(22,163,74,0.3)",
                  borderRadius: "8px",
                  fontWeight: 700,
                }}
              >
                ✓ CLAIMED
              </span>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming || settlePositionHook.isPending}
                style={{
                  padding: "0.45rem 1rem",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
                  color: "#ffffff",
                  border: "none",
                  cursor: claiming ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 10px rgba(22,163,74,0.35)",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Sparkles size={14} />
                <span>{claiming ? "Claiming..." : "Claim Payout"}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* AI Consensus Card */}
      {bet.genlayerPrediction && (
        <GenLayerPredictionDisplay prediction={bet.genlayerPrediction} network={bet.network} />
      )}
    </div>
  );
}

/**
 * Transparent GenLayer Validator Consensus & Evidence Inspector Card
 */
function GenLayerPredictionDisplay({
  prediction,
  network,
}: {
  prediction: GenLayerPrediction;
  network?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "rgba(168,85,247,0.06)",
        border: "1px solid rgba(168,85,247,0.22)",
        borderRadius: "10px",
        padding: "0.85rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              background: "linear-gradient(90deg, #9333ea, #6366f1)",
              color: "#ffffff",
              fontSize: "0.68rem",
              fontWeight: 800,
              padding: "0.2rem 0.55rem",
              borderRadius: "var(--r-pill)",
              letterSpacing: "0.02em",
              boxShadow: "0 2px 8px rgba(147,51,234,0.3)",
            }}
          >
            <Sparkles size={11} />
            <span>GenLayer AI Consensus (v0.6)</span>
          </span>

          <span
            style={{
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-1)",
              fontWeight: 700,
            }}
          >
            {prediction.validatorsAgreed}/{prediction.totalValidators} Validators Agreed ({prediction.confidence}%)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: prediction.predictedOutcome === "YES" ? "var(--yes-green)" : "var(--no-red)",
            }}
          >
            Verdict: {prediction.predictedOutcome}
          </span>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#a855f7",
              cursor: "pointer",
              borderRadius: "6px",
              padding: "0.25rem 0.55rem",
              fontSize: "0.7rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: 700,
            }}
          >
            <span>{expanded ? "Hide Evidence Dossier" : "Inspect 5 Validator Nodes & Evidence"}</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Confidence Bar */}
      <div style={{ width: "100%", height: 5, borderRadius: 3, background: "rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div
          style={{
            width: `${prediction.confidence}%`,
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(90deg, #a855f7, #38bdf8)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Expandable Deep Evidence & Validator Nodes Inspector */}
      {expanded && (
        <div
          style={{
            background: "var(--bg-0)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: "10px",
            padding: "1rem",
            marginTop: "0.35rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            fontSize: "0.78rem",
          }}
        >
          {/* Web Ground Truth Source Section */}
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#a855f7", fontWeight: 700 }}>
                <Globe size={14} />
                <span>Authoritative Web Ground Truth Source</span>
              </div>
              <span style={{ fontSize: "0.68rem", background: "#dcfce7", color: "#15803d", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 700 }}>
                HTTP 200 OK
              </span>
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-1)", wordBreak: "break-all" }}>
              Source:{" "}
              <a
                href={prediction.webGroundTruthSource || "https://testnet.arcscan.app"}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--teal)", fontWeight: 700, textDecoration: "underline" }}
              >
                {prediction.webGroundTruthSource}
              </a>
            </div>

            {prediction.evidenceDetail?.keyFindings && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", fontWeight: 600, marginBottom: "0.25rem" }}>
                  WHAT VALIDATORS CHECKED:
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-1)", lineHeight: 1.45, fontSize: "0.72rem" }}>
                  {prediction.evidenceDetail.keyFindings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.evidenceDetail?.verdictSupport && (
              <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border-0)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-3)", fontWeight: 600 }}>
                  HOW SOURCE SUPPORTS VERDICT:{" "}
                </span>
                <span style={{ color: "var(--text-1)", fontSize: "0.72rem" }}>
                  {prediction.evidenceDetail.verdictSupport}
                </span>
              </div>
            )}
          </div>

          {/* Individual 5 Validator Nodes Table */}
          {prediction.validatorNodes && prediction.validatorNodes.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#a855f7", fontWeight: 700, marginBottom: "0.4rem" }}>
                <Cpu size={14} />
                <span>5/5 GenVM Independent Validator Consensus Breakdown:</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {prediction.validatorNodes.map((node) => (
                  <div
                    key={node.nodeId}
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border-1)",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.3rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.72rem", color: "var(--text-0)" }}>
                          {node.nodeId}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-3)" }}>
                          ({node.region} · {node.llmModel})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>
                          {node.latencyMs}ms
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            color: node.vote === "YES" ? "var(--yes-green)" : "var(--no-red)",
                            background: node.vote === "YES" ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                          }}
                        >
                          VOTE: {node.vote}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-2)", lineHeight: 1.35 }}>
                      Snippet: "{node.extractedSnippet}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equivalence Principle Tag */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px solid var(--border-0)", fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>
            <span>Consensus Method: <code style={{ color: "#a855f7" }}>gl.eq_principle.strict_eq()</code></span>
            <span style={{ color: "var(--yes-green)", fontWeight: 700 }}>5/5 Majority Finalized</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Multi-Validator AI Consensus Simulation Modal
 */
function AISettlementModal({
  bet,
  onClose,
  onFinalize,
}: {
  bet: UserBet;
  onClose: () => void;
  onFinalize: (outcome: "YES" | "NO") => void;
}) {
  const [stage, setStage] = useState(0);

  const stages = [
    {
      title: "Connecting to GenLayer Consensus v0.6 Network...",
      desc: "Establishing EIP-1193 RPC session with GenLayer Studio Next (Chain 61997).",
    },
    {
      title: "Executing Autonomous Web Data Extraction...",
      desc: `gl.nondet.web.render() scraping authoritative ground truth at ${bet.genlayerPrediction?.webGroundTruthSource || "https://testnet.arcscan.app"}.`,
    },
    {
      title: "Multi-LLM Synthesis Across 5 GenVM Validator Nodes...",
      desc: "Llama 3.3, DeepSeek R1, and Claude 3.5 evaluating truth propositions independently.",
    },
    {
      title: "Strict Equivalence Reached (5/5 Consensus)!",
      desc: "gl.eq_principle.strict_eq() finalized majority agreement on YES.",
    },
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 800);
    const t2 = setTimeout(() => setStage(2), 1700);
    const t3 = setTimeout(() => setStage(3), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const outcome = (bet.genlayerPrediction?.predictedOutcome as "YES" | "NO") || bet.side;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 7, 18, 0.8)",
        backdropFilter: "blur(8px)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        className="modal-container"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-1)",
          border: "1.5px solid var(--border-1)",
          borderRadius: "20px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, rgba(147,51,234,0.15), rgba(37,99,235,0.15))",
            borderBottom: "1px solid var(--border-1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={18} color="#a855f7" />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--text-0)" }}>
              GenLayer AI Consensus Simulator
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border-1)",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: "0.25rem" }}>
            MARKET SETTLEMENT IN PROGRESS:
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-0)", marginBottom: "1.25rem", lineHeight: 1.4 }}>
            {bet.marketTitle}
          </div>

          {/* 4 Stages Stepper */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem" }}>
            {stages.map((st, i) => {
              const isDone = stage > i;
              const isCurrent = stage === i;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    background: isCurrent ? "rgba(168,85,247,0.08)" : isDone ? "var(--bg-2)" : "var(--bg-0)",
                    border: isCurrent ? "1px solid #a855f7" : "1px solid var(--border-1)",
                    opacity: isDone || isCurrent ? 1 : 0.4,
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: isDone ? "#16a34a" : isCurrent ? "#a855f7" : "var(--bg-3)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? "✓" : isCurrent ? <RotateCw size={12} className="animate-spin" /> : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: isCurrent ? "#a855f7" : "var(--text-0)" }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-2)", marginTop: "0.15rem", lineHeight: 1.35 }}>
                      {st.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action on Complete */}
          {stage >= 3 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "12px",
                  padding: "0.85rem",
                  textAlign: "center",
                  color: "#15803d",
                }}
              >
                <div style={{ fontSize: "1rem", fontWeight: 800 }}>
                  Consensus Reached: {outcome}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#166534", marginTop: "0.2rem" }}>
                  5/5 GenVM Validators agree with 88% confidence. Payout is ready to claim!
                </div>
              </div>

              <button
                onClick={() => onFinalize(outcome)}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  boxShadow: "0 4px 14px rgba(22,163,74,0.35)",
                }}
              >
                <span>Finalize Settlement & Enable Claim</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
              Processing non-deterministic web ground truth execution...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
