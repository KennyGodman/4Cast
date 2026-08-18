import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, Trophy, Activity, TrendingUp, Wallet, ChevronDown, LogOut, Copy, Check, Sun, Moon, Droplet, Home } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useBalance } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { LIVE_STATE_REFETCH_INTERVAL } from "@/lib/wagmi";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onConnectClick: () => void;
  onGoHome?: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  search,
  onSearchChange,
  darkMode,
  onToggleDarkMode,
  onConnectClick,
  onGoHome,
}: HeaderProps) {
  const { address, isConnected, walletType, disconnect } = useWallet();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch native USDC balance (USDC is the native token on Arc Testnet)
  const { data: usdcBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({
    address: address,
    query: {
      enabled: mounted && !!address,
      refetchInterval: LIVE_STATE_REFETCH_INTERVAL,
      refetchIntervalInBackground: false,
      retry: false,
    },
  });

  // Instantly refetch on-chain balance when a bet is placed
  useEffect(() => {
    const handleBetsUpdated = () => {
      if (refetchBalance) refetchBalance();
    };
    window.addEventListener("4cast_bets_updated", handleBetsUpdated);
    window.addEventListener("storage", handleBetsUpdated);
    return () => {
      window.removeEventListener("4cast_bets_updated", handleBetsUpdated);
      window.removeEventListener("storage", handleBetsUpdated);
    };
  }, [refetchBalance]);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const navTabs = [
    { id: "home", label: "Home", icon: Home, isHomeBtn: true },
    { id: "markets", label: "Markets", icon: TrendingUp },
    { id: "my-bets", label: "My Bets", icon: Activity },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "faucet", label: "Faucet", icon: Droplet, external: true, url: "https://faucet.circle.com/" },
  ];

  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setWalletOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const formattedBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(2)
    : "0.00";

  const walletLabel = walletType === "circle" ? "Passkey" : "MetaMask";
  const walletIcon = walletType === "circle" ? "🛡️" : "🦊";

  return (
    <header
      style={{
        background: "var(--bg-header)",
        borderBottom: "1px solid var(--border-0)",
        position: "sticky",
        top: 0,
        zIndex: 200,
        boxShadow: "var(--shadow-header)",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.25rem",
          height: "60px",
          display: "flex",
          alignItems: "center",
          gap: "0.875rem",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => {
            if (onGoHome) onGoHome();
            else setActiveTab("markets");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
          aria-label="Go to homepage"
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.15rem",
              letterSpacing: "-0.025em",
              color: "var(--text-0)",
            }}
          >
            4<span style={{ color: "var(--teal)" }}>Cast</span>
          </span>
        </button>

        {/* Create Market CTA */}
        <button
          id="create-market-btn"
          onClick={() => setActiveTab("create")}
          className="btn-cyber"
          style={{
            background: activeTab === "create" ? "var(--teal-dim)" : "var(--teal)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--r-pill)",
            padding: "0.45rem 1rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <Plus size={13} />
          <span className="hide-mobile">Create Market</span>
        </button>

        {/* Search Bar */}
        <div style={{ position: "relative", flex: 1, maxWidth: "360px", margin: "0 auto" }}>
          <Search
            size={14}
            color="var(--text-3)"
            style={{
              position: "absolute",
              left: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            id="header-search"
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="cyber-input"
            style={{
              paddingLeft: "2.25rem",
              fontSize: "0.875rem",
              height: "36px",
              background: "var(--bg-2)",
              border: "1.5px solid var(--border-1)",
              color: "var(--text-0)",
            }}
          />
        </div>

        {/* Right Tab controls & Wallet */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {navTabs.map(({ id, label, icon: Icon, external, url, isHomeBtn }) => {
            const isActive = activeTab === id;
            if (external) {
              return (
                <a
                  key={id}
                  id={`nav-${id}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.82rem",
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    borderRadius: "var(--r-pill)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: "transparent",
                    color: "var(--text-2)",
                    border: "1.5px solid transparent",
                    outline: "none",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--teal-light)";
                    e.currentTarget.style.color = "var(--teal)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-2)";
                  }}
                >
                  <Icon size={13} strokeWidth={2} />
                  <span className="hide-mobile">{label}</span>
                </a>
              );
            }
            return (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => {
                  if (isHomeBtn && onGoHome) {
                    onGoHome();
                  } else {
                    setActiveTab(id);
                  }
                }}
                style={{
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-body)",
                  fontWeight: isActive ? 600 : 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  borderRadius: "var(--r-pill)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: isActive ? "var(--teal-light)" : "transparent",
                  color: isActive ? "var(--teal)" : "var(--text-2)",
                  border: isActive ? "1.5px solid rgba(37,99,235,0.3)" : "1.5px solid transparent",
                  outline: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--teal-light)";
                    e.currentTarget.style.color = "var(--teal)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-2)";
                  }
                }}
              >
                <Icon size={13} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hide-mobile">{label}</span>
              </button>
            );
          })}

          {/* Dark / Light Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleDarkMode}
            title={!mounted ? "Switch to light mode" : darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              borderRadius: "var(--r-pill)",
              border: "1.5px solid var(--border-1)",
              background: !mounted ? "var(--bg-3)" : darkMode ? "var(--bg-3)" : "var(--bg-2)",
              color: !mounted ? "#f0c040" : darkMode ? "#f0c040" : "var(--text-2)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-4)";
              e.currentTarget.style.borderColor = "var(--border-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = !mounted ? "var(--bg-3)" : darkMode ? "var(--bg-3)" : "var(--bg-2)";
              e.currentTarget.style.borderColor = "var(--border-1)";
            }}
          >
            {!mounted ? (
              <Sun size={15} strokeWidth={2} />
            ) : darkMode ? (
              <Sun size={15} strokeWidth={2} />
            ) : (
              <Moon size={15} strokeWidth={2} />
            )}
          </button>

          {/* Wallet balance pill */}
          {mounted && isConnected && address && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--yes-green)",
                background: "var(--yes-bg)",
                border: "1px solid var(--yes-border)",
                borderRadius: "var(--r-pill)",
                padding: "0.3rem 0.75rem",
                flexShrink: 0,
              }}
            >
              {isBalanceLoading ? "..." : formattedBalance} USDC
            </div>
          )}

          {/* Wallet button + dropdown */}
          <div ref={walletRef} style={{ position: "relative", flexShrink: 0 }}>
            {mounted && isConnected && address ? (
              <>
                <button
                  id="wallet-connect-btn"
                  onClick={() => setWalletOpen((prev) => !prev)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "var(--r-pill)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: walletOpen ? "var(--teal)" : "var(--bg-2)",
                    color: walletOpen ? "#ffffff" : "var(--text-2)",
                    border: walletOpen ? "1px solid var(--teal)" : "1px solid var(--border-1)",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!walletOpen) {
                      e.currentTarget.style.borderColor = "var(--teal)";
                      e.currentTarget.style.color = "var(--teal)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!walletOpen) {
                      e.currentTarget.style.borderColor = "var(--border-1)";
                      e.currentTarget.style.color = "var(--text-2)";
                    }
                  }}
                >
                  <span style={{ fontSize: "0.9rem", marginRight: "0.1rem" }}>
                    {walletIcon}
                  </span>
                  <span className="hide-mobile">{formatAddress(address)}</span>
                  <ChevronDown
                    size={11}
                    style={{
                      transition: "transform 0.2s",
                      transform: walletOpen ? "rotate(180deg)" : "none",
                    }}
                  />
                </button>

                {/* Dropdown */}
                {walletOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: "220px",
                      background: "var(--bg-1)",
                      border: "1px solid var(--border-1)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                      zIndex: 999,
                    }}
                  >
                    {/* Wallet info header */}
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--border-0)",
                        background: "var(--bg-2)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-2)",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Connected with {walletLabel}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "var(--text-0)",
                          wordBreak: "break-all",
                        }}
                      >
                        {address}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.72rem",
                          color: "var(--yes-green)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {formattedBalance} USDC
                      </div>
                    </div>



                    {/* Copy address */}
                    <button
                      id="wallet-copy-address"
                      onClick={handleCopy}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.65rem 1rem",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border-0)",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontFamily: "var(--font-body)",
                        color: "var(--text-1)",
                        transition: "background 0.12s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {copied ? (
                        <Check size={14} color="var(--yes-green)" />
                      ) : (
                        <Copy size={14} color="var(--text-3)" />
                      )}
                      {copied ? "Copied!" : "Copy address"}
                    </button>

                    {/* Disconnect */}
                    <button
                      id="wallet-disconnect-btn"
                      onClick={() => {
                        setWalletOpen(false);
                        disconnect();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.65rem 1rem",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontFamily: "var(--font-body)",
                        color: "var(--no-red)",
                        transition: "background 0.12s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--no-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut size={14} color="var(--no-red)" />
                      Disconnect
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                id="wallet-connect-btn"
                onClick={onConnectClick}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 1.1rem",
                  borderRadius: "var(--r-pill)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--teal-dim)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--teal)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.3)";
                }}
              >
                <Wallet size={13} />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
