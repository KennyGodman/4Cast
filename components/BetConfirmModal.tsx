import React, { useState, useEffect, useRef } from "react";
import { X, Minus, Plus, ArrowRight, ExternalLink, Sparkles, Shield, Cpu } from "lucide-react";
import { parseUnits, formatUnits, type Address } from "viem";
import { useWallet } from "@/contexts/WalletContext";
import { MarketAddressProvider, useMarketAddress } from "@/contexts/MarketAddressContext";
import { useAMMState, useCalcBuy, useBuyYes, useBuyNo, useApproveArctForAMM, useAMMAllowances } from "@/hooks/useAMM";
import { COLLATERAL_DECIMALS } from "@/lib/contracts/addresses";
import { saveUserBet, generateTxHash, type UserBet } from "@/lib/bets";
import { GenLayerTxModal } from "./GenLayerTxModal";
import {
  GENLAYER_PREDICTION_MARKET_ADDRESS,
  STUDIO_NEXT_CHAIN_ID,
  STUDIO_NEXT_EXPLORER_URL,
  switchToStudioNext,
} from "@/lib/genlayer";

const PRESETS = [10, 50, 100, 500];

interface BetConfirmModalProps {
  market: {
    id: string;
    address: string;
    ammAddress?: string;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    isReal?: boolean;
    volume?: string;
  };
  initialSide?: "YES" | "NO";
  onClose: () => void;
  onPlaceBet?: (
    marketId: string,
    side: "YES" | "NO",
    amount: number,
    txHash?: string,
    network?: "arc" | "genlayer",
    currency?: "USDC" | "GEN"
  ) => Promise<string | undefined>;
}

export function BetConfirmModal({ market, initialSide = "YES", onClose, onPlaceBet }: BetConfirmModalProps) {
  const targetAmmAddress = (market.ammAddress || "0x0000000000000000000000000000000000000000") as Address;
  return (
    <MarketAddressProvider
      marketAddress={market.address as Address}
      ammAddress={targetAmmAddress}
    >
      <BetConfirmModalInner
        market={market}
        initialSide={initialSide}
        onClose={onClose}
        onPlaceBet={onPlaceBet}
      />
    </MarketAddressProvider>
  );
}

interface InnerProps {
  market: BetConfirmModalProps["market"];
  initialSide: "YES" | "NO";
  onClose: () => void;
  onPlaceBet?: BetConfirmModalProps["onPlaceBet"];
}

function BetConfirmModalInner({ market, initialSide, onClose, onPlaceBet }: InnerProps) {
  const { address, isConnected, connectMetaMask } = useWallet();
  const { ammAddress } = useMarketAddress();
  const [side, setSide] = useState<"YES" | "NO">(initialSide);
  const [selectedCurrency, setSelectedCurrency] = useState<"USDC" | "GEN">("USDC");
  const [amount, setAmount] = useState(50);
  const [inputVal, setInputVal] = useState("50");
  const [placed, setPlaced] = useState(false);
  const [placedTx, setPlacedTx] = useState("");
  const [showGenLayerModal, setShowGenLayerModal] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const processedHashesRef = useRef<Set<string>>(new Set());

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
        console.warn("Chain switch check error prior to GenLayer modal:", e);
      }
    }
    setShowGenLayerModal(true);
  };

  // AMM state & calculations
  const { yesPrice, noPrice, isLoading: isAmmLoading } = useAMMState();

  const currentYesPrice = yesPrice !== undefined ? yesPrice : market.yesPrice * 100;
  const currentNoPrice = noPrice !== undefined ? noPrice : market.noPrice * 100;

  const selectedProb = (side === "YES" ? currentYesPrice : currentNoPrice) / 100;

  // Calculate buy preview
  const { tokensOut, isLoading: isCalcLoading } = useCalcBuy(
    side.toLowerCase() as "yes" | "no",
    amount.toString()
  );

  const payout = tokensOut !== undefined
    ? parseFloat(formatUnits(tokensOut, COLLATERAL_DECIMALS)).toFixed(2)
    : amount > 0
    ? (amount / (selectedProb || 0.5)).toFixed(2)
    : "0.00";

  const multiplier = selectedProb > 0 ? (1 / selectedProb).toFixed(2) : "2.00";

  // Allowances & approvals
  const { arctAllowance, isLoading: isAllowancesLoading } = useAMMAllowances(
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002"
  );
  
  const amountBigInt = parseUnits(amount.toString(), COLLATERAL_DECIMALS);
  const needsApproval = isConnected && selectedCurrency === "USDC" && arctAllowance !== undefined && arctAllowance < amountBigInt;

  const approveHook = useApproveArctForAMM();
  const buyYesHook = useBuyYes();
  const buyNoHook = useBuyNo();

  // Handle Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  // Success transaction updates from real on-chain transaction (strictly deduplicated)
  const activeHook = side === "YES" ? buyYesHook : buyNoHook;
  useEffect(() => {
    if (activeHook.isSuccess && activeHook.hash) {
      const realTx = activeHook.hash;
      if (processedHashesRef.current.has(realTx)) return;
      processedHashesRef.current.add(realTx);

      const betId = `bet-${realTx.slice(2, 12)}`;
      const newBet: UserBet = {
        id: betId,
        txHash: realTx,
        marketId: market.id,
        marketTitle: market.title,
        side,
        amount,
        placedAt: new Date().toISOString(),
        status: "open",
        claimed: false,
        network: selectedCurrency === "GEN" ? "genlayer" : "arc",
        currency: selectedCurrency,
      };

      saveUserBet(newBet);
      if (onPlaceBet) {
        onPlaceBet(market.id, side, amount, realTx, selectedCurrency === "GEN" ? "genlayer" : "arc", selectedCurrency);
      }

      setPlacedTx(realTx);
      setPlaced(true);
      const timer = setTimeout(() => {
        setPlaced(false);
        setPlacedTx("");
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeHook.isSuccess, activeHook.hash, side, amount, market.id, market.title, onPlaceBet, selectedCurrency, onClose]);

  const setAmt = (v: number) => {
    const n = Math.max(0.01, Math.min(10000, v));
    setAmount(n);
    setInputVal(String(n));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    const n = parseFloat(e.target.value);
    if (!isNaN(n) && n > 0) setAmount(Math.min(10000, n));
  };

  const handleInputBlur = () => {
    const n = parseFloat(inputVal);
    if (isNaN(n) || n <= 0) {
      setAmount(10);
      setInputVal("10");
    } else {
      setAmt(n);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const handleAction = async () => {
    if (amount <= 0) return;
    setTxError(null);

    // If $GEN is selected, open the GenLayer Transaction Panel
    if (selectedCurrency === "GEN") {
      await handleOpenGenLayerModal();
      return;
    }

    const isUnconfigured = (addr?: string) =>
      !addr ||
      addr === "0x0000000000000000000000000000000000000000" ||
      addr.startsWith("0x000000000000000000000000000000000000000");

    // 1. If contract hook is configured (real deployed AMM contract)
    if (market.isReal && !isUnconfigured(market.address) && !isUnconfigured(ammAddress)) {
      if (needsApproval) {
        approveHook.approve(parseUnits("1000000", COLLATERAL_DECIMALS));
      } else {
        if (side === "YES") {
          buyYesHook.buy(amount.toString());
        } else {
          buyNoHook.buy(amount.toString());
        }
      }
      return;
    }

    // 2. Direct Wallet On-Chain Transaction path (prompts Rabby / EVM wallet on Arc Testnet)
    if (isConnected && address && typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setIsSubmitting(true);
        const eth = (window as any).ethereum;

        const targetAddress =
          market.address && !isUnconfigured(market.address)
            ? market.address
            : "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

        const amountWei = parseUnits(amount.toString(), COLLATERAL_DECIMALS);
        const hexValue = "0x" + amountWei.toString(16);

        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: address,
              to: targetAddress,
              value: hexValue,
              data: "0x3863617374",
            },
          ],
        });

        if (txHash) {
          if (processedHashesRef.current.has(txHash)) return;
          processedHashesRef.current.add(txHash);

          const betId = `bet-${txHash.slice(2, 12)}`;
          const newBet: UserBet = {
            id: betId,
            txHash,
            marketId: market.id,
            marketTitle: market.title,
            side,
            amount,
            placedAt: new Date().toISOString(),
            status: "open",
            claimed: false,
            network: "arc",
            currency: "USDC",
          };

          saveUserBet(newBet);
          if (onPlaceBet) {
            onPlaceBet(market.id, side, amount, txHash, "arc", "USDC");
          }

          setPlacedTx(txHash);
          setPlaced(true);
          const timer = setTimeout(() => {
            setPlaced(false);
            setPlacedTx("");
            onClose();
          }, 5000);
          return;
        }
      } catch (err: any) {
        console.error("Wallet transaction rejected or failed:", err);
        setTxError(err?.message || "Transaction was rejected or failed in your wallet.");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    // 3. Fallback for non-connected demo mode (strictly deduplicated)
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
      amount,
      placedAt: new Date().toISOString(),
      status: "open",
      claimed: false,
      network: "arc",
      currency: "USDC",
    };

    saveUserBet(newBet);
    if (onPlaceBet) {
      onPlaceBet(market.id, side, amount, mockHash, "arc", "USDC");
    }

    setPlacedTx(mockHash);
    setPlaced(true);
    setTimeout(() => {
      setPlaced(false);
      setPlacedTx("");
      onClose();
    }, 4000);
  };

  const isPending = approveHook.isPending || approveHook.isConfirming || activeHook.isPending || activeHook.isConfirming || isSubmitting;
  const error = approveHook.error || buyYesHook.error || buyNoHook.error;

  const currentProb = Math.round(selectedProb * 100);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 7, 18, 0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        className="modal-container"
        role="dialog"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden",
          animation: "slideUp 0.22s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem 0.875rem",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              flexShrink: 0,
              background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            📊
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {market.title}
            </div>
            <div style={{ fontSize: "0.68rem", color: "#6b7280", marginTop: "2px" }}>
              Category: <span style={{ fontWeight: 600 }}>{market.category}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              border: "none",
              borderRadius: "8px",
              padding: "0.3rem",
              cursor: "pointer",
              color: "#6b7280",
              display: "flex",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          >
            <X size={15} />
          </button>
        </div>

        <div
          style={{
            padding: "1.125rem 1.25rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Dual Currency & Network Selector Pill */}
          <div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600, marginBottom: "0.35rem" }}>
              PREDICTION CURRENCY & NETWORK
            </div>
            <div
              style={{
                display: "flex",
                background: "#f3f4f6",
                borderRadius: "10px",
                padding: "3px",
                gap: "3px",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCurrency("USDC")}
                style={{
                  flex: 1,
                  padding: "0.45rem",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: selectedCurrency === "USDC" ? "#ffffff" : "transparent",
                  color: selectedCurrency === "USDC" ? "#2563eb" : "#6b7280",
                  boxShadow: selectedCurrency === "USDC" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                }}
              >
                <span>🔵</span>
                <span>Arc USDC</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCurrency("GEN")}
                style={{
                  flex: 1,
                  padding: "0.45rem",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: selectedCurrency === "GEN" ? "#ffffff" : "transparent",
                  color: selectedCurrency === "GEN" ? "#9333ea" : "#6b7280",
                  boxShadow: selectedCurrency === "GEN" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                }}
              >
                <span>⚡</span>
                <span>GenLayer $GEN</span>
              </button>
            </div>
          </div>

          {/* Buying side selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600 }}>
              Position:
            </span>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {(["YES", "NO"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  style={{
                    padding: "0.35rem 1rem",
                    borderRadius: "8px",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    border: side === s
                      ? s === "YES"
                        ? "1.5px solid #16a34a"
                        : "1.5px solid #dc2626"
                      : "1.5px solid #e5e7eb",
                    background: side === s
                      ? s === "YES"
                        ? "#dcfce7"
                        : "#fee2e2"
                      : "#ffffff",
                    color: side === s
                      ? s === "YES"
                        ? "#15803d"
                        : "#b91c1c"
                      : "#6b7280",
                  }}
                >
                  {s === "YES" ? "📈 YES" : "📉 NO"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input block */}
          <div
            style={{
              background: "#f9fafb",
              border: "1.5px solid #e5e7eb",
              borderRadius: "14px",
              padding: "0.875rem 1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600 }}>
                AMOUNT ({selectedCurrency})
              </span>
              <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                Odds: <strong style={{ color: "#111827" }}>{currentProb}%</strong>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setAmt(amount - 10)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#374151",
                  flexShrink: 0,
                }}
              >
                <Minus size={14} />
              </button>

              <div style={{ flex: 1, position: "relative" }}>
                <input
                  id="bet-amount-input"
                  type="number"
                  min="0.01"
                  max="10000"
                  step="any"
                  value={inputVal}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  style={{
                    width: "100%",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "#111827",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    textAlign: "center",
                    fontFamily: "var(--font-display)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setAmt(amount + 10)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#374151",
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Quick Presets */}
            <div
              style={{
                display: "flex",
                gap: "0.375rem",
                marginTop: "0.75rem",
                paddingTop: "0.625rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmt(p)}
                  style={{
                    flex: 1,
                    padding: "0.25rem 0",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: amount === p ? "1px solid #2563eb" : "1px solid #e5e7eb",
                    background: amount === p ? "#eff6ff" : "#ffffff",
                    color: amount === p ? "#2563eb" : "#4b5563",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.12s ease",
                  }}
                >
                  +{p}
                </button>
              ))}
            </div>
          </div>

          {/* Payout preview strip */}
          <div
            style={{
              background: "#f9fafb",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.78rem",
            }}
          >
            <div>
              <div style={{ color: "#6b7280", fontSize: "0.7rem" }}>Est. Return</div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#16a34a",
                  fontFamily: "var(--font-display)",
                }}
              >
                ~{payout} {selectedCurrency}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#6b7280", fontSize: "0.7rem" }}>Multiplier</div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#374151",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {multiplier}x
              </div>
            </div>
          </div>

          {/* Success state */}
          {placed && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "10px",
                padding: "0.75rem",
                textAlign: "center",
                color: "#15803d",
                fontSize: "0.82rem",
                fontWeight: 600,
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <span>🎉 Bet successfully confirmed!</span>
              <span style={{ fontSize: "0.7rem", color: "#166534" }}>
                Recorded {amount} {selectedCurrency} on {selectedCurrency === "GEN" ? "GenLayer Studio Next" : "Arc Testnet"}.
              </span>
              {placedTx && (
                <a
                  href={
                    selectedCurrency === "GEN"
                      ? `${STUDIO_NEXT_EXPLORER_URL}/address/${GENLAYER_PREDICTION_MARKET_ADDRESS}`
                      : `https://testnet.arcscan.app/tx/${placedTx}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#2563eb",
                    fontSize: "0.7rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.2rem",
                    marginTop: "0.2rem",
                  }}
                >
                  <span>View Explorer Receipt</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

          {/* Primary Action Button */}
          {!isConnected && selectedCurrency === "USDC" ? (
            <button
              id="connect-to-bet-btn"
              onClick={connectMetaMask}
              style={{
                width: "100%",
                padding: "0.875rem",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "0.92rem",
                borderRadius: "12px",
                cursor: "pointer",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              }}
            >
              Connect Wallet to Bet
            </button>
          ) : (
            <button
              id="confirm-bet-btn"
              onClick={handleAction}
              disabled={amount <= 0 || isPending || isAllowancesLoading || isCalcLoading}
              style={{
                width: "100%",
                padding: "0.875rem",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "0.92rem",
                borderRadius: "12px",
                cursor: amount > 0 && !isPending && !isCalcLoading ? "pointer" : "not-allowed",
                transition: "all 0.18s ease",
                background:
                  selectedCurrency === "GEN"
                    ? "linear-gradient(135deg, #7928ca 0%, #a855f7 100%)"
                    : needsApproval
                    ? "#ea580c"
                    : side === "YES"
                    ? "#2563eb"
                    : "#12062a",
                color: "#ffffff",
                border: "none",
                boxShadow:
                  selectedCurrency === "GEN"
                    ? "0 4px 16px rgba(168,85,247,0.35)"
                    : needsApproval
                    ? "0 4px 16px rgba(234,88,12,0.35)"
                    : "0 4px 16px rgba(37,99,235,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              {isPending ? (
                "Processing transaction..."
              ) : selectedCurrency === "GEN" ? (
                <>
                  <Sparkles size={16} />
                  <span>Bet {amount} $GEN on GenLayer Studio Next</span>
                </>
              ) : needsApproval ? (
                "Approve USDC Collateral"
              ) : (
                `${side === "YES" ? "📈" : "📉"} Place ${side} Bet — ${amount} USDC`
              )}
            </button>
          )}

          {(txError || error) && (
            <div style={{ fontSize: "0.75rem", color: "#dc2626", textAlign: "center", fontWeight: 600 }}>
              {txError || error?.message || "Transaction failed"}
            </div>
          )}

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              color: "#9ca3af",
              textAlign: "center",
              lineHeight: 1.5,
              marginTop: "0.2rem",
            }}
          >
            Powered by {selectedCurrency === "GEN" ? "GenLayer Studio Next (Consensus v0.6)" : "Arc Testnet (Circle USDC)"}.
          </p>
        </div>

        {/* GenLayer Transaction Kit Modal (Studio Next) */}
        <GenLayerTxModal
          isOpen={showGenLayerModal}
          onClose={() => setShowGenLayerModal(false)}
          account={address}
          title={`Bet ${side} on GenLayer Studio Next`}
          userValue={BigInt(amount) * 10n ** 18n}
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

            const newBet: UserBet = {
              id: `bet-${txHash.slice(2, 12)}`,
              txHash,
              marketId: market.id,
              marketTitle: market.title,
              side,
              amount,
              placedAt: new Date().toISOString(),
              status: "open",
              claimed: false,
              network: "genlayer",
              currency: "GEN",
            };
            saveUserBet(newBet);
            if (onPlaceBet) {
              onPlaceBet(market.id, side, amount, txHash, "genlayer", "GEN");
            }
            setPlaced(true);
            setPlacedTx(txHash);
          }}
        />
      </div>
    </div>
  );
}
