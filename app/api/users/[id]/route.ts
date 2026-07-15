import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function countAdmins() {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }).n;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can change access levels." }, { status: 403 });
  }
  const { id } = await params;
  const { role } = await req.json().catch(() => ({}));
  if (role !== "admin" && role !== "member") {
    return NextResponse.json({ error: "Role must be 'admin' or 'member'." }, { status: 400 });
  }
  const db = getDb();
  const user = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(Number(id)) as
    | { id: number; name: string; role: string }
    | undefined;
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (user.role === "admin" && role === "member" && countAdmins() <= 1) {
    return NextResponse.json(
      { error: "Cannot demote the last admin. Promote someone else first." },
      { status: 400 }
    );
  }

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, user.id);
  logActivity({
    boardId: null,
    userId: session.id,
    action: "changed access level",
    detail: `${user.name} → ${role}`,
  });
  const updated = db
    .prepare("SELECT id, email, name, role, title, created_at FROM users WHERE id = ?")
    .get(user.id);
  return NextResponse.json({ user: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can remove team members." }, { status: 403 });
  }
  const { id } = await params;
  const db = getDb();
  const user = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(Number(id)) as
    | { id: number; name: string; role: string }
    | undefined;
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (user.id === session.id) {
    return NextResponse.json(
      { error: "You cannot remove your own account. Ask another admin." },
      { status: 400 }
    );
  }
  if (user.role === "admin" && countAdmins() <= 1) {
    return NextResponse.json({ error: "Cannot remove the last admin." }, { status: 400 });
  }

  const removeUser = db.transaction(() => {
    // Keep boards and history intact: hand ownership to the acting admin,
    // unassign their tasks, and fold their activity into the deletion record.
    db.prepare("UPDATE boards SET created_by = ? WHERE created_by = ?").run(session.id, user.id);
    db.prepare("UPDATE items SET assignee_id = NULL WHERE assignee_id = ?").run(user.id);
    db.prepare("UPDATE bills SET approver_id = NULL WHERE approver_id = ?").run(user.id);
    // Reimbursed bills are financial records — keep them under the acting admin.
    db.prepare("UPDATE bills SET user_id = ? WHERE user_id = ? AND status = 'Reimbursed'").run(session.id, user.id);
    db.prepare("DELETE FROM bills WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM activity WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  });
  removeUser();

  logActivity({
    boardId: null,
    userId: session.id,
    action: "removed team member",
    detail: user.name,
  });
  return NextResponse.json({ ok: true });
}
