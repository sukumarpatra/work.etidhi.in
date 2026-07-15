import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { groupId, name } = await req.json().catch(() => ({}));
  if (!groupId || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "groupId and name are required." }, { status: 400 });
  }
  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(Number(groupId)) as
    | { id: number; board_id: number }
    | undefined;
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM items WHERE group_id = ?")
    .get(group.id) as { p: number };

  const result = db
    .prepare("INSERT INTO items (board_id, group_id, name, position) VALUES (?, ?, ?, ?)")
    .run(group.board_id, group.id, name.trim(), max.p + 1);
  const itemId = Number(result.lastInsertRowid);

  logActivity({ boardId: group.board_id, itemId, userId: session.id, action: "created item", detail: name.trim() });

  const item = db
    .prepare(
      `SELECT i.*, u.name AS assignee_name FROM items i
       LEFT JOIN users u ON u.id = i.assignee_id WHERE i.id = ?`
    )
    .get(itemId);
  return NextResponse.json({ item }, { status: 201 });
}
