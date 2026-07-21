import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { BOARD_COLORS, GROUP_COLORS } from "@/lib/constants";

export async function GET() {
  await requireSession();
  const boards = getDb()
    .prepare(
      `SELECT b.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id) AS item_count,
        (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id AND i.status = 'Done') AS done_count
       FROM boards b JOIN users u ON u.id = b.created_by
       ORDER BY b.created_at DESC`
    )
    .all();
  return NextResponse.json({ boards });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { name, description, category } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Board name is required." }, { status: 400 });
  }

  const VALID_CATEGORIES = ["General", "Action Items", "Client", "Partners"];
  const cat = VALID_CATEGORIES.includes(category) ? category : "General";

  const db = getDb();
  const color = BOARD_COLORS[Math.floor(Math.random() * BOARD_COLORS.length)];
  const result = db
    .prepare("INSERT INTO boards (name, description, color, created_by, category) VALUES (?, ?, ?, ?, ?)")
    .run(name.trim(), typeof description === "string" ? description.trim() : "", color, session.id, cat);
  const boardId = Number(result.lastInsertRowid);

  const insertGroup = db.prepare(
    "INSERT INTO groups (board_id, name, color, position) VALUES (?, ?, ?, ?)"
  );
  insertGroup.run(boardId, "To-Do", GROUP_COLORS[0], 0);
  insertGroup.run(boardId, "Completed", GROUP_COLORS[1], 1);

  logActivity({ boardId, userId: session.id, action: "created board", detail: name.trim() });

  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(boardId);
  return NextResponse.json({ board }, { status: 201 });
}
