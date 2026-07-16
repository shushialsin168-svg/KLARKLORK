import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: rows[0] });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const id = await getId(ctx);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json();
    const update: { balance?: number; name?: string; role?: string } = {};

    if (body && Object.prototype.hasOwnProperty.call(body, "balance")) {
      const b = Math.trunc(Number(body.balance));
      if (!Number.isFinite(b) || b < 0) {
        return NextResponse.json(
          { error: "Balance must be a non-negative integer." },
          { status: 400 }
        );
      }
      update.balance = b;
    }
    if (body && typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim().slice(0, 120);
    }
    if (body && typeof body.role === "string" && body.role.trim()) {
      update.role = body.role.trim().slice(0, 20);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ user: updated[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    // The `bets` table has a foreign key to users(id) without ON DELETE CASCADE,
    // so remove dependent bet rows first.
    await db.execute(sql`DELETE FROM bets WHERE user_id = ${id}`);

    const deleted = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!deleted[0]) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, user: deleted[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
