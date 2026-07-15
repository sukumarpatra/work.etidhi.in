import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const bill = getDb()
    .prepare("SELECT photo_path, photo_mime FROM bills WHERE id = ?")
    .get(Number(id)) as { photo_path: string; photo_mime: string } | undefined;
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  const filePath = path.join(process.cwd(), "data", "uploads", bill.photo_path);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Photo file missing." }, { status: 404 });
  }
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": bill.photo_mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
