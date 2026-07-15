import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { statusColor, priorityColor } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string;
  status: string;
  priority: string;
  due_date: string | null;
  board_id: number;
  board_name: string;
  board_color: string;
  group_name: string;
};

export default async function MyWorkPage() {
  const session = (await getSession())!;
  const rows = getDb()
    .prepare(
      `SELECT i.id, i.name, i.status, i.priority, i.due_date, i.board_id,
              b.name AS board_name, b.color AS board_color, g.name AS group_name
       FROM items i
       JOIN boards b ON b.id = i.board_id
       JOIN groups g ON g.id = i.group_id
       WHERE i.assignee_id = ?
       ORDER BY CASE WHEN i.status = 'Done' THEN 1 ELSE 0 END, i.due_date IS NULL, i.due_date`
    )
    .all(session.id) as Row[];

  const open = rows.filter((r) => r.status !== "Done");
  const done = rows.filter((r) => r.status === "Done");

  function Section({ title, list }: { title: string; list: Row[] }) {
    if (list.length === 0) return null;
    return (
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#676879]">
          {title} ({list.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-[#d0d4e4] bg-white">
          {list.map((r, idx) => (
            <Link
              key={r.id}
              href={`/boards/${r.board_id}`}
              className={`flex items-center gap-4 px-5 py-3.5 transition hover:bg-[#f6f7fb] ${
                idx > 0 ? "border-t border-[#f0f1f5]" : ""
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: r.board_color }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[#323338]">{r.name}</div>
                <div className="text-xs text-[#676879]">
                  {r.board_name} · {r.group_name}
                </div>
              </div>
              <span
                className="rounded px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: priorityColor(r.priority) }}
              >
                {r.priority}
              </span>
              <span
                className="w-28 rounded px-2.5 py-1 text-center text-xs font-medium text-white"
                style={{ backgroundColor: statusColor(r.status) }}
              >
                {r.status}
              </span>
              <span className="w-24 text-right text-xs text-[#676879]">
                {r.due_date ?? "No due date"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-bold text-[#323338]">My Work</h1>
      <p className="mt-1 text-[#676879]">
        Everything assigned to you across all Etidhi boards.
      </p>
      {rows.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-[#d0d4e4] bg-white p-10 text-center text-[#676879]">
          Nothing assigned to you yet. 🎉
        </div>
      )}
      <Section title="Open tasks" list={open} />
      <Section title="Completed" list={done} />
    </div>
  );
}
