import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { STATUSES, statusColor } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import type { ActivityRow, Board } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = (await getSession())!;
  const db = getDb();

  const boards = db
    .prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id) AS item_count,
        (SELECT COUNT(*) FROM items i WHERE i.board_id = b.id AND i.status = 'Done') AS done_count
       FROM boards b ORDER BY b.created_at DESC`
    )
    .all() as Board[];

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN status = 'Stuck' THEN 1 ELSE 0 END) AS stuck,
        SUM(CASE WHEN assignee_id = ? AND status != 'Done' THEN 1 ELSE 0 END) AS mine
       FROM items`
    )
    .get(session.id) as { total: number; done: number; stuck: number; mine: number };

  const statusCounts = db
    .prepare("SELECT status, COUNT(*) AS n FROM items GROUP BY status")
    .all() as { status: string; n: number }[];

  const activity = db
    .prepare(
      `SELECT a.*, u.name AS user_name FROM activity a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT 8`
    )
    .all() as ActivityRow[];

  const total = totals.total || 1;
  let acc = 0;
  const segments: string[] = [];
  for (const s of STATUSES) {
    const n = statusCounts.find((c) => c.status === s.value)?.n ?? 0;
    if (n === 0) continue;
    const start = (acc / total) * 360;
    acc += n;
    const end = (acc / total) * 360;
    segments.push(`${s.color} ${start}deg ${end}deg`);
  }
  const donut = segments.length
    ? `conic-gradient(${segments.join(", ")})`
    : "conic-gradient(#e8e5e0 0deg 360deg)";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Total tasks", value: totals.total ?? 0, color: "#37352f" },
    { label: "Completed", value: totals.done ?? 0, color: "#4dab9a" },
    { label: "Stuck", value: totals.stuck ?? 0, color: "#e03e3e" },
    { label: "Assigned to me", value: totals.mine ?? 0, color: "#d9730d" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-10 md:py-10">
      <h1 className="text-3xl font-bold text-[#37352f]">
        {greeting}, {session.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-[#787774]">Here&apos;s what&apos;s happening across Etidhi.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[#e8e5e0] p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="mt-0.5 text-[13px] text-[#9b9a97]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#9b9a97]">
            Your boards
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {boards.map((b) => {
              const pct = b.item_count ? Math.round(((b.done_count ?? 0) / b.item_count) * 100) : 0;
              return (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  className="group rounded-lg border border-[#e8e5e0] p-4 transition hover:bg-[#f7f6f3]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-medium text-[#37352f]">{b.name}</span>
                  </div>
                  {b.description && (
                    <p className="mt-1 line-clamp-1 text-[13px] text-[#9b9a97]">{b.description}</p>
                  )}
                  <div className="mt-3">
                    <div className="flex justify-between text-[12px] text-[#9b9a97]">
                      <span>
                        {b.done_count}/{b.item_count} done
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#e8e5e0]">
                      <div
                        className="h-full rounded-full bg-[#4dab9a] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[#e8e5e0] p-4">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#9b9a97]">
              Status overview
            </h3>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative h-24 w-24 shrink-0 rounded-full"
                style={{ background: donut }}
              >
                <div className="absolute inset-2.5 flex items-center justify-center rounded-full bg-white">
                  <span className="text-lg font-bold text-[#37352f]">{totals.total ?? 0}</span>
                </div>
              </div>
              <ul className="space-y-1 text-[12px]">
                {STATUSES.map((s) => {
                  const n = statusCounts.find((c) => c.status === s.value)?.n ?? 0;
                  return (
                    <li key={s.value} className="flex items-center gap-1.5 text-[#787774]">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: statusColor(s.value) }}
                      />
                      {s.value} &middot; <span className="font-medium text-[#37352f]">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-[#e8e5e0] p-4">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#9b9a97]">
              Recent activity
            </h3>
            <ul className="mt-3 space-y-2.5">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-[13px]">
                  <Avatar id={a.user_id} name={a.user_name} size={20} />
                  <div className="min-w-0">
                    <span className="font-medium text-[#37352f]">{a.user_name}</span>{" "}
                    <span className="text-[#787774]">{a.action}</span>
                    {a.detail && (
                      <div className="truncate text-[12px] text-[#9b9a97]">{a.detail}</div>
                    )}
                  </div>
                </li>
              ))}
              {activity.length === 0 && (
                <li className="text-[13px] text-[#9b9a97]">No activity yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
