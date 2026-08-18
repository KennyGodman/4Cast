import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { MarketsPage } from "@/components/MarketsPage";
import { CreateMarket } from "@/components/CreateMarket";
import { MyBets } from "@/components/MyBets";
import { Leaderboard } from "@/components/Leaderboard";
import { LandingPage } from "@/components/LandingPage";
import { WalletConnectModal } from "@/components/WalletConnectModal";
import { AlertModal } from "@/components/AlertModal";
import { MarketDetailModal } from "@/components/MarketDetailModal";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { MARKETS, type MarketCardData, type DynamicMarket, dynamicToCardData } from "@/lib/markets";
import { useWallet } from "@/contexts/WalletContext";
import { getUserBets, saveUserBet, updateUserBet, generateTxHash, type UserBet } from "@/lib/bets";

export default function App() {
  const { address } = useWallet();

  const [view, setView] = useState<"home" | "app">("home");
  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [activeTab, setActiveTab] = useState("markets");
  const [dynamicMarkets, setDynamicMarkets] = useState<MarketCardData[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("4cast_dynamic_markets");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedMarket, setSelectedMarket] = useState<MarketCardData | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");

  // Dark Mode Theme State
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Load theme preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("4cast_dark_mode");
    if (saved !== null) {
      setDarkMode(saved === "true");
    }
  }, []);

  // Local user bets database with auto-migration and live reactivity
  const [userBets, setUserBets] = useState<UserBet[]>(getUserBets);

  // Modal Overlays
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; actionUrl?: string; actionText?: string } | null>(null);

  // Sync theme with HTML attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("4cast_dark_mode", String(darkMode));
  }, [darkMode]);

  // Reactive listener for bets updates across modals/tabs
  useEffect(() => {
    const handleBetsUpdated = () => {
      setUserBets(getUserBets());
    };

    window.addEventListener("4cast_bets_updated", handleBetsUpdated);
    window.addEventListener("storage", handleBetsUpdated);
    return () => {
      window.removeEventListener("4cast_bets_updated", handleBetsUpdated);
      window.removeEventListener("storage", handleBetsUpdated);
    };
  }, []);

  // Sync dynamic markets to localStorage
  useEffect(() => {
    localStorage.setItem("4cast_dynamic_markets", JSON.stringify(dynamicMarkets));
  }, [dynamicMarkets]);

  // Fetch on-chain deployed markets from API server
  const fetchDynamicMarkets = useCallback(async () => {
    try {
      const res = await fetch("/api/markets");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const { dynamicToCardData } = await import("@/lib/markets");
          setDynamicMarkets(data.map(dynamicToCardData));
        }
      }
    } catch {
      // API server may not be running — fall back to localStorage cache silently
    }
  }, []);

  useEffect(() => {
    fetchDynamicMarkets();
    const interval = setInterval(fetchDynamicMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchDynamicMarkets]);

  // Combine static mock markets & dynamic on-chain markets
  const allMarkets = [...dynamicMarkets, ...MARKETS];

  const handlePlaceBetLocal = async (marketId: string, side: "YES" | "NO", amount: number, customTxHash?: string) => {
    const market = allMarkets.find((m) => m.id === marketId);
    if (!market) return;

    const betId = `bet-${Date.now()}`;
    const txHash = customTxHash || generateTxHash();

    const newBet: UserBet = {
      id: betId,
      txHash,
      marketId,
      marketTitle: market.title,
      side,
      amount,
      placedAt: new Date().toISOString(),
      status: "open",
      claimed: false,
    };

    saveUserBet(newBet);
    setUserBets((prev) => [newBet, ...prev.filter((b) => b.id !== betId)]);
    return txHash;
  };

  const handleClaimPayoutLocal = async (betId: string, _marketAddress: string) => {
    updateUserBet(betId, { claimed: true, status: "settled" });
    setUserBets((prev) =>
      prev.map((b) => (b.id === betId ? { ...b, claimed: true, status: "settled" } : b))
    );
    setCustomAlert({
      title: "Winnings Claimed",
      message: "The payout position has been settled and funds recorded to your wallet.",
    });
  };

  const handleCreateMarketLocal = (newMarket: MarketCardData) => {
    setDynamicMarkets((prev) => [newMarket, ...prev]);
    setActiveTab("markets");
    setCustomAlert({
      title: "Market Deployed Successfully",
      message: `Your contract has been created on Arc Testnet. Address: ${newMarket.address}`,
      actionUrl: `https://testnet.arcscan.app/address/${newMarket.address}`,
      actionText: "View on ArcScan",
    });
  };

  const handleLaunchApp = (targetMarket?: MarketCardData) => {
    setIsLoadingApp(true);
    if (targetMarket) {
      setSelectedMarket(targetMarket);
    }
    setView("app");
  };

  if (view === "home") {
    return (
      <>
        <LandingPage
          onLaunchApp={() => handleLaunchApp()}
          onSelectMarket={(m) => handleLaunchApp(m)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          markets={allMarkets}
        />

        {/* Modal overlays in home mode if opened */}
        {selectedMarket && (
          <MarketDetailModal
            market={selectedMarket}
            onClose={() => setSelectedMarket(null)}
            onConnectClick={() => setShowWalletModal(true)}
            bets={userBets}
            onPlaceBet={handlePlaceBetLocal}
            onShowAlert={(alert) => setCustomAlert(alert)}
          />
        )}

        {showWalletModal && (
          <WalletConnectModal
            onClose={() => setShowWalletModal(false)}
            onShowAlert={(alert) => setCustomAlert(alert)}
          />
        )}

        {customAlert && (
          <AlertModal
            title={customAlert.title}
            message={customAlert.message}
            actionUrl={customAlert.actionUrl}
            actionText={customAlert.actionText}
            onClose={() => setCustomAlert(null)}
          />
        )}
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--bg-0)",
        color: "var(--text-0)",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* Loading Overlay Screen */}
      {isLoadingApp && (
        <AppLoadingScreen
          onComplete={() => setIsLoadingApp(false)}
          duration={1500}
        />
      )}

      {/* Header component */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onConnectClick={() => setShowWalletModal(true)}
        onGoHome={() => setView("home")}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: "2.25rem 1.25rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {activeTab === "markets" && (
            <MarketsPage
              markets={allMarkets}
              walletAddress={address || undefined}
              onConnectClick={() => setShowWalletModal(true)}
              onMarketClick={setSelectedMarket}
              onQuickBet={(market, _side) => {
                setSelectedMarket(market);
              }}
              onPlaceBet={handlePlaceBetLocal}
              externalSearch={headerSearch}
            />
          )}

          {activeTab === "create" && (
            <CreateMarket onCreateMarket={handleCreateMarketLocal} />
          )}

          {activeTab === "my-bets" && (
            <MyBets
              bets={userBets}
              markets={allMarkets}
              onClaimPayout={handleClaimPayoutLocal}
            />
          )}

          {activeTab === "leaderboard" && <Leaderboard />}
        </div>
      </main>

      {/* Footer tagline strip */}
      <footer
        style={{
          background: "var(--bg-header)",
          borderTop: "1px solid var(--border-0)",
          padding: "3rem 1.5rem",
          textAlign: "center",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div style={{ marginBottom: "0.75rem" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--teal-light)",
              margin: "0 auto 0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.35rem",
            }}
          >
            🔮
          </div>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--text-0)",
            letterSpacing: "-0.015em",
            marginBottom: "1rem",
            lineHeight: 1.3,
          }}
        >
          Predict opinions that matter to you.
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <a
            href="https://www.youtube.com/results?search_query=prediction+markets"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "var(--r-pill)",
              background: "var(--bg-3)",
              border: "1.5px solid var(--border-1)",
              color: "var(--text-0)",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              transition: "all 0.15s ease",
            }}
          >
            <span>Learn Prediction Markets</span>
          </a>
        </div>
        <p
          style={{
            marginTop: "2rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.68rem",
            color: "var(--text-3)",
          }}
        >
          Powered by Circle passkeys & UMA Optimistic Oracle on Arc Testnet.
        </p>
      </footer>

      {/* Detail Modal Overlay */}
      {selectedMarket && (
        <MarketDetailModal
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
          onConnectClick={() => setShowWalletModal(true)}
          bets={userBets}
          onPlaceBet={handlePlaceBetLocal}
          onShowAlert={(alert) => setCustomAlert(alert)}
        />
      )}

      {/* Wallet Connection Dialog Overlay */}
      {showWalletModal && (
        <WalletConnectModal
          onClose={() => setShowWalletModal(false)}
          onShowAlert={(alert) => setCustomAlert(alert)}
        />
      )}

      {/* Alert Overlay */}
      {customAlert && (
        <AlertModal
          title={customAlert.title}
          message={customAlert.message}
          actionUrl={customAlert.actionUrl}
          actionText={customAlert.actionText}
          onClose={() => setCustomAlert(null)}
        />
      )}
    </div>
  );
}
