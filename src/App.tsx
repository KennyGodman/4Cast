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
import { OnboardingModal } from "@/components/OnboardingModal";
import { MARKETS, type MarketCardData, type DynamicMarket, dynamicToCardData } from "@/lib/markets";
import { useWallet } from "@/contexts/WalletContext";
import { getUserBets, saveUserBet, updateUserBet, generateTxHash, generateGenLayerPrediction, type UserBet } from "@/lib/bets";

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
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; actionUrl?: string; actionText?: string } | null>(null);

  // Sync theme with HTML attribute
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
    localStorage.setItem("4cast_dark_mode", String(darkMode));
  }, [darkMode]);

  // Sync bets with storage updates
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

  // Fetch dynamic markets from backend API
  const fetchDynamicMarkets = useCallback(async () => {
    try {
      const res = await fetch("/api/markets");
      if (!res.ok) return;
      const data: DynamicMarket[] = await res.json();
      if (Array.isArray(data)) {
        const cardData = data.map(dynamicToCardData);
        setDynamicMarkets(cardData);
        localStorage.setItem("4cast_dynamic_markets", JSON.stringify(cardData));
      }
    } catch {
      // Offline or mock mode
    }
  }, []);

  useEffect(() => {
    fetchDynamicMarkets();
    const interval = setInterval(fetchDynamicMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchDynamicMarkets]);

  // Combine static mock markets & dynamic on-chain markets
  const allMarkets = [...dynamicMarkets, ...MARKETS];

  const handlePlaceBetLocal = useCallback(
    async (
      marketId: string,
      side: "YES" | "NO",
      amount: number,
      customTxHash?: string,
      network: "arc" | "genlayer" = "arc",
      currency: "USDC" | "GEN" = "USDC"
    ) => {
      const market = allMarkets.find((m) => m.id === marketId);
      if (!market) return;

      const txHash = customTxHash || generateTxHash();
      const betId = `bet-${txHash.slice(2, 12)}`;

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
        network,
        currency,
        genlayerPrediction: generateGenLayerPrediction(market.title, side),
      };

      saveUserBet(newBet);
      setUserBets(getUserBets());
      return txHash;
    },
    [allMarkets]
  );

  const handleClaimPayoutLocal = useCallback(async (betId: string, _marketAddress: string) => {
    updateUserBet(betId, { claimed: true, status: "settled" });
    setUserBets(getUserBets());
    setCustomAlert({
      title: "Winnings Claimed",
      message: "The payout position has been settled and funds recorded to your wallet.",
    });
  }, []);

  const handleFastSettleBet = useCallback((betId: string, outcome: "YES" | "NO") => {
    updateUserBet(betId, { status: "settled", outcome });
    setUserBets(getUserBets());
    setCustomAlert({
      title: "Consensus Finalized!",
      message: `GenLayer AI jury (5/5 validators) verified web ground truth and settled the market as ${outcome}. You can now claim your winnings!`,
    });
  }, []);

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
          onSelectMarket={(market) => handleLaunchApp(market)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          markets={allMarkets}
        />

        {showWalletModal && (
          <WalletConnectModal
            onClose={() => setShowWalletModal(false)}
            onShowAlert={(alert) => setCustomAlert(alert)}
          />
        )}
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
        onOpenOnboarding={() => setShowOnboardingModal(true)}
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
              onSettleBet={handleFastSettleBet}
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
          <button
            onClick={() => setShowOnboardingModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "var(--r-pill)",
              background: "var(--bg-3)",
              border: "1.5px solid var(--border-1)",
              color: "var(--text-0)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>📖 Platform Guide & Dual-Network Architecture</span>
          </button>
        </div>
        <p
          style={{
            marginTop: "2rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.68rem",
            color: "var(--text-3)",
          }}
        >
          Powered by Circle passkeys on Arc Testnet & GenVM Intelligent Contracts on GenLayer Studio Next.
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
          onSettleBet={handleFastSettleBet}
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

      {/* Onboarding Guide Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onStartDemo={() => setActiveTab("markets")}
      />

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
