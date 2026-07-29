import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== (process.env.DIGEST_SECRET || "etidhi-digest-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = process.env.EMAIL_FROM || "Etidhi Work OS <onboarding@resend.dev>";

  const config = {
    api_key: process.env.RESEND_API_KEY ? "re_****" + process.env.RESEND_API_KEY.slice(-4) : "(not set)",
    from,
    md_email: process.env.MD_EMAIL || "(not set)",
  };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    const { data, error } = await resend.emails.send({
      from,
      to: (process.env.MD_EMAIL || "").split(",").map((e) => e.trim()),
      subject: "Etidhi Email Test - Working!",
      html: "<h2>Email notifications are working!</h2><p>This is a test email from Etidhi Work OS on Railway via Resend.</p>",
    });

    if (error) {
      return NextResponse.json({ ok: false, error, config }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Test email sent successfully!", id: data?.id, config });
  } catch (err: unknown) {
    const error = err instanceof Error ? { message: err.message } : String(err);
    return NextResponse.json({ ok: false, error, config }, { status: 500 });
  }
}
