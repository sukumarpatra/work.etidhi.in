"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Board } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/my-work", label: "My Work", icon: "📋" },
  { href: "/bills", label: "Bills", icon: "🧾" },
  { href: "/team", label: "Team", icon: "👥" },
];

const BOARD_CATEGORIES = ["General", "Action Items", "Client", "Partners"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  General: "📄",
  "Action Items": "⚡",
  Client: "🤝",
  Partners: "🏢",
};

export default function Sidebar({ boards, onClose }: { boards: Board[]; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  function toggleCat(cat: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, category }),
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
    setCategory("General");
    router.push(`/boards/${data.board.id}`);
    router.refresh();
  }

  const boardsByCategory = BOARD_CATEGORIES.map((cat) => ({
    category: cat,
    boards: boards.filter((b) => (b.category || "General") === cat),
  })).filter((g) => g.boards.length > 0);

  const inputCls =
    "w-full rounded-md border border-[#e8e5e0] px-3 py-2 text-sm text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]/30";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[#f7f6f3]">
      <div className="flex items-center gap-2.5 px-4 py-3">
        {onClose && (
          <button
            onClick={onClose}
            className="mr-auto flex h-6 w-6 items-center justify-center rounded text-[#9b9a97] transition hover:bg-[#ebebea] hover:text-[#37352f] md:hidden"
            aria-label="Close sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Etidhi logo"
            className="h-full w-full object-cover"
            style={{ transform: "scale(1.55)", transformOrigin: "50% 38%" }}
          />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#37352f]">Etidhi</div>
          <div className="text-[10px] text-[#9b9a97]">Collaborate. Solve. Differentiate.</div>
        </div>
      </div>

      <nav className="mt-1 px-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={onClose}
            className={`flex items-center gap-2 rounded-md px-2.5 py-[5px] text-sm transition ${
              pathname === n.href
                ? "bg-[#ebebea] font-medium text-[#37352f]"
                : "text-[#787774] hover:bg-[#ebebea]"
            }`}
          >
            <span className="w-5 text-center text-[13px] leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 flex items-center justify-between px-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9b9a97]">
          Boards
        </span>
        <button
          onClick={() => setShowModal(true)}
          title="New board"
          className="flex h-5 w-5 items-center justify-center rounded text-[#9b9a97] transition hover:bg-[#ebebea] hover:text-[#37352f]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-1.5 flex-1 overflow-y-auto px-2 pb-4">
        {boardsByCategory.map(({ category: cat, boards: catBoards }) => (
          <div key={cat} className="mb-0.5">
            <button
              onClick={() => toggleCat(cat)}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[11px] font-medium text-[#9b9a97] transition hover:bg-[#ebebea] hover:text-[#787774]"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="shrink-0 transition-transform"
                style={{ transform: collapsedCats.has(cat) ? "rotate(-90deg)" : "rotate(0)" }}
              >
                <path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[12px]">{CATEGORY_ICONS[cat] || "📄"}</span>
              <span className="uppercase tracking-wider">{cat}</span>
              <span className="ml-auto text-[10px] text-[#c3c2bf]">{catBoards.length}</span>
            </button>
            {!collapsedCats.has(cat) &&
              catBoards.map((b) => (
                <Link
                  key={b.id}
                  href={`/boards/${b.id}`}
                  onClick={onClose}
                  className={`ml-3 flex items-center gap-2 rounded-md px-2 py-[5px] text-sm transition ${
                    pathname === `/boards/${b.id}`
                      ? "bg-[#ebebea] font-medium text-[#37352f]"
                      : "text-[#787774] hover:bg-[#ebebea]"
                  }`}
                >
                  <span
                    className="h-[6px] w-[6px] shrink-0 rounded-sm"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="truncate">{b.name}</span>
                </Link>
              ))}
          </div>
        ))}
        {boards.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#9b9a97]">No boards yet. Create one!</p>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="menu-pop w-full max-w-sm rounded-t-xl border border-[#e8e5e0] bg-white p-5 shadow-xl sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[#37352f]">Create board</h3>
            <form onSubmit={createBoard} className="mt-4 space-y-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
                className={inputCls}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                {BOARD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_ICONS[c]} {c}
                  </option>
                ))}
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className={`${inputCls} resize-none`}
              />
              {error && <p className="text-sm text-[#e03e3e]">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-[#787774] hover:bg-[#f1f1ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-md bg-[#2383e2] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
