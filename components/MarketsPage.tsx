import React, { useState, useMemo } from "react";
import { Filter, Share2 } from "lucide-react";
import { MarketCard } from "./MarketCard";
import { MarketCommentsSection } from "./MarketCommentsSection";
import { type MarketCardData } from "@/lib/markets";

const SORT_OPTIONS = [
  { value: "volume", label: "Top Volume" },
  { value: "pool", label: "Largest Pool" },
  { value: "newest", label: "Newest" },
  { value: "closing", label: "Closing Soon" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "resolving", label: "Resolving" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORIES = ["Arc Network", "Crypto", "Economy", "Equities", "Commodities", "Geopolitics"];

interface MarketsPageProps {
  markets: MarketCardData[];
  walletAddress?: string;
  onConnectClick: () => void;
  onMarketClick: (market: MarketCardData) => void;
  onQuickBet: (market: MarketCardData, side: "YES" | "NO") => void;
  onPlaceBet?: (marketId: string, side: "YES" | "NO", amount: number, txHash?: string) => Promise<string | undefined>;
  externalSearch?: string;
}

export function MarketsPage({
  markets,
  walletAddress,
  onConnectClick,
  onMarketClick,
  onQuickBet,
  onPlaceBet,
  externalSearch = "",
}: MarketsPageProps) {
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("volume");

  const filtered = useMemo(() => {
    let result = [...markets];
    
    // Filter by search
    if (externalSearch) {
      const q = externalSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }
    
    // Filter by category
    if (category !== "All") {
      result = result.filter((m) => m.category === category);
    }

    if (status !== "all") {
      result = result.filter((m) => {
        const mStatus = m.isReal ? "open" : "open";
        return mStatus === status;
      });
    }

    // Sort
    const parseVolume = (volStr: string) => {
      if (!volStr) return 0;
      const clean = volStr.replace(/[^0-9.]/g, "");
      let val = parseFloat(clean) || 0;
      if (volStr.toUpperCase().includes("K")) val *= 1000;
      if (volStr.toUpperCase().includes("M")) val *= 1000000;
      return val;
    };

    switch (sort) {
      case "volume":
        result.sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume));
        break;
      case "pool":
        result.sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume));
        break;
      case "newest":
        result.sort((a, b) => (b.isReal ? 1 : 0) - (a.isReal ? 1 : 0));
        break;
      case "closing":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return result;
  }, [markets, externalSearch, category, status, sort]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "1.5rem",
        alignItems: "start",
      }}
      className="markets-page-layout"
    >
      {/* Left Main Content: Category Pills, Filters, Markets Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Category Filter Pills */}
        <div style={{ marginBottom: "0.25rem" }}>
          <div className="category-strip">
            {["All", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                id={`cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className={`cat-pill${category === cat ? " active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sort / Status controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--text-2)", fontWeight: 500 }}>
            {filtered.length} markets
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="cyber-select"
              style={{
                fontSize: "0.8rem",
                padding: "0.35rem 0.75rem",
                width: "auto",
                borderRadius: "var(--r-pill)",
                height: "34px",
                background: "var(--bg-1)",
                color: "var(--text-0)",
                border: "1.5px solid var(--border-1)",
              }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value} style={{ background: "var(--bg-1)", color: "var(--text-0)" }}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              id="sort-markets"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cyber-select"
              style={{
                fontSize: "0.8rem",
                padding: "0.35rem 0.75rem",
                width: "auto",
                borderRadius: "var(--r-pill)",
                height: "34px",
                background: "var(--bg-1)",
                color: "var(--text-0)",
                border: "1.5px solid var(--border-1)",
              }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value} style={{ background: "var(--bg-1)", color: "var(--text-0)" }}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Markets Grid */}
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <Filter size={32} color="var(--text-3)" style={{ margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>
              No markets match your filters.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "1rem",
            }}
            className="markets-grid"
          >
            {filtered.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                walletAddress={walletAddress}
                onConnectClick={onConnectClick}
                onDetailClick={onMarketClick}
                onQuickBet={onQuickBet}
                onPlaceBet={onPlaceBet}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar: Polykoe Comments & X Discussion Section */}
      <div className="markets-page-sidebar" style={{ position: "sticky", top: "85px" }}>
        <MarketCommentsSection marketId="global_feed" marketTitle="4Cast Arc Prediction Markets" />
      </div>

      <style>{`
        @media (max-width: 1080px) {
          .markets-page-layout { grid-template-columns: 1fr !important; }
          .markets-page-sidebar { position: static !important; margin-top: 1.5rem; }
        }
        @media (max-width: 700px) {
          .markets-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
