import React, { useMemo, useEffect, useRef } from "react";
import { X, Sparkles, Shield, Cpu, ExternalLink } from "lucide-react";
import { GenLayerTransactionPanel } from "@genlayer/transaction-kit-react";
import "@genlayer/transaction-kit-react/styles.css";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit";
import { getGenLayerTransactionKit, STUDIO_NEXT_CHAIN_ID, STUDIO_NEXT_EXPLORER_URL } from "@/lib/genlayer";

interface GenLayerTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: SubmitInput | null;
  userValue?: bigint;
  account?: string;
  title?: string;
  darkMode?: boolean;
  onDone?: (status: TrackedStatus) => void;
}

export function GenLayerTxModal({
  isOpen,
  onClose,
  tx,
  userValue,
  account,
  title = "GenLayer Studio Next Transaction",
  darkMode = false,
  onDone,
}: GenLayerTxModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Instantiate Transaction Kit
  const kit = useMemo(() => {
    if (!isOpen || !account || typeof window === "undefined") return null;
    try {
      return getGenLayerTransactionKit(account);
    } catch (err) {
      console.warn("Could not create TransactionKit:", err);
      return null;
    }
  }, [isOpen, account]);

  if (!isOpen || !tx) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 7, 18, 0.75)",
        backdropFilter: "blur(10px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          background: darkMode ? "#151022" : "#ffffff",
          color: darkMode ? "#f3f4f6" : "#111827",
          borderRadius: "24px",
          boxShadow: "0 28px 70px rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.15)",
          overflow: "hidden",
          animation: "slideUp 0.25s ease",
          border: darkMode ? "1px solid rgba(168, 85, 247, 0.25)" : "1px solid rgba(46, 16, 82, 0.12)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: darkMode ? "linear-gradient(135deg, rgba(168,85,247,0.1), transparent)" : "linear-gradient(135deg, rgba(46,16,82,0.04), transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #7928ca, #ff0080)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>{title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "2px 8px",
                    borderRadius: "100px",
                    background: darkMode ? "rgba(168,85,247,0.2)" : "rgba(46,16,82,0.08)",
                    color: darkMode ? "#c084fc" : "#6b21a8",
                    fontWeight: 600,
                  }}
                >
                  Studio Next ({STUDIO_NEXT_CHAIN_ID})
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <Shield size={12} color="#10b981" /> Consensus v0.6
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              color: darkMode ? "#9ca3af" : "#6b7280",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content body */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {kit ? (
            <div className="genlayer-panel-container">
              <GenLayerTransactionPanel
                kit={kit}
                tx={tx}
                userValue={userValue}
                network="studio-dev"
                theme={darkMode ? "dark" : "light"}
                trackUntil="decided"
                onDone={(status) => {
                  if (onDone) onDone(status);
                }}
              />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <Sparkles size={36} color="#a855f7" style={{ margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Connect Wallet to GenLayer
              </h3>
              <p style={{ fontSize: "0.88rem", color: darkMode ? "#9ca3af" : "#6b7280", lineHeight: 1.5 }}>
                Please ensure your MetaMask or EIP-1193 Web3 wallet is connected and switched to
                <strong> GenLayer Studio Next</strong> (Chain ID: {STUDIO_NEXT_CHAIN_ID}) to sign this transaction.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: "0.85rem 1.5rem",
            background: darkMode ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.02)",
            borderTop: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: darkMode ? "#9ca3af" : "#6b7280",
          }}
        >
          <span>Measured via <code>fee-profile.json</code></span>
          <a
            href={STUDIO_NEXT_EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: darkMode ? "#c084fc" : "#7c3aed",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 500,
            }}
          >
            Studio Next Explorer <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
