import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendMdAlert } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== (process.env.DIGEST_SECRET || "etidhi-digest-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const totalItems = db.prepare("SELECT COUNT(*) AS n FROM items").get() as { n: number };
  const doneItems = db.prepare("SELECT COUNT(*) AS n FROM items WHERE status = 'Done'").get() as { n: number };
  const stuckItems = db.prepare("SELECT COUNT(*) AS n FROM items WHERE status = 'Stuck'").get() as { n: number };
  const inProgressItems = db.prepare("SELECT COUNT(*) AS n FROM items WHERE status = 'Working on it'").get() as { n: number };

  const overdueItems = db.prepare(
    `SELECT i.name, i.due_date, i.status, i.priority, b.name AS board_name, u.name AS assignee_name
     FROM items i
     JOIN boards b ON b.id = i.board_id
     LEFT JOIN users u ON u.id = i.assignee_id
     WHERE i.due_date < date('now') AND i.status != 'Done'
     ORDER BY i.due_date ASC
     LIMIT 15`
  ).all() as { name: string; due_date: string; status: string; priority: string; board_name: string; assignee_name: string | null }[];

  const pendingBills = db.prepare(
    `SELECT b.title, b.amount, b.category, b.created_at, u.name AS submitter_name
     FROM bills b JOIN users u ON u.id = b.user_id
     WHERE b.status = 'Pending'
     ORDER BY b.created_at DESC`
  ).all() as { title: string; amount: number; category: string; created_at: string; submitter_name: string }[];

  const pendingBillTotal = pendingBills.reduce((s, b) => s + b.amount, 0);

  const recentActivity = db.prepare(
    `SELECT a.action, a.detail, a.created_at, u.name AS user_name
     FROM activity a JOIN users u ON u.id = a.user_id
     WHERE a.created_at >= datetime('now', '-1 day')
     ORDER BY a.created_at DESC
     LIMIT 20`
  ).all() as { action: string; detail: string; created_at: string; user_name: string }[];

  const boards = db.prepare(
    `SELECT b.name,
       (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id) AS total,
       (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id AND i.status = 'Done') AS done,
       (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id AND i.status = 'Stuck') AS stuck
     FROM boards b ORDER BY b.name`
  ).all() as { name: string; total: number; done: number; stuck: number }[];

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = `
    <h2>Daily Digest — ${today}</h2>

    <!-- Stats overview -->
    <table style="width:100%; margin: 16px 0;">
      <tr>
        <td style="text-align:center; padding:16px; background:#f8f9fb; border-radius:8px;">
          <div style="font-size:28px; font-weight:700; color:#6161ff;">${totalItems.n}</div>
          <div style="font-size:11px; text-transform:uppercase; color:#999; margin-top:4px;">Total Items</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center; padding:16px; background:#f8f9fb; border-radius:8px;">
          <div style="font-size:28px; font-weight:700; color:#00c875;">${doneItems.n}</div>
          <div style="font-size:11px; text-transform:uppercase; color:#999; margin-top:4px;">Completed</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center; padding:16px; background:#f8f9fb; border-radius:8px;">
          <div style="font-size:28px; font-weight:700; color:#fdab3d;">${inProgressItems.n}</div>
          <div style="font-size:11px; text-transform:uppercase; color:#999; margin-top:4px;">In Progress</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center; padding:16px; background:#f8f9fb; border-radius:8px;">
          <div style="font-size:28px; font-weight:700; color:#e2445c;">${stuckItems.n}</div>
          <div style="font-size:11px; text-transform:uppercase; color:#999; margin-top:4px;">Stuck</div>
        </td>
      </tr>
    </table>

    <!-- Board progress -->
    <h2>Board Progress</h2>
    <table>
      <tr><th>Board</th><th>Done</th><th>Stuck</th><th>Progress</th></tr>
      ${boards.map(b => {
        const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
        return `<tr>
          <td><strong>${esc(b.name)}</strong></td>
          <td>${b.done}/${b.total}</td>
          <td>${b.stuck > 0 ? `<span class="badge badge-stuck">${b.stuck}</span>` : "0"}</td>
          <td>
            <div style="background:#eee; border-radius:4px; height:8px; width:100px; display:inline-block; vertical-align:middle;">
              <div style="background:#00c875; border-radius:4px; height:8px; width:${pct}px;"></div>
            </div>
            <span style="font-size:12px; color:#666; margin-left:4px;">${pct}%</span>
          </td>
        </tr>`;
      }).join("")}
    </table>

    ${overdueItems.length > 0 ? `
    <!-- Overdue items -->
    <h2>⚠️ Overdue Items (${overdueItems.length})</h2>
    <table>
      <tr><th>Item</th><th>Board</th><th>Assignee</th><th>Due Date</th><th>Priority</th></tr>
      ${overdueItems.map(i => `<tr>
        <td>${esc(i.name)}</td>
        <td>${esc(i.board_name)}</td>
        <td>${esc(i.assignee_name || "Unassigned")}</td>
        <td style="color:#e2445c; font-weight:600;">${i.due_date}</td>
        <td>${i.priority === "Critical" ? '<span class="badge badge-critical">Critical</span>' : esc(i.priority)}</td>
      </tr>`).join("")}
    </table>
    ` : '<div class="card success"><div class="value">✅ No overdue items!</div></div>'}

    ${pendingBills.length > 0 ? `
    <!-- Pending bills -->
    <h2>💰 Pending Bills (${pendingBills.length}) — Total: ₹${pendingBillTotal.toLocaleString("en-IN")}</h2>
    <table>
      <tr><th>Bill</th><th>Amount</th><th>Submitted By</th><th>Category</th></tr>
      ${pendingBills.map(b => `<tr>
        <td>${esc(b.title)}</td>
        <td style="font-weight:600;">₹${b.amount.toLocaleString("en-IN")}</td>
        <td>${esc(b.submitter_name)}</td>
        <td>${esc(b.category || "—")}</td>
      </tr>`).join("")}
    </table>
    ` : '<div class="card success"><div class="value">✅ No pending bills!</div></div>'}

    ${recentActivity.length > 0 ? `
    <!-- Recent activity -->
    <h2>📋 Recent Activity (Last 24h)</h2>
    <table>
      <tr><th>Who</th><th>Action</th><th>Details</th></tr>
      ${recentActivity.map(a => `<tr>
        <td><strong>${esc(a.user_name)}</strong></td>
        <td>${esc(a.action)}</td>
        <td style="color:#666;">${esc(a.detail)}</td>
      </tr>`).join("")}
    </table>
    ` : ""}
  `;

  await sendMdAlert(`📊 Etidhi Daily Digest — ${today}`, html);
  return NextResponse.json({ ok: true, message: "Digest email sent" });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
