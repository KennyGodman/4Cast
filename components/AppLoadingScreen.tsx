"use client";

import React, { useEffect, useState } from "react";

interface AppLoadingScreenProps {
  onComplete?: () => void;
  duration?: number; // duration in ms, default 1500ms
}

export function AppLoadingScreen({ onComplete, duration = 1500 }: AppLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessages = [
    "Connecting to Arc Network...",
    "Loading Prediction Markets...",
    "Syncing UMA Optimistic Oracle...",
    "Preparing workspace...",
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct > 75) setStatusIndex(3);
      else if (pct > 50) setStatusIndex(2);
      else if (pct > 25) setStatusIndex(1);

      if (elapsed >= duration) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--bg-0)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        animation: "4castFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Ambient background glow circle */}
      <div
        style={{
          position: "absolute",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30, 104, 201, 0.22) 0%, rgba(30, 104, 201, 0) 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
          animation: "4castPulse 2.5s ease-in-out infinite alternate",
        }}
      />

      {/* Main Loader Box */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        {/* Animated Icon Ring */}
        <div
          style={{
            position: "relative",
            width: "90px",
            height: "90px",
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer Spin Ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid rgba(30, 104, 201, 0.12)",
              borderTopColor: "var(--teal)",
              borderRightColor: "#38bdf8",
              animation: "4castSpin 1s linear infinite",
            }}
          />
          {/* Inner Counter Spin Ring */}
          <div
            style={{
              position: "absolute",
              inset: "8px",
              borderRadius: "50%",
              border: "2px stroke rgba(56, 189, 248, 0.2)",
              borderBottomColor: "#60a5fa",
              animation: "4castSpinReverse 1.4s linear infinite",
            }}
          />

          {/* Logo Emblem */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #1e68c9 0%, #0c438c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(30, 104, 201, 0.45)",
            }}
          >
            <img
              src="/4cast-logo.svg"
              alt="4Cast"
              style={{ width: "36px", height: "36px", objectFit: "contain" }}
            />
          </div>
        </div>

        {/* Branding Title requested: "4cast on Arc" */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-0)",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <span>4cast</span>
          <span style={{ fontWeight: 400, color: "var(--text-2)", fontSize: "1.75rem" }}>on</span>
          <span style={{ color: "var(--teal)" }}>Arc</span>
        </h1>

        {/* Loading Status Text */}
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.88rem",
            color: "var(--text-2)",
            marginBottom: "1.75rem",
            minHeight: "1.3rem",
            fontWeight: 500,
          }}
        >
          {statusMessages[statusIndex]}
        </p>

        {/* Progress Line */}
        <div
          style={{
            width: "100%",
            height: "5px",
            background: "var(--bg-3)",
            borderRadius: "var(--r-pill)",
            overflow: "hidden",
            position: "relative",
            border: "1px solid var(--border-0)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #1e68c9 0%, #38bdf8 100%)",
              borderRadius: "var(--r-pill)",
              transition: "width 0.08s ease-out",
              boxShadow: "0 0 10px rgba(56, 189, 248, 0.6)",
            }}
          />
        </div>

        {/* Arc Network Status Tag */}
        <div
          style={{
            marginTop: "1.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.35rem 0.9rem",
            borderRadius: "var(--r-pill)",
            background: "var(--teal-light)",
            border: "1px solid rgba(30, 104, 201, 0.2)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--teal)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--teal)",
              display: "inline-block",
              boxShadow: "0 0 8px var(--teal)",
            }}
          />
          <span>Arc Testnet • Chain ID 50</span>
        </div>
      </div>

      <style>{`
        @keyframes 4castSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes 4castSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes 4castPulse {
          0% { transform: scale(0.92); opacity: 0.5; }
          100% { transform: scale(1.18); opacity: 0.9; }
        }
        @keyframes 4castFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
