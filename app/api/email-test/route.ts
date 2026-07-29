import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { lookup } from "dns/promises";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== (process.env.DIGEST_SECRET || "etidhi-digest-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();

  const config = {
    host,
    port: 587,
    email: process.env.SMTP_EMAIL || "(not set)",
    password: process.env.SMTP_PASSWORD ? "****" + process.env.SMTP_PASSWORD.slice(-4) : "(not set)",
    md_email: process.env.MD_EMAIL || "(not set)",
    resolved_ip: "",
  };

  try {
    const { address } = await lookup(host, { family: 4 });
    config.resolved_ip = address;

    const smtpOpts: SMTPTransport.Options = {
      host: address,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { servername: host },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    };
    const transporter = nodemailer.createTransport(smtpOpts);

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
