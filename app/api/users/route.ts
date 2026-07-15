import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ETIDHI_DOMAIN } from "@/lib/constants";

export async function GET() {
  await requireSession();
  const users = getDb()
    .prepare("SELECT id, email, name, role, title, created_at FROM users ORDER BY name")
    .all();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can add team members." }, { status: 403 });
  }
  const { email, name, password, title, role } = await req.json().catch(() => ({}));
  const newRole = role === "admin" ? "admin" : "member";
  if (typeof email !== "string" || typeof name !== "string" || !email.trim() || !name.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(ETIDHI_DOMAIN)) {
    return NextResponse.json(
      { error: `Team members must have an Etidhi email (${ETIDHI_DOMAIN}).` },
      { status: 400 }
    );
  }
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }
  const pw = typeof password === "string" && password.length >= 6 ? password : "etidhi123";
  const result = db
    .prepare("INSERT INTO users (email, name, password_hash, role, title) VALUES (?, ?, ?, ?, ?)")
    .run(normalized, name.trim(), bcrypt.hashSync(pw, 10), newRole, typeof title === "string" ? title.trim() : "");

  logActivity({
    boardId: null,
    userId: session.id,
    action: "added team member",
    detail: `${name.trim()} (${newRole})`,
  });
  const user = db
    .prepare("SELECT id, email, name, role, title, created_at FROM users WHERE id = ?")
    .get(Number(result.lastInsertRowid));
  return NextResponse.json({ user }, { status: 201 });
}
