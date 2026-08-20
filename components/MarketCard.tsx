import React, { useState } from "react";
import { Clock, Share2, Droplets, Zap } from "lucide-react";
import { type MarketCardData } from "@/lib/markets";
import { useMarketCardData } from "@/hooks/useMarket";
import { type Address } from "viem";
import { BetConfirmModal } from "./BetConfirmModal";

function daysUntil(dateStr: string) {
  if (!dateStr) return "30 days";
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "Ended";
  if (days === 0) return "Today";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return `${months} months`;
}

function fakeCreator(marketId: string) {
  const names = ["CryptoWolf", "AcePredictor", "MarketMaker", "StarGazer", "BullBear", "NightOwl", "DataDriven"];
  const idx = marketId ? parseInt(marketId.replace(/\D/g, ""), 10) % names.length : 0;
  return names[isNaN(idx) ? 0 : idx] || "CryptoWolf";
}

interface MarketCardProps {
  market: MarketCardData;
  walletAddress?: string;
  onConnectClick: () => void;
  onDetailClick: (market: MarketCardData) => void;
  onQuickBet: (market: MarketCardData, side: "YES" | "NO") => void;
  onPlaceBet?: (marketId: string, side: "YES" | "NO", amount: number, txHash?: string) => Promise<string | undefined>;
}

export function MarketCard({
  market,
  walletAddress,
  onConnectClick,
  onDetailClick,
  onQuickBet,
  onPlaceBet,
}: MarketCardProps) {
  const [pendingSide, setPendingSide] = useState<"YES" | "NO" | null>(null);

  // Load live contract state if it's a real on-chain market
  const { status, volume, settlementOutcome, ammYesPrice, isLoading } = useMarketCardData(
    market.address as Address,
    market.ammAddress as Address | undefined,
    !!market.isReal
  );

  const isReal = !!market.isReal;
  const isSettled = isReal && status === "Settled";
  const hasAmmPrice = isReal && ammYesPrice !== undefined;

  // Use dynamic AMM price for real markets, static price for demos
  const yesPercent = hasAmmPrice
    ? Math.round(ammYesPrice * 100)
    : !isReal
    ? Math.round(market.yesPrice * 100)
    : null;

  const displayVolume = isReal
    ? hasAmmPrice
      ? (volume ?? "0.00 USDC")
      : "0.00 USDC"
    : market.volume;

  const handleBet = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.stopPropagation();
    setPendingSide(side);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: market.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  };

  const creator = fakeCreator(market.id);
  const isOpen = !isReal || status === "Active" || status === "Not Initialized";
  const isResolving = isReal && status === "Active" && yesPercent === null; // resolving if active but AMM not active, or simple mapping

  if (isReal && isLoading) {
    return (
      <div
        className="market-card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          minHeight: "160px",
          justifyContent: "center",
          alignItems: "center",
          opacity: 0.6,
        }}
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Loading live market data...</span>
      </div>
    );
  }

  return (
    <>
      <div
        id={`market-card-${market.id}`}
        className="market-card"
        onClick={() => onDetailClick(market)}
        style={{
          cursor: "pointer",
          opacity: 1,
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDetailClick(market);
        }}
      >
        {/* Header: thumbnail + title + % */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          {/* Thumbnail using category color */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              flexShrink: 0,
              background: `linear-gradient(135deg, ${getCatColor(market.category)} 0%, ${getCatColorDark(market.category)} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              overflow: "hidden",
            }}
          >
            {getCatEmoji(market.category)}
          </div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.9rem",
                lineHeight: 1.4,
                color: "var(--text-0)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {market.title}
            </div>

            {/* Status chip */}
            <div
              style={{
                marginTop: "0.3rem",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                flexWrap: "wrap",
              }}
            >
              {market.category === "Arc Network" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.2rem",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.55rem",
                    borderRadius: "var(--r-pill)",
                    background: "rgba(30, 104, 201, 0.15)",
                    color: "var(--teal)",
                    border: "1px solid rgba(30, 104, 201, 0.35)",
                  }}
                >
                  ⚡ Arc Mainnet
                </span>
              )}
              {isResolving && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "var(--r-pill)",
                    letterSpacing: "0.03em",
                    background: "rgba(217,119,6,0.1)",
                    color: "var(--resolving)",
                    border: "1px solid rgba(217,119,6,0.2)",
                  }}
                >
                  <Zap size={9} fill="currentColor" /> Resolving
                </span>
              )}
              {isSettled && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "var(--r-pill)",
                    background: "var(--bg-3)",
                    color: "var(--text-3)",
                    border: "1px solid var(--border-0)",
                  }}
                >
                  {settlementOutcome ? `✓ Resolved ${settlementOutcome}` : "Resolved"}
                </span>
              )}
              {hasAmmPrice && !isSettled && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.2rem",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "var(--r-pill)",
                    background: "var(--teal-light)",
                    color: "var(--teal)",
                    border: "1px solid var(--border-teal)",
                  }}
                >
                  ⛓️ On-Chain
                </span>
              )}
            </div>
          </div>

          {/* Probability % */}
          {yesPercent !== null && (
            <div
              style={{
                flexShrink: 0,
                fontWeight: 700,
                fontSize: "1.2rem",
                color: yesPercent >= 50 ? "var(--yes-green)" : "var(--no-red)",
                fontFamily: "var(--font-display)",
                lineHeight: 1,
                marginTop: "2px",
              }}
            >
              {yesPercent}%
            </div>
          )}
        </div>

        {/* YES/NO buttons or Resolved state */}
        {isOpen && !isSettled ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              id={`bet-yes-${market.id}`}
              className="yes-btn"
              onClick={(e) => handleBet(e, "YES")}
              style={{
                borderRadius: "var(--r-md)",
                padding: "0.45rem",
                fontSize: "0.85rem",
                flex: 1,
              }}
            >
              Yes
            </button>
            <button
              id={`bet-no-${market.id}`}
              className="no-btn"
              onClick={(e) => handleBet(e, "NO")}
              style={{
                borderRadius: "var(--r-md)",
                padding: "0.45rem",
                fontSize: "0.85rem",
                flex: 1,
              }}
            >
              No
            </button>
          </div>
        ) : isSettled ? (
          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--r-md)",
              background: settlementOutcome === "YES" ? "var(--yes-bg)" : "var(--no-bg)",
              border: `1px solid ${settlementOutcome === "YES" ? "var(--yes-border)" : "var(--no-border)"}`,
              textAlign: "center",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: settlementOutcome === "YES" ? "var(--yes-green)" : "var(--no-red)",
            }}
          >
            ✓ Resolved {settlementOutcome}
          </div>
        ) : null}

        {/* Footer: creator · time · liquidity · share */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            borderTop: "1px solid var(--border-0)",
            paddingTop: "0.625rem",
            fontSize: "0.72rem",
            color: "var(--text-3)",
            fontFamily: "var(--font-body)",
          }}
        >
          <span style={{ fontWeight: 500, color: "var(--text-2)" }}>by {creator}</span>
          <span>·</span>
          <Clock size={11} strokeWidth={1.8} />
          <span>30 days</span>
          <span>·</span>
          <Droplets size={11} strokeWidth={1.8} color="var(--teal)" />
          <span>{displayVolume}</span>

          {/* Share button */}
          <button
            onClick={handleShare}
            title="Share market"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-3)",
              padding: "0.1rem",
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <Share2 size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {pendingSide && (
        <BetConfirmModal
          market={market}
          initialSide={pendingSide}
          onClose={() => setPendingSide(null)}
          onPlaceBet={onPlaceBet}
        />
      )}
    </>
  );
}

/* Category helpers */
function getCatColor(cat: string) {
  const map: Record<string, string> = {
    Crypto: "#e0f2fe",
    Economy: "#dcfce7",
    Equities: "#fef3c7",
    Commodities: "#ede9fe",
    Geopolitics: "#fce7f3",
  };
  return map[cat] || "#f0f2f5";
}

function getCatColorDark(cat: string) {
  const map: Record<string, string> = {
    Crypto: "#bae6fd",
    Economy: "#bbf7d0",
    Equities: "#fde68a",
    Commodities: "#ddd6fe",
    Geopolitics: "#fbcfe8",
  };
  return map[cat] || "#e2e8f0";
}

function getCatEmoji(cat: string) {
  const map: Record<string, string> = {
    Crypto: "₿",
    Economy: "💵",
    Equities: "📈",
    Commodities: "🥇",
    Geopolitics: "🌍",
  };
  return map[cat] || "📊";
}
