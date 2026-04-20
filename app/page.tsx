"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Trade } from "@/lib/supabase";
import { calculateRisk } from "@/lib/risk";
import { detectStrategies, optimize } from "@/lib/strategies";
import type { OptimizedStrategy } from "@/lib/strategies";
import { buildTradeTicket } from "@/lib/tickets";
import type { TradeForm, TradeTicket } from "@/lib/tickets";

const defaultForm: TradeForm = {
  symbol: "",
  direction: "long",
  entry: "",
  exit: "",
};

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState<TradeForm>(defaultForm);
  const [ticket, setTicket] = useState<TradeTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from("trades")
        .select("*")
        .order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;
      setTrades(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const strategies: OptimizedStrategy[] = optimize(detectStrategies(trades));
  const risk = calculateRisk(trades);

  const handleCreateTicket = () => {
    const result = buildTradeTicket(form, strategies[0]);
    if (!result) {
      setError("Please enter a valid symbol, entry, and exit price.");
      return;
    }
    setError(null);
    setTicket(result);
  };

  const handleCopy = async () => {
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(ticket, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  };

  const handleExecute = async (mode: "paper" | "live") => {
    if (!ticket) return;
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", mode, ticket }),
      });
      if (!res.ok) throw new Error("Execution request failed");
      const data = await res.json();
      alert(data.status === "paper_logged" ? "Paper trade logged!" : data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    }
  };

  return (
    <main style={{ padding: "2rem", maxWidth: 800, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>AI Trading OS</h1>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Risk Panel */}
      <section
        style={{
          padding: "1rem",
          borderRadius: 8,
          border: "1px solid",
          borderColor: risk.riskFlag === "RISK ACTIVE" ? "#fca5a5" : "#86efac",
          background: risk.riskFlag === "RISK ACTIVE" ? "#fef2f2" : "#f0fdf4",
          marginBottom: "1.5rem",
        }}
      >
        <strong>Risk Status:</strong>{" "}
        <span style={{ color: risk.riskFlag === "RISK ACTIVE" ? "#dc2626" : "#16a34a" }}>
          {risk.riskFlag}
        </span>
        <span style={{ marginLeft: "1rem", color: "#6b7280", fontSize: 14 }}>
          Daily P&amp;L: ${risk.dailyPnL.toFixed(2)} · Loss streak: {risk.lossStreak}
        </span>
      </section>

      {/* Strategy Panel */}
      {strategies.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: 16, marginBottom: "0.5rem" }}>Active Strategies</h2>
          {strategies.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                borderBottom: "1px solid #e5e7eb",
                fontSize: 14,
              }}
            >
              <span>{s.strategy}</span>
              <span
                style={{
                  color: s.status === "HIGH EDGE" ? "#16a34a" : s.status === "MID" ? "#d97706" : "#9ca3af",
                  fontWeight: 600,
                }}
              >
                {s.status}
              </span>
              <span style={{ color: "#6b7280" }}>Weight: {(s.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
        </section>
      )}

      {/* Trade Input Form */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 16, marginBottom: "0.75rem" }}>New Trade</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <input
            placeholder="Symbol (e.g. AAPL)"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          />
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value as "long" | "short" })}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <input
            placeholder="Entry price"
            type="number"
            value={form.entry}
            onChange={(e) => setForm({ ...form, entry: e.target.value })}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          />
          <input
            placeholder="Target price"
            type="number"
            value={form.exit}
            onChange={(e) => setForm({ ...form, exit: e.target.value })}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          />
        </div>
        <button
          onClick={handleCreateTicket}
          style={{
            marginTop: "0.75rem",
            padding: "0.6rem 1.25rem",
            background: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Generate Ticket
        </button>
      </section>

      {/* Trade Ticket */}
      {ticket && (
        <section
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            background: "#f9fafb",
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: "0.75rem" }}>
            Trade Ticket — {ticket.symbol}
          </h2>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Direction", ticket.direction.toUpperCase()],
                ["Entry", `$${ticket.entry.toFixed(4)}`],
                ["Stop Loss", `$${ticket.stop.toFixed(4)}`],
                ["Take Profit", `$${ticket.takeProfit.toFixed(4)}`],
                ["Risk Weight", `${(ticket.riskWeight * 100).toFixed(0)}%`],
                ["Strategy", ticket.strategy],
                ["Note", ticket.note],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.4rem 0", color: "#6b7280", width: 120 }}>{label}</td>
                  <td style={{ padding: "0.4rem 0", fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              onClick={() => handleExecute("paper")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #86efac",
                borderRadius: 6,
                background: "#f0fdf4",
                color: "#166534",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Log Paper Trade
            </button>
            <button
              onClick={() => handleExecute("live")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                background: "#fef2f2",
                color: "#991b1b",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Live Assist
            </button>
          </div>
        </section>
      )}

      {/* Trade History */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Trade History</h2>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "0.35rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              color: "#374151",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading trades…</p>
        ) : trades.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>No trades recorded yet.</p>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                {["Date", "Symbol", "Direction", "Entry", "Exit", "P&L"].map((h) => (
                  <th key={h} style={{ padding: "0.4rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.4rem 0.5rem", color: "#9ca3af" }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>{t.symbol}</td>
                  <td style={{ padding: "0.4rem 0.5rem", textTransform: "capitalize" }}>{t.direction}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>${t.entry?.toFixed(2) ?? "—"}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>${t.exit?.toFixed(2) ?? "—"}</td>
                  <td
                    style={{
                      padding: "0.4rem 0.5rem",
                      fontWeight: 600,
                      color: (t.pnl ?? 0) >= 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
