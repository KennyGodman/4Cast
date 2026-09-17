import React, { useState } from "react";
import {
  Sparkles,
  Shield,
  Layers,
  BrainCircuit,
  Coins,
  ArrowRight,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Cpu,
} from "lucide-react";
import { STUDIO_NEXT_EXPLORER_URL } from "@/lib/genlayer";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo?: () => void;
}

export function OnboardingModal({ isOpen, onClose, onStartDemo }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      badge: "DUAL-NETWORK ARCHITECTURE",
      title: "Predict with USDC on Arc & $GEN on GenLayer",
      description:
        "4Cast combines high-throughput on-chain trading with autonomous AI consensus resolution across two complementary networks.",
      items: [
        {
          icon: Shield,
          title: "Arc Network (USDC)",
          desc: "Ultra-fast execution with native USDC collateral and Circle Passkey smart account security.",
        },
        {
          icon: Cpu,
          title: "GenLayer Studio Next ($GEN)",
          desc: "Intelligent Contracts running GenVM Python runtime, Consensus v0.6, and empirical fee profiling.",
        },
        {
          icon: Coins,
          title: "Flexible Token Choice",
          desc: "Switch between USDC and $GEN test tokens directly in every betting panel with 1 click.",
        },
      ],
    },
    {
      badge: "AUTONOMOUS SETTLEMENT",
      title: "How the 5-Validator AI Jury Resolves Markets",
      description:
        "No centralized oracles or slow multisigs. GenLayer validators autonomously read the live web and execute multi-LLM consensus.",
      items: [
        {
          icon: Layers,
          title: "1. Real-Time Web Scraping",
          desc: "Validators execute gl.nondet.web.render() to fetch official ground truth (APIs, government indices, sports scores).",
        },
        {
          icon: BrainCircuit,
          title: "2. Multi-LLM Reasoning",
          desc: "5 independent GenVM nodes evaluate contract criteria using Llama 3.3, DeepSeek R1, and Claude 3.5 models.",
        },
        {
          icon: CheckCircle2,
          title: "3. Strict Equivalence (5/5 Consensus)",
          desc: "gl.eq_principle.strict_eq() guarantees all validators agree on the verdict before payouts are released.",
        },
      ],
    },
    {
      badge: "TESTER WALKTHROUGH",
      title: "Experience Trading, AI Settlement & Claiming",
      description:
        "Everything is designed for immediate end-to-end testing without waiting months for real-world closing dates.",
      items: [
        {
          icon: Coins,
          title: "1. Place Predictions",
          desc: "Select any market (including our new Sports category!) and place YES/NO bets in USDC or $GEN.",
        },
        {
          icon: Sparkles,
          title: "2. Fast AI Settlement (Demo)",
          desc: "Click '⚡ Settle via AI Jury' on any open bet in My Bets to watch the 5 validators inspect live ground truth.",
        },
        {
          icon: CheckCircle2,
          title: "3. Instant Payout Claim",
          desc: "Once settled, click 'Claim Payout' to immediately record winnings and verify settlement flow.",
        },
      ],
    },
  ];

  const cur = steps[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 7, 18, 0.78)",
        backdropFilter: "blur(8px)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "var(--bg-1)",
          border: "1.5px solid var(--border-1)",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Gradient Header */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(168,85,247,0.15))",
            borderBottom: "1px solid var(--border-1)",
            padding: "1.25rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                letterSpacing: "0.15em",
                color: "var(--teal)",
                fontWeight: 800,
                background: "var(--teal-light)",
                padding: "0.2rem 0.55rem",
                borderRadius: "var(--r-pill)",
              }}
            >
              {cur.badge}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Step {step + 1} of {steps.length}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border-1)",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "1.5rem 1.5rem 1.25rem" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.35rem",
              fontWeight: 800,
              color: "var(--text-0)",
              letterSpacing: "-0.02em",
              margin: "0 0 0.5rem",
            }}
          >
            {cur.title}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.85rem",
              color: "var(--text-2)",
              lineHeight: 1.5,
              margin: "0 0 1.25rem",
            }}
          >
            {cur.description}
          </p>

          {/* Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {cur.items.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.85rem",
                  padding: "0.85rem 1rem",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    background: "rgba(37,99,235,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--teal)",
                    marginTop: "2px",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "var(--text-0)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.78rem",
                      color: "var(--text-2)",
                      lineHeight: 1.45,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Indicators & Action Buttons */}
        <div
          style={{
            padding: "1rem 1.5rem 1.5rem",
            background: "var(--bg-0)",
            borderTop: "1px solid var(--border-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Dots */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? "22px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: i === step ? "var(--teal)" : "var(--border-1)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: "0.5rem 0.85rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "10px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-1)",
                  color: "var(--text-2)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onStartDemo) onStartDemo();
                }}
                style={{
                  padding: "0.5rem 1.15rem",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 10px rgba(22,163,74,0.3)",
                }}
              >
                <span>Start Exploring</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
