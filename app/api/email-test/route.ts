import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== (process.env.DIGEST_SECRET || "etidhi-digest-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = {
    host: (process.env.SMTP_HOST || "smtp.gmail.com").trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    email: process.env.SMTP_EMAIL || "(not set)",
    password: process.env.SMTP_PASSWORD ? "****" + process.env.SMTP_PASSWORD.slice(-4) : "(not set)",
    md_email: process.env.MD_EMAIL || "(not set)",
  };

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Etidhi Work OS" <${process.env.SMTP_EMAIL}>`,
      to: process.env.MD_EMAIL,
      subject: "Etidhi Email Test - Working!",
      html: "<h2>Email notifications are working!</h2><p>This is a test email from Etidhi Work OS on Railway.</p>",
    });

    return NextResponse.json({ ok: true, message: "Test email sent successfully!", config });
  } catch (err: unknown) {
    const error = err instanceof Error ? { message: err.message, code: (err as unknown as Record<string, unknown>).code } : String(err);
    return NextResponse.json({ ok: false, error, config }, { status: 500 });
  }
}
