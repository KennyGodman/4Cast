"use client";
import React, { useEffect, useState } from "react";
import { X, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { isCircleConfigured } from "@/lib/circle";

interface WalletConnectModalProps {
  onClose: () => void;
  onShowAlert?: (alert: { title: string; message: string }) => void;
}

/* ── EVM wallet definitions ─────────────────────────── */
const EVM_WALLETS = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    desc: "Browser extension wallet",
    detect: () => typeof window !== "undefined" && !!(window as any).ethereum?.isMetaMask,
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    icon: "🐇",
    desc: "Smart contract wallet by DeBank",
    detect: () => typeof window !== "undefined" && !!(window as any).ethereum?.isRabby,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "🔵",
    desc: "Self-custody by Coinbase",
    detect: () => typeof window !== "undefined" && !!(window as any).ethereum?.isCoinbaseWallet,
  },
  {
    id: "brave",
    name: "Brave Wallet",
    icon: "🦁",
    desc: "Built into Brave browser",
    detect: () => typeof window !== "undefined" && !!(window as any).ethereum?.isBraveWallet,
  },
  {
    id: "injected",
    name: "Browser Wallet",
    icon: "🌐",
    desc: "Any injected EVM wallet",
    detect: () => typeof window !== "undefined" && !!(window as any).ethereum,
  },
];

/* ── SVM wallet definitions ─────────────────────────── */
const SVM_WALLETS = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "👻",
    desc: "Multi-chain wallet — Solana & more",
    detect: () => typeof window !== "undefined" && !!(window as any).phantom?.solana,
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "☀️",
    desc: "Non-custodial Solana wallet",
    detect: () => typeof window !== "undefined" && !!(window as any).solflare,
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "🎒",
    desc: "xNFT wallet by Coral",
    detect: () => typeof window !== "undefined" && !!(window as any).backpack,
  },
  {
    id: "glow",
    name: "Glow",
    icon: "✨",
    desc: "Solana wallet",
    detect: () => typeof window !== "undefined" && !!(window as any).glow,
  },
];

export function WalletConnectModal({ onClose, onShowAlert }: WalletConnectModalProps) {
  const { connectMetaMask, connectCircle, isConnecting, circleError } = useWallet();
  const [expandedSection, setExpandedSection] = useState<"evm" | "svm" | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  /* ── EVM connect ─ directly triggers window.ethereum popup */
  const handleConnectEVM = (walletId: string) => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      const names: Record<string, string> = {
        metamask: "MetaMask",
        rabby: "Rabby Wallet",
        coinbase: "Coinbase Wallet",
        brave: "Brave Wallet",
        injected: "an EVM wallet",
      };
      onShowAlert?.({
        title: "No EVM Wallet Detected",
        message: `No EVM wallet extension is installed. Please install ${names[walletId] ?? "an EVM wallet"} from the browser extension store, then refresh the page.`,
      });
      return;
    }
    // connectMetaMask directly calls window.ethereum.request — pops up whichever wallet is active
    connectMetaMask();
    onClose();
  };

  /* ── SVM connect ─ Arc is EVM-only; show graceful message with install link */
  const handleConnectSVM = (walletId: string) => {
    const wallet = SVM_WALLETS.find((w) => w.id === walletId);
    const detected = wallet?.detect();
    if (!detected) {
      onShowAlert?.({
        title: `${wallet?.name ?? "SVM Wallet"} Not Detected`,
        message: `${wallet?.name ?? "This wallet"} is not installed. Note: Arc Network is an EVM-compatible chain. SVM wallets can interact with Arc if they support EVM networks — please add Arc Testnet (Chain ID 5042002) manually in your wallet settings.`,
      });
      return;
    }
    onShowAlert?.({
      title: "SVM Wallet Connected (Read-only)",
      message: `${wallet?.name} detected! Arc Network is an EVM chain. Please switch to the Arc Testnet network (Chain ID: 5042002) inside your wallet to interact with 4Cast markets.`,
    });
    onClose();
  };

  /* ── Circle Passkey connect */
  const handleConnectCircle = async () => {
    try {
      if (!isCircleConfigured()) {
        onShowAlert?.({
          title: "Circle Wallet Not Configured",
          message: "Circle Passkey environment variables (NEXT_PUBLIC_CIRCLE_CLIENT_KEY and NEXT_PUBLIC_CIRCLE_CLIENT_URL) are not set. Add them to .env.local and restart the server.",
        });
        return;
      }
      await connectCircle();
      onClose();
    } catch (err) {
      console.error("Circle connection error:", err);
    }
  };

  const toggleSection = (section: "evm" | "svm") => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  /* ── shared button style ─────────────────────────── */
  const categoryBtnStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    padding: "0.9rem 1.1rem",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    color: "#111827",
    fontSize: "0.9rem",
    transition: "all 0.15s ease",
    outline: "none",
  };

  const walletRowStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 1rem",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    color: "#111827",
    fontSize: "0.85rem",
    transition: "all 0.12s ease",
    outline: "none",
  };

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
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden",
          animation: "slideUp 0.25s ease",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#ffffff",
            zIndex: 1,
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>
              Connect a Wallet
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.15rem" }}>
              Choose a connection method for the 4Cast prediction market
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              border: "none",
              borderRadius: "8px",
              padding: "0.4rem",
              cursor: "pointer",
              color: "#6b7280",
              display: "flex",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* ── EVM WALLETS SECTION ─────────────────────── */}
          <div>
            <button
              id="toggle-evm"
              style={{
                ...categoryBtnStyle,
                borderRadius: expandedSection === "evm" ? "12px 12px 0 0" : "12px",
                borderColor: expandedSection === "evm" ? "#1e68c9" : "#e5e7eb",
                background: expandedSection === "evm" ? "#eef5ff" : "#f9fafb",
              }}
              onClick={() => toggleSection("evm")}
              onMouseEnter={(e) => {
                if (expandedSection !== "evm") {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#1e68c9";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(30,104,201,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (expandedSection !== "evm") {
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>🦊</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: expandedSection === "evm" ? "#1e68c9" : "#111827" }}>EVM Wallets</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500, marginTop: "0.1rem" }}>
                  MetaMask, Rabby, Coinbase, Brave & more
                </div>
              </div>
              {expandedSection === "evm"
                ? <ChevronUp size={16} color="#1e68c9" />
                : <ChevronDown size={16} color="#9ca3af" />}
            </button>

            {/* EVM sub-list */}
            {expandedSection === "evm" && (
              <div
                style={{
                  border: "1px solid #1e68c9",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  background: "#f8fbff",
                  animation: "fadeIn 0.15s ease",
                }}
              >
                {EVM_WALLETS.map((wallet) => {
                  const installed = wallet.detect();
                  return (
                    <button
                      key={wallet.id}
                      id={`connect-${wallet.id}`}
                      style={walletRowStyle}
                      onClick={() => handleConnectEVM(wallet.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eef5ff";
                        e.currentTarget.style.borderColor = "#1e68c9";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(30,104,201,0.10)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{ fontSize: "1.2rem", minWidth: "1.5rem", textAlign: "center" }}>{wallet.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{wallet.name}</div>
                        <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.05rem" }}>{wallet.desc}</div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "999px",
                          background: installed ? "#dcfce7" : "#f3f4f6",
                          color: installed ? "#16a34a" : "#9ca3af",
                        }}
                      >
                        {installed ? "DETECTED" : "INSTALL"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SVM WALLETS SECTION ─────────────────────── */}
          <div>
            <button
              id="toggle-svm"
              style={{
                ...categoryBtnStyle,
                borderRadius: expandedSection === "svm" ? "12px 12px 0 0" : "12px",
                borderColor: expandedSection === "svm" ? "#9333ea" : "#e5e7eb",
                background: expandedSection === "svm" ? "#faf5ff" : "#f9fafb",
              }}
              onClick={() => toggleSection("svm")}
              onMouseEnter={(e) => {
                if (expandedSection !== "svm") {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#9333ea";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(147,51,234,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (expandedSection !== "svm") {
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>👻</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: expandedSection === "svm" ? "#9333ea" : "#111827" }}>SVM Wallets</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500, marginTop: "0.1rem" }}>
                  Phantom, Solflare, Backpack, Glow & more
                </div>
              </div>
              {expandedSection === "svm"
                ? <ChevronUp size={16} color="#9333ea" />
                : <ChevronDown size={16} color="#9ca3af" />}
            </button>

            {/* SVM sub-list */}
            {expandedSection === "svm" && (
              <div
                style={{
                  border: "1px solid #9333ea",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  background: "#fdf8ff",
                  animation: "fadeIn 0.15s ease",
                }}
              >
                {/* Arc EVM notice */}
                <div style={{
                  margin: "0.75rem 0.75rem 0",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(147,51,234,0.06)",
                  borderRadius: "8px",
                  fontSize: "0.68rem",
                  color: "#7c3aed",
                  lineHeight: 1.4,
                  border: "1px solid rgba(147,51,234,0.15)",
                }}>
                  ⚡ Arc Network is EVM-compatible. SVM wallets that support EVM (e.g. Phantom) can connect by adding Arc Testnet (Chain ID: 5042002) manually.
                </div>
                <div style={{ padding: "0.5rem 0.75rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {SVM_WALLETS.map((wallet) => {
                    const installed = wallet.detect();
                    return (
                      <button
                        key={wallet.id}
                        id={`connect-${wallet.id}`}
                        style={walletRowStyle}
                        onClick={() => handleConnectSVM(wallet.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#faf5ff";
                          e.currentTarget.style.borderColor = "#9333ea";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(147,51,234,0.10)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <span style={{ fontSize: "1.2rem", minWidth: "1.5rem", textAlign: "center" }}>{wallet.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{wallet.name}</div>
                          <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.05rem" }}>{wallet.desc}</div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "999px",
                            background: installed ? "#dcfce7" : "#f3f4f6",
                            color: installed ? "#16a34a" : "#9ca3af",
                          }}
                        >
                          {installed ? "DETECTED" : "INSTALL"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── CIRCLE WALLET ───────────────────────────── */}
          <button
            id="connect-circle"
            onClick={handleConnectCircle}
            disabled={isConnecting}
            style={{
              ...categoryBtnStyle,
              opacity: isConnecting ? 0.6 : 1,
              cursor: isConnecting ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isConnecting) {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>🛡️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Circle Wallet</div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500, marginTop: "0.1rem" }}>
                {!isCircleConfigured()
                  ? "Biometric sign-in — configure env vars to enable"
                  : "Sign in with Passkeys / FaceID / TouchID"}
              </div>
            </div>
          </button>

          {/* Error */}
          {circleError && (
            <div style={{ fontSize: "0.75rem", color: "#dc2626", textAlign: "center" }}>
              {circleError}
            </div>
          )}

          {/* Footer notice */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "rgba(37,99,235,0.04)",
              borderRadius: "10px",
            }}
          >
            <ShieldCheck size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.68rem", color: "#6b7280", lineHeight: 1.4 }}>
              By connecting, you agree to the prediction market terms of service and acknowledge that transaction gas is paid in USDC on Arc Testnet.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
