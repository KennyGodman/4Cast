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
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { type Address, formatUnits } from "viem";
import { MarketAddressProvider } from "@/contexts/MarketAddressContext";
import { useMarketState, useTokenBalances, useSettlePosition } from "@/hooks/useMarket";
import { useWallet } from "@/contexts/WalletContext";
import { useBalance } from "wagmi";
import { COLLATERAL_DECIMALS } from "@/lib/contracts/addresses";
import { type MarketCardData } from "@/lib/markets";
import { getUserBets, type UserBet } from "@/lib/bets";

interface MyBetsProps {
  bets: UserBet[];
  markets: MarketCardData[];
  onClaimPayout: (betId: string, marketAddress: string) => Promise<void>;
  onGoToMarkets?: () => void;
}

export function MyBets({ bets: propBets, markets, onClaimPayout, onGoToMarkets }: MyBetsProps) {
  const { address, isConnected } = useWallet();

  // Keep state reactive to localStorage & event updates
  const [localBets, setLocalBets] = useState<UserBet[]>(() => {
    return propBets.length > 0 ? propBets : getUserBets();
  });

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

  const bets = localBets;

  // Fetch user's native USDC balance (USDC is the native token on Arc Testnet)
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
    if (market?.outcome === b.side) {
      return s + (b.amount * 2);
    }
    return s;
  }, 0);

  const pnl = totalPayout - settledBets.reduce((s, b) => s + (b.amount || 0), 0);

  if (bets.length === 0) {
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
          <h3
            style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.5rem" }}
          >
            No Bets in History Yet
          </h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--text-2)", maxWidth: "420px", margin: "0 auto 1.75rem", lineHeight: 1.5 }}>
            Pick a live or demo prediction market, place your YES or NO prediction, and your position history with transaction hash and explorer links will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
          <ShieldCheck size={14} color="var(--teal)" />
          <span>Arc Testnet Explorer Verified</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          {
            icon: DollarSign,
            label: "WALLET BALANCE",
            value: isConnected ? `${walletBalance.toFixed(2)} USDC` : "Connect Wallet",
            color: "var(--teal)",
          },
          {
            icon: Activity,
            label: "TOTAL WAGERED",
            value: `${totalInvested.toLocaleString()} USDC`,
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
            value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)} USDC`,
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span
              className="font-display"
              style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--yes-green)", fontWeight: 800 }}
            >
              OPEN POSITIONS ({openBets.length})
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border-1)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {openBets.map((bet) => {
              const market = markets.find((m) => m.id === bet.marketId);
              const targetAddress = (market?.address || "0x0000000000000000000000000000000000000000") as Address;
              const targetAmm = (market?.ammAddress || "0x0000000000000000000000000000000000000000") as Address;
              return (
                <MarketAddressProvider key={bet.id} marketAddress={targetAddress} ammAddress={targetAmm}>
                  <OpenBetRow bet={bet} market={market} />
                </MarketAddressProvider>
              );
            })}
          </div>
        </div>
      )}

      {/* Settled Bets */}
      {settledBets.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span
              className="font-display"
              style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-3)", fontWeight: 800 }}
            >
              SETTLED HISTORY ({settledBets.length})
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border-1)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {settledBets.map((bet) => {
              const market = markets.find((m) => m.id === bet.marketId);
              const targetAddress = (market?.address || "0x0000000000000000000000000000000000000000") as Address;
              const targetAmm = (market?.ammAddress || "0x0000000000000000000000000000000000000000") as Address;
              return (
                <MarketAddressProvider key={bet.id} marketAddress={targetAddress} ammAddress={targetAmm}>
                  <SettledBetRow bet={bet} market={market} onClaimPayout={onClaimPayout} />
                </MarketAddressProvider>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OpenBetRow({ bet, market }: { bet: UserBet; market: MarketCardData | undefined }) {
  const [copied, setCopied] = useState(false);
  const { longTokenAddress, shortTokenAddress } = useMarketState();
  const { longBalance, shortBalance } = useTokenBalances(longTokenAddress, shortTokenAddress);

  const formattedBalance =
    bet.side === "YES"
      ? longBalance
        ? parseFloat(formatUnits(longBalance, COLLATERAL_DECIMALS)).toFixed(2)
        : null
      : shortBalance
      ? parseFloat(formatUnits(shortBalance, COLLATERAL_DECIMALS)).toFixed(2)
      : null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(bet.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          {/* Side badge */}
          <span
            style={{
              padding: "0.3rem 0.75rem",
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
            {bet.amount} USDC
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: "0.15rem" }}>
            ESTIMATED RETURN
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, color: "var(--yes-green)" }}>
            ~{estimatedPayout} USDC
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: "0.15rem" }}>
            CONTRACT TOKENS
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-1)" }}>
            {formattedBalance ? `${formattedBalance} ${bet.side}` : `${bet.amount} Shares`}
          </div>
        </div>
      </div>

      {/* Bottom Row: Transaction Hash & ArcScan Explorer Link */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
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

        {bet.txHash && (
          <a
            href={`https://testnet.arcscan.app/tx/${bet.txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.75rem",
              color: "var(--teal)",
              textDecoration: "none",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "6px",
              background: "var(--teal-light)",
              border: "1px solid var(--border-teal)",
              transition: "all 0.15s ease",
            }}
          >
            <span>View on ArcScan Explorer</span>
            <ExternalLink size={12} />
          </a>
        )}
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
  if (receivedSettlementPrice && settlementPrice !== undefined) {
    const p = formatUnits(settlementPrice, 18);
    const winOutcome = p === "1" ? "YES" : p === "0" ? "NO" : "Undetermined";
    won = winOutcome === bet.side;
  } else if (market) {
    won = market.outcome === bet.side;
  }

  const isClaimed = bet.claimed === true;

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
          {won ? <CheckCircle size={22} color="var(--yes-green)" /> : <XCircle size={22} color="var(--no-red)" />}
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-0)" }}>
              {bet.marketTitle}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Side: <span style={{ fontWeight: 700, color: bet.side === "YES" ? "var(--yes-green)" : "var(--no-red)" }}>{bet.side}</span> · Amount: {bet.amount} USDC
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <span
            className="font-mono"
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: won ? "var(--yes-green)" : "var(--text-3)",
            }}
          >
            {won ? `+${(bet.amount * 2).toFixed(0)} USDC` : `-${bet.amount} USDC`}
          </span>

          {won && (
            isClaimed ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  color: "var(--text-3)",
                  padding: "0.25rem 0.6rem",
                  background: "var(--bg-3)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "6px",
                  fontWeight: 600,
                }}
              >
                CLAIMED
              </span>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming || settlePositionHook.isPending}
                style={{
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  borderRadius: "8px",
                  background: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(30,104,201,0.3)",
                }}
              >
                {settlePositionHook.isPending || claiming ? "CLAIMING..." : "CLAIM PAYOUT"}
              </button>
            )
          )}
        </div>
      </div>

      {/* Explorer strip for settled bet */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          borderTop: "1px solid var(--border-0)",
          paddingTop: "0.625rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            TX: {bet.txHash ? `${bet.txHash.slice(0, 10)}...${bet.txHash.slice(-8)}` : "—"}
          </span>
          {bet.txHash && (
            <button
              onClick={handleCopy}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.1rem",
                color: copied ? "var(--yes-green)" : "var(--text-3)",
                display: "flex",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.65rem",
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>

        {bet.txHash && (
          <a
            href={`https://testnet.arcscan.app/tx/${bet.txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.72rem",
              color: "var(--teal)",
              textDecoration: "none",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span>ArcScan Explorer</span>
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
