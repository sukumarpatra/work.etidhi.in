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
              className="menu-pop fixed z-50 flex min-w-40 flex-col overflow-y-auto rounded-md border border-[#e8e5e0] bg-white py-1 shadow-lg"
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

function StatusCell({ item, onChange }: { item: Item; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      trigger={
        <button
          className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-center text-[12px] font-medium text-white transition hover:opacity-90"
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
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#37352f] hover:bg-[#f1f1ef]"
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
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
          className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-center text-[12px] font-medium text-white transition hover:opacity-90"
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
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#37352f] hover:bg-[#f1f1ef]"
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
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
        <button className="flex w-full cursor-pointer items-center justify-center py-1.5 transition hover:bg-[#f1f1ef]">
          {item.assignee_id && item.assignee_name ? (
            <Avatar id={item.assignee_id} name={item.assignee_name} size={22} />
          ) : (
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-[#c3c2bf] text-[11px] text-[#9b9a97]">
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
          placeholder="Search..."
          className="w-full rounded border border-[#e8e5e0] px-2 py-1 text-[13px] text-[#37352f] focus:border-[#2383e2] focus:outline-none"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="px-3 py-2 text-[13px] text-[#9b9a97]">No people found</div>
        ) : (
          matches.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setOpen(false);
                onChange(u.id);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#37352f] hover:bg-[#f1f1ef]"
            >
              <Avatar id={u.id} name={u.name} size={18} />
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
        className="w-full border-t border-[#e8e5e0]/60 px-3 py-1.5 text-left text-[13px] text-[#9b9a97] hover:bg-[#f1f1ef]"
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
        className="w-full rounded border border-[#2383e2] px-2 py-1 text-[13px] text-[#37352f]"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full truncate rounded px-2 py-1 text-left text-[13px] text-[#37352f] hover:bg-[#f1f1ef]"
      title={item.name}
    >
      {item.name}
    </button>
  );
}

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
    { key: "table", label: "Table" },
    { key: "kanban", label: "Board" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e8e5e0]/60 px-4 pt-4 md:px-10 md:pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: board.color }} />
              <h1 className="text-2xl font-bold text-[#37352f]">{board.name}</h1>
            </div>
            {board.description && (
              <p className="mt-1 text-[13px] text-[#9b9a97]">{board.description}</p>
            )}
          </div>
          <button
            onClick={deleteBoard}
            className="rounded-md px-2.5 py-1 text-[13px] text-[#9b9a97] transition hover:bg-[#f1f1ef] hover:text-[#e03e3e]"
          >
            Delete
          </button>
        </div>

        <div className="mt-4 flex items-center gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-3 py-2 text-[13px] font-medium transition ${
                tab === t.key
                  ? "border-[#37352f] text-[#37352f]"
                  : "border-transparent text-[#9b9a97] hover:text-[#37352f]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab !== "activity" && (
        <div className="flex items-center gap-2 border-b border-[#e8e5e0]/60 px-4 py-2 md:px-10">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full rounded-md border border-[#e8e5e0] px-2.5 py-1 text-[13px] text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] sm:w-48"
          />
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(Number(e.target.value))}
            className="rounded-md border border-[#e8e5e0] bg-white px-2.5 py-1 text-[13px] text-[#37352f]"
          >
            <option value={0}>All people</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {error && <span className="text-[13px] font-medium text-[#e03e3e]">{error}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-10 md:py-6">
        {tab === "table" && (
          <div className="space-y-6">
            {groups.map((group) => {
              const groupItems = filtered.filter((i) => i.group_id === group.id);
              const allGroupItems = items.filter((i) => i.group_id === group.id);
              const isCollapsed = collapsed.has(group.id);
              return (
                <div key={group.id}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="text-[11px] text-[#9b9a97] transition hover:text-[#37352f]"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}
                        className="transition-transform"
                      >
                        <path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <h3 className="text-sm font-semibold" style={{ color: group.color }}>
                      {group.name}
                    </h3>
                    <span className="text-[12px] text-[#c3c2bf]">
                      {allGroupItems.length}
                    </span>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      title="Delete group"
                      className="ml-0.5 text-[11px] text-[#c3c2bf] transition hover:text-[#e03e3e]"
                    >
                      &times;
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto rounded-md border border-[#e8e5e0]">
                      <div className="grid grid-cols-[minmax(200px,1fr)_80px_120px_100px_120px_32px] items-center gap-0 border-b border-[#e8e5e0] bg-[#f7f6f3] text-[11px] font-medium uppercase tracking-wider text-[#9b9a97]">
                        <div className="px-3 py-1.5">Item</div>
                        <div className="border-l border-[#e8e5e0] px-2 py-1.5 text-center">Person</div>
                        <div className="border-l border-[#e8e5e0] py-1.5 text-center">Status</div>
                        <div className="border-l border-[#e8e5e0] py-1.5 text-center">Priority</div>
                        <div className="border-l border-[#e8e5e0] px-2 py-1.5 text-center">Due date</div>
                        <div className="border-l border-[#e8e5e0]" />
                      </div>

                      {groupItems.map((item) => (
                        <div
                          key={item.id}
                          className="group grid grid-cols-[minmax(200px,1fr)_80px_120px_100px_120px_32px] items-stretch border-b border-[#e8e5e0]/60 last:border-b-0"
                        >
                          <div className="flex items-center px-1.5 py-0.5">
                            <NameCell item={item} onRename={(name) => updateItem(item.id, { name })} />
                          </div>
                          <div className="flex items-center justify-center border-l border-[#e8e5e0]/60">
                            <PersonCell
                              item={item}
                              users={users}
                              onChange={(assigneeId) => updateItem(item.id, { assigneeId })}
                            />
                          </div>
                          <div className="flex items-center border-l border-[#e8e5e0]/60 px-1">
                            <StatusCell item={item} onChange={(status) => updateItem(item.id, { status })} />
                          </div>
                          <div className="flex items-center border-l border-[#e8e5e0]/60 px-1">
                            <PriorityCell
                              item={item}
                              onChange={(priority) => updateItem(item.id, { priority })}
                            />
                          </div>
                          <div className="flex items-center justify-center border-l border-[#e8e5e0]/60 px-1">
                            <input
                              type="date"
                              value={item.due_date ?? ""}
                              onChange={(e) => updateItem(item.id, { dueDate: e.target.value || null })}
                              className="w-full cursor-pointer rounded bg-transparent px-1 py-1 text-center text-[12px] text-[#37352f] hover:bg-[#f1f1ef]"
                            />
                          </div>
                          <div className="flex items-center justify-center border-l border-[#e8e5e0]/60">
                            <button
                              onClick={() => deleteItem(item.id)}
                              title="Delete item"
                              className="text-[12px] text-transparent transition group-hover:text-[#c3c2bf] group-hover:hover:text-[#e03e3e]"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="px-1.5 py-0.5">
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
                            placeholder="Type item name and press Enter..."
                            className="w-full rounded border border-[#2383e2] px-2 py-1 text-[13px] text-[#37352f]"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setNewItemGroup(group.id);
                              setNewItemName("");
                            }}
                            className="w-full rounded px-2 py-1 text-left text-[13px] text-[#c3c2bf] transition hover:bg-[#f1f1ef] hover:text-[#2383e2]"
                          >
                            + New
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!isCollapsed && allGroupItems.length > 0 && (
                    <div className="mt-0.5 flex h-1 overflow-hidden rounded-full">
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
                placeholder="Group name..."
                className="rounded-md border border-[#2383e2] px-3 py-1.5 text-[13px] text-[#37352f]"
              />
            ) : (
              <button
                onClick={() => setAddingGroup(true)}
                className="rounded-md px-3 py-1.5 text-[13px] text-[#9b9a97] transition hover:bg-[#f1f1ef] hover:text-[#2383e2]"
              >
                + Add group
              </button>
            )}
          </div>
        )}

        {tab === "kanban" && (
          <div className="flex gap-3 overflow-x-auto pb-4">
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
                  className="flex w-56 shrink-0 flex-col rounded-md bg-[#f7f6f3]"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[12px] font-semibold text-[#37352f]">{s.value}</span>
                    <span className="text-[11px] text-[#c3c2bf]">{colItems.length}</span>
                  </div>
                  <div className="flex-1 space-y-1.5 px-1.5 pb-2">
                    {colItems.map((item) => {
                      const group = groups.find((g) => g.id === item.group_id);
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => (dragItemId.current = item.id)}
                          className="cursor-grab rounded-md border border-[#e8e5e0] bg-white p-2.5 transition hover:bg-[#fafaf8] active:cursor-grabbing"
                        >
                          <div className="text-[13px] text-[#37352f]">{item.name}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: priorityColor(item.priority) }}
                            >
                              {item.priority}
                            </span>
                            {item.assignee_id && item.assignee_name && (
                              <Avatar id={item.assignee_id} name={item.assignee_name} size={18} />
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#c3c2bf]">
                            <span style={{ color: group?.color }}>{group?.name}</span>
                            {item.due_date && <span>{item.due_date}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {colItems.length === 0 && (
                      <div className="rounded-md border border-dashed border-[#e8e5e0] p-3 text-center text-[11px] text-[#c3c2bf]">
                        Drop items here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "activity" && (
          <div className="mx-auto max-w-2xl">
            {activity === null ? (
              <p className="text-[13px] text-[#9b9a97]">Loading...</p>
            ) : activity.length === 0 ? (
              <p className="text-[13px] text-[#9b9a97]">No activity on this board yet.</p>
            ) : (
              <div className="space-y-0.5">
                {activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 rounded-md px-3 py-2 hover:bg-[#f7f6f3]"
                  >
                    <Avatar id={a.user_id} name={a.user_name} size={20} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px]">
                        <span className="font-medium text-[#37352f]">{a.user_name}</span>{" "}
                        <span className="text-[#787774]">{a.action}</span>
                      </div>
                      {a.detail && (
                        <div className="mt-0.5 truncate text-[12px] text-[#c3c2bf]">{a.detail}</div>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-[#c3c2bf]">
                      {a.created_at.replace("T", " ").slice(0, 16)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
