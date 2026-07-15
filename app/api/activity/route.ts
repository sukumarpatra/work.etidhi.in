import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireSession();
  const boardId = req.nextUrl.searchParams.get("boardId");
  const db = getDb();
  const rows = boardId
    ? db
        .prepare(
          `SELECT a.*, u.name AS user_name FROM activity a
           JOIN users u ON u.id = a.user_id
           WHERE a.board_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT 50`
        )
        .all(Number(boardId))
    : db
        .prepare(
          `SELECT a.*, u.name AS user_name FROM activity a
           JOIN users u ON u.id = a.user_id
           ORDER BY a.created_at DESC, a.id DESC LIMIT 50`
        )
        .all();
  return NextResponse.json({ activity: rows });
}
