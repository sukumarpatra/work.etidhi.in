import { NextRequest, NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can decide reset requests." }, { status: 403 });
  }
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "Action must be 'approve' or 'deny'." }, { status: 400 });
  }

  const db = getDb();
  const request = db
    .prepare(
      `SELECT r.*, u.name AS user_name FROM password_resets r
       JOIN users u ON u.id = r.user_id WHERE r.id = ?`
    )
    .get(Number(id)) as
    | { id: number; user_id: number; new_password_hash: string; status: string; user_name: string }
    | undefined;
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "Pending") {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 400 });
  }

  if (action === "approve") {
    const apply = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
        request.new_password_hash,
        request.user_id
      );
      db.prepare(
        "UPDATE password_resets SET status = 'Approved', decided_at = datetime('now'), decided_by = ? WHERE id = ?"
      ).run(session.id, request.id);
    });
    apply();
    logActivity({
      boardId: null,
      userId: session.id,
      action: "approved password reset",
      detail: request.user_name,
    });
  } else {
    db.prepare(
      "UPDATE password_resets SET status = 'Denied', decided_at = datetime('now'), decided_by = ? WHERE id = ?"
    ).run(session.id, request.id);
    logActivity({
      boardId: null,
      userId: session.id,
      action: "denied password reset",
      detail: request.user_name,
    });
  }
  return NextResponse.json({ ok: true });
}
