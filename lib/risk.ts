import type { Trade } from "./supabase";

export type RiskResult = {
  dailyPnL: number;
  lossStreak: number;
  riskFlag: "RISK ACTIVE" | "OK";
};

export function calculateRisk(trades: Trade[]): RiskResult {
  const today = new Date().toDateString();
  const todayTrades = trades.filter(
    (t) => new Date(t.created_at).toDateString() === today
  );

  const dailyPnL = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  let lossStreak = 0;
  for (const t of [...trades].reverse()) {
    if ((t.pnl ?? 0) < 0) lossStreak++;
    else break;
  }

  const riskFlag: "RISK ACTIVE" | "OK" =
    dailyPnL < -1000 || lossStreak >= 3 ? "RISK ACTIVE" : "OK";

  return { dailyPnL, lossStreak, riskFlag };
}
