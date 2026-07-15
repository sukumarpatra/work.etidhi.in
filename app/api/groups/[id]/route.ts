import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const { name } = await req.json().catch(() => ({}));
  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(Number(id)) as
    | { id: number; board_id: number; name: string }
    | undefined;
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (typeof name === "string" && name.trim()) {
    db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name.trim(), group.id);
    logActivity({ boardId: group.board_id, userId: session.id, action: "renamed group", detail: `${group.name} → ${name.trim()}` });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(Number(id)) as
    | { id: number; board_id: number; name: string }
    | undefined;
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  db.prepare("DELETE FROM groups WHERE id = ?").run(group.id);
  logActivity({ boardId: group.board_id, userId: session.id, action: "deleted group", detail: group.name });
  return NextResponse.json({ ok: true });
}
