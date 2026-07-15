import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await requireSession();
  const { id } = await params;
  const db = getDb();
  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(Number(id));
  if (!board) return NextResponse.json({ error: "Board not found." }, { status: 404 });
  const groups = db
    .prepare("SELECT * FROM groups WHERE board_id = ? ORDER BY position, id")
    .all(Number(id));
  const items = db
    .prepare(
      `SELECT i.*, u.name AS assignee_name FROM items i
       LEFT JOIN users u ON u.id = i.assignee_id
       WHERE i.board_id = ? ORDER BY i.position, i.id`
    )
    .all(Number(id));
  return NextResponse.json({ board, groups, items });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(Number(id)) as
    | { id: number; name: string }
    | undefined;
  if (!board) return NextResponse.json({ error: "Board not found." }, { status: 404 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : board.name;
  const description = typeof body.description === "string" ? body.description.trim() : undefined;

  if (description !== undefined) {
    db.prepare("UPDATE boards SET name = ?, description = ? WHERE id = ?").run(name, description, board.id);
  } else {
    db.prepare("UPDATE boards SET name = ? WHERE id = ?").run(name, board.id);
  }
  logActivity({ boardId: board.id, userId: session.id, action: "updated board", detail: name });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const db = getDb();
  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(Number(id)) as
    | { id: number; name: string }
    | undefined;
  if (!board) return NextResponse.json({ error: "Board not found." }, { status: 404 });
  db.prepare("DELETE FROM boards WHERE id = ?").run(board.id);
  logActivity({ boardId: null, userId: session.id, action: "deleted board", detail: board.name });
  return NextResponse.json({ ok: true });
}
