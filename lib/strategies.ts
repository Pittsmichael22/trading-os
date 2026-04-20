import type { Trade } from "./supabase";

export type StrategyStats = {
  key: string;
  winRate: number;
  expectancy: number;
  score: number;
  trades: number;
};

export type OptimizedStrategy = {
  strategy: string;
  weight: number;
  status: "HIGH EDGE" | "MID" | "LOW";
};

type StrategyMap = {
  [key: string]: { trades: number; wins: number; pnl: number };
};

export function detectStrategies(trades: Trade[]): StrategyStats[] {
  const map: StrategyMap = {};

  trades.forEach((t) => {
    const key = `${t.symbol}-${t.direction}`;
    if (!map[key]) map[key] = { trades: 0, wins: 0, pnl: 0 };

    map[key].trades++;
    map[key].pnl += t.pnl ?? 0;
    if ((t.pnl ?? 0) > 0) map[key].wins++;
  });

  return Object.entries(map).map(([key, v]) => {
    const winRate = v.trades > 0 ? (v.wins / v.trades) * 100 : 0;
    const expectancy = v.trades > 0 ? v.pnl / v.trades : 0;

    return {
      key,
      winRate,
      expectancy,
      score: winRate * expectancy,
      trades: v.trades,
    };
  });
}

export function optimize(strategies: StrategyStats[]): OptimizedStrategy[] {
  const sorted = [...strategies]
    .filter((s) => s.trades >= 3)
    .sort((a, b) => b.score - a.score);

  if (sorted.length === 0) return [];

  const best = sorted[0];
  const bestScore = best.score || 1;

  return sorted.map((s) => {
    const weight = Math.min(s.score / bestScore, 1);
    let status: "HIGH EDGE" | "MID" | "LOW";

    if (s.score > bestScore * 0.8) status = "HIGH EDGE";
    else if (s.score > bestScore * 0.5) status = "MID";
    else status = "LOW";

    return { strategy: s.key, weight, status };
  });
}
