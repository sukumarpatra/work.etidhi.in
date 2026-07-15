import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can view reset requests." }, { status: 403 });
  }
  const requests = getDb()
    .prepare(
      `SELECT r.id, r.user_id, r.status, r.created_at, u.name AS user_name, u.email AS user_email
       FROM password_resets r JOIN users u ON u.id = r.user_id
       WHERE r.status = 'Pending'
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .all();
  return NextResponse.json({ requests });
}
