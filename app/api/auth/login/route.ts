import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { ETIDHI_DOMAIN } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(ETIDHI_DOMAIN)) {
    return NextResponse.json(
      { error: `Access is restricted to Etidhi accounts (${ETIDHI_DOMAIN}).` },
      { status: 403 }
    );
  }

  const user = getDb()
    .prepare("SELECT id, email, name, password_hash, role FROM users WHERE email = ?")
    .get(normalized) as
    | { id: number; email: string; name: string; password_hash: string; role: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
