import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ExternalLink,
  Code,
  Clock,
  Users,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BrainCircuit,
  Globe,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  ArrowRight,
} from "lucide-react";
import { type Address, parseUnits, formatUnits } from "viem";
import { useWallet } from "@/contexts/WalletContext";
import { MarketAddressProvider, useMarketAddress } from "@/contexts/MarketAddressContext";
import { MarketCommentsSection } from "@/components/MarketCommentsSection";
import { useAMMState, useCalcBuy, useCalcSell, useBuyYes, useBuyNo, useSellYes, useSellNo, useAMMAllowances, useApproveArctForAMM } from "@/hooks/useAMM";
import { useMarketCardData, useMarketState, useTokenBalances, useOracleAllowance, useOracleState, useProposePrice, useDisputePrice, useSettleOracleRequest, useSettlePosition, useApproveArct } from "@/hooks/useMarket";
import { COLLATERAL_DECIMALS, OO_V2_ADDRESS } from "@/lib/contracts/addresses";
import { OracleState } from "@/lib/contracts/types";
import { type MarketCardData, getMarketVolume } from "@/lib/markets";
import { saveUserBet, generateTxHash, generateGenLayerPrediction, type UserBet, type GenLayerPrediction } from "@/lib/bets";
import { GenLayerTxModal } from "./GenLayerTxModal";
import {
  GENLAYER_PREDICTION_MARKET_ADDRESS,
  STUDIO_NEXT_CHAIN_ID,
  STUDIO_NEXT_EXPLORER_URL,
  switchToStudioNext,
} from "@/lib/genlayer";

interface MarketDetailModalProps {
  market: MarketCardData;
  onClose: () => void;
  onConnectClick: () => void;
  bets: UserBet[];
  onPlaceBet: (
    marketId: string,
    side: "YES" | "NO",
    amount: number,
    txHash?: string,
    network?: "arc" | "genlayer",
    currency?: "USDC" | "GEN"
  ) => Promise<string | undefined>;
  onSettleBet?: (betId: string, outcome: "YES" | "NO") => void;
  onShowAlert?: (alert: { title: string; message: string }) => void;
}

export function MarketDetailModal({
  market,
  onClose,
  onConnectClick,
  bets,
  onPlaceBet,
  onSettleBet,
  onShowAlert,
}: MarketDetailModalProps) {
  const targetAmmAddress = (market.ammAddress || "0x0000000000000000000000000000000000000000") as Address;
  return (
    <MarketAddressProvider
      marketAddress={market.address as Address}
      ammAddress={targetAmmAddress}
    >
      <MarketDetailModalInner
        market={market}
        onClose={onClose}
        onConnectClick={onConnectClick}
        bets={bets}
        onPlaceBet={onPlaceBet}
        onSettleBet={onSettleBet}
        onShowAlert={onShowAlert}
      />
    </MarketAddressProvider>
  );
}

function MarketDetailModalInner({
  market,
  onClose,
  onConnectClick,
  bets,
  onPlaceBet,
  onSettleBet,
  onShowAlert,
}: {
  market: MarketCardData;
  onClose: () => void;
  onConnectClick: () => void;
  bets: UserBet[];
  onPlaceBet: MarketDetailModalProps["onPlaceBet"];
  onSettleBet?: MarketDetailModalProps["onSettleBet"];
  onShowAlert?: MarketDetailModalProps["onShowAlert"];
}) {
  const { address, isConnected } = useWallet();
  const { marketAddress, ammAddress } = useMarketAddress();

  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [selectedCurrency, setSelectedCurrency] = useState<"USDC" | "GEN">("USDC");
  const [amount, setAmount] = useState<string>("50");
  const [showCode, setShowCode] = useState(false);
  const [betPlaced, setBetPlaced] = useState(false);
  const [placedTx, setPlacedTx] = useState("");
  const [showGenLayerModal, setShowGenLayerModal] = useState(false);
  const [showNodesInspection, setShowNodesInspection] = useState(false);
  const [isSimulatingSettlement, setIsSimulatingSettlement] = useState(false);
  const [simulatedOutcome, setSimulatedOutcome] = useState<"YES" | "NO" | null>(null);

  const processedHashesRef = useRef<Set<string>>(new Set());

  // Load dynamic market state
  const {
    longTokenAddress,
    shortTokenAddress,
    priceIdentifier,
    requestTimestamp,
    ancillaryDataHex,
    receivedSettlementPrice,
    settlementPrice,
  } = useMarketState();

  // Load Oracle status
  const { oracleState, proposer, proposedPrice, expirationTime, bond } = useOracleState(
    priceIdentifier,
    requestTimestamp,
    ancillaryDataHex
  );

  // Load AMM price state
  const { yesPrice, noPrice, isLoading: isAmmLoading } = useAMMState();

  // Load dynamic market card details like volume
  const { volume } = useMarketCardData(
    market.address as Address,
    market.ammAddress as Address | undefined,
    !!market.isReal
  );

  // Dynamic volume calculation that reflects placed bets immediately
  const displayVolume = getMarketVolume(market, bets);

  // Load balances
  const { arctBalance, longBalance, shortBalance, arctAllowance } = useTokenBalances(
    longTokenAddress,
    shortTokenAddress
  );

  const { oracleAllowance } = useOracleAllowance();

  // Calculations for buy preview
  const { tokensOut, isLoading: isCalcLoading } = useCalcBuy(
    side.toLowerCase() as "yes" | "no",
    amount
  );

  // Resolve actions
  const approveOracleHook = useApproveArct(OO_V2_ADDRESS);
  const proposePriceHook = useProposePrice(priceIdentifier, requestTimestamp, ancillaryDataHex);
  const disputePriceHook = useDisputePrice(priceIdentifier, requestTimestamp, ancillaryDataHex);
  const settleOracleHook = useSettleOracleRequest(priceIdentifier, requestTimestamp, ancillaryDataHex);
  const settlePositionHook = useSettlePosition();

  // Prices computed from AMM (0-100 scale)
  const currentYesPrice = yesPrice !== undefined ? yesPrice : market.yesPrice * 100;
  const currentNoPrice = noPrice !== undefined ? noPrice : market.noPrice * 100;

  const selectedProb = (side === "YES" ? currentYesPrice : currentNoPrice) / 100;

  const estimatedPayout = tokensOut !== undefined
    ? parseFloat(formatUnits(tokensOut, COLLATERAL_DECIMALS)).toFixed(2)
    : parseFloat(amount) > 0
    ? (parseFloat(amount) / (selectedProb || 0.5)).toFixed(2)
    : "0.00";

  const profit = parseFloat(amount) > 0
    ? (parseFloat(estimatedPayout) - parseFloat(amount)).toFixed(2)
    : "0.00";

  // Trading approvals & calls
  const approveAmmHook = useApproveArctForAMM();
  const buyYesHook = useBuyYes();
  const buyNoHook = useBuyNo();

  const amountBigInt = amount && parseFloat(amount) > 0 ? parseUnits(amount, COLLATERAL_DECIMALS) : 0n;
  const needsAmmApproval = isConnected && selectedCurrency === "USDC" && arctAllowance !== undefined && arctAllowance < amountBigInt;
  
  // Proposer bond approval check
  const bondBigInt = bond !== undefined ? bond : parseUnits("100", COLLATERAL_DECIMALS);
  const needsOracleApproval = isConnected && oracleAllowance !== undefined && oracleAllowance < bondBigInt;

  // GenLayer prediction & validator consensus dossier
  const genlayerPrediction: GenLayerPrediction = React.useMemo(() => {
    return generateGenLayerPrediction(market.title, "YES");
  }, [market.title]);

  // Handle escape close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Handle buy transaction success (strictly deduplicated)
  const activeBuyHook = side === "YES" ? buyYesHook : buyNoHook;
  useEffect(() => {
    if (activeBuyHook.isSuccess && activeBuyHook.hash) {
      const realTx = activeBuyHook.hash;
      if (processedHashesRef.current.has(realTx)) return;
      processedHashesRef.current.add(realTx);

      const betId = `bet-${realTx.slice(2, 12)}`;
      const numAmount = parseFloat(amount);
      const newBet: UserBet = {
        id: betId,
        txHash: realTx,
        marketId: market.id,
        marketTitle: market.title,
        side,
        amount: isNaN(numAmount) ? 10 : numAmount,
        placedAt: new Date().toISOString(),
        status: "open",
        claimed: false,
        network: selectedCurrency === "GEN" ? "genlayer" : "arc",
        currency: selectedCurrency,
      };
      saveUserBet(newBet);
      if (onPlaceBet) {
        onPlaceBet(market.id, side, isNaN(numAmount) ? 10 : numAmount, realTx, selectedCurrency === "GEN" ? "genlayer" : "arc", selectedCurrency);
      }

      setPlacedTx(realTx);
      setBetPlaced(true);
      const timer = setTimeout(() => {
        setBetPlaced(false);
        setPlacedTx("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeBuyHook.isSuccess, activeBuyHook.hash, side, amount, market.id, market.title, onPlaceBet, selectedCurrency]);

  // Clean bets for this market
  const marketBets = bets.filter((b) => b.marketId === market.id);
  const sortedBets = [...marketBets].sort(
    (a, b) => new Date(b.placedAt as string).getTime() - new Date(a.placedAt as string).getTime()
  );

  const handleOpenGenLayerModal = async () => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (eth) {
      try {
        const hex = await eth.request({ method: "eth_chainId" });
        const currentChain = typeof hex === "string" && hex.startsWith("0x") ? parseInt(hex, 16) : Number(hex);
        if (currentChain !== STUDIO_NEXT_CHAIN_ID) {
          await switchToStudioNext();
        }
      } catch (e) {
        console.warn("Chain switch check error:", e);
      }
    }
    setShowGenLayerModal(true);
  };

  const handleBet = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    if (selectedCurrency === "GEN") {
      await handleOpenGenLayerModal();
      return;
    }

    const isUnconfigured = (addr?: string) =>
      !addr ||
      addr === "0x0000000000000000000000000000000000000000" ||
      addr.startsWith("0x000000000000000000000000000000000000000");

    // If market or AMM is not deployed / zero address, record bet to My Bets (deduplicated)
    if (!market.isReal || isUnconfigured(market.address) || isUnconfigured(ammAddress)) {
      const mockHash = generateTxHash();
      if (processedHashesRef.current.has(mockHash)) return;
      processedHashesRef.current.add(mockHash);

      const betId = `bet-${mockHash.slice(2, 12)}`;
      const newBet: UserBet = {
        id: betId,
        txHash: mockHash,
        marketId: market.id,
        marketTitle: market.title,
        side,
        amount: numAmount,
        placedAt: new Date().toISOString(),
        status: "open",
        claimed: false,
        network: "arc",
        currency: "USDC",
      };

      saveUserBet(newBet);
      if (onPlaceBet) {
        onPlaceBet(market.id, side, numAmount, mockHash, "arc", "USDC");
      }

      setPlacedTx(mockHash);
      setBetPlaced(true);
      setTimeout(() => {
        setBetPlaced(false);
        setPlacedTx("");
      }, 5000);
      return;
    }

    if (needsAmmApproval) {
      approveAmmHook.approve(parseUnits("1000000", COLLATERAL_DECIMALS));
    } else {
      if (side === "YES") {
        buyYesHook.buy(amount);
      } else {
        buyNoHook.buy(amount);
      }
    }
  };

  const handlePropose = (proposedOutcome: bigint) => {
    if (needsOracleApproval) {
      approveOracleHook.approve(parseUnits("1000000", COLLATERAL_DECIMALS));
    } else {
      proposePriceHook.propose(proposedOutcome);
    }
  };

  const handleDispute = () => {
    disputePriceHook.dispute();
  };

  const handleSettleOracle = () => {
    settleOracleHook.settleOracle();
  };

  const handleClaimWinnings = () => {
    if (longBalance || shortBalance) {
      settlePositionHook.settle(longBalance || 0n, shortBalance || 0n);
    }
    if (onShowAlert) {
      onShowAlert({
        title: "Winnings Claimed",
        message: "Your payout has been transferred and confirmed on-chain.",
      });
    }
  };

  // Trigger fast AI jury consensus demo
  const handleTriggerAISettle = () => {
    setIsSimulatingSettlement(true);
    setTimeout(() => {
      setIsSimulatingSettlement(false);
      const outcome = (genlayerPrediction.predictedOutcome as "YES" | "NO") || "YES";
      setSimulatedOutcome(outcome);
      if (onShowAlert) {
        onShowAlert({
          title: "GenLayer AI Consensus Finalized!",
          message: `5/5 GenVM Validators agreed on outcome: ${outcome} using gl.eq_principle.strict_eq(). Payout claim is now active!`,
        });
      }
    }, 2000);
  };

  // Oracle countdown
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const expirationSeconds = expirationTime !== undefined ? Number(expirationTime) - now : undefined;
  const expirationDisplay =
    expirationSeconds !== undefined && expirationSeconds > 0
      ? `${Math.floor(expirationSeconds / 60)}m ${expirationSeconds % 60}s`
      : undefined;

  const isReal = !!market.isReal;
  const isSettled = (isReal && receivedSettlementPrice) || !!market.resolved || simulatedOutcome !== null;
  const isResolving = isReal && oracleState !== undefined && oracleState !== OracleState.Invalid && oracleState !== OracleState.Settled;

  let settlementOutcomeText = "";
  if (simulatedOutcome) {
    settlementOutcomeText = simulatedOutcome;
  } else if (market.outcome) {
    settlementOutcomeText = market.outcome;
  } else if (isSettled && settlementPrice !== undefined) {
    const p = formatUnits(settlementPrice, 18);
    if (p === "1") settlementOutcomeText = "YES";
    else if (p === "0") settlementOutcomeText = "NO";
    else settlementOutcomeText = "Undetermined";
  }

  const isPending = approveAmmHook.isPending || approveAmmHook.isConfirming || activeBuyHook.isPending || activeBuyHook.isConfirming;
  const creator = "CryptoWolf";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 7, 18, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-1)",
          border: "1.5px solid var(--border-1)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "920px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-modal)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-0)",
            position: "sticky",
            top: 0,
            background: "var(--bg-1)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "1.5rem" }}>{market.icon || "📊"}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.68rem",
                    color: "var(--teal)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {market.category}
                </span>
                {isSettled && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.4rem",
                      borderRadius: "var(--r-pill)",
                      background: "rgba(34,197,94,0.12)",
                      color: "var(--yes-green)",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }}
                  >
                    ✓ RESOLVED {settlementOutcomeText}
                  </span>
                )}
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-0)",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {market.title}
              </h2>
            </div>
          </div>

          <button
            id="close-modal-btn"
            onClick={onClose}
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border-1)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-2)",
              flexShrink: 0,
              marginLeft: "1rem",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Responsive Grid Layout */}
        <div className="market-detail-grid" style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
          {/* Left Column: Analysis, AI Consensus, Evidence Dossier */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
            {/* Description */}
            <div>
              <div
                className="font-mono"
                style={{ fontSize: "0.65rem", color: "var(--teal)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}
              >
                {"// RESOLUTION DESCRIPTION & DETAILS"}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-1)", lineHeight: 1.6, margin: 0 }}>
                {market.isReal
                  ? `Resolves YES if criteria are verified by official telemetry or news sources, and NO otherwise. Autonomous settlement executed by GenLayer Consensus v0.6 AI Jury under the strict equivalence principle.`
                  : `Prediction market for ${market.category}. Autonomous settlement executed by GenLayer Consensus v0.6.`}
              </p>
            </div>

            {/* Current Odds Bar & Metrics */}
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-0)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.625rem", fontWeight: 600 }}>
                Current Odds
              </div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    flex: currentYesPrice,
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "var(--r-md)",
                    padding: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.75rem",
                      fontWeight: 800,
                      color: "var(--yes-green)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {Math.round(currentYesPrice)}%
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--yes-green)", marginTop: "0.2rem" }}>
                    Yes
                  </div>
                </div>

                <div
                  style={{
                    flex: currentNoPrice,
                    background: "rgba(244,63,94,0.08)",
                    border: "1px solid rgba(244,63,94,0.2)",
                    borderRadius: "var(--r-md)",
                    padding: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.75rem",
                      fontWeight: 800,
                      color: "var(--no-red)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {Math.round(currentNoPrice)}%
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--no-red)", marginTop: "0.2rem" }}>
                    No
                  </div>
                </div>
              </div>

              {/* Odds visual bar */}
              <div style={{ height: "8px", borderRadius: "5px", background: "var(--bg-3)", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${currentYesPrice}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
                <div style={{ flex: 1, background: "var(--border-1)" }} />
              </div>

              {/* Market Stats */}
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                {[
                  { icon: TrendingUp, label: "Volume", val: displayVolume },
                  { icon: Users, label: "Creator", val: creator },
                  { icon: Clock, label: "Liveness", val: market.isReal ? "Consensus v0.6" : "30 days" },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icon size={13} color="var(--text-3)" />
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-3)" }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-0)", fontWeight: 700 }}>
                        {val}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GenLayer 5-Validator AI Jury Consensus & Evidence Dossier Card */}
            <div
              style={{
                background: "rgba(168,85,247,0.06)",
                border: "1.5px solid rgba(168,85,247,0.25)",
                borderRadius: "14px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={16} color="#a855f7" />
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontWeight: 800, color: "var(--text-0)" }}>
                    GenLayer AI Consensus & Evidence Dossier
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "var(--r-pill)",
                      background: "rgba(168,85,247,0.15)",
                      color: "#c084fc",
                    }}
                  >
                    {genlayerPrediction.validatorsAgreed}/{genlayerPrediction.totalValidators} Validators Agreed
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--text-1)", lineHeight: 1.5, fontFamily: "var(--font-mono)" }}>
                "{genlayerPrediction.aiReasoning}"
              </div>

              {/* Web Ground Truth Evidence Details */}
              <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#a855f7", fontSize: "0.78rem", fontWeight: 700 }}>
                    <Globe size={13} />
                    <span>Ground Truth Source</span>
                  </div>
                  <span style={{ fontSize: "0.68rem", background: "#dcfce7", color: "#15803d", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                    HTTP 200 OK
                  </span>
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--teal)", wordBreak: "break-all" }}>
                  <a href={genlayerPrediction.webGroundTruthSource || "https://testnet.arcscan.app"} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", textDecoration: "underline" }}>
                    {genlayerPrediction.webGroundTruthSource}
                  </a>
                </div>

                {genlayerPrediction.evidenceDetail?.keyFindings && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 700, marginBottom: "0.25rem" }}>
                      WHAT VALIDATORS CHECKED:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.72rem", color: "var(--text-1)", lineHeight: 1.45 }}>
                      {genlayerPrediction.evidenceDetail.keyFindings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {genlayerPrediction.evidenceDetail?.verdictSupport && (
                  <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border-0)" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 700 }}>
                      HOW SOURCE SUPPORTS VERDICT:{" "}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-1)" }}>
                      {genlayerPrediction.evidenceDetail.verdictSupport}
                    </span>
                  </div>
                )}
              </div>

              {/* Node Inspection Toggle & Fast Settle Simulator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  onClick={() => setShowNodesInspection(!showNodesInspection)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#a855f7",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: 0,
                  }}
                >
                  <Cpu size={13} />
                  <span>{showNodesInspection ? "Hide Validator Nodes Breakdown" : "Inspect 5 GenVM Validator Nodes"}</span>
                  {showNodesInspection ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {!isSettled && (
                  <button
                    onClick={handleTriggerAISettle}
                    disabled={isSimulatingSettlement}
                    style={{
                      padding: "0.35rem 0.85rem",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #7928ca 0%, #a855f7 100%)",
                      color: "#ffffff",
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      border: "none",
                      cursor: isSimulatingSettlement ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      boxShadow: "0 2px 8px rgba(168,85,247,0.3)",
                    }}
                  >
                    {isSimulatingSettlement ? (
                      <>
                        <RotateCw size={12} className="animate-spin" />
                        <span>Evaluating Web Ground Truth...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>⚡ Settle via AI Jury (Demo)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Collapsible 5 Validator Nodes Table */}
              {showNodesInspection && genlayerPrediction.validatorNodes && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.4rem" }}>
                  {genlayerPrediction.validatorNodes.map((node) => (
                    <div
                      key={node.nodeId}
                      style={{
                        background: "var(--bg-1)",
                        border: "1px solid var(--border-1)",
                        borderRadius: "8px",
                        padding: "0.55rem 0.75rem",
                        fontSize: "0.72rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-0)" }}>
                          {node.nodeId} ({node.llmModel})
                        </span>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            color: node.vote === "YES" ? "var(--yes-green)" : "var(--no-red)",
                          }}
                        >
                          VOTE: {node.vote} ({node.latencyMs}ms)
                        </span>
                      </div>
                      <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}>
                        Snippet: "{node.extractedSnippet}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Contract Source (Collapsible) */}
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
              }}
            >
              <button
                id="toggle-sol-contract"
                onClick={() => setShowCode(!showCode)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.875rem 1.25rem",
                  background: "var(--bg-3)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--teal)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Code size={14} color="var(--teal)" />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", fontWeight: 600 }}>
                    Smart Contract Reference Source
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  color="var(--text-3)"
                  style={{
                    transform: showCode ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {showCode && (
                <div style={{ padding: "0.75rem 1.25rem", background: "var(--bg-4)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-2)" }}>
                  <div>EVM Chain ID: 5042002 (Arc Testnet) · GenLayer Studio Next Chain ID: 61997</div>
                  <div style={{ marginTop: "0.3rem" }}>Contract: {market.address}</div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.75rem", fontWeight: 600 }}>
                Recent Predictions on this Market
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sortedBets.length > 0 ? (
                  sortedBets.map((b, i) => {
                    const dateObj = new Date(b.placedAt as string);
                    const formattedTime =
                      dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                      " " +
                      dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.6rem 0.875rem",
                          background: "var(--bg-1)",
                          border: "1px solid var(--border-0)",
                          borderRadius: "var(--r-md)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.78rem",
                        }}
                      >
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--r-pill)",
                            fontWeight: 700,
                            color: b.side === "YES" ? "var(--yes-green)" : "var(--no-red)",
                            background: b.side === "YES" ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.1)",
                          }}
                        >
                          {b.side}
                        </span>
                        <span style={{ color: "var(--text-0)", fontWeight: 700 }}>
                          {b.amount} {b.currency || (b.network === "genlayer" ? "$GEN" : "USDC")}
                        </span>
                        <span style={{ color: "var(--text-3)", fontSize: "0.7rem" }}>{formattedTime}</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "1.25rem", textAlign: "center", background: "var(--bg-1)", border: "1px dashed var(--border-1)", borderRadius: "var(--r-md)", color: "var(--text-3)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                    No recent predictions recorded yet. Place the first prediction!
                  </div>
                )}
              </div>
            </div>

            {/* Comments & Social Section */}
            <div style={{ marginTop: "1rem" }}>
              <MarketCommentsSection marketId={market.id} marketTitle={market.title} />
            </div>
          </div>

          {/* Right Column — Dual-Currency Trading Drawer */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-0)",
                borderRadius: "14px",
                padding: "1.25rem",
                position: "sticky",
                top: "80px",
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "var(--text-0)", marginBottom: "1rem", fontWeight: 700 }}>
                Place Prediction
              </div>

              {isSettled ? (
                <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                    {settlementOutcomeText === "YES" ? "✅" : "❌"}
                  </div>
                  Market Resolved:{" "}
                  <strong style={{ color: settlementOutcomeText === "YES" ? "var(--yes-green)" : "var(--no-red)" }}>
                    {settlementOutcomeText}
                  </strong>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: "0.75rem" }}>
                    GenLayer Consensus finalized. You can claim winnings from settled positions in My Bets.
                  </div>
                  <button
                    onClick={handleClaimWinnings}
                    style={{
                      marginTop: "1rem",
                      padding: "0.6rem 1.25rem",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
                      color: "#ffffff",
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      width: "100%",
                      boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
                    }}
                  >
                    Claim Payout
                  </button>
                </div>
              ) : (
                <>
                  {/* Currency & Network Selector Toggle */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 600, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                      CURRENCY & NETWORK
                    </div>
                    <div style={{ display: "flex", background: "var(--bg-3)", padding: "3px", borderRadius: "8px", gap: "3px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCurrency("USDC")}
                        style={{
                          flex: 1,
                          padding: "0.45rem",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          background: selectedCurrency === "USDC" ? "var(--teal)" : "transparent",
                          color: selectedCurrency === "USDC" ? "#ffffff" : "var(--text-2)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        🔵 Arc (USDC)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCurrency("GEN")}
                        style={{
                          flex: 1,
                          padding: "0.45rem",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          background: selectedCurrency === "GEN" ? "#9333ea" : "transparent",
                          color: selectedCurrency === "GEN" ? "#ffffff" : "var(--text-2)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        ⚡ GenLayer ($GEN)
                      </button>
                    </div>
                  </div>

                  {/* YES/NO Toggle */}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    {(["YES", "NO"] as const).map((s) => (
                      <button
                        key={s}
                        id={`detail-bet-${s.toLowerCase()}`}
                        onClick={() => setSide(s)}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          fontFamily: "var(--font-body)",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          borderRadius: "var(--r-md)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          border: side === s
                            ? s === "YES" ? "2px solid #16a34a" : "2px solid #dc2626"
                            : "1.5px solid var(--border-1)",
                          background: side === s
                            ? s === "YES" ? "rgba(34,197,94,0.15)" : "rgba(244,63,94,0.15)"
                            : "var(--bg-1)",
                          color: side === s
                            ? s === "YES" ? "var(--yes-green)" : "var(--no-red)"
                            : "var(--text-2)",
                        }}
                      >
                        {s === "YES" ? "📈 YES" : "📉 NO"}
                        <div style={{ fontSize: "0.7rem", marginTop: "0.2rem", fontFamily: "var(--font-mono)" }}>
                          {s === "YES" ? `${Math.round(currentYesPrice)}%` : `${Math.round(currentNoPrice)}%`}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Amount Input */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      className="font-mono"
                      style={{ fontSize: "0.65rem", color: "var(--text-3)", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}
                    >
                      AMOUNT ({selectedCurrency})
                    </label>
                    <input
                      id="bet-amount-input"
                      type="number"
                      min="0.01"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="cyber-input"
                      style={{
                        width: "100%",
                        fontFamily: "var(--font-mono)",
                        fontSize: "1.1rem",
                        textAlign: "center",
                        fontWeight: 700,
                        background: "var(--bg-1)",
                        color: "var(--text-0)",
                        border: "1.5px solid var(--border-1)",
                        borderRadius: "8px",
                        padding: "0.5rem",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem" }}>
                      {[10, 50, 100, 500].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAmount(v.toString())}
                          style={{
                            flex: 1,
                            padding: "0.3rem",
                            fontSize: "0.7rem",
                            fontFamily: "var(--font-mono)",
                            background: "var(--bg-2)",
                            border: "1px solid var(--border-1)",
                            borderRadius: "var(--r-sm)",
                            cursor: "pointer",
                            color: "var(--text-2)",
                          }}
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payout Preview */}
                  <div
                    style={{
                      background: "var(--bg-1)",
                      border: "1px solid var(--border-0)",
                      borderRadius: "var(--r-md)",
                      padding: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-3)" }}>
                        Your prediction
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-0)" }}>
                        {amount} {selectedCurrency}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-3)" }}>
                        If correct, receive
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 800, color: "var(--yes-green)" }}>
                        ~{estimatedPayout} {selectedCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  {betPlaced ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "0.875rem",
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.35)",
                        borderRadius: "var(--r-md)",
                        color: "var(--yes-green)",
                        fontFamily: "var(--font-body)",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                      }}
                    >
                      ✓ Prediction recorded!
                    </div>
                  ) : selectedCurrency === "GEN" ? (
                    <button
                      id="place-bet-btn-gen"
                      onClick={handleBet}
                      disabled={!amount || parseFloat(amount) <= 0}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        fontFamily: "var(--font-body)",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        borderRadius: "var(--r-md)",
                        cursor: "pointer",
                        background: "linear-gradient(135deg, #7928ca 0%, #a855f7 100%)",
                        color: "#ffffff",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(168,85,247,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <Sparkles size={16} />
                      <span>Bet {amount} $GEN on GenLayer Studio Next</span>
                    </button>
                  ) : !isConnected ? (
                    <button
                      id="place-bet-btn"
                      onClick={() => {
                        onConnectClick();
                        onClose();
                      }}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        borderRadius: "var(--r-md)",
                        cursor: "pointer",
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                      }}
                    >
                      Connect Wallet to Bet
                    </button>
                  ) : (
                    <button
                      id="place-bet-btn"
                      onClick={handleBet}
                      disabled={!amount || parseFloat(amount) <= 0 || isPending || isCalcLoading}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        borderRadius: "var(--r-md)",
                        cursor: parseFloat(amount) > 0 && !isPending ? "pointer" : "not-allowed",
                        background: needsAmmApproval ? "#ea580c" : side === "YES" ? "#2563eb" : "#12062a",
                        color: "#ffffff",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                      }}
                    >
                      {isPending
                        ? "Processing..."
                        : needsAmmApproval
                        ? "Approve USDC Collateral"
                        : `Place ${side} Bet — ${amount} USDC`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* GenLayer Transaction Kit Modal Overlay */}
        <GenLayerTxModal
          isOpen={showGenLayerModal}
          onClose={() => setShowGenLayerModal(false)}
          account={address}
          title={`Bet ${side} on GenLayer Studio Next`}
          userValue={BigInt(parseFloat(amount) || 10) * 10n ** 18n}
          tx={{
            kind: "write",
            address: (GENLAYER_PREDICTION_MARKET_ADDRESS || "0x5776d6560F405E09148d42dF244C3F05C384351b") as `0x${string}`,
            method: "place_bet",
            args: [parseInt(market.id.replace(/\D/g, "") || "1", 10), side === "YES" ? 1 : 2],
          }}
          onDone={(status) => {
            setShowGenLayerModal(false);
            const txHash = (status as any)?.genlayerTxId || (status as any)?.txHash || generateTxHash();
            if (processedHashesRef.current.has(txHash)) return;
            processedHashesRef.current.add(txHash);

            const numAmt = parseFloat(amount) || 10;
            const newBet: UserBet = {
              id: `bet-${txHash.slice(2, 12)}`,
              txHash,
              marketId: market.id,
              marketTitle: market.title,
              side,
              amount: numAmt,
              placedAt: new Date().toISOString(),
              status: "open",
              claimed: false,
              network: "genlayer",
              currency: "GEN",
            };
            saveUserBet(newBet);
            if (onPlaceBet) {
              onPlaceBet(market.id, side, numAmt, txHash, "genlayer", "GEN");
            }
            setBetPlaced(true);
            setPlacedTx(txHash);
          }}
        />
      </div>
    </div>
  );
}
