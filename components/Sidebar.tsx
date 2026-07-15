"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Board } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/my-work", label: "My Work", icon: "✅" },
  { href: "/bills", label: "Bills", icon: "🧾" },
  { href: "/team", label: "Team", icon: "👥" },
];

export default function Sidebar({ boards }: { boards: Board[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create board.");
      return;
    }
    setShowModal(false);
    setName("");
    setDescription("");
    router.push(`/boards/${data.board.id}`);
    router.refresh();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#d0d4e4] bg-white">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#f0f1f5] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Etidhi logo"
            className="h-full w-full object-cover"
            style={{ transform: "scale(1.55)", transformOrigin: "50% 38%" }}
          />
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight text-[#323338]">Etidhi</div>
          <div className="text-[11px] text-[#676879]">Collaborate. Solve. Differentiate.</div>
        </div>
      </div>

      <nav className="px-3">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              pathname === n.href
                ? "bg-[#eceafe] text-[#6161ff]"
                : "text-[#323338] hover:bg-[#f6f7fb]"
            }`}
          >
            <span className="text-base leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 flex items-center justify-between px-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#676879]">
          Boards
        </span>
        <button
          onClick={() => setShowModal(true)}
          title="New board"
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[#6161ff] text-sm font-bold text-white transition hover:bg-[#5151d5]"
        >
          +
        </button>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
        {boards.map((b) => (
          <Link
            key={b.id}
            href={`/boards/${b.id}`}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
              pathname === `/boards/${b.id}`
                ? "bg-[#eceafe] font-medium text-[#6161ff]"
                : "text-[#323338] hover:bg-[#f6f7fb]"
            }`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: b.color }}
            />
            <span className="truncate">{b.name}</span>
          </Link>
        ))}
        {boards.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#676879]">No boards yet. Create one!</p>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="menu-pop w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#323338]">Create board</h3>
            <form onSubmit={createBoard} className="mt-4 space-y-4">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
                className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full resize-none rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              {error && <p className="text-sm text-[#df2f4a]">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#676879] hover:bg-[#f6f7fb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-lg bg-[#6161ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5151d5] disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create board"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
