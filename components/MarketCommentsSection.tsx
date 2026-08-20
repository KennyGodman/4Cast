import React, { useState, useEffect } from "react";
import { MessageSquare, Share2, Heart, Send, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

interface CommentItem {
  id: string;
  author: string;
  avatarBg: string;
  text: string;
  sentiment: "YES" | "NO" | "NEUTRAL";
  timestamp: string;
  likes: number;
  liked?: boolean;
}

interface MarketCommentsSectionProps {
  marketId: string;
  marketTitle: string;
}

const DEFAULT_COMMENTS: Record<string, CommentItem[]> = {
  default: [
    {
      id: "c1",
      author: "0x89a2...4f1e",
      avatarBg: "#2e1052",
      text: "Macro conditions strongly favor YES on this market. Liquidity volume on Arc Network is ramping up rapidly!",
      sentiment: "YES",
      timestamp: "12m ago",
      likes: 14,
    },
    {
      id: "c2",
      author: "0x3f1a...92b0",
      avatarBg: "#7e22ce",
      text: "Sub-second finality on Arc makes trading this market super responsive. Loaded up NO shares at 32¢ bargain price.",
      sentiment: "NO",
      timestamp: "45m ago",
      likes: 8,
    },
    {
      id: "c3",
      author: "0xd4e1...6b88",
      avatarBg: "#0c438c",
      text: "Passkey biometric sign-in made taking a position effortless. Circle wallet integration is top-notch!",
      sentiment: "YES",
      timestamp: "2h ago",
      likes: 23,
    },
  ],
};

export function MarketCommentsSection({ marketId, marketTitle }: MarketCommentsSectionProps) {
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<"comments" | "xinfo">("comments");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState<"YES" | "NO" | "NEUTRAL">("YES");
  const [copiedLink, setCopiedLink] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "top">("recent");

  // Load comments from localStorage or defaults
  useEffect(() => {
    const storageKey = `4cast_comments_${marketId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setComments(JSON.parse(saved));
      } catch {
        setComments(DEFAULT_COMMENTS.default);
      }
    } else {
      setComments(DEFAULT_COMMENTS.default);
    }
  }, [marketId]);

  // Save comments when updated
  const updateComments = (updated: CommentItem[]) => {
    setComments(updated);
    localStorage.setItem(`4cast_comments_${marketId}`, JSON.stringify(updated));
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const authorName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anon Trader";
    const colors = ["#2e1052", "#7e22ce", "#2563eb", "#059669", "#d97706"];
    const randomBg = colors[Math.floor(Math.random() * colors.length)];

    const item: CommentItem = {
      id: `c_${Date.now()}`,
      author: authorName,
      avatarBg: randomBg,
      text: newCommentText.trim(),
      sentiment: selectedSentiment,
      timestamp: "Just now",
      likes: 1,
    };

    const next = [item, ...comments];
    updateComments(next);
    setNewCommentText("");
  };

  const handleLike = (id: string) => {
    const next = comments.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          likes: c.liked ? c.likes - 1 : c.likes + 1,
          liked: !c.liked,
        };
      }
      return c;
    });
    updateComments(next);
  };

  // Generate X (Twitter) share URL intent
  const getXShareUrl = (customText?: string) => {
    const text = customText
      ? encodeURIComponent(`"${customText}" — Prediction on 4Cast: ${marketTitle}`)
      : encodeURIComponent(`Predicting "${marketTitle}" on 4Cast on Arc Network! What's your take?`);
    const pageUrl = encodeURIComponent(window.location.href);
    const hashtags = encodeURIComponent("4Cast,ArcNetwork,CryptoPredictions");
    return `https://twitter.com/intent/tweet?text=${text}&url=${pageUrl}&hashtags=${hashtags}`;
  };

  const handleShareOnX = (customText?: string) => {
    const url = getXShareUrl(customText);
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "top") return b.likes - a.likes;
    return 0; // default recent order
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* ── Top Header Widget: Subscribe to Top Comments ────── */}
      <div
        style={{
          background: "var(--bg-1)",
          border: "1.5px solid var(--border-1)",
          borderRadius: "var(--r-xl)",
          padding: "1.25rem 1.5rem",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.05rem",
              fontWeight: 800,
              color: "var(--text-0)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Sparkles size={18} color="var(--teal)" />
            <span>Subscribe to Top Comments</span>
          </h4>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--teal)",
              background: "var(--teal-light)",
              padding: "0.2rem 0.6rem",
              borderRadius: "var(--r-pill)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Live Activity
          </span>
        </div>

        <p style={{ fontSize: "0.83rem", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
          Get instant notifications when top prediction traders share insights or execute positions on this market.
        </p>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            onClick={() => {
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            style={{
              flex: 1,
              background: "var(--teal-light)",
              border: "1px solid var(--border-teal)",
              color: "var(--teal)",
              borderRadius: "var(--r-md)",
              padding: "0.55rem 0.9rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.15s ease",
            }}
          >
            {copiedLink ? <CheckCircle2 size={15} /> : <MessageSquare size={15} />}
            <span>{copiedLink ? "Subscribed!" : "Subscribe Updates"}</span>
          </button>

          <button
            onClick={() => handleShareOnX()}
            style={{
              background: "var(--text-0)",
              color: "var(--bg-1)",
              border: "none",
              borderRadius: "var(--r-md)",
              padding: "0.55rem 1rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "transform 0.15s ease",
            }}
          >
            <span style={{ fontWeight: 900 }}>𝕏</span>
            <span>Share Market</span>
          </button>
        </div>
      </div>

      {/* ── Main Comments & X Info Box (Polykoe Tabbed Style) ────── */}
      <div
        style={{
          background: "var(--bg-1)",
          border: "1.5px solid var(--border-1)",
          borderRadius: "var(--r-xl)",
          padding: "1.25rem",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Navigation Tabs Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--bg-2)",
            padding: "0.3rem",
            borderRadius: "var(--r-lg)",
            marginBottom: "1.25rem",
            border: "1px solid var(--border-0)",
          }}
        >
          <button
            onClick={() => setActiveTab("comments")}
            style={{
              flex: 1,
              padding: "0.65rem 1rem",
              borderRadius: "var(--r-md)",
              border: "none",
              background: activeTab === "comments" ? "var(--teal)" : "transparent",
              color: activeTab === "comments" ? "#ffffff" : "var(--text-2)",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <MessageSquare size={16} />
            <span>Comments ({comments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("xinfo")}
            style={{
              flex: 1,
              padding: "0.65rem 1rem",
              borderRadius: "var(--r-md)",
              border: "none",
              background: activeTab === "xinfo" ? "var(--teal)" : "transparent",
              color: activeTab === "xinfo" ? "#ffffff" : "var(--text-2)",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontWeight: 900 }}>𝕏</span>
            <span>X Info & Posts</span>
          </button>
        </div>

        {/* Tab 1: Live Comments */}
        {activeTab === "comments" && (
          <div>
            {/* Comment Form */}
            <form onSubmit={handlePostComment} style={{ marginBottom: "1.5rem" }}>
              <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Share your opinion or market analysis..."
                  rows={3}
                  style={{
                    width: "100%",
                    background: "var(--bg-2)",
                    border: "1.5px solid var(--border-1)",
                    borderRadius: "var(--r-lg)",
                    padding: "0.85rem 1rem",
                    fontSize: "0.88rem",
                    color: "var(--text-0)",
                    outline: "none",
                    resize: "none",
                    fontFamily: "var(--font-body)",
                    transition: "border-color 0.15s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-1)")}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                {/* Sentiment Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-2)" }}>Position:</span>
                  {(["YES", "NO", "NEUTRAL"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSentiment(s)}
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "var(--r-pill)",
                        border: selectedSentiment === s ? "1.5px solid var(--teal)" : "1px solid var(--border-teal)",
                        background: selectedSentiment === s ? "var(--teal)" : "var(--teal-light)",
                        color: selectedSentiment === s ? "#ffffff" : "var(--teal)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {s === "YES" ? "🟢 YES" : s === "NO" ? "🔴 NO" : "⚪ Neutral"}
                    </button>
                  ))}
                </div>

                {/* Submit & X Share buttons */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => handleShareOnX(newCommentText || undefined)}
                    title="Post this comment directly to X (Twitter)"
                    style={{
                      background: "var(--bg-2)",
                      border: "1.5px solid var(--border-1)",
                      color: "var(--text-0)",
                      borderRadius: "var(--r-pill)",
                      padding: "0.45rem 0.85rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span style={{ fontWeight: 900 }}>𝕏</span>
                    <span>Post to X</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    style={{
                      background: newCommentText.trim() ? "var(--teal)" : "var(--bg-3)",
                      color: newCommentText.trim() ? "#ffffff" : "var(--text-3)",
                      border: "none",
                      borderRadius: "var(--r-pill)",
                      padding: "0.45rem 1.1rem",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: newCommentText.trim() ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span>Comment</span>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </form>

            {/* Controls Bar (Filter/Sort) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderTop: "1px solid var(--border-0)", paddingTop: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-0)" }}>
                <span>{comments.length} Thoughts</span>
              </div>

              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  onClick={() => setSortBy("recent")}
                  style={{
                    border: "none",
                    background: sortBy === "recent" ? "var(--teal-light)" : "transparent",
                    color: sortBy === "recent" ? "var(--teal)" : "var(--text-2)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "var(--r-pill)",
                    cursor: "pointer",
                  }}
                >
                  Most Recent
                </button>
                <button
                  onClick={() => setSortBy("top")}
                  style={{
                    border: "none",
                    background: sortBy === "top" ? "var(--teal-light)" : "transparent",
                    color: sortBy === "top" ? "var(--teal)" : "var(--text-2)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "var(--r-pill)",
                    cursor: "pointer",
                  }}
                >
                  Top Upvoted
                </button>
              </div>
            </div>

            {/* Comment List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {sortedComments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border-0)",
                    borderRadius: "var(--r-lg)",
                    padding: "0.9rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: c.avatarBg,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                        }}
                      >
                        {c.author.slice(2, 4).toUpperCase()}
                      </div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-0)" }}>
                        {c.author}
                      </span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "var(--r-pill)",
                          background: c.sentiment === "YES" ? "var(--yes-bg)" : c.sentiment === "NO" ? "var(--no-bg)" : "var(--bg-3)",
                          color: c.sentiment === "YES" ? "var(--yes-green)" : c.sentiment === "NO" ? "var(--no-red)" : "var(--text-2)",
                        }}
                      >
                        {c.sentiment}
                      </span>
                    </div>

                    <span style={{ fontSize: "0.72rem", color: "var(--text-2)" }}>{c.timestamp}</span>
                  </div>

                  <p style={{ fontSize: "0.86rem", color: "var(--text-1)", lineHeight: 1.5, margin: 0 }}>
                    {c.text}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                    <button
                      onClick={() => handleLike(c.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: c.liked ? "#e11d48" : "var(--text-2)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: 0,
                      }}
                    >
                      <Heart size={14} fill={c.liked ? "#e11d48" : "none"} color={c.liked ? "#e11d48" : "currentColor"} />
                      <span>{c.likes}</span>
                    </button>

                    <button
                      onClick={() => handleShareOnX(c.text)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-2)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Share2 size={13} />
                      <span>Post on 𝕏</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: X (Twitter) Info & Social Feed */}
        {activeTab === "xinfo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* X Post Callout Box */}
            <div
              style={{
                background: "var(--bg-2)",
                border: "1.5px solid var(--border-1)",
                borderRadius: "var(--r-lg)",
                padding: "1.25rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "var(--text-0)",
                  color: "var(--bg-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  margin: "0 auto 0.85rem",
                }}
              >
                𝕏
              </div>

              <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.4rem" }}>
                Make Comments & Share via 𝕏
              </h4>

              <p style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.5, marginBottom: "1rem" }}>
                Post your prediction opinion directly to X (Twitter). Your post will be tagged with <span style={{ color: "var(--teal)", fontWeight: 700 }}>#4CastOnArc</span> for community discussion.
              </p>

              <button
                onClick={() => handleShareOnX()}
                style={{
                  width: "100%",
                  background: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--r-pill)",
                  padding: "0.75rem 1.25rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <span style={{ fontWeight: 900 }}>𝕏</span>
                <span>Compose Post on X</span>
              </button>
            </div>

            {/* Mock X Social Activity Stream */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Recent X Mentions & Discussions
              </div>

              {[
                {
                  handle: "@CryptoPredictorX",
                  name: "Arc Trader",
                  text: `Analyzing ${marketTitle}. Volume looks strong on Arc Testnet! #4CastOnArc`,
                  time: "18m ago",
                  retweets: 5,
                  likes: 29,
                },
                {
                  handle: "@Arc_Defi_Pulse",
                  name: "DeFi Pulse Arc",
                  text: `Biometric Circle Passkey wallets + sub-second finality on Arc makes trading 4Cast markets seamless.`,
                  time: "1h ago",
                  retweets: 12,
                  likes: 64,
                },
              ].map((x, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border-0)",
                    borderRadius: "var(--r-lg)",
                    padding: "0.85rem 1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-0)" }}>{x.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{x.handle}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-2)" }}>{x.time}</span>
                  </div>

                  <p style={{ fontSize: "0.84rem", color: "var(--text-1)", lineHeight: 1.4, margin: "0 0 0.5rem" }}>
                    {x.text}
                  </p>

                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem", color: "var(--text-2)", fontWeight: 600 }}>
                    <span>🔁 {x.retweets} reposts</span>
                    <span>❤️ {x.likes} likes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
