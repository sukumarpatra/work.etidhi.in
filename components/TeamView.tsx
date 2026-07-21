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

  const inputCls =
    "w-full rounded-md border border-[#e8e5e0] px-3 py-2 text-sm text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]/30";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">Team</h1>
          <p className="mt-1 text-[13px] text-[#9b9a97]">
            {users.length} member{users.length !== 1 ? "s" : ""} at Etidhi
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-[#2383e2] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1b6ec2]"
          >
            + Add member
          </button>
        )}
      </div>

      {isAdmin && resetRequests.length > 0 && (
        <div className="mt-6 rounded-lg border border-[#fdecc8] bg-[#fdecc8]/20 p-4">
          <h2 className="text-sm font-semibold text-[#37352f]">
            Password reset requests ({resetRequests.length})
          </h2>
          <p className="mt-0.5 text-[12px] text-[#9b9a97]">
            Approving activates the new password immediately.
          </p>
          <ul className="mt-2 space-y-1.5">
            {resetRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-[#e8e5e0] bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-[#37352f]">{r.user_name}</span>
                  <span className="ml-2 text-[12px] text-[#9b9a97]">{r.user_email}</span>
                  <span className="ml-2 text-[11px] text-[#c3c2bf]">
                    {r.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <button
                  onClick={() => decideReset(r.id, "approve")}
                  disabled={busyId === -r.id}
                  className="rounded-md bg-[#0f7b6c] px-2.5 py-1 text-[12px] font-medium text-white transition hover:bg-[#0a6b5e] disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => decideReset(r.id, "deny")}
                  disabled={busyId === -r.id}
                  className="rounded-md border border-[#e03e3e] px-2.5 py-1 text-[12px] font-medium text-[#e03e3e] transition hover:bg-[#ffe2dd] disabled:opacity-50"
                >
                  Deny
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-lg border border-[#e8e5e0] p-4 transition hover:bg-[#fafaf8]">
            <div className="flex items-center gap-3">
              <Avatar id={u.id} name={u.name} size={36} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-[#37352f]">{u.name}</span>
                  {u.role === "admin" && (
                    <span className="rounded bg-[#e8f0fe] px-1.5 py-0.5 text-[10px] font-medium text-[#2383e2]">
                      Admin
                    </span>
                  )}
                  {u.id === currentUserId && (
                    <span className="rounded bg-[#f1f1ef] px-1.5 py-0.5 text-[10px] font-medium text-[#9b9a97]">
                      You
                    </span>
                  )}
                </div>
                <div className="truncate text-[12px] text-[#9b9a97]">{u.title || "Team member"}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#e8e5e0]/60 pt-2.5 text-[12px] text-[#9b9a97]">
              <span className="truncate">{u.email}</span>
              <span className="shrink-0 font-medium text-[#37352f]">
                {u.open_tasks} open
              </span>
            </div>
            {isAdmin && u.id !== currentUserId && (
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  onClick={() => changeRole(u)}
                  disabled={busyId === u.id}
                  className="flex-1 rounded-md border border-[#e8e5e0] px-2 py-1 text-[12px] text-[#37352f] transition hover:bg-[#f1f1ef] disabled:opacity-50"
                >
                  {u.role === "admin" ? "Make member" : "Make admin"}
                </button>
                <button
                  onClick={() => removeUser(u)}
                  disabled={busyId === u.id}
                  className="flex-1 rounded-md border border-[#e8e5e0] px-2 py-1 text-[12px] text-[#9b9a97] transition hover:border-[#e03e3e] hover:text-[#e03e3e] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
            {cardError?.id === u.id && (
              <p className="mt-1.5 text-[12px] text-[#e03e3e]">{cardError.msg}</p>
            )}
          </div>
        ))}
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
            <h3 className="text-base font-semibold text-[#37352f]">Add team member</h3>
            <p className="mt-1 text-[13px] text-[#9b9a97]">
              Only @etidhi.in emails are allowed.
            </p>
            <form onSubmit={invite} className="mt-4 space-y-3">
              <input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={inputCls} />
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@etidhi.in" className={inputCls} />
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Job title (optional)" className={inputCls} />
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#9b9a97]">Access level</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "member", label: "Member", hint: "Can work on boards" },
                    { value: "admin", label: "Admin", hint: "Full control" },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`rounded-md border px-3 py-2 text-left transition ${
                        form.role === r.value
                          ? "border-[#2383e2] bg-[#e8f0fe]"
                          : "border-[#e8e5e0] hover:bg-[#f1f1ef]"
                      }`}
                    >
                      <div className="text-sm font-medium text-[#37352f]">{r.label}</div>
                      <div className="text-[11px] text-[#9b9a97]">{r.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (default: etidhi123)" className={inputCls} />
              {error && <p className="text-[13px] text-[#e03e3e]">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-md px-3 py-1.5 text-sm text-[#787774] hover:bg-[#f1f1ef]">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-md bg-[#2383e2] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-50">
                  {saving ? "Adding..." : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
