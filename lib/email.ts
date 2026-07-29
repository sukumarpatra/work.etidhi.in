import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const smtpOpts: SMTPTransport.Options = {
  host: (process.env.SMTP_HOST || "smtp.gmail.com").trim(),
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
};
const transporter = nodemailer.createTransport(smtpOpts);

const FROM = `"Etidhi Work OS" <${process.env.SMTP_EMAIL || "noreply@etidhi.in"}>`;
const MD_EMAIL = process.env.MD_EMAIL || "";

export async function sendMdAlert(subject: string, html: string) {
  if (!MD_EMAIL) return;
  try {
    await transporter.sendMail({
      from: FROM,
      to: MD_EMAIL,
      subject,
      html: wrapHtml(subject, html),
    });
  } catch (err) {
    console.error("[Email] Failed to send alert:", err);
  }
}

export async function sendUserAlert(to: string, subject: string, html: string) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html: wrapHtml(subject, html),
    });
  } catch (err) {
    console.error("[Email] Failed to send user alert:", err);
  }
}

function wrapHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f5f7; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #6161ff; padding: 24px 32px; }
    .header h1 { margin: 0; color: #fff; font-size: 20px; font-weight: 600; }
    .header .subtitle { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .body { padding: 24px 32px; color: #333; font-size: 14px; line-height: 1.6; }
    .body h2 { font-size: 16px; color: #333; margin: 20px 0 8px; }
    .body h2:first-child { margin-top: 0; }
    .card { background: #f8f9fb; border-radius: 8px; padding: 16px; margin: 12px 0; border-left: 4px solid #6161ff; }
    .card.warning { border-left-color: #e2445c; }
    .card.success { border-left-color: #00c875; }
    .card.pending { border-left-color: #fdab3d; }
    .label { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #999; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 600; color: #333; }
    .amount { font-size: 22px; font-weight: 700; color: #333; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-critical { background: #e2445c; color: #fff; }
    .badge-stuck { background: #e2445c; color: #fff; }
    .badge-pending { background: #fdab3d; color: #fff; }
    .badge-done { background: #00c875; color: #fff; }
    .badge-reimbursed { background: #00c875; color: #fff; }
    .badge-rejected { background: #e2445c; color: #fff; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #999; font-weight: 700; padding: 8px 12px; border-bottom: 2px solid #eee; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .footer { padding: 16px 32px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .stat-row { display: flex; gap: 12px; margin: 12px 0; }
    .stat-box { flex: 1; background: #f8f9fb; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-number { font-size: 28px; font-weight: 700; color: #6161ff; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: #999; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Etidhi Work OS</h1>
      <div class="subtitle">${title}</div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      Etidhi Work OS &middot; Collaborate. Solve. Differentiate.
    </div>
  </div>
</body>
</html>`;
}
