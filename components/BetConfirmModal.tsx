import React, { useState, useEffect, useRef } from "react";
import { X, Minus, Plus, ArrowRight, ExternalLink } from "lucide-react";
import { parseUnits, formatUnits, type Address } from "viem";
import { useWallet } from "@/contexts/WalletContext";
import { MarketAddressProvider, useMarketAddress } from "@/contexts/MarketAddressContext";
import { useAMMState, useCalcBuy, useBuyYes, useBuyNo, useApproveArctForAMM, useAMMAllowances } from "@/hooks/useAMM";
import { COLLATERAL_DECIMALS } from "@/lib/contracts/addresses";
import { saveUserBet, generateTxHash, type UserBet } from "@/lib/bets";

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
  };
  initialSide?: "YES" | "NO";
  onClose: () => void;
  onPlaceBet?: (marketId: string, side: "YES" | "NO", amount: number, txHash?: string) => Promise<string | undefined>;
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
  const [amount, setAmount] = useState(50);
  const [inputVal, setInputVal] = useState("50");
  const [placed, setPlaced] = useState(false);
  const [placedTx, setPlacedTx] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // AMM state & calculations
  const { yesPrice, noPrice, isLoading: isAmmLoading } = useAMMState();

  // If AMM isn't initialized or ready, fall back to static market prices (converted to 0-100 scale)
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
    ? (amount / selectedProb).toFixed(2)
    : "0.00";

  const multiplier = selectedProb > 0 ? (1 / selectedProb).toFixed(2) : "0.00";

  // Allowances & approvals
  const { arctAllowance, isLoading: isAllowancesLoading } = useAMMAllowances(
    "0x0000000000000000000000000000000000000001", // dummy address for tokens since we only check ARCT allowance here
    "0x0000000000000000000000000000000000000002"
  );
  
  const amountBigInt = parseUnits(amount.toString(), COLLATERAL_DECIMALS);
  const needsApproval = isConnected && arctAllowance !== undefined && arctAllowance < amountBigInt;

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

  // Success transaction updates from real on-chain transaction
  const activeHook = side === "YES" ? buyYesHook : buyNoHook;
  useEffect(() => {
    if (activeHook.isSuccess && activeHook.hash) {
      const realTx = activeHook.hash;
      const newBet: UserBet = {
        id: `bet-${Date.now()}`,
        txHash: realTx,
        marketId: market.id,
        marketTitle: market.title,
        side,
        amount,
        placedAt: new Date().toISOString(),
        status: "open",
        claimed: false,
      };

      saveUserBet(newBet);
      if (onPlaceBet) {
        onPlaceBet(market.id, side, amount, realTx);
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
  }, [activeHook.isSuccess, activeHook.hash, onClose, side, amount, market.id, market.title, onPlaceBet]);

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
      setAmount(0.1);
      setInputVal("0.1");
    } else {
      setAmt(n);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const handleAction = async () => {
    if (amount <= 0) return;
    setTxError(null);

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

        // Calculate exact hex value in wei for native USDC (18 decimals on Arc Testnet)
        const amountWei = parseUnits(amount.toString(), COLLATERAL_DECIMALS);
        const hexValue = "0x" + amountWei.toString(16);

        // Prompt Rabby / EVM wallet for on-chain Arc Testnet transaction with bet value
        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: address,
              to: targetAddress,
              value: hexValue,
              data: "0x3863617374", // "4cast" hex identifier
            },
          ],
        });

        if (txHash) {
          const newBet: UserBet = {
            id: `bet-${Date.now()}`,
            txHash,
            marketId: market.id,
            marketTitle: market.title,
            side,
            amount,
            placedAt: new Date().toISOString(),
            status: "open",
            claimed: false,
          };

          saveUserBet(newBet);
          if (onPlaceBet) {
            onPlaceBet(market.id, side, amount, txHash);
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

    // 3. Fallback for non-connected demo mode
    const mockHash = generateTxHash();

    const newBet: UserBet = {
      id: `bet-${Date.now()}`,
      txHash: mockHash,
      marketId: market.id,
      marketTitle: market.title,
      side,
      amount,
      placedAt: new Date().toISOString(),
      status: "open",
      claimed: false,
    };

    saveUserBet(newBet);
    if (onPlaceBet) {
      onPlaceBet(market.id, side, amount, mockHash);
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
  const error = approveHook.error || activeHook.error;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,7,18,0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
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
          {/* Market thumbnail */}
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
                fontSize: "0.78rem",
                fontWeight: 600,
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
          {/* Buying label */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}>
              Buying:
            </span>
            {/* YES / NO toggle */}
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {(["YES", "NO"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  style={{
                    padding: "0.3rem 0.95rem",
                    borderRadius: "999px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    ...(side === s
                      ? {
                          background: "var(--teal)",
                          color: "#ffffff",
                          border: "1.5px solid var(--teal)",
                          boxShadow: "0 2px 10px rgba(46,16,82,0.3)",
                        }
                      : {
                          background: "var(--teal-light)",
                          color: "var(--teal)",
                          border: "1.5px solid var(--border-teal)",
                        }),
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontSize: "0.72rem",
                color: "#9ca3af",
                fontFamily: "var(--font-mono)",
              }}
            >
              {Math.round(selectedProb * 100)}% chance
            </div>
          </div>

          {/* Amount section */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 500 }}>
                Amount
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#9ca3af" }}>
                  USDC
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="10000"
                  value={inputVal}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  style={{
                    width: "80px",
                    textAlign: "right",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "0.25rem 0.5rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#111827",
                    outline: "none",
                    background: "#f9fafb",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--teal)")}
                  onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            {/* Slider row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setAmt(Math.max(0.01, amount - 10))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  flexShrink: 0,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                  e.currentTarget.style.color = "#111827";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <Minus size={12} />
              </button>
              <input
                type="range"
                min="1"
                max="1000"
                step="1"
                value={Math.min(1000, amount)}
                onChange={(e) => setAmt(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: "var(--teal)",
                  height: "4px",
                  cursor: "pointer",
                }}
              />
              <button
                onClick={() => setAmt(amount + 10)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  flexShrink: 0,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                  e.currentTarget.style.color = "#111827";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Quick preset chips */}
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.6rem" }}>
              {PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmt(v)}
                  style={{
                    flex: 1,
                    padding: "0.3rem",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.12s",
                    border: amount === v ? "1.5px solid var(--teal)" : "1.5px solid #e5e7eb",
                    background: amount === v ? "var(--teal)" : "#f9fafb",
                    color: amount === v ? "#ffffff" : "#6b7280",
                    fontWeight: 600,
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (amount !== v) {
                      e.currentTarget.style.background = "var(--teal-light)";
                      e.currentTarget.style.borderColor = "var(--border-teal)";
                      e.currentTarget.style.color = "var(--teal)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (amount !== v) {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.color = "#6b7280";
                    }
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Payout preview */}
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "0.875rem 1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af", fontWeight: 500, marginBottom: "0.2rem" }}>
                  You put
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>
                  {amount} USDC
                </div>
              </div>
              <ArrowRight size={16} color="#9ca3af" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af", fontWeight: 500, marginBottom: "0.2rem" }}>
                  You receive
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "#16a34a" }}>
                  {payout} {side === "YES" ? "YES" : "NO"}
                  <span style={{ fontSize: "0.68rem", color: "#16a34a", opacity: 0.75, marginLeft: "0.3rem" }}>
                    ({multiplier}x)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          {placed ? (
            <div
              style={{
                textAlign: "center",
                padding: "1rem",
                background: "rgba(22,163,74,0.08)",
                border: "1.5px solid rgba(22,163,74,0.35)",
                borderRadius: "14px",
                color: "#16a34a",
                fontWeight: 700,
                fontSize: "0.95rem",
                animation: "fadeIn 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "1rem" }}>
                <span>✓</span> Bet Placed Successfully!
              </div>
              <div style={{ fontSize: "0.75rem", color: "#4b5563", fontWeight: 500 }}>
                Position added to your <strong>My Bets</strong> portfolio.
              </div>
              {placedTx && (
                <div
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.68rem", color: "#6b7280", fontFamily: "var(--font-mono)" }}>
                    TX Hash: {placedTx.slice(0, 10)}...{placedTx.slice(-8)}
                  </span>
                  <a
                    href={`https://testnet.arcscan.app/tx/${placedTx}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--teal)",
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span>View on ArcScan Explorer</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          ) : !isConnected ? (
            <button
              id="confirm-bet-btn"
              onClick={() => {
                connectMetaMask();
              }}
              style={{
                width: "100%",
                padding: "0.875rem",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "0.95rem",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.18s ease",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
            >
              🔒 Connect Wallet to Bet
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
                fontSize: "0.95rem",
                borderRadius: "12px",
                cursor: amount > 0 && !isPending && !isCalcLoading ? "pointer" : "not-allowed",
                transition: "all 0.18s ease",
                background:
                  amount > 0 && !isPending && !isCalcLoading
                    ? needsApproval
                      ? "#ea580c" // Orange for approval
                      : side === "YES"
                      ? "#2563eb"
                      : "#12062a"
                    : "#e5e7eb",
                color: amount > 0 && !isPending && !isCalcLoading ? "#ffffff" : "#9ca3af",
                border: "none",
                boxShadow:
                  amount > 0 && !isPending && !isCalcLoading
                    ? needsApproval
                      ? "0 4px 16px rgba(234,88,12,0.35)"
                      : side === "YES"
                      ? "0 4px 16px rgba(37,99,235,0.35)"
                      : "0 4px 16px rgba(18,6,42,0.35)"
                    : "none",
                opacity: amount > 0 && !isPending && !isCalcLoading ? 1 : 0.7,
              }}
              onMouseEnter={(e) => {
                if (amount > 0 && !isPending) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
              }}
            >
              {isPending
                ? "Processing transaction..."
                : needsApproval
                ? "Approve USDC Collateral"
                : `${side === "YES" ? "📈" : "📉"} Place ${side} Bet — ${amount} USDC`}
            </button>
          )}

          {(txError || error) && (
            <div style={{ fontSize: "0.75rem", color: "#dc2626", textAlign: "center", marginTop: "0.5rem", fontWeight: 600 }}>
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
            }}
          >
            Resolved via Optimistic Oracle V2 on Arc Testnet.
          </p>
        </div>
      </div>
    </div>
  );
}
