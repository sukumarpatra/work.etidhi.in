import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { ETIDHI_DOMAIN } from "@/lib/constants";

// Public endpoint: a locked-out user picks their preferred new password here.
// The change only takes effect after an Etidhi admin approves the request,
// so nobody can hijack an account just by knowing its email.
export async function POST(req: NextRequest) {
  const { email, newPassword } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(ETIDHI_DOMAIN)) {
    return NextResponse.json(
      { error: `Password resets are only available for Etidhi accounts (${ETIDHI_DOMAIN}).` },
      { status: 400 }
    );
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized) as
    | { id: number }
    | undefined;

  // Always answer the same way so the endpoint can't be used to probe
  // which email addresses exist.
  const genericOk = NextResponse.json({
    ok: true,
    message: "Request received. An Etidhi admin will approve it — you can sign in with your new password after approval.",
  });
  if (!user) return genericOk;

  const hash = bcrypt.hashSync(newPassword, 10);
  const saveRequest = db.transaction(() => {
    // A newer request replaces any pending one for the same account.
    db.prepare("DELETE FROM password_resets WHERE user_id = ? AND status = 'Pending'").run(user.id);
    db.prepare("INSERT INTO password_resets (user_id, new_password_hash) VALUES (?, ?)").run(
      user.id,
      hash
    );
  });
  saveRequest();

  return genericOk;
}
