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
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#9b9a97]">
          {title} ({list.length})
        </h2>
        <div className="rounded-md border border-[#e8e5e0]">
          {list.map((r, idx) => (
            <Link
              key={r.id}
              href={`/boards/${r.board_id}`}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-[#f7f6f3] ${
                idx > 0 ? "border-t border-[#e8e5e0]/60" : ""
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: r.board_color }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-[#37352f]">{r.name}</div>
                <div className="text-[12px] text-[#c3c2bf]">
                  {r.board_name} &middot; {r.group_name}
                </div>
              </div>
              <span
                className="hidden rounded px-2 py-0.5 text-[11px] font-medium text-white sm:inline"
                style={{ backgroundColor: priorityColor(r.priority) }}
              >
                {r.priority}
              </span>
              <span
                className="w-auto shrink-0 rounded px-2 py-0.5 text-center text-[11px] font-medium text-white sm:w-24"
                style={{ backgroundColor: statusColor(r.status) }}
              >
                {r.status}
              </span>
              <span className="hidden w-20 text-right text-[12px] text-[#c3c2bf] sm:block">
                {r.due_date ?? "No date"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold text-[#37352f]">My Work</h1>
      <p className="mt-1 text-[13px] text-[#9b9a97]">
        Everything assigned to you across all boards.
      </p>
      {rows.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-[#e8e5e0] p-8 text-center text-[13px] text-[#9b9a97]">
          Nothing assigned to you yet.
        </div>
      )}
      <Section title="Open tasks" list={open} />
      <Section title="Completed" list={done} />
    </div>
  );
}
