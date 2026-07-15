import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import BoardView from "@/components/BoardView";
import type { Board, Group, Item, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(Number(id)) as
    | Board
    | undefined;
  if (!board) notFound();

  const groups = db
    .prepare("SELECT * FROM groups WHERE board_id = ? ORDER BY position, id")
    .all(board.id) as Group[];
  const items = db
    .prepare(
      `SELECT i.*, u.name AS assignee_name FROM items i
       LEFT JOIN users u ON u.id = i.assignee_id
       WHERE i.board_id = ? ORDER BY i.position, i.id`
    )
    .all(board.id) as Item[];
  const users = db
    .prepare("SELECT id, email, name, role, title FROM users ORDER BY name")
    .all() as User[];

  return (
    <BoardView
      key={board.id}
      initialBoard={board}
      initialGroups={groups}
      initialItems={items}
      users={users}
    />
  );
}
