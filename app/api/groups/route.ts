import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { GROUP_COLORS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { boardId, name } = await req.json().catch(() => ({}));
  if (!boardId || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "boardId and name are required." }, { status: 400 });
  }
  const db = getDb();
  const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(Number(boardId));
  if (!board) return NextResponse.json({ error: "Board not found." }, { status: 404 });

  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM groups WHERE board_id = ?")
    .get(Number(boardId)) as { p: number };
  const color = GROUP_COLORS[(max.p + 1) % GROUP_COLORS.length];
  const result = db
    .prepare("INSERT INTO groups (board_id, name, color, position) VALUES (?, ?, ?, ?)")
    .run(Number(boardId), name.trim(), color, max.p + 1);

  logActivity({ boardId: Number(boardId), userId: session.id, action: "created group", detail: name.trim() });
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json({ group }, { status: 201 });
}
