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

  // Build a conic-gradient donut of item statuses
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
    : "conic-gradient(#e5e7ef 0deg 360deg)";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Total tasks", value: totals.total ?? 0, color: "#6161ff" },
    { label: "Completed", value: totals.done ?? 0, color: "#00c875" },
    { label: "Stuck", value: totals.stuck ?? 0, color: "#df2f4a" },
    { label: "Assigned to me", value: totals.mine ?? 0, color: "#fdab3d" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-2xl font-bold text-[#323338]">
        {greeting}, {session.name.split(" ")[0]}! 👋
      </h1>
      <p className="mt-1 text-[#676879]">Here&apos;s what&apos;s happening across Etidhi.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#d0d4e4] bg-white p-5">
            <div className="text-3xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="mt-1 text-sm text-[#676879]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Boards */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-[#323338]">Your boards</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {boards.map((b) => {
              const pct = b.item_count ? Math.round(((b.done_count ?? 0) / b.item_count) * 100) : 0;
              return (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  className="group rounded-xl border border-[#d0d4e4] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-semibold text-[#323338] group-hover:text-[#6161ff]">
                      {b.name}
                    </span>
                  </div>
                  {b.description && (
                    <p className="mt-1.5 line-clamp-1 text-sm text-[#676879]">{b.description}</p>
                  )}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[#676879]">
                      <span>
                        {b.done_count}/{b.item_count} done
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0f1f5]">
                      <div
                        className="h-full rounded-full bg-[#00c875] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column: donut + activity */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#d0d4e4] bg-white p-5">
            <h3 className="font-semibold text-[#323338]">Status overview</h3>
            <div className="mt-4 flex items-center gap-5">
              <div
                className="relative h-28 w-28 shrink-0 rounded-full"
                style={{ background: donut }}
              >
                <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white">
                  <span className="text-xl font-bold text-[#323338]">{totals.total ?? 0}</span>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs">
                {STATUSES.map((s) => {
                  const n = statusCounts.find((c) => c.status === s.value)?.n ?? 0;
                  return (
                    <li key={s.value} className="flex items-center gap-2 text-[#676879]">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: statusColor(s.value) }}
                      />
                      {s.value} · <span className="font-semibold text-[#323338]">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-[#d0d4e4] bg-white p-5">
            <h3 className="font-semibold text-[#323338]">Recent activity</h3>
            <ul className="mt-3 space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-sm">
                  <Avatar id={a.user_id} name={a.user_name} size={24} />
                  <div className="min-w-0">
                    <span className="font-medium text-[#323338]">{a.user_name}</span>{" "}
                    <span className="text-[#676879]">{a.action}</span>
                    {a.detail && (
                      <div className="truncate text-xs text-[#9699a6]">{a.detail}</div>
                    )}
                  </div>
                </li>
              ))}
              {activity.length === 0 && (
                <li className="text-sm text-[#676879]">No activity yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
