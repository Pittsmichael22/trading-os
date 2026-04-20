import { NextRequest, NextResponse } from "next/server";
import type { Trade } from "@/lib/supabase";
import type { TradeTicket } from "@/lib/tickets";

type ReviewPayload = {
  action: "review";
  trade: Partial<Trade>;
};

type ExecutePayload = {
  action: "execute";
  mode?: "paper" | "live";
  ticket: TradeTicket;
};

type RequestPayload = ReviewPayload | ExecutePayload;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as RequestPayload;

    if (!body?.action) {
      return NextResponse.json({ error: "Missing action field" }, { status: 400 });
    }

    if (body.action === "review") {
      const { trade } = body;
      if (!trade) {
        return NextResponse.json({ error: "Missing trade data" }, { status: 400 });
      }
      const insight =
        (trade.pnl ?? 0) > 0
          ? "Good execution discipline"
          : "Poor entry timing or emotional execution";
      return NextResponse.json({ insight });
    }

    if (body.action === "execute") {
      const { ticket, mode = "paper" } = body;
      if (!ticket) {
        return NextResponse.json({ error: "Missing ticket data" }, { status: 400 });
      }
      if (mode === "paper") {
        return NextResponse.json({ status: "paper_logged", ticket });
      }
      return NextResponse.json({
        status: "live_manual_required",
        message: "Execute in broker manually",
        ticket,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
