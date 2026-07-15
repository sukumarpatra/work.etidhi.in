"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { STATUSES, PRIORITIES, statusColor, priorityColor } from "@/lib/constants";
import type { ActivityRow, Board, Group, Item, User } from "@/lib/types";

type Tab = "table" | "kanban" | "activity";

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

/* ---------- small dropdown menu ---------- */

function Dropdown({
  trigger,
  children,
  open,
  setOpen,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  // Compute a viewport-anchored position so the menu can be portaled to
  // <body>, escaping any `overflow-hidden` ancestor (e.g. the group card).
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - 200));
    setPos(
      openUp
        ? { left, bottom: window.innerHeight - r.top + gap, maxHeight: spaceAbove }
        : { left, top: r.bottom + gap, maxHeight: spaceBelow },
    );
  }, [open]);

  return (
    <div className="relative">
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="menu-pop fixed z-50 flex min-w-40 flex-col overflow-y-auto rounded-lg border border-[#d0d4e4] bg-white py-1 shadow-xl"
              style={{
                left: pos.left,
                top: pos.top,
                bottom: pos.bottom,
                maxHeight: pos.maxHeight,
              }}
            >
              {children}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

/* ---------- editable cells ---------- */

function StatusCell({ item, onChange }: { item: Item; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      trigger={
        <button
          className="w-full cursor-pointer py-2 text-center text-xs font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: statusColor(item.status) }}
        >
          {item.status}
        </button>
      }
    >
      {STATUSES.map((s) => (
        <button
          key={s.value}
          onClick={() => {
            setOpen(false);
            onChange(s.value);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f6f7fb]"
        >
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
          {s.value}
        </button>
      ))}
    </Dropdown>
  );
}

function PriorityCell({ item, onChange }: { item: Item; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      trigger={
        <button
          className="w-full cursor-pointer py-2 text-center text-xs font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: priorityColor(item.priority) }}
        >
          {item.priority}
        </button>
      }
    >
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          onClick={() => {
            setOpen(false);
            onChange(p.value);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f6f7fb]"
        >
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color }} />
          {p.value}
        </button>
      ))}
    </Dropdown>
  );
}

function PersonCell({
  item,
  users,
  onChange,
}: {
  item: Item;
  users: User[];
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  const matches = users.filter((u) =>
    u.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      trigger={
        <button className="flex w-full cursor-pointer items-center justify-center py-1.5 transition hover:bg-[#f6f7fb]">
          {item.assignee_id && item.assignee_name ? (
            <Avatar id={item.assignee_id} name={item.assignee_name} size={26} />
          ) : (
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-[#c5c7d0] text-xs text-[#9699a6]">
              +
            </span>
          )}
        </button>
      }
    >
      <div className="px-2 pb-1 pt-0.5">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Search people…"
          className="w-full rounded border border-[#d0d4e4] px-2 py-1 text-sm focus:border-[#6161ff] focus:outline-none"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="px-3 py-2 text-sm text-[#9699a6]">No people found</div>
        ) : (
          matches.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setOpen(false);
                onChange(u.id);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f6f7fb]"
            >
              <Avatar id={u.id} name={u.name} size={22} />
              {u.name}
            </button>
          ))
        )}
      </div>
      <button
        onClick={() => {
          setOpen(false);
          onChange(null);
        }}
        className="w-full border-t border-[#f0f1f5] px-3 py-2 text-left text-sm text-[#676879] hover:bg-[#f6f7fb]"
      >
        Unassign
      </button>
    </Dropdown>
  );
}

function NameCell({ item, onRename }: { item: Item; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.name);
  useEffect(() => setValue(item.name), [item.name]);

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (value.trim() && value.trim() !== item.name) onRename(value.trim());
          else setValue(item.name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setValue(item.name);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-[#6161ff] px-2 py-1 text-sm"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full truncate rounded px-2 py-1 text-left text-sm text-[#323338] hover:bg-[#f6f7fb]"
      title={item.name}
    >
      {item.name}
    </button>
  );
}

/* ---------- main board view ---------- */

export default function BoardView({
  initialBoard,
  initialGroups,
  initialItems,
  users,
}: {
  initialBoard: Board;
  initialGroups: Group[];
  initialItems: Item[];
  users: User[];
}) {
  const router = useRouter();
  const [board] = useState(initialBoard);
  const [groups, setGroups] = useState(initialGroups);
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<Tab>("table");
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<number | 0>(0);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [newItemGroup, setNewItemGroup] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState("");
  const dragItemId = useRef<number | null>(null);

  useEffect(() => {
    if (tab === "activity") {
      fetch(`/api/activity?boardId=${board.id}`)
        .then((r) => r.json())
        .then((d) => setActivity(d.activity ?? []))
        .catch(() => setActivity([]));
    }
  }, [tab, board.id, items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (personFilter && i.assignee_id !== personFilter) return false;
      return true;
    });
  }, [items, search, personFilter]);

  function flashError(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  }

  async function updateItem(id: number, patch: Record<string, unknown>) {
    try {
      const data = await api(`/api/items/${id}`, "PATCH", patch);
      setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
    } catch (e) {
      flashError((e as Error).message);
    }
  }

  async function deleteItem(id: number) {
    try {
      await api(`/api/items/${id}`, "DELETE");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      flashError((e as Error).message);
    }
  }

  async function addItem(groupId: number) {
    if (!newItemName.trim()) return;
    try {
      const data = await api("/api/items", "POST", { groupId, name: newItemName });
      setItems((prev) => [...prev, data.item]);
      setNewItemName("");
    } catch (e) {
      flashError((e as Error).message);
    }
  }

  async function addGroup() {
    if (!newGroupName.trim()) return;
    try {
      const data = await api("/api/groups", "POST", { boardId: board.id, name: newGroupName });
      setGroups((prev) => [...prev, data.group]);
      setNewGroupName("");
      setAddingGroup(false);
    } catch (e) {
      flashError((e as Error).message);
    }
  }

  async function deleteGroup(id: number) {
    if (!confirm("Delete this group and all its items?")) return;
    try {
      await api(`/api/groups/${id}`, "DELETE");
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setItems((prev) => prev.filter((i) => i.group_id !== id));
    } catch (e) {
      flashError((e as Error).message);
    }
  }

  async function deleteBoard() {
    if (!confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
    try {
      await api(`/api/boards/${board.id}`, "DELETE");
      router.push("/");
      router.refresh();
    } catch (e) {
      flashError((e as Error).message);
    }
  }

  function toggleGroup(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "table", label: "Main Table" },
    { key: "kanban", label: "Kanban" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Board header */}
      <div className="border-b border-[#d0d4e4] bg-white px-8 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: board.color }} />
              <h1 className="text-xl font-bold text-[#323338]">{board.name}</h1>
            </div>
            {board.description && (
              <p className="mt-1 text-sm text-[#676879]">{board.description}</p>
            )}
          </div>
          <button
            onClick={deleteBoard}
            className="rounded-lg px-3 py-1.5 text-sm text-[#676879] transition hover:bg-[#df2f4a]/10 hover:text-[#df2f4a]"
          >
            Delete board
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === t.key
                  ? "border-[#6161ff] text-[#6161ff]"
                  : "border-transparent text-[#676879] hover:text-[#323338]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      {tab !== "activity" && (
        <div className="flex items-center gap-3 border-b border-[#d0d4e4] bg-white px-8 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search items…"
            className="w-56 rounded-lg border border-[#d0d4e4] px-3 py-1.5 text-sm focus:border-[#6161ff]"
          />
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(Number(e.target.value))}
            className="rounded-lg border border-[#d0d4e4] bg-white px-3 py-1.5 text-sm text-[#323338]"
          >
            <option value={0}>All people</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {error && <span className="text-sm font-medium text-[#df2f4a]">{error}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* ============ TABLE VIEW ============ */}
        {tab === "table" && (
          <div className="space-y-8">
            {groups.map((group) => {
              const groupItems = filtered.filter((i) => i.group_id === group.id);
              const allGroupItems = items.filter((i) => i.group_id === group.id);
              const isCollapsed = collapsed.has(group.id);
              return (
                <div key={group.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="text-xs text-[#676879] transition hover:text-[#323338]"
                    >
                      {isCollapsed ? "▶" : "▼"}
                    </button>
                    <h3 className="text-[15px] font-semibold" style={{ color: group.color }}>
                      {group.name}
                    </h3>
                    <span className="text-xs text-[#9699a6]">
                      {allGroupItems.length} item{allGroupItems.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      title="Delete group"
                      className="ml-1 text-xs text-[#c5c7d0] transition hover:text-[#df2f4a]"
                    >
                      ✕
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div
                      className="overflow-hidden rounded-lg border border-[#d0d4e4] bg-white"
                      style={{ borderLeft: `4px solid ${group.color}` }}
                    >
                      <div className="grid grid-cols-[minmax(200px,1fr)_90px_130px_110px_130px_40px] items-center gap-0 border-b border-[#f0f1f5] bg-[#fafbfc] text-xs font-medium text-[#676879]">
                        <div className="px-3 py-2">Item</div>
                        <div className="border-l border-[#f0f1f5] px-2 py-2 text-center">Person</div>
                        <div className="border-l border-[#f0f1f5] py-2 text-center">Status</div>
                        <div className="border-l border-[#f0f1f5] py-2 text-center">Priority</div>
                        <div className="border-l border-[#f0f1f5] px-2 py-2 text-center">Due date</div>
                        <div className="border-l border-[#f0f1f5]" />
                      </div>

                      {groupItems.map((item) => (
                        <div
                          key={item.id}
                          className="group grid grid-cols-[minmax(200px,1fr)_90px_130px_110px_130px_40px] items-stretch border-b border-[#f0f1f5] last:border-b-0"
                        >
                          <div className="flex items-center px-1.5 py-1">
                            <NameCell item={item} onRename={(name) => updateItem(item.id, { name })} />
                          </div>
                          <div className="flex items-center justify-center border-l border-[#f0f1f5]">
                            <PersonCell
                              item={item}
                              users={users}
                              onChange={(assigneeId) => updateItem(item.id, { assigneeId })}
                            />
                          </div>
                          <div className="border-l border-[#f0f1f5]">
                            <StatusCell item={item} onChange={(status) => updateItem(item.id, { status })} />
                          </div>
                          <div className="border-l border-[#f0f1f5]">
                            <PriorityCell
                              item={item}
                              onChange={(priority) => updateItem(item.id, { priority })}
                            />
                          </div>
                          <div className="flex items-center justify-center border-l border-[#f0f1f5] px-2">
                            <input
                              type="date"
                              value={item.due_date ?? ""}
                              onChange={(e) => updateItem(item.id, { dueDate: e.target.value || null })}
                              className="w-full cursor-pointer rounded bg-transparent px-1 py-1 text-center text-xs text-[#323338] hover:bg-[#f6f7fb]"
                            />
                          </div>
                          <div className="flex items-center justify-center border-l border-[#f0f1f5]">
                            <button
                              onClick={() => deleteItem(item.id)}
                              title="Delete item"
                              className="text-xs text-transparent transition group-hover:text-[#c5c7d0] group-hover:hover:text-[#df2f4a]"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add item row */}
                      <div className="px-1.5 py-1">
                        {newItemGroup === group.id ? (
                          <input
                            autoFocus
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addItem(group.id);
                              if (e.key === "Escape") {
                                setNewItemGroup(null);
                                setNewItemName("");
                              }
                            }}
                            onBlur={() => {
                              if (newItemName.trim()) addItem(group.id);
                              setNewItemGroup(null);
                            }}
                            placeholder="Type item name and press Enter…"
                            className="w-full rounded border border-[#6161ff] px-2 py-1.5 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setNewItemGroup(group.id);
                              setNewItemName("");
                            }}
                            className="w-full rounded px-2 py-1.5 text-left text-sm text-[#9699a6] transition hover:bg-[#f6f7fb] hover:text-[#6161ff]"
                          >
                            + Add item
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* status distribution bar */}
                  {!isCollapsed && allGroupItems.length > 0 && (
                    <div className="mt-1 flex h-1.5 overflow-hidden rounded-full">
                      {STATUSES.map((s) => {
                        const n = allGroupItems.filter((i) => i.status === s.value).length;
                        if (!n) return null;
                        return (
                          <div
                            key={s.value}
                            title={`${s.value}: ${n}`}
                            style={{
                              backgroundColor: s.color,
                              width: `${(n / allGroupItems.length) * 100}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add group */}
            {addingGroup ? (
              <input
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addGroup();
                  if (e.key === "Escape") setAddingGroup(false);
                }}
                onBlur={() => {
                  if (newGroupName.trim()) addGroup();
                  else setAddingGroup(false);
                }}
                placeholder="Group name…"
                className="rounded-lg border border-[#6161ff] px-3 py-2 text-sm"
              />
            ) : (
              <button
                onClick={() => setAddingGroup(true)}
                className="rounded-lg border border-[#d0d4e4] bg-white px-4 py-2 text-sm font-medium text-[#323338] transition hover:border-[#6161ff] hover:text-[#6161ff]"
              >
                + Add new group
              </button>
            )}
          </div>
        )}

        {/* ============ KANBAN VIEW ============ */}
        {tab === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map((s) => {
              const colItems = filtered.filter((i) => i.status === s.value);
              return (
                <div
                  key={s.value}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragItemId.current !== null) {
                      updateItem(dragItemId.current, { status: s.value });
                      dragItemId.current = null;
                    }
                  }}
                  className="flex w-64 shrink-0 flex-col rounded-xl bg-[#eef0f5]"
                >
                  <div
                    className="rounded-t-xl px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.value} <span className="font-normal opacity-80">/ {colItems.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 p-2.5">
                    {colItems.map((item) => {
                      const group = groups.find((g) => g.id === item.group_id);
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => (dragItemId.current = item.id)}
                          className="cursor-grab rounded-lg border border-[#d0d4e4] bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
                        >
                          <div className="text-sm font-medium text-[#323338]">{item.name}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: priorityColor(item.priority) }}
                            >
                              {item.priority}
                            </span>
                            {item.assignee_id && item.assignee_name && (
                              <Avatar id={item.assignee_id} name={item.assignee_name} size={22} />
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-[#9699a6]">
                            <span style={{ color: group?.color }}>{group?.name}</span>
                            {item.due_date && <span>📅 {item.due_date}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {colItems.length === 0 && (
                      <div className="rounded-lg border border-dashed border-[#c5c7d0] p-3 text-center text-xs text-[#9699a6]">
                        Drop items here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============ ACTIVITY VIEW ============ */}
        {tab === "activity" && (
          <div className="mx-auto max-w-2xl">
            {activity === null ? (
              <p className="text-sm text-[#676879]">Loading activity…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-[#676879]">No activity on this board yet.</p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-[#d0d4e4] bg-white">
                {activity.map((a, idx) => (
                  <li
                    key={a.id}
                    className={`flex items-start gap-3 px-5 py-3.5 ${
                      idx > 0 ? "border-t border-[#f0f1f5]" : ""
                    }`}
                  >
                    <Avatar id={a.user_id} name={a.user_name} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-[#323338]">{a.user_name}</span>{" "}
                        <span className="text-[#676879]">{a.action}</span>
                      </div>
                      {a.detail && (
                        <div className="mt-0.5 truncate text-xs text-[#9699a6]">{a.detail}</div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-[#9699a6]">
                      {a.created_at.replace("T", " ").slice(0, 16)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
