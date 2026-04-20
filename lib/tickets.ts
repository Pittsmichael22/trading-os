import type { OptimizedStrategy } from "./strategies";

export type TradeForm = {
  symbol: string;
  direction: "long" | "short";
  entry: string;
  exit: string;
};

export type TradeTicket = {
  symbol: string;
  direction: "long" | "short";
  entry: number;
  stop: number;
  takeProfit: number;
  riskWeight: number;
  strategy: string;
  note: string;
};

export function buildTradeTicket(
  form: TradeForm,
  strategy?: OptimizedStrategy
): TradeTicket | null {
  const entry = parseFloat(form.entry);
  const takeProfit = parseFloat(form.exit);

  if (isNaN(entry) || isNaN(takeProfit)) return null;
  if (!form.symbol.trim()) return null;

  return {
    symbol: form.symbol.toUpperCase(),
    direction: form.direction,
    entry,
    stop: parseFloat((entry * 0.99).toFixed(4)),
    takeProfit,
    riskWeight: strategy?.weight ?? 0.5,
    strategy: strategy?.strategy ?? "UNCLASSIFIED",
    note:
      strategy?.status === "HIGH EDGE"
        ? "High probability setup"
        : "Trade cautiously",
  };
}
