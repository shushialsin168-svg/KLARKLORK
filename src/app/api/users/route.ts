import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(users).orderBy(desc(users.id));
  return NextResponse.json({ users: rows });
}

function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string };
  };
  if (e.code === "23505") return true;
  if (e.cause?.code === "23505") return true;
  const msg = `${e.message ?? ""} ${e.cause?.message ?? ""}`.toLowerCase();
  return msg.includes("unique") || msg.includes("duplicate");
}

function friendlyMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Could not create account.";
  const e = err as { message?: string; cause?: { message?: string } };
  // Prefer the underlying Postgres detail if present.
  const detail = e.cause?.message ?? e.message ?? "";
  if (!detail) return "Could not create account.";
  // Drizzle wraps failures with a "Failed query: ..." dump; don't leak that.
  if (detail.startsWith("Failed query")) {
    return "Could not create account. Please try again.";
  }
  return detail;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");
    const balanceRaw = body?.balance;

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Name, username and password are required." },
        { status: 400 }
      );
    }

    const balanceInt = Math.trunc(Number(balanceRaw));
    if (!Number.isFinite(balanceInt) || balanceInt < 0) {
      return NextResponse.json(
        { error: "Account Balance Amount must be a non-negative integer." },
        { status: 400 }
      );
    }

    // Pre-check uniqueness so we can return a clean 409 without relying on
    // parsing database error internals.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Username already exists. Please choose another one." },
        { status: 409 }
      );
    }

    const inserted = await db
      .insert(users)
      .values({
        name,
        username,
        password,
        balance: balanceInt,
        role: "customer",
      })
      .returning();

    return NextResponse.json({ user: inserted[0] }, { status: 201 });
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: "Username already exists. Please choose another one." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: friendlyMessage(err) }, { status: 500 });
  }
}
