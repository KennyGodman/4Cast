import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Providers } from "./providers";
import "./index.css";

// Polyfill global & process for web3 libraries if needed
if (typeof window !== "undefined") {
  (window as any).global = window;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Error Boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0d0f14",
            color: "#f0f4ff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              background: "#161a24",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "2rem",
            }}
          >
            <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Application Error</h2>
            <pre
              style={{
                background: "#0d0f14",
                padding: "1rem",
                borderRadius: "8px",
                overflowX: "auto",
                color: "#fca5a5",
                fontSize: "0.85rem",
              }}
            >
              {this.state.error?.stack || this.state.error?.message || "Unknown error"}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "1.5rem",
                padding: "0.6rem 1.2rem",
                borderRadius: "999px",
                background: "#1e68c9",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
);
