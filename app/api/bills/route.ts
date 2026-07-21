import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getDb, logActivity } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const BILL_SELECT = `
  SELECT b.*, su.name AS submitter_name, ap.name AS approver_name
  FROM bills b
  JOIN users su ON su.id = b.user_id
  LEFT JOIN users ap ON ap.id = b.approver_id
`;

export async function GET() {
  const session = await requireSession();
  const db = getDb();
  const bills =
    session.role === "admin"
      ? db.prepare(`${BILL_SELECT} ORDER BY b.created_at DESC, b.id DESC`).all()
      : db
          .prepare(
            `${BILL_SELECT} WHERE b.user_id = ?
             ORDER BY b.created_at DESC, b.id DESC`
          )
          .all(session.id);
  return NextResponse.json({ bills });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const title = String(form.get("title") ?? "").trim();
  const amount = Number(form.get("amount"));
  const category = String(form.get("category") ?? "").trim();
  const photo = form.get("photo");

  if (!title) return NextResponse.json({ error: "Bill title is required." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });
  }
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "A bill photo is required." }, { status: 400 });
  }
  const ext = ALLOWED_MIMES[photo.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Photo must be a JPG, PNG, WEBP, or GIF image." },
      { status: 400 }
    );
  }
  if (photo.size > MAX_SIZE) {
    return NextResponse.json({ error: "Photo must be under 5 MB." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `bill_${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await photo.arrayBuffer()));

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO bills (user_id, title, amount, category, photo_path, photo_mime)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(session.id, title, amount, category, filename, photo.type);

  logActivity({
    boardId: null,
    userId: session.id,
    action: "submitted bill",
    detail: `${title} · ₹${amount}`,
  });

  const bill = db
    .prepare(`${BILL_SELECT} WHERE b.id = ?`)
    .get(Number(result.lastInsertRowid));
  return NextResponse.json({ bill }, { status: 201 });
}
