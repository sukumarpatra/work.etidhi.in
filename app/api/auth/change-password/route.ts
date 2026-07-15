import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { currentPassword, newPassword } = await req.json().catch(() => ({}));

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const db = getDb();
  const user = db.prepare("SELECT id, password_hash FROM users WHERE id = ?").get(session.id) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    user.id
  );
  db.prepare("DELETE FROM password_resets WHERE user_id = ? AND status = 'Pending'").run(user.id);

  logActivity({ boardId: null, userId: session.id, action: "changed their password" });
  return NextResponse.json({ ok: true });
}
