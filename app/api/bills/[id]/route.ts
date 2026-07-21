import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const BILL_SELECT = `
  SELECT b.*, su.name AS submitter_name, ap.name AS approver_name
  FROM bills b
  JOIN users su ON su.id = b.user_id
  LEFT JOIN users ap ON ap.id = b.approver_id
`;

type BillRow = {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  status: string;
  approver_id: number | null;
  photo_path: string;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(Number(id)) as
    | BillRow
    | undefined;
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  // --- assign an approver (admin only, while pending) ---
  if ("approverId" in body) {
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only admins can assign an approver." }, { status: 403 });
    }
    if (bill.status !== "Pending") {
      return NextResponse.json({ error: "This bill has already been decided." }, { status: 400 });
    }
    const approverId = body.approverId === null ? null : Number(body.approverId);
    if (approverId !== null) {
      const approver = db.prepare("SELECT id, name FROM users WHERE id = ?").get(approverId) as
        | { id: number; name: string }
        | undefined;
      if (!approver) return NextResponse.json({ error: "Approver not found." }, { status: 400 });
      if (approver.id === bill.user_id) {
        return NextResponse.json(
          { error: "The submitter cannot approve their own bill." },
          { status: 400 }
        );
      }
      logActivity({
        boardId: null,
        userId: session.id,
        action: "assigned bill approver",
        detail: `"${bill.title}" → ${approver.name}`,
      });
    }
    db.prepare("UPDATE bills SET approver_id = ? WHERE id = ?").run(approverId, bill.id);
  }

  // --- approve / reject (assigned approver or any admin, while pending) ---
  if (body.action === "approve" || body.action === "reject") {
    const canDecide = session.role === "admin" || session.id === bill.approver_id;
    if (!canDecide) {
      return NextResponse.json(
        { error: "Only the assigned approver or an admin can decide this bill." },
        { status: 403 }
      );
    }
    if (session.id === bill.user_id) {
      return NextResponse.json(
        { error: "You cannot approve your own bill." },
        { status: 403 }
      );
    }
    if (bill.status !== "Pending") {
      return NextResponse.json({ error: "This bill has already been decided." }, { status: 400 });
    }

    if (body.action === "approve") {
      // Approval triggers automatic reimbursement with a payment reference.
      const refNo = `ETD-RB-${String(bill.id).padStart(4, "0")}-${Date.now().toString(36).toUpperCase()}`;
      db.prepare(
        `UPDATE bills SET status = 'Reimbursed', ref_no = ?, approver_id = COALESCE(approver_id, ?),
         decided_at = datetime('now') WHERE id = ?`
      ).run(refNo, session.id, bill.id);
      logActivity({
        boardId: null,
        userId: session.id,
        action: "approved bill",
        detail: `"${bill.title}" · ₹${bill.amount} auto-reimbursed (${refNo})`,
      });
    } else {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      db.prepare(
        `UPDATE bills SET status = 'Rejected', reject_reason = ?, approver_id = COALESCE(approver_id, ?),
         decided_at = datetime('now') WHERE id = ?`
      ).run(reason, session.id, bill.id);
      logActivity({
        boardId: null,
        userId: session.id,
        action: "rejected bill",
        detail: `"${bill.title}"${reason ? ` — ${reason}` : ""}`,
      });
    }
  }

  if (body.action === "acknowledge") {
    if (session.id !== bill.user_id) {
      return NextResponse.json(
        { error: "Only the bill submitter can acknowledge reimbursement." },
        { status: 403 }
      );
    }
    if (bill.status !== "Reimbursed") {
      return NextResponse.json(
        { error: "Only reimbursed bills can be acknowledged." },
        { status: 400 }
      );
    }
    db.prepare("UPDATE bills SET acknowledged_at = datetime('now') WHERE id = ?").run(bill.id);
    logActivity({
      boardId: null,
      userId: session.id,
      action: "acknowledged reimbursement",
      detail: `"${bill.title}" · ₹${bill.amount}`,
    });
  }

  const updated = db.prepare(`${BILL_SELECT} WHERE b.id = ?`).get(bill.id);
  return NextResponse.json({ bill: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const db = getDb();
  const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(Number(id)) as
    | BillRow
    | undefined;
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  const canDelete = session.role === "admin" || session.id === bill.user_id;
  if (!canDelete) {
    return NextResponse.json({ error: "You can only delete your own bills." }, { status: 403 });
  }
  if (bill.status === "Reimbursed") {
    return NextResponse.json(
      { error: "Reimbursed bills are financial records and cannot be deleted." },
      { status: 400 }
    );
  }

  db.prepare("DELETE FROM bills WHERE id = ?").run(bill.id);
  const photoFile = path.join(process.cwd(), "data", "uploads", bill.photo_path);
  if (fs.existsSync(photoFile)) fs.unlinkSync(photoFile);

  logActivity({ boardId: null, userId: session.id, action: "deleted bill", detail: bill.title });
  return NextResponse.json({ ok: true });
}
