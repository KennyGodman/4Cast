import React, { useState } from "react";
import { Plus, Calendar, AlignLeft, Tag, Eye, Info, Loader2 } from "lucide-react";

const RESOLUTION_TEMPLATES = [
  {
    label: "Price Target",
    title: "Will [ASSET] exceed $[PRICE] before [DATE]?",
    description: "Resolves YES if the [ASSET] spot price reaches or exceeds $[PRICE] at any point before [DATE].",
    source: "https://api.coingecko.com",
  },
  {
    label: "News Event",
    title: "Will [EVENT] happen before [DATE]?",
    description: "Resolves YES if [EVENT] occurs and is confirmed by at least two major news sources before [DATE].",
    source: "https://reuters.com",
  },
  {
    label: "Sports Result",
    title: "Will [TEAM/PLAYER] win [COMPETITION] in [YEAR]?",
    description: "Resolves YES if [TEAM/PLAYER] wins the [COMPETITION] as confirmed by the official governing body.",
    source: "https://fifa.com",
  },
];

const CATEGORIES = ["Crypto", "Economy", "Equities", "Commodities", "Geopolitics"];

interface CreateMarketProps {
  onCreateMarket: (market: any) => void;
}

export function CreateMarket({ onCreateMarket }: CreateMarketProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Crypto",
    resolveDate: "",
    totalPool: 1000,
  });

  const [templateIdx, setTemplateIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Deployment loading states
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [deployError, setDeployError] = useState("");

  const update = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const applyTemplate = (idx: number) => {
    const t = RESOLUTION_TEMPLATES[idx];
    setTemplateIdx(idx);
    if (!form.title || form.title.includes("[")) update("title", t.title);
    if (!form.description || form.description.includes("[")) update("description", t.description);
  };

  const handleLaunch = async () => {
    if (!form.title || !form.resolveDate) return;
    setIsDeploying(true);
    setDeployError("");
    setDeployStep(1);

    try {
      // Step 1: Request contract deployment from api route
      const res = await fetch("/api/create-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      setDeployStep(5); // Finished
      setTimeout(() => {
        setIsDeploying(false);
        setDeployStep(0);
        // Trigger success callback
        onCreateMarket(data.market);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setDeployError(err.message || "Failed to deploy contracts.");
      setIsDeploying(false);
      setDeployStep(0);
    }
  };

  // Automatically increment step simulation for cool logs during deployment
  React.useEffect(() => {
    if (isDeploying && deployStep > 0 && deployStep < 5) {
      const timer = setTimeout(() => {
        setDeployStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDeploying, deployStep]);

  const isValid = form.title.trim() && form.resolveDate && form.description.trim() && !isDeploying;

  const stepsList = [
    "Deploying Event-Based Prediction Market contract to Arc Testnet...",
    "Approving proposer rewards and requesting resolution price from UMA Oracle...",
    "Deploying Prediction Market AMM Liquidity Pool contract...",
    "Funding AMM and seeding pool with 1,000 USDC initial liquidity...",
    "Market deployed successfully! Finalizing details...",
  ];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div>
        <div
          className="font-mono"
          style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "var(--teal)", marginBottom: "0.5rem" }}
        >
          // CREATE A NEW PREDICTION MARKET
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-0)", letterSpacing: "-0.01em" }}
        >
          LAUNCH MARKET
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "0.9rem", marginTop: "0.4rem" }}>
          Deploy a custom binary market contract on Arc Testnet. Seeding liquidity and oracle setups are managed
          automatically.
        </p>
      </div>

      {/* Deploying Overlay Progress Screen */}
      {isDeploying && (
        <div
          className="glass-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "3rem 2rem",
            gap: "1.5rem",
            background: "rgba(255, 255, 255, 0.8)",
            border: "1.5px solid var(--border-teal)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <Loader2 size={36} className="animate-spin" color="var(--teal)" />
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-0)" }}>
              Deploying Prediction Market on Arc
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
              Please wait while we run contract deployments on-chain.
            </p>
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              background: "var(--bg-2)",
              padding: "1.25rem",
              borderRadius: "12px",
              border: "1px solid var(--border-1)",
            }}
          >
            {stepsList.map((stepDesc, idx) => {
              const currentIdx = idx + 1;
              const isDone = deployStep > currentIdx || deployStep === 5;
              const isActive = deployStep === currentIdx;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    fontSize: "0.78rem",
                    color: isDone ? "var(--yes-green)" : isActive ? "var(--text-0)" : "var(--text-3)",
                    fontWeight: isActive || isDone ? 600 : 400,
                    opacity: isDone || isActive ? 1 : 0.6,
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>{isDone ? "✓" : isActive ? "⏳" : "○"}</span>
                  <span>{stepDesc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deployError && (
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            background: "var(--no-bg)",
            border: "1px solid var(--no-border)",
            color: "var(--no-red)",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          Error launching market: {deployError}
        </div>
      )}

      {!isDeploying && (
        <>
          {/* Quick Templates */}
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            <div
              className="font-mono"
              style={{
                fontSize: "0.65rem",
                color: "var(--teal)",
                letterSpacing: "0.1em",
                marginBottom: "0.875rem",
              }}
            >
              // QUICK START TEMPLATES
            </div>
            <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
              {RESOLUTION_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  id={`template-${i}`}
                  onClick={() => applyTemplate(i)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.78rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: templateIdx === i ? "var(--teal-light)" : "var(--bg-2)",
                    color: templateIdx === i ? "var(--teal)" : "var(--text-2)",
                    border: templateIdx === i ? "1.5px solid var(--teal)" : "1.5px solid var(--border-1)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--teal)", letterSpacing: "0.1em" }}>
              // MARKET DETAILS
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="market-title"
                className="font-mono"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.08em",
                  color: "var(--text-3)",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                MARKET TITLE *
              </label>
              <input
                id="market-title"
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Will Bitcoin exceed $150,000 before Jan 1, 2027?"
                className="cyber-input"
                style={{
                  fontSize: "0.9rem",
                  background: "var(--bg-1)",
                  color: "var(--text-0)",
                  border: "1.5px solid var(--border-1)",
                }}
              />
              <div style={{ fontSize: "0.63rem", color: "var(--text-3)", marginTop: "0.3rem", opacity: 0.7 }}>
                Be specific. Good titles clearly state what YES means.
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="market-description"
                className="font-mono"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.08em",
                  color: "var(--text-3)",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                DESCRIPTION *
              </label>
              <textarea
                id="market-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the resolution criteria in detail..."
                className="cyber-input"
                rows={4}
                style={{
                  fontSize: "0.875rem",
                  resize: "vertical",
                  background: "var(--bg-1)",
                  color: "var(--text-0)",
                  border: "1.5px solid var(--border-1)",
                }}
              />
              <div style={{ fontSize: "0.63rem", color: "var(--text-3)", marginTop: "0.3rem", opacity: 0.7 }}>
                Explain exactly what counts as YES. Include edge cases.
              </div>
            </div>

            {/* Category + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  htmlFor="market-category"
                  className="font-mono"
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.08em",
                    color: "var(--text-3)",
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  CATEGORY
                </label>
                <select
                  id="market-category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="cyber-select"
                  style={{
                    background: "var(--bg-1)",
                    color: "var(--text-0)",
                    border: "1.5px solid var(--border-1)",
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} style={{ background: "var(--bg-1)", color: "var(--text-0)" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="market-resolve-date"
                  className="font-mono"
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.08em",
                    color: "var(--text-3)",
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  RESOLUTION DATE *
                </label>
                <input
                  id="market-resolve-date"
                  type="date"
                  value={form.resolveDate}
                  onChange={(e) => update("resolveDate", e.target.value)}
                  className="cyber-input"
                  min={new Date().toISOString().split("T")[0]}
                  style={{
                    background: "var(--bg-1)",
                    color: "var(--text-0)",
                    border: "1.5px solid var(--border-1)",
                  }}
                />
              </div>
            </div>

            {/* Initial Liquidity */}
            <div>
              <label
                htmlFor="market-pool"
                className="font-mono"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.08em",
                  color: "var(--text-3)",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                INITIAL LIQUIDITY (1,000 USDC HARDCODED)
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--bg-3)",
                  padding: "0.65rem 0.875rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  color: "var(--text-2)",
                  border: "1px solid var(--border-1)",
                }}
              >
                <Info size={14} color="var(--teal)" />
                <span>Markets are automatically seeded with 1,000 USDC from the deployer account.</span>
              </div>
            </div>
          </div>

          {/* Preview + Submit */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              id="preview-market-btn"
              onClick={() => setShowPreview(!showPreview)}
              className="btn-cyber"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.8rem",
                background: "transparent",
                color: "var(--text-2)",
                border: "1.5px solid var(--border-1)",
                borderRadius: "var(--r-pill)",
                cursor: "pointer",
              }}
            >
              <Eye size={14} />
              {showPreview ? "Hide Preview" : "Preview"}
            </button>
            <button
              id="launch-market-btn"
              onClick={handleLaunch}
              disabled={!isValid}
              className="btn-cyber"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 2rem",
                fontSize: "0.85rem",
                background: isValid ? "var(--teal)" : "var(--bg-3)",
                color: isValid ? "#ffffff" : "var(--text-3)",
                border: "none",
                borderRadius: "var(--r-pill)",
                opacity: isValid ? 1 : 0.45,
                cursor: isValid ? "pointer" : "not-allowed",
                boxShadow: isValid ? "0 4px 16px rgba(37,99,235,0.35)" : "none",
              }}
            >
              <Plus size={14} />
              LAUNCH ON-CHAIN
            </button>
          </div>

          {/* Live Preview */}
          {showPreview && form.title && (
            <div>
              <div
                className="font-mono"
                style={{ fontSize: "0.65rem", color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}
              >
                {"// LIVE CARD PREVIEW"}
              </div>
              <div
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "4px",
                      background: "var(--teal-light)",
                      color: "var(--teal)",
                      border: "1px solid var(--border-teal)",
                    }}
                  >
                    {form.category.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.62rem",
                      color: "var(--yes-green)",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "4px",
                      background: "var(--yes-bg)",
                      border: "1px solid var(--yes-border)",
                    }}
                  >
                    ⛓️ ON-CHAIN
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--text-0)" }}>
                  {form.title}
                </div>
                <div
                  style={{
                    height: "8px",
                    borderRadius: "4px",
                    background: "var(--bg-3)",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div style={{ width: "50%", background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
                  <div style={{ flex: 1, background: "var(--border-1)" }} />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "0.4rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                  }}
                >
                  <span style={{ color: "var(--yes-green)" }}>YES 50%</span>
                  <span style={{ color: "var(--no-red)" }}>50% NO</span>
                </div>
                <div
                  style={{
                    marginTop: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    color: "var(--text-3)",
                    display: "flex",
                    gap: "1.5rem",
                  }}
                >
                  <span>Pool: 1,000 USDC</span>
                  {form.resolveDate && <span>Resolves: {form.resolveDate}</span>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
