import React, { useState, useEffect, useRef } from "react";
import { X, ExternalLink, Code, Clock, Users, TrendingUp, Zap, ChevronDown } from "lucide-react";
import { type Address, parseUnits, formatUnits } from "viem";
import { useWallet } from "@/contexts/WalletContext";
import { MarketAddressProvider, useMarketAddress } from "@/contexts/MarketAddressContext";
import { MarketCommentsSection } from "@/components/MarketCommentsSection";
import { useAMMState, useCalcBuy, useCalcSell, useBuyYes, useBuyNo, useSellYes, useSellNo, useAMMAllowances, useApproveArctForAMM } from "@/hooks/useAMM";
import { useMarketCardData, useMarketState, useTokenBalances, useOracleAllowance, useOracleState, useProposePrice, useDisputePrice, useSettleOracleRequest, useSettlePosition, useApproveArct } from "@/hooks/useMarket";
import { COLLATERAL_DECIMALS, OO_V2_ADDRESS } from "@/lib/contracts/addresses";
import { OracleState } from "@/lib/contracts/types";
import { type MarketCardData } from "@/lib/markets";
import { saveUserBet, generateTxHash, type UserBet } from "@/lib/bets";

function formatPool(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

interface MarketDetailModalProps {
  market: MarketCardData;
  onClose: () => void;
  onConnectClick: () => void;
  bets: UserBet[];
  onPlaceBet: (marketId: string, side: "YES" | "NO", amount: number, txHash?: string) => Promise<string | undefined>;
  onShowAlert?: (alert: { title: string; message: string }) => void;
}

export function MarketDetailModal({
  market,
  onClose,
  onConnectClick,
  bets,
  onPlaceBet,
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
  onShowAlert,
}: {
  market: MarketCardData;
  onClose: () => void;
  onConnectClick: () => void;
  bets: UserBet[];
  onPlaceBet: MarketDetailModalProps["onPlaceBet"];
  onShowAlert?: MarketDetailModalProps["onShowAlert"];
}) {
  const { address, isConnected } = useWallet();
  const { marketAddress, ammAddress } = useMarketAddress();

  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<string>("100");
  const [showCode, setShowCode] = useState(false);
  const [betPlaced, setBetPlaced] = useState(false);
  const [placedTx, setPlacedTx] = useState("");

  const [isOracleResolving, setIsOracleResolving] = useState(false);

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

  const displayVolume = market.isReal
    ? (volume ?? "0.00 USDC")
    : market.volume;

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
    ? (parseFloat(amount) / selectedProb).toFixed(2)
    : "0.00";

  const profit = parseFloat(amount) > 0
    ? (parseFloat(estimatedPayout) - parseFloat(amount)).toFixed(2)
    : "0.00";

  // Trading approvals & calls
  const approveAmmHook = useApproveArctForAMM();
  const buyYesHook = useBuyYes();
  const buyNoHook = useBuyNo();

  const amountBigInt = amount && parseFloat(amount) > 0 ? parseUnits(amount, COLLATERAL_DECIMALS) : 0n;
  const needsAmmApproval = isConnected && arctAllowance !== undefined && arctAllowance < amountBigInt;
  
  // Proposer bond approval check
  const bondBigInt = bond !== undefined ? bond : parseUnits("100", COLLATERAL_DECIMALS);
  const needsOracleApproval = isConnected && oracleAllowance !== undefined && oracleAllowance < bondBigInt;

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

  // Handle buy transaction success
  const activeBuyHook = side === "YES" ? buyYesHook : buyNoHook;
  useEffect(() => {
    if (activeBuyHook.isSuccess && activeBuyHook.hash) {
      const realTx = activeBuyHook.hash;
      const newBet: UserBet = {
        id: `bet-${Date.now()}`,
        txHash: realTx,
        marketId: market.id,
        marketTitle: market.title,
        side,
        amount: parseFloat(amount),
        placedAt: new Date().toISOString(),
        status: "open",
        claimed: false,
      };
      saveUserBet(newBet);
      onPlaceBet(market.id, side, parseFloat(amount), realTx);

      setPlacedTx(realTx);
      setBetPlaced(true);
      const timer = setTimeout(() => {
        setBetPlaced(false);
        setPlacedTx("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeBuyHook.isSuccess, activeBuyHook.hash, side, amount, market.id, market.title, onPlaceBet]);

  // Clean bets for this market
  const marketBets = bets.filter((b) => b.marketId === market.id);
  const sortedBets = [...marketBets].sort(
    (a, b) => new Date(b.placedAt as string).getTime() - new Date(a.placedAt as string).getTime()
  );

  const handleBet = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const isUnconfigured = (addr?: string) =>
      !addr ||
      addr === "0x0000000000000000000000000000000000000000" ||
      addr.startsWith("0x000000000000000000000000000000000000000");

    // If market or AMM is not deployed / zero address, record bet to My Bets
    if (!market.isReal || isUnconfigured(market.address) || isUnconfigured(ammAddress)) {
      const mockHash = generateTxHash();
      const newBet: UserBet = {
        id: `bet-${Date.now()}`,
        txHash: mockHash,
        marketId: market.id,
        marketTitle: market.title,
        side,
        amount: numAmount,
        placedAt: new Date().toISOString(),
        status: "open",
        claimed: false,
      };

      saveUserBet(newBet);
      onPlaceBet(market.id, side, numAmount, mockHash);

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
  const isSettled = isReal && receivedSettlementPrice;
  const isResolving = isReal && oracleState !== undefined && oracleState !== OracleState.Invalid && oracleState !== OracleState.Settled;

  let settlementOutcomeText = "";
  if (isSettled && settlementPrice !== undefined) {
    const p = formatUnits(settlementPrice, 18);
    if (p === "1") settlementOutcomeText = "YES";
    else if (p === "0") settlementOutcomeText = "NO";
    else settlementOutcomeText = "Undetermined";
  }

  const isPending = approveAmmHook.isPending || approveAmmHook.isConfirming || activeBuyHook.isPending || activeBuyHook.isConfirming;
  const error = approveAmmHook.error || activeBuyHook.error;

  return (
    <div
      id="market-detail-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        id="market-detail-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.1)",
          animation: "slideUp 0.25s ease",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            position: "sticky",
            top: 0,
            background: "#ffffff",
            backdropFilter: "blur(10px)",
            zIndex: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.67rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "var(--r-pill)",
                  background: "var(--teal-light)",
                  color: "var(--teal)",
                  border: "1px solid var(--border-teal)",
                }}
              >
                {market.category}
              </span>
              {isResolving && !isSettled && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.62rem",
                    color: "var(--resolving)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <Zap size={10} />
                  Resolving via OO...
                </span>
              )}
              {isSettled && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.62rem",
                    color: settlementOutcomeText === "YES" ? "var(--yes-green)" : "var(--no-red)",
                  }}
                >
                  ✓ Resolved {settlementOutcomeText}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.4, color: "var(--text-0)" }}>
              {market.title}
            </h2>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border-1)",
              borderRadius: "8px",
              padding: "0.4rem",
              cursor: "pointer",
              color: "var(--text-3)",
              display: "flex",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-0)";
              e.currentTarget.style.borderColor = "var(--border-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-3)";
              e.currentTarget.style.borderColor = "var(--border-1)";
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
            {/* Description */}
            <div>
              <div
                className="font-mono"
                style={{ fontSize: "0.65rem", color: "var(--teal)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}
              >
                {"// RESOLUTION DESCRIPTION & DETAILS"}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-1)", lineHeight: 1.6 }}>
                {market.isReal
                  ? `This market resolves to YES if the statement is true and NO otherwise. Dispute or resolution is adjudicated trustlessly via Optimistic Oracle on Arc Testnet.`
                  : `Mock prediction market for category ${market.category}. Standard resolution rules apply.`}
              </p>
            </div>

            {/* Probability Odds visualization */}
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-0)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.625rem", fontWeight: 500 }}>
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
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      color: "var(--yes-green)",
                      marginTop: "0.2rem",
                      opacity: 0.8,
                    }}
                  >
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
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      color: "var(--no-red)",
                      marginTop: "0.2rem",
                      opacity: 0.8,
                    }}
                  >
                    No
                  </div>
                </div>
              </div>
              {/* Odds Bar */}
              <div style={{ height: "8px", borderRadius: "5px", background: "var(--bg-3)", overflow: "hidden", display: "flex" }}>
                <div
                  style={{
                    width: `${currentYesPrice}%`,
                    background: "linear-gradient(90deg, #16a34a, #22c55e)",
                  }}
                />
                <div style={{ flex: 1, background: "var(--border-1)" }} />
              </div>

              {/* Market Stats */}
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem" }}>
                {[
                  { icon: TrendingUp, label: "Volume", val: displayVolume },
                  { icon: Users, label: "Creator", val: creator },
                  { icon: Clock, label: "Liveness", val: market.isReal ? "1 minute" : "30 days" },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icon size={12} color="var(--text-3)" />
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-3)" }}>
                        {label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.82rem",
                          color: "var(--text-0)",
                          fontWeight: 600,
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solidity Smart Contract Code block */}
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
                  borderBottom: showCode ? "1px solid var(--border-1)" : "none",
                  cursor: "pointer",
                  color: "var(--teal)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Code size={14} color="var(--teal)" />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", fontWeight: 600 }}>
                    Solidity Smart Contract Source
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
                <div>
                  <div
                    style={{
                      padding: "0.5rem 1.25rem",
                      background: "var(--bg-3)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.65rem",
                      color: "var(--text-2)",
                      borderBottom: "1px solid var(--border-0)",
                    }}
                  >
                    EVM Chain ID: 5042002 (Arc Testnet)
                  </div>
                  {isReal && (
                    <div
                      style={{
                        padding: "0.5rem 1.25rem",
                        background: "var(--bg-4)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.68rem",
                        color: "var(--text-0)",
                        borderBottom: "1px solid var(--border-0)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <span>Contract Address:</span>
                      <a
                        href={`https://testnet.arcscan.app/address/${marketAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--teal)", fontWeight: 700, textDecoration: "none" }}
                      >
                        {marketAddress}
                      </a>
                    </div>
                  )}
                  <pre
                    style={{
                      padding: "1.25rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      color: "var(--text-1)",
                      lineHeight: 1.7,
                      overflowX: "auto",
                      borderTop: "1px solid var(--border-0)",
                      background: "var(--bg-2)",
                      margin: 0,
                    }}
                  >
                    {`// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

contract EventBasedPredictionMarket {
    bool public priceRequested;
    bool public receivedSettlementPrice;
    uint256 public requestTimestamp;
    uint256 public settlementPrice;
    
    bytes32 public priceIdentifier = "YES_OR_NO_QUERY";
    bytes public customAncillaryData;
    
    // Deployed at construction
    constructor(
        string memory _pairName,
        address _collateralToken,
        bytes memory _customAncillaryData,
        address _finder,
        address _timer,
        uint256 _proposerReward,
        uint256 _liveness,
        uint256 _proposerBond
    ) {
        customAncillaryData = _customAncillaryData;
        // ... deploys expander YES/NO tokens ...
    }

    // Requests price from OO
    function initializeMarket() external {
        require(!priceRequested);
        priceRequested = true;
        // ... calls optimisticOracle.requestPrice() ...
    }

    // Called back by Oracle at settlement
    function priceSettled(
        bytes32 identifier,
        uint256 timestamp,
        bytes memory ancillaryData,
        int256 price
    ) external {
        receivedSettlementPrice = true;
        settlementPrice = uint256(price);
    }
}`}
                  </pre>
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.75rem", fontWeight: 500 }}>
                Recent Activity
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
                        <span style={{ color: "var(--text-3)" }}>
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "You"}
                        </span>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--r-pill)",
                            fontWeight: 600,
                            fontSize: "0.68rem",
                            background: b.side === "YES" ? "var(--yes-bg)" : "var(--no-bg)",
                            color: b.side === "YES" ? "var(--yes-green)" : "var(--no-red)",
                            border: `1px solid ${b.side === "YES" ? "var(--yes-border)" : "var(--no-border)"}`,
                          }}
                        >
                          {b.side as string}
                        </span>
                        <span style={{ color: "var(--text-0)", fontWeight: 600 }}>{b.amount as number} USDC</span>
                        <span style={{ color: "var(--text-3)", fontSize: "0.7rem" }}>{formattedTime}</span>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      background: "var(--bg-1)",
                      border: "1px dashed var(--border-1)",
                      borderRadius: "var(--r-md)",
                      color: "var(--text-3)",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    No recent activity on-chain. Be the first to place a bet!
                  </div>
                )}
              </div>
            </div>

            {/* Polykoe-styled Comments & X (Twitter) Social Activity Section */}
            <div style={{ marginTop: "1rem" }}>
              <MarketCommentsSection marketId={market.id} marketTitle={market.title} />
            </div>
          </div>

          {/* Right Column — Bet Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-0)",
                borderRadius: "12px",
                padding: "1.25rem",
                position: "sticky",
                top: "80px",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "1rem", fontWeight: 500 }}>
                Place Your Bet
              </div>

              {isSettled ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "1.5rem 1rem",
                    color: "var(--text-2)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                    {settlementOutcomeText === "YES" ? "✅" : "❌"}
                  </div>
                  Market Resolved:{" "}
                  <span
                    style={{
                      color: settlementOutcomeText === "YES" ? "var(--yes-green)" : "var(--no-red)",
                      fontWeight: 700,
                    }}
                  >
                    {settlementOutcomeText}
                  </span>
                  <br />
                  <br />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
                    The resolution is complete. You can claim your winnings below if you hold the winning tokens.
                  </span>
                  {(longBalance !== undefined && longBalance > 0n || shortBalance !== undefined && shortBalance > 0n) && (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: "0.72rem", marginBottom: "0.5rem" }}>
                        Your tokens: <br />
                        {longBalance !== undefined && longBalance > 0n && (
                          <span style={{ color: "var(--yes-green)" }}>
                            {parseFloat(formatUnits(longBalance, COLLATERAL_DECIMALS)).toFixed(2)} YES <br />
                          </span>
                        )}
                        {shortBalance !== undefined && shortBalance > 0n && (
                          <span style={{ color: "var(--no-red)" }}>
                            {parseFloat(formatUnits(shortBalance, COLLATERAL_DECIMALS)).toFixed(2)} NO <br />
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleClaimWinnings}
                        disabled={settlePositionHook.isPending || settlePositionHook.isConfirming}
                        style={{
                          padding: "0.55rem 1.25rem",
                          borderRadius: "10px",
                          background: "var(--yes-green)",
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        {settlePositionHook.isPending || settlePositionHook.isConfirming
                          ? "Claiming..."
                          : "Claim Winnings"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Oracle Resolution Section */}
                  {isReal && (
                    <div
                      style={{
                        padding: "1rem",
                        background: "var(--bg-3)",
                        border: "1px solid var(--border-1)",
                        borderRadius: "12px",
                        marginBottom: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--text-0)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>🔮</span> Oracle Resolution Console
                      </div>

                      {/* Oracle States */}
                      {oracleState === OracleState.Requested || oracleState === OracleState.Invalid || oracleState === OracleState.Disputed ? (
                        <>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-2)", lineHeight: 1.4 }}>
                            No active proposal. Propose the outcome to the oracle. Requires a bond of{" "}
                            {parseFloat(formatUnits(bondBigInt, COLLATERAL_DECIMALS))} USDC.
                          </div>
                          {needsOracleApproval ? (
                            <button
                              onClick={() => handlePropose(1n)} // triggers approval
                              disabled={approveOracleHook.isPending || approveOracleHook.isConfirming}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "#ea580c",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                width: "100%",
                              }}
                            >
                              {approveOracleHook.isPending || approveOracleHook.isConfirming
                                ? "Approving..."
                                : "Approve USDC for Oracle"}
                            </button>
                          ) : (
                            <div style={{ display: "flex", gap: "0.4rem", width: "100%" }}>
                              <button
                                onClick={() => handlePropose(parseUnits("1", 18))} // 1e18 = YES
                                disabled={proposePriceHook.isPending || proposePriceHook.isConfirming}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  background: "var(--yes-green)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "8px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  flex: 1,
                                }}
                              >
                                Propose YES
                              </button>
                              <button
                                onClick={() => handlePropose(0n)} // 0 = NO
                                disabled={proposePriceHook.isPending || proposePriceHook.isConfirming}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  background: "var(--no-red)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "8px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  flex: 1,
                                }}
                              >
                                Propose NO
                              </button>
                            </div>
                          )}
                        </>
                      ) : oracleState === OracleState.Proposed ? (
                        <>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-2)", lineHeight: 1.4 }}>
                            Outcome Proposed:{" "}
                            <span style={{ fontWeight: 700 }}>
                              {proposedPrice !== undefined && formatUnits(proposedPrice, 18) === "1"
                                ? "YES"
                                : "NO"}
                            </span>
                            <br />
                            Liveness expires in: <span style={{ fontWeight: 700 }}>{expirationDisplay}</span>
                          </div>
                          <button
                            onClick={handleDispute}
                            disabled={disputePriceHook.isPending || disputePriceHook.isConfirming}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              width: "100%",
                            }}
                          >
                            {disputePriceHook.isPending || disputePriceHook.isConfirming
                              ? "Disputing..."
                              : "Dispute Proposal"}
                          </button>
                        </>
                      ) : oracleState === OracleState.Expired || oracleState === OracleState.Resolved ? (
                        <>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-2)", lineHeight: 1.4 }}>
                            Proposal expired or resolved. Settle the oracle request to write the price back to the
                            prediction market.
                          </div>
                          <button
                            onClick={handleSettleOracle}
                            disabled={settleOracleHook.isPending || settleOracleHook.isConfirming}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "var(--teal)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              width: "100%",
                            }}
                          >
                            {settleOracleHook.isPending || settleOracleHook.isConfirming
                              ? "Settling..."
                              : "Settle Oracle"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}

                  {/* YES/NO Toggle */}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    {(["YES", "NO"] as const).map((s) => (
                      <button
                        key={s}
                        id={`detail-bet-${s.toLowerCase()}`}
                        onClick={() => setSide(s)}
                        style={{
                          flex: 1,
                          padding: "0.875rem",
                          fontFamily: "var(--font-body)",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          borderRadius: "var(--r-md)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          ...(side === s
                            ? {
                                background: "var(--teal)",
                                color: "#ffffff",
                                border: "2px solid var(--teal)",
                                boxShadow: "0 4px 14px rgba(46,16,82,0.3)",
                              }
                            : {
                                background: "var(--teal-light)",
                                color: "var(--teal)",
                                border: "1.5px solid var(--border-teal)",
                              }),
                        }}
                      >
                        {s}
                        <div
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 500,
                            marginTop: "0.2rem",
                            opacity: side === s ? 0.9 : 0.75,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {s === "YES" ? `${Math.round(currentYesPrice)}%` : `${Math.round(currentNoPrice)}%`}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Amount Input */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      className="font-mono"
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--text-3)",
                        letterSpacing: "0.08em",
                        display: "block",
                        marginBottom: "0.4rem",
                      }}
                    >
                      AMOUNT (USDC)
                    </label>
                    <input
                      id="bet-amount-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="cyber-input"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "1.1rem",
                        textAlign: "center",
                        fontWeight: 700,
                        background: "var(--bg-1)",
                        color: "var(--text-0)",
                        border: "1.5px solid var(--border-1)",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem" }}>
                      {[50, 100, 500, 1000].map((v) => (
                        <button
                          key={v}
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
                            color: "var(--text-3)",
                            transition: "all 0.15s ease",
                            outline: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--teal)";
                            e.currentTarget.style.borderColor = "var(--border-teal)";
                            e.currentTarget.style.background = "var(--teal-light)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--text-3)";
                            e.currentTarget.style.borderColor = "var(--border-1)";
                            e.currentTarget.style.background = "var(--bg-2)";
                          }}
                        >
                          {v}
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
                    {[
                      { label: "Your bet", val: `${amount} USDC`, color: "var(--text-0)" },
                      {
                        label: "If correct, receive",
                        val: `${estimatedPayout} ${side}`,
                        color: "var(--yes-green)",
                      },
                      { label: "Potential profit", val: `+${profit} USDC`, color: "var(--resolving)" },
                    ].map(({ label, val, color }) => (
                      <div
                        key={label}
                        style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-3)" }}>
                          {label}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color }}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Place Bet Button */}
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
                        fontWeight: 600,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <div>✓ Bet placed successfully!</div>
                      {placedTx && (
                        <div style={{ fontSize: "0.72rem", color: "#4b5563", fontFamily: "var(--font-mono)", wordBreak: "break-all", fontWeight: 500 }}>
                          TX:{" "}
                          <a
                            href={`https://testnet.arcscan.app/tx/${placedTx}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--teal)", textDecoration: "underline" }}
                          >
                            {placedTx.slice(0, 10)}...{placedTx.slice(-8)}
                          </a>
                        </div>
                      )}
                    </div>
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
                        transition: "all 0.2s ease",
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
                    >
                      🔒 Connect Wallet to Bet
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
                        cursor: parseFloat(amount) > 0 && !isPending && !isCalcLoading ? "pointer" : "not-allowed",
                        transition: "all 0.2s ease",
                        background:
                          parseFloat(amount) > 0 && !isPending && !isCalcLoading
                            ? needsAmmApproval
                              ? "#ea580c"
                              : side === "YES"
                              ? "rgba(34,197,94,0.18)"
                              : "rgba(244,63,94,0.18)"
                            : "#e5e7eb",
                        color:
                          parseFloat(amount) > 0 && !isPending && !isCalcLoading
                            ? needsAmmApproval
                              ? "#ffffff"
                              : side === "YES"
                              ? "var(--yes-green)"
                              : "var(--no-red)"
                            : "#9ca3af",
                        border:
                          parseFloat(amount) > 0 && !isPending && !isCalcLoading
                            ? needsAmmApproval
                              ? "none"
                              : side === "YES"
                              ? "1px solid rgba(34,197,94,0.45)"
                              : "1px solid rgba(244,63,94,0.45)"
                            : "none",
                        opacity: parseFloat(amount) > 0 && !isPending && !isCalcLoading ? 1 : 0.5,
                      }}
                    >
                      {isPending
                        ? "Confirming transaction..."
                        : needsAmmApproval
                        ? "Approve USDC for Trading"
                        : `Place ${side} Bet — ${amount} USDC`}
                    </button>
                  )}

                  {error && (
                    <div style={{ fontSize: "0.75rem", color: "#dc2626", textAlign: "center", marginTop: "0.5rem" }}>
                      Error: {error.message || "Transaction failed"}
                    </div>
                  )}

                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      marginTop: "0.75rem",
                      lineHeight: 1.5,
                    }}
                  >
                    Resolved via Optimistic Oracle V2. Results are decentralized and final.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const creator = "CryptoWolf"; // derived creator fallback
