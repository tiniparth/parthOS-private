import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Generic CRUD for the dashboard. Only allowlisted tables + columns are
   writable, and every request requires the dashboard auth cookie. */
const EDITABLE: Record<string, string[]> = {
  tasks: ["title", "status", "priority", "due_date", "notes"],
  expenses: ["amount", "currency", "item", "category", "spent_on"],
  habit_logs: ["habit", "done_on", "note"],
  notes: ["content", "tags"],
  memory_facts: ["category", "fact"],
  profile: ["content"],
};

const ORDER_BY: Record<string, string> = {
  tasks: "created_at",
  expenses: "spent_on",
  habit_logs: "done_on",
  notes: "created_at",
  memory_facts: "created_at",
  profile: "updated_at",
};

function pick(table: string, body: Record<string, unknown>) {
  const cols = EDITABLE[table];
  const out: Record<string, unknown> = {};
  for (const k of cols) if (k in body && body[k] !== undefined) out[k] = body[k] === "" ? null : body[k];
  return out;
}

async function guard(table: string) {
  if (!(await isAuthed())) return { error: NextResponse.json({ ok: false }, { status: 401 }) };
  if (!EDITABLE[table]) return { error: NextResponse.json({ ok: false, reason: "unknown table" }, { status: 400 }) };
  return { error: null };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const { table } = await ctx.params;
  const g = await guard(table);
  if (g.error) return g.error;
  const { data, error } = await db()
    .from(table)
    .select("*")
    .order(ORDER_BY[table], { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const { table } = await ctx.params;
  const g = await guard(table);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const row = pick(table, body);
  const { data, error } = await db().from(table).insert(row).select().limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, row: data?.[0] });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const { table } = await ctx.params;
  const g = await guard(table);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ ok: false, reason: "id required" }, { status: 400 });
  const row = pick(table, body);
  const { error } = await db().from(table).update(row).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const { table } = await ctx.params;
  const g = await guard(table);
  if (g.error) return g.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "id required" }, { status: 400 });
  const { error } = await db().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
