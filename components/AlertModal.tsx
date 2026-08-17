import React, { useEffect, useRef } from "react";
import { X, AlertTriangle, ExternalLink } from "lucide-react";

interface AlertModalProps {
  title?: string;
  message: string;
  onClose: () => void;
  actionUrl?: string;
  actionText?: string;
}

export function AlertModal({
  title = "Warning",
  message,
  onClose,
  actionUrl = "",
  actionText = "",
}: AlertModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

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
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden",
          animation: "slideUp 0.22s ease",
          border: "1px solid rgba(239, 68, 68, 0.15)",
        }}
      >
        {/* Header decoration */}
        <div
          style={{
            height: "6px",
            background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 100%)",
          }}
        />

        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            {/* Warning Icon Badge */}
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(239, 68, 68, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} color="#ef4444" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "0.4rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#4b5563",
                  lineHeight: 1.45,
                  margin: 0,
                }}
              >
                {message}
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "#f3f4f6",
                border: "none",
                borderRadius: "8px",
                padding: "0.25rem",
                cursor: "pointer",
                color: "#9ca3af",
                display: "flex",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            >
              <X size={15} />
            </button>
          </div>

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
              marginTop: "0.25rem",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "10px",
                border: "1.5px solid #e5e7eb",
                background: "#ffffff",
                color: "#374151",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              Got it
            </button>

            {actionUrl && (
              <a
                href={actionUrl}
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: "10px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.22)",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                {actionText || "Open Link"}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
