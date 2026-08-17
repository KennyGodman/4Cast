import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import { type Address, formatUnits } from "viem";
import { MarketAddressProvider } from "@/contexts/MarketAddressContext";
import { useMarketState, useTokenBalances, useSettlePosition } from "@/hooks/useMarket";
import { useWallet } from "@/contexts/WalletContext";
import { useBalance } from "wagmi";
import { COLLATERAL_DECIMALS } from "@/lib/contracts/addresses";
import { type MarketCardData } from "@/lib/markets";

interface Bet {
  id: string;
  txHash: string;
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  amount: number;
  placedAt: string;
  status: "open" | "settled";
  outcome?: "YES" | "NO" | "Undetermined";
  claimed?: boolean;
}

interface MyBetsProps {
  bets: Bet[];
  markets: MarketCardData[];
  onClaimPayout: (betId: string, marketAddress: string) => Promise<void>;
}

export function MyBets({ bets, markets, onClaimPayout }: MyBetsProps) {
  const { address, isConnected } = useWallet();

  // Fetch user's native USDC balance (USDC is the native token on Arc Testnet)
  const { data: usdcBalance } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  const walletBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals))
    : 0;

  const totalInvested = bets.reduce((s, b) => s + b.amount, 0);
  const openBets = bets.filter((b) => b.status === "open");
  const settledBets = bets.filter((b) => b.status === "settled");

  // Sum up estimated payout
  const totalPayout = settledBets.reduce((s, b) => {
    const market = markets.find((m) => m.id === b.marketId);
    if (market?.outcome === b.side) {
      // rough fallback calculation for payout if not stored
      return s + (b.amount * 2); 
    }
    return s;
  }, 0);

  const pnl = totalPayout - settledBets.reduce((s, b) => s + b.amount, 0);

  if (bets.length === 0) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
        <div className="glass-panel" style={{ textAlign: "center", padding: "5rem 2rem" }}>
          <Activity size={48} color="var(--text-3)" style={{ margin: "0 auto 1.5rem", opacity: 0.4 }} />
          <p
            className="font-display"
            style={{ fontSize: "1rem", color: "var(--text-2)", letterSpacing: "0.06em", marginBottom: "0.5rem" }}
          >
            NO BETS YET
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-3)", opacity: 0.7 }}>
            Head to Markets and place your first prediction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <div
          className="font-mono"
          style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "var(--teal)", marginBottom: "0.5rem" }}
        >
          {"// MY PORTFOLIO"}
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-0)", letterSpacing: "-0.025em" }}>
          MY BETS
        </h1>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
        {[
          {
            icon: DollarSign,
            label: "WALLET BALANCE",
            value: `${walletBalance.toFixed(2)} USDC`,
            color: "var(--teal)",
          },
          {
            icon: Activity,
            label: "TOTAL WAGERED",
            value: `${totalInvested.toLocaleString()} USDC`,
            color: "var(--text-2)",
          },
          { icon: Clock, label: "OPEN POSITIONS", value: openBets.length.toString(), color: "var(--resolving)" },
          {
            icon: TrendingUp,
            label: "TOTAL P&L",
            value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)} USDC`,
            color: pnl >= 0 ? "var(--yes-green)" : "var(--no-red)",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-panel" style={{ padding: "1rem", border: `1px solid ${color}20` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Icon size={14} color={color} />
              <span
                className="font-mono"
                style={{ fontSize: "0.62rem", color: "var(--text-3)", letterSpacing: "0.08em" }}
              >
                {label}
              </span>
            </div>
            <div className="font-display" style={{ fontSize: "1.2rem", fontWeight: 800, color }}>
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
              style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--yes-green)", fontWeight: 700 }}
            >
              OPEN POSITIONS ({openBets.length})
            </span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(34,197,94,0.3), transparent)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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
              style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-3)", fontWeight: 700 }}
            >
              SETTLED HISTORY ({settledBets.length})
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border-0)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

function OpenBetRow({ bet, market }: { bet: Bet; market: MarketCardData | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const { longTokenAddress, shortTokenAddress } = useMarketState();
  const { longBalance, shortBalance } = useTokenBalances(longTokenAddress, shortTokenAddress);

  const formattedBalance =
    bet.side === "YES"
      ? longBalance
        ? parseFloat(formatUnits(longBalance, COLLATERAL_DECIMALS)).toFixed(2)
        : "0.00"
      : shortBalance
      ? parseFloat(formatUnits(shortBalance, COLLATERAL_DECIMALS)).toFixed(2)
      : "0.00";

  return (
    <div
      className="glass-panel"
      style={{
        padding: "0",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        borderColor: expanded ? "var(--teal)" : "var(--border-0)",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Summary Row */}
      <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-0)" }}>
            {bet.marketTitle}
          </div>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-3)" }}>
            {new Date(bet.placedAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexShrink: 0 }}>
          <span
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "4px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.72rem",
              background: bet.side === "YES" ? "var(--yes-bg)" : "var(--no-bg)",
              color: bet.side === "YES" ? "var(--yes-green)" : "var(--no-red)",
              border: `1px solid ${bet.side === "YES" ? "var(--yes-border)" : "var(--no-border)"}`,
            }}
          >
            {bet.side}
          </span>
          <div style={{ textAlign: "right" }}>
            <div className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-0)" }}>
              {bet.amount} USDC
            </div>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--resolving)" }}>
              {formattedBalance !== "0.00" ? `${formattedBalance} tokens held` : "Pending tx..."}
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--teal)",
              padding: "0.2rem 0.5rem",
              background: "var(--teal-light)",
              border: "1px solid var(--border-teal)",
              borderRadius: "4px",
            }}
          >
            OPEN
          </span>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            background: "var(--bg-3)",
            borderTop: "1px solid var(--border-0)",
            padding: "1rem 1.25rem",
            animation: "fadeIn 0.15s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>
              🔍 Bet Tx Hash:{" "}
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--teal)",
                  background: "var(--bg-2)",
                  padding: "0.1rem 0.3rem",
                  borderRadius: "4px",
                }}
              >
                {bet.txHash.substring(0, 18)}...
              </code>
            </span>
            <a
              href={`https://testnet.arcscan.app/tx/${bet.txHash}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.68rem", color: "var(--teal)", textDecoration: "none", fontWeight: 700 }}
            >
              View on ArcScan Explorer →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function SettledBetRow({
  bet,
  market,
  onClaimPayout,
}: {
  bet: Bet;
  market: MarketCardData | undefined;
  onClaimPayout: (betId: string, marketAddress: string) => Promise<void>;
}) {
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
      // Execute the settle position on-chain
      settlePositionHook.settle(longBalance || 0n, shortBalance || 0n);
      // Wait for success and then mark claimed local
      await onClaimPayout(bet.id, market?.address || "");
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  const hasTokens = (longBalance && longBalance > 0n) || (shortBalance && shortBalance > 0n);

  return (
    <div
      className="glass-panel"
      style={{
        padding: "0.875rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        opacity: isClaimed ? 0.6 : 0.9,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {won ? <CheckCircle size={18} color="var(--yes-green)" /> : <XCircle size={18} color="var(--no-red)" />}
      </div>
      <div style={{ flex: 1, minWidth: "180px", fontSize: "0.85rem", color: "var(--text-1)" }}>
        {bet.marketTitle}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            color: bet.side === "YES" ? "var(--yes-green)" : "var(--no-red)",
          }}
        >
          {bet.side}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: won ? "var(--yes-green)" : "var(--text-3)",
            marginRight: "1rem",
          }}
        >
          {won ? `+${(bet.amount * 2).toFixed(0)} USDC` : `-${bet.amount} USDC`}
        </span>

        {won && market && (
          isClaimed ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                color: "var(--text-3)",
                padding: "0.2rem 0.5rem",
                background: "var(--bg-3)",
                border: "1px solid var(--border-1)",
                borderRadius: "4px",
              }}
            >
              CLAIMED
            </span>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming || !hasTokens || settlePositionHook.isPending}
              className="cyber-btn"
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.68rem",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "0.05em",
                borderRadius: "4px",
                background: hasTokens ? "var(--teal)" : "var(--bg-3)",
                color: hasTokens ? "#ffffff" : "var(--text-3)",
                border: "none",
                cursor: hasTokens ? "pointer" : "not-allowed",
              }}
            >
              {settlePositionHook.isPending || claiming ? "CLAIMING..." : "CLAIM PAYOUT"}
            </button>
          )
        )}
      </div>
    </div>
  );
}
