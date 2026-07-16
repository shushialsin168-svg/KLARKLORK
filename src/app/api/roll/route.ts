import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SYMBOL_COUNT = 6;
// House edge: the player wins on roughly WIN_RATE of rolls. The other
// (1 - WIN_RATE) rolls are forced to avoid every symbol the player bet on,
// so the stake is lost. This gives ~5 wins per 100 bets.
const WIN_RATE = 0.05;

type Bet = { symbolIndex: number; amount: number };

function rollFair(): number[] {
  return [0, 0, 0].map(() => Math.floor(Math.random() * SYMBOL_COUNT));
}

function rollLosing(avoid: Set<number>): number[] {
  const allowed = [0, 1, 2, 3, 4, 5].filter((s) => !avoid.has(s));
  if (allowed.length === 0) return rollFair(); // bet on all 6 -> can't avoid
  return [0, 0, 0].map(() => allowed[Math.floor(Math.random() * allowed.length)]);
}

function rollWinning(forceSymbol: number): number[] {
  const dice = rollFair();
  dice[Math.floor(Math.random() * 3)] = forceSymbol;
  return dice;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = Number(body?.userId);
    const betsRaw = Array.isArray(body?.bets) ? (body.bets as Bet[]) : [];

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const bets: Bet[] = betsRaw
      .map((b) => ({
        symbolIndex: Number(b?.symbolIndex),
        amount: Math.trunc(Number(b?.amount)),
      }))
      .filter(
        (b) =>
          Number.isFinite(b.symbolIndex) &&
          b.symbolIndex >= 0 &&
          b.symbolIndex < SYMBOL_COUNT &&
          Number.isFinite(b.amount) &&
          b.amount > 0
      );

    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = Number(rows[0].balance);

    if (totalBet > currentBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${currentBalance} but bets total ${totalBet}.`,
        },
        { status: 400 }
      );
    }

    // Determine dice outcome. With no bets, roll fairly (nothing at stake).
    // Otherwise ~WIN_RATE of rolls are winning; the rest avoid all bet symbols.
    const betSymbols = Array.from(new Set(bets.map((b) => b.symbolIndex)));
    let dice: number[];
    if (bets.length === 0) {
      dice = rollFair();
    } else if (Math.random() < WIN_RATE) {
      const force = betSymbols[Math.floor(Math.random() * betSymbols.length)];
      dice = rollWinning(force);
    } else {
      dice = rollLosing(new Set(betSymbols));
    }

    // Payout rule: a winning bet returns the stake plus 5% of the bet as profit
    // (e.g. a 100 bet wins 5). A losing bet forfeits the whole stake. Combined
    // with the WIN_RATE gate above, the player wins on roughly 5% of rolls and
    // each win is only 5% of the wagered amount.
    let totalReturn = 0;
    const betResults = bets.map((b) => {
      const matches = dice.filter((d) => d === b.symbolIndex).length;
      const win = matches > 0 ? Math.round(b.amount * 0.05) : 0;
      const payout = matches > 0 ? b.amount + win : 0;
      totalReturn += payout;
      return { ...b, matches, win, payout };
    });

    const newBalance = currentBalance - totalBet + totalReturn;
    const netGain = totalReturn - totalBet;

    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId));

    const fresh = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json({
      dice,
      bets: betResults,
      totalBet,
      totalReturn,
      netGain,
      balance: Number(fresh[0].balance),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
