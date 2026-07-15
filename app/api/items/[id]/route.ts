import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { STATUSES, PRIORITIES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

const STATUS_VALUES = STATUSES.map((s) => s.value as string);
const PRIORITY_VALUES = PRIORITIES.map((p) => p.value as string);

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(Number(id)) as
    | { id: number; board_id: number; name: string; status: string }
    | undefined;
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const updates: string[] = [];
  const values: unknown[] = [];
  const logs: string[] = [];

  if (typeof body.name === "string" && body.name.trim()) {
    updates.push("name = ?");
    values.push(body.name.trim());
    logs.push(`renamed to "${body.name.trim()}"`);
  }
  if (typeof body.status === "string" && STATUS_VALUES.includes(body.status)) {
    updates.push("status = ?");
    values.push(body.status);
    logs.push(`status → ${body.status}`);
  }
  if (typeof body.priority === "string" && PRIORITY_VALUES.includes(body.priority)) {
    updates.push("priority = ?");
    values.push(body.priority);
    logs.push(`priority → ${body.priority}`);
  }
  if ("assigneeId" in body) {
    const assigneeId = body.assigneeId === null ? null : Number(body.assigneeId);
    if (assigneeId !== null) {
      const user = db.prepare("SELECT id, name FROM users WHERE id = ?").get(assigneeId) as
        | { id: number; name: string }
        | undefined;
      if (!user) return NextResponse.json({ error: "Assignee not found." }, { status: 400 });
      logs.push(`assigned to ${user.name}`);
    } else {
      logs.push("unassigned");
    }
    updates.push("assignee_id = ?");
    values.push(assigneeId);
  }
  if ("dueDate" in body) {
    updates.push("due_date = ?");
    values.push(body.dueDate || null);
    logs.push(body.dueDate ? `due date → ${body.dueDate}` : "due date cleared");
  }
  if ("groupId" in body) {
    const group = db.prepare("SELECT id, board_id FROM groups WHERE id = ?").get(Number(body.groupId)) as
      | { id: number; board_id: number }
      | undefined;
    if (!group || group.board_id !== item.board_id) {
      return NextResponse.json({ error: "Invalid group." }, { status: 400 });
    }
    updates.push("group_id = ?");
    values.push(group.id);
    logs.push("moved to another group");
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  db.prepare(`UPDATE items SET ${updates.join(", ")} WHERE id = ?`).run(...values, item.id);

  logActivity({
    boardId: item.board_id,
    itemId: item.id,
    userId: session.id,
    action: "updated item",
    detail: `"${item.name}": ${logs.join(", ")}`,
  });

  const updated = db
    .prepare(
      `SELECT i.*, u.name AS assignee_name FROM items i
       LEFT JOIN users u ON u.id = i.assignee_id WHERE i.id = ?`
    )
    .get(item.id);
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const db = getDb();
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(Number(id)) as
    | { id: number; board_id: number; name: string }
    | undefined;
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  db.prepare("DELETE FROM items WHERE id = ?").run(item.id);
  logActivity({ boardId: item.board_id, itemId: item.id, userId: session.id, action: "deleted item", detail: item.name });
  return NextResponse.json({ ok: true });
}
