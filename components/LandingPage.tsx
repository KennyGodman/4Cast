"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  Plus,
  Lock,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Users,
  Sun,
  Moon,
  HelpCircle,
} from "lucide-react";
import { type MarketCardData } from "@/lib/markets";

interface LandingPageProps {
  onLaunchApp: () => void;
  onSelectMarket?: (market: MarketCardData) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  markets: MarketCardData[];
}

export function LandingPage({
  onLaunchApp,
  onSelectMarket,
  darkMode,
  onToggleDarkMode,
  markets,
}: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const featuredMarkets = markets.slice(0, 4);

  const faqs = [
    {
      q: "What is 4Cast?",
      a: "4Cast is a decentralized binary prediction market built on Arc Network. It allows users to trade positions on future events in crypto, economics, technology, and geopolitics.",
    },
    {
      q: "How are markets resolved?",
      a: "Market resolution is secured by UMA's Optimistic Oracle V2. Anyone can propose an outcome with a bond, and if undisputed during the liveness period, the market settles trustlessly on-chain.",
    },
    {
      q: "Do I need a Web3 wallet like MetaMask?",
      a: "No! You can connect with standard EVM wallets like MetaMask, or sign in using Circle Passkey wallets with FaceID, TouchID, or device PIN — no seed phrases or browser extension required.",
    },
    {
      q: "What tokens are used for trading?",
      a: "Collateral and trading gas use USDC on Arc Testnet, providing stable collateral values and instant sub-second transactions.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-0)",
        color: "var(--text-0)",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* ── Top Nav Bar ────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg-header)",
          borderBottom: "1px solid var(--border-0)",
          backdropFilter: "blur(12px)",
          boxShadow: "var(--shadow-header)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0.85rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
            onClick={onLaunchApp}
          >
            <span
              style={{
                fontSize: "1.4rem",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--teal-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              🔮
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.35rem",
                letterSpacing: "-0.025em",
                color: "var(--text-0)",
              }}
            >
              4<span style={{ color: "var(--teal)" }}>Cast</span>
            </span>
          </div>

          {/* Nav links */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.75rem",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            <a
              href="#features"
              style={{ color: "var(--text-1)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              style={{ color: "var(--text-1)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            >
              How It Works
            </a>
            <a
              href="#markets-preview"
              style={{ color: "var(--text-1)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            >
              Markets
            </a>
            <a
              href="#faq"
              style={{ color: "var(--text-1)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            >
              FAQ
            </a>
          </nav>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r-pill)",
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-1)",
                transition: "all 0.2s ease",
              }}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Launch App Button */}
            <button
              onClick={onLaunchApp}
              style={{
                background: "var(--teal)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--r-pill)",
                padding: "0.6rem 1.35rem",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 14px rgba(30,104,201,0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(30,104,201,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,104,201,0.35)";
              }}
            >
              <span>Launch App</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Banner Section ────────────────────────────────── */}
      <section
        style={{
          padding: "5rem 1.5rem 4rem",
          maxWidth: "1280px",
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3.5rem",
          alignItems: "center",
        }}
      >
        {/* Left Hero Text */}
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 1rem",
              borderRadius: "var(--r-pill)",
              background: "var(--teal-light)",
              border: "1px solid rgba(30,104,201,0.25)",
              color: "var(--teal)",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
              marginBottom: "1.5rem",
            }}
          >
            <Sparkles size={14} />
            <span>Next-Gen Prediction Market on Arc Network</span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3.2rem",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.035em",
              color: "var(--text-0)",
              marginBottom: "1.25rem",
            }}
          >
            Predict tomorrow&apos;s outcomes. <br />
            <span
              style={{
                background: "linear-gradient(135deg, var(--teal) 0%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Trade with confidence.
            </span>
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-2)",
              lineHeight: 1.6,
              marginBottom: "2rem",
              maxWidth: "540px",
            }}
          >
            Trade opinions on crypto, politics, finance, and macro events. Built with UMA Optimistic Oracle resolution and Circle biometric passkey wallets on Arc Network.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={onLaunchApp}
              style={{
                background: "var(--teal)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--r-pill)",
                padding: "0.9rem 2rem",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                boxShadow: "0 6px 20px rgba(30,104,201,0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(30,104,201,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(30,104,201,0.35)";
              }}
            >
              <span>Explore DApp</span>
              <ArrowRight size={18} />
            </button>

            <a
              href="#markets-preview"
              style={{
                background: "var(--bg-1)",
                color: "var(--text-0)",
                border: "1.5px solid var(--border-1)",
                borderRadius: "var(--r-pill)",
                padding: "0.9rem 1.75rem",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--teal)";
                e.currentTarget.style.background = "var(--bg-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-1)";
                e.currentTarget.style.background = "var(--bg-1)";
              }}
            >
              <TrendingUp size={18} />
              <span>Live Markets</span>
            </a>
          </div>

          {/* Security highlights */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border-0)",
              fontSize: "0.82rem",
              color: "var(--text-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <ShieldCheck size={16} color="var(--yes-green)" />
              <span>UMA Oracle V2</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Zap size={16} color="var(--teal)" />
              <span>Passkey Sign-in</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Lock size={16} color="var(--resolving)" />
              <span>Arc Testnet USDC</span>
            </div>
          </div>
        </div>

        {/* Right Hero Market Preview Card */}
        <div style={{ position: "relative" }}>
          {/* Glass Card Stack */}
          <div
            style={{
              background: "var(--bg-1)",
              border: "1.5px solid var(--border-1)",
              borderRadius: "var(--r-xl)",
              padding: "1.75rem",
              boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--teal)",
                  background: "var(--teal-light)",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "var(--r-pill)",
                }}
              >
                🔥 Trending Market
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 500 }}>
                Ends Dec 31, 2026
              </span>
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-0)", lineHeight: 1.35 }}>
              Will Bitcoin exceed $150,000 before the end of Q4 2026?
            </h3>

            {/* YES / NO Probabilities Bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ color: "var(--yes-green)" }}>YES 68%</span>
                <span style={{ color: "var(--no-red)" }}>NO 32%</span>
              </div>
              <div
                style={{
                  height: "10px",
                  borderRadius: "var(--r-pill)",
                  background: "var(--no-bg)",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: "68%",
                    background: "var(--yes-green)",
                    transition: "width 0.5s ease",
                  }}
                />
                <div style={{ flex: 1, background: "var(--no-red)" }} />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button
                onClick={onLaunchApp}
                style={{
                  background: "var(--yes-bg)",
                  border: "1.5px solid var(--yes-border)",
                  color: "var(--yes-green)",
                  borderRadius: "var(--r-md)",
                  padding: "0.75rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span>Buy YES 68¢</span>
              </button>
              <button
                onClick={onLaunchApp}
                style={{
                  background: "var(--no-bg)",
                  border: "1.5px solid var(--no-border)",
                  color: "var(--no-red)",
                  borderRadius: "var(--r-md)",
                  padding: "0.75rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span>Buy NO 32¢</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Platform Stats Strip ───────────────────────────── */}
      <section
        style={{
          background: "var(--bg-1)",
          borderTop: "1px solid var(--border-0)",
          borderBottom: "1px solid var(--border-0)",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--teal)" }}>$1.4M+</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-2)", marginTop: "0.25rem", fontWeight: 500 }}>
              Total Volume Traded
            </div>
          </div>
          <div>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--yes-green)" }}>100%</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-2)", marginTop: "0.25rem", fontWeight: 500 }}>
              UMA Oracle Dispute Accuracy
            </div>
          </div>
          <div>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--teal)" }}>&lt; 1s</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-2)", marginTop: "0.25rem", fontWeight: 500 }}>
              Arc Sub-Second Finality
            </div>
          </div>
          <div>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--resolving)" }}>0 Fees</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-2)", marginTop: "0.25rem", fontWeight: 500 }}>
              USDC Gas Sponsored
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid Section ─────────────────────────────── */}
      <section id="features" style={{ padding: "5rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-0)" }}>
            Engineered for Precision & Transparency
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--text-2)", marginTop: "0.5rem" }}>
            Everything you need for seamless prediction market trading on-chain.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.75rem" }}>
          {/* Feature 1 */}
          <div
            style={{
              background: "var(--bg-1)",
              border: "1.5px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              padding: "2rem",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "var(--teal-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <ShieldCheck size={24} color="var(--teal)" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              UMA Optimistic Oracle
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              Decentralized resolution backed by economic bond guarantees and dispute escalation to UMA DVM arbitration.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            style={{
              background: "var(--bg-1)",
              border: "1.5px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              padding: "2rem",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "rgba(22,163,74,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <Zap size={24} color="var(--yes-green)" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Circle Passkey Sign-in
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              Log in securely using FaceID, TouchID, or hardware keys with ERC-4337 smart account abstraction.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            style={{
              background: "var(--bg-1)",
              border: "1.5px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              padding: "2rem",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "rgba(217,119,6,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <BarChart3 size={24} color="var(--resolving)" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Automated Market Maker
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              Constant-product pricing guarantees continuous liquidity for instant YES and NO token position trades.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ─────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          background: "var(--bg-1)",
          borderTop: "1px solid var(--border-0)",
          borderBottom: "1px solid var(--border-0)",
          padding: "5rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-0)" }}>
              How 4Cast Works
            </h2>
            <p style={{ fontSize: "1rem", color: "var(--text-2)", marginTop: "0.5rem" }}>
              3 simple steps to forecast and earn on Arc Network.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
            <div style={{ textAlign: "center", padding: "1.5rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--teal)",
                  color: "#ffffff",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Connect Wallet
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.5 }}>
                Use MetaMask or Circle Passkeys to start. Claim testnet collateral directly from our faucet.
              </p>
            </div>

            <div style={{ textAlign: "center", padding: "1.5rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--teal)",
                  color: "#ffffff",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Take a Position
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.5 }}>
                Select any market and buy YES or NO position tokens based on your market conviction.
              </p>
            </div>

            <div style={{ textAlign: "center", padding: "1.5rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--teal)",
                  color: "#ffffff",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Settle & Claim Payout
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.5 }}>
                Once resolved by UMA Oracle, redeem winning shares 1-to-1 for USDC collateral.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Markets Section ───────────────────────────── */}
      <section id="markets-preview" style={{ padding: "5rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
          <div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-0)" }}>
              Explore Active Markets
            </h2>
            <p style={{ fontSize: "1rem", color: "var(--text-2)", marginTop: "0.35rem" }}>
              Real-time probabilities driven by automated market makers.
            </p>
          </div>
          <button
            onClick={onLaunchApp}
            style={{
              background: "transparent",
              color: "var(--teal)",
              border: "1.5px solid var(--teal)",
              borderRadius: "var(--r-pill)",
              padding: "0.6rem 1.25rem",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span>View All Markets</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>
          {featuredMarkets.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                onSelectMarket?.(m);
                onLaunchApp();
              }}
              style={{
                background: "var(--bg-1)",
                border: "1.5px solid var(--border-1)",
                borderRadius: "var(--r-lg)",
                padding: "1.5rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--teal)";
                e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--teal)",
                    background: "var(--teal-light)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  {m.category}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                  Vol {m.volume}
                </span>
              </div>
              <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-0)", marginBottom: "1rem" }}>
                {m.title}
              </h4>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                <span style={{ color: "var(--yes-green)" }}>YES {m.yesPrice}%</span>
                <span style={{ color: "var(--no-red)" }}>NO {m.noPrice}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────── */}
      <section
        id="faq"
        style={{
          background: "var(--bg-1)",
          borderTop: "1px solid var(--border-0)",
          padding: "5rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-0)" }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: "1px solid var(--border-1)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: "100%",
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--text-0)",
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: "0 1.5rem 1.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-2)",
                        lineHeight: 1.6,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem", textAlign: "center", background: "var(--bg-0)" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text-0)", marginBottom: "1rem" }}>
          Ready to Forecast?
        </h2>
        <p style={{ fontSize: "1.1rem", color: "var(--text-2)", marginBottom: "2rem" }}>
          Join the next generation of decentralized prediction markets on Arc Network.
        </p>
        <button
          onClick={onLaunchApp}
          style={{
            background: "var(--teal)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--r-pill)",
            padding: "1rem 2.5rem",
            fontWeight: 800,
            fontSize: "1.1rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            boxShadow: "0 8px 24px rgba(30,104,201,0.4)",
          }}
        >
          <span>Launch DApp Now</span>
          <ArrowRight size={20} />
        </button>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        style={{
          background: "var(--bg-header)",
          borderTop: "1px solid var(--border-0)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          marginTop: "auto",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "var(--text-2)", fontWeight: 600, marginBottom: "0.5rem" }}>
          4Cast Prediction Markets — Powered by Circle Passkeys & UMA Optimistic Oracle on Arc Network
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
          © 2026 4Cast. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
