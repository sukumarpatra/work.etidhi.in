"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import type { User } from "@/lib/types";

type TeamUser = User & { open_tasks: number };

export type ResetRequest = {
  id: number;
  created_at: string;
  user_name: string;
  user_email: string;
};

export default function TeamView({
  users,
  isAdmin,
  currentUserId,
  resetRequests,
}: {
  users: TeamUser[];
  isAdmin: boolean;
  currentUserId: number;
  resetRequests: ResetRequest[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", title: "", password: "", role: "member" });
  const [error, setError] = useState("");
  const [cardError, setCardError] = useState<{ id: number; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add member.");
      return;
    }
    setShowModal(false);
    setForm({ name: "", email: "", title: "", password: "", role: "member" });
    router.refresh();
  }

  async function changeRole(u: TeamUser) {
    const newRole = u.role === "admin" ? "member" : "admin";
    setBusyId(u.id);
    setCardError(null);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setCardError({ id: u.id, msg: data.error ?? "Could not change role." });
      return;
    }
    router.refresh();
  }

  async function decideReset(id: number, action: "approve" | "deny") {
    setBusyId(-id);
    const res = await fetch(`/api/password-resets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  async function removeUser(u: TeamUser) {
    if (!confirm(`Remove ${u.name} from Etidhi? Their tasks will be unassigned.`)) return;
    setBusyId(u.id);
    setCardError(null);
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setCardError({ id: u.id, msg: data.error ?? "Could not remove member." });
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#323338]">Team</h1>
          <p className="mt-1 text-[#676879]">
            {users.length} member{users.length !== 1 ? "s" : ""} at Etidhi
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-[#6161ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5151d5]"
          >
            + Add member
          </button>
        )}
      </div>

      {isAdmin && resetRequests.length > 0 && (
        <div className="mt-6 rounded-xl border border-[#fdab3d]/50 bg-[#fdab3d]/5 p-5">
          <h2 className="font-semibold text-[#323338]">
            🔑 Password reset requests ({resetRequests.length})
          </h2>
          <p className="mt-0.5 text-xs text-[#676879]">
            These users chose a new password on the login page. Approving activates it immediately.
          </p>
          <ul className="mt-3 space-y-2">
            {resetRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d0d4e4] bg-white px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-[#323338]">{r.user_name}</span>
                  <span className="ml-2 text-xs text-[#676879]">{r.user_email}</span>
                  <span className="ml-2 text-xs text-[#9699a6]">
                    {r.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <button
                  onClick={() => decideReset(r.id, "approve")}
                  disabled={busyId === -r.id}
                  className="rounded-lg bg-[#00c875] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#00a865] disabled:opacity-50"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => decideReset(r.id, "deny")}
                  disabled={busyId === -r.id}
                  className="rounded-lg border border-[#df2f4a] px-3 py-1.5 text-xs font-semibold text-[#df2f4a] transition hover:bg-[#df2f4a]/10 disabled:opacity-50"
                >
                  ✕ Deny
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-[#d0d4e4] bg-white p-5">
            <div className="flex items-center gap-3">
              <Avatar id={u.id} name={u.name} size={44} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-[#323338]">{u.name}</span>
                  {u.role === "admin" && (
                    <span className="rounded bg-[#eceafe] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#6161ff]">
                      Admin
                    </span>
                  )}
                  {u.id === currentUserId && (
                    <span className="rounded bg-[#f0f1f5] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#676879]">
                      You
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-[#676879]">{u.title || "Team member"}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#f0f1f5] pt-3 text-xs text-[#676879]">
              <span className="truncate">{u.email}</span>
              <span className="shrink-0 font-medium text-[#323338]">
                {u.open_tasks} open task{u.open_tasks !== 1 ? "s" : ""}
              </span>
            </div>
            {isAdmin && u.id !== currentUserId && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => changeRole(u)}
                  disabled={busyId === u.id}
                  className="flex-1 rounded-lg border border-[#d0d4e4] px-2.5 py-1.5 text-xs font-medium text-[#323338] transition hover:border-[#6161ff] hover:text-[#6161ff] disabled:opacity-50"
                >
                  {u.role === "admin" ? "Make member" : "Make admin"}
                </button>
                <button
                  onClick={() => removeUser(u)}
                  disabled={busyId === u.id}
                  className="flex-1 rounded-lg border border-[#d0d4e4] px-2.5 py-1.5 text-xs font-medium text-[#676879] transition hover:border-[#df2f4a] hover:text-[#df2f4a] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
            {cardError?.id === u.id && (
              <p className="mt-2 text-xs font-medium text-[#df2f4a]">{cardError.msg}</p>
            )}
          </div>
        ))}
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
            <h3 className="text-lg font-bold text-[#323338]">Add team member</h3>
            <p className="mt-1 text-sm text-[#676879]">
              Only <span className="font-medium">@etidhi.in</span> emails are allowed.
            </p>
            <form onSubmit={invite} className="mt-4 space-y-3">
              <input
                autoFocus
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@etidhi.in"
                className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Job title (optional)"
                className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-[#676879]">
                  Access level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "member", label: "Member", hint: "Can work on boards" },
                    { value: "admin", label: "Admin", hint: "Full control + manage team" },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        form.role === r.value
                          ? "border-[#6161ff] bg-[#eceafe]"
                          : "border-[#d0d4e4] hover:border-[#9699a6]"
                      }`}
                    >
                      <div className="text-sm font-semibold text-[#323338]">{r.label}</div>
                      <div className="text-[11px] text-[#676879]">{r.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password (min 6 chars, default: etidhi123)"
                className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              {error && <p className="text-sm text-[#df2f4a]">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#676879] hover:bg-[#f6f7fb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#6161ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5151d5] disabled:opacity-50"
                >
                  {saving ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
