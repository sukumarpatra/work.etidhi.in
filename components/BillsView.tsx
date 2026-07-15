"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import type { Bill, User } from "@/lib/types";

const STATUS_STYLES: Record<Bill["status"], { bg: string; label: string }> = {
  Pending: { bg: "#fdab3d", label: "Pending approval" },
  Reimbursed: { bg: "#00c875", label: "Reimbursed" },
  Rejected: { bg: "#df2f4a", label: "Rejected" },
};

function formatAmount(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function BillsView({
  initialBills,
  users,
  currentUserId,
  isAdmin,
}: {
  initialBills: Bill[];
  users: User[];
  currentUserId: number;
  isAdmin: boolean;
}) {
  const [bills, setBills] = useState(initialBills);
  const [showModal, setShowModal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<Bill | null>(null);
  const [form, setForm] = useState({ title: "", amount: "", category: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState<{ id: number; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  function pickPhoto(f: File | null) {
    setPhotoFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submitBill(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) {
      setError("Please attach a photo of the bill.");
      return;
    }
    setSaving(true);
    setError("");
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("amount", form.amount);
    fd.append("category", form.category);
    fd.append("photo", photoFile);
    const res = await fetch("/api/bills", { method: "POST", body: fd });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit bill.");
      return;
    }
    setBills((prev) => [data.bill, ...prev]);
    setShowModal(false);
    setForm({ title: "", amount: "", category: "" });
    pickPhoto(null);
  }

  async function patchBill(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    setRowError(null);
    const res = await fetch(`/api/bills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setRowError({ id, msg: data.error ?? "Action failed." });
      return;
    }
    setBills((prev) => prev.map((b) => (b.id === id ? data.bill : b)));
  }

  async function deleteBill(bill: Bill) {
    if (!confirm(`Delete bill "${bill.title}"?`)) return;
    setBusyId(bill.id);
    setRowError(null);
    const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setRowError({ id: bill.id, msg: data.error ?? "Could not delete." });
      return;
    }
    setBills((prev) => prev.filter((b) => b.id !== bill.id));
  }

  function rejectBill(bill: Bill) {
    const reason = prompt("Reason for rejecting (optional):") ?? "";
    patchBill(bill.id, { action: "reject", reason });
  }

  const pendingTotal = bills
    .filter((b) => b.status === "Pending")
    .reduce((s, b) => s + b.amount, 0);
  const reimbursedTotal = bills
    .filter((b) => b.status === "Reimbursed")
    .reduce((s, b) => s + b.amount, 0);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#323338]">Bills & Reimbursements</h1>
          <p className="mt-1 text-[#676879]">
            Upload a bill photo — once approved it is reimbursed automatically.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-[#6161ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5151d5]"
        >
          + Submit bill
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#d0d4e4] bg-white p-4">
          <div className="text-2xl font-bold text-[#fdab3d]">{formatAmount(pendingTotal)}</div>
          <div className="mt-0.5 text-xs text-[#676879]">Awaiting approval</div>
        </div>
        <div className="rounded-xl border border-[#d0d4e4] bg-white p-4">
          <div className="text-2xl font-bold text-[#00c875]">{formatAmount(reimbursedTotal)}</div>
          <div className="mt-0.5 text-xs text-[#676879]">Reimbursed</div>
        </div>
        <div className="rounded-xl border border-[#d0d4e4] bg-white p-4">
          <div className="text-2xl font-bold text-[#6161ff]">{bills.length}</div>
          <div className="mt-0.5 text-xs text-[#676879]">Total bills</div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {bills.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d0d4e4] bg-white p-10 text-center text-[#676879]">
            No bills yet. Submit your first bill with a photo to get reimbursed.
          </div>
        )}

        {bills.map((bill) => {
          const style = STATUS_STYLES[bill.status];
          const canDecide =
            bill.status === "Pending" &&
            bill.user_id !== currentUserId &&
            (isAdmin || bill.approver_id === currentUserId);
          return (
            <div key={bill.id} className="rounded-xl border border-[#d0d4e4] bg-white p-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => setViewPhoto(bill)}
                  title="View bill photo"
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#d0d4e4] transition hover:ring-2 hover:ring-[#6161ff]/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/bills/${bill.id}/photo`}
                    alt={`Bill: ${bill.title}`}
                    className="h-full w-full object-cover"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#323338]">{bill.title}</span>
                    <span className="text-lg font-bold text-[#323338]">
                      {formatAmount(bill.amount)}
                    </span>
                    {bill.category && (
                      <span className="rounded bg-[#f0f1f5] px-2 py-0.5 text-[11px] font-medium text-[#676879]">
                        {bill.category}
                      </span>
                    )}
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: style.bg }}
                    >
                      {style.label}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#676879]">
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar id={bill.user_id} name={bill.submitter_name} size={18} />
                      {bill.submitter_name}
                    </span>
                    <span>{bill.created_at.slice(0, 16).replace("T", " ")}</span>
                    {bill.status === "Reimbursed" && bill.ref_no && (
                      <span className="font-medium text-[#00c875]">
                        ✓ Auto-reimbursed · Ref {bill.ref_no}
                      </span>
                    )}
                    {bill.status === "Rejected" && (
                      <span className="text-[#df2f4a]">
                        Rejected{bill.reject_reason ? `: ${bill.reject_reason}` : ""}
                        {bill.approver_name ? ` (by ${bill.approver_name})` : ""}
                      </span>
                    )}
                  </div>

                  {/* Approver row */}
                  {bill.status === "Pending" && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {isAdmin ? (
                        <label className="flex items-center gap-2 text-xs text-[#676879]">
                          Approver:
                          <select
                            value={bill.approver_id ?? ""}
                            disabled={busyId === bill.id}
                            onChange={(e) =>
                              patchBill(bill.id, {
                                approverId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="rounded-lg border border-[#d0d4e4] bg-white px-2 py-1.5 text-xs text-[#323338]"
                          >
                            <option value="">Not assigned</option>
                            {users
                              .filter((u) => u.id !== bill.user_id)
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                  {u.role === "admin" ? " (admin)" : ""}
                                </option>
                              ))}
                          </select>
                        </label>
                      ) : (
                        <span className="text-xs text-[#676879]">
                          Approver:{" "}
                          <span className="font-medium text-[#323338]">
                            {bill.approver_name ?? "Not assigned yet"}
                          </span>
                        </span>
                      )}

                      {canDecide && (
                        <>
                          <button
                            onClick={() => patchBill(bill.id, { action: "approve" })}
                            disabled={busyId === bill.id}
                            className="rounded-lg bg-[#00c875] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#00a865] disabled:opacity-50"
                          >
                            ✓ Approve & reimburse
                          </button>
                          <button
                            onClick={() => rejectBill(bill)}
                            disabled={busyId === bill.id}
                            className="rounded-lg border border-[#df2f4a] px-3 py-1.5 text-xs font-semibold text-[#df2f4a] transition hover:bg-[#df2f4a]/10 disabled:opacity-50"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {rowError?.id === bill.id && (
                    <p className="mt-2 text-xs font-medium text-[#df2f4a]">{rowError.msg}</p>
                  )}
                </div>

                {bill.status !== "Reimbursed" &&
                  (bill.user_id === currentUserId || isAdmin) && (
                    <button
                      onClick={() => deleteBill(bill)}
                      disabled={busyId === bill.id}
                      title="Delete bill"
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-[#c5c7d0] transition hover:bg-[#df2f4a]/10 hover:text-[#df2f4a]"
                    >
                      🗑
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit bill modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="menu-pop w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#323338]">Submit a bill</h3>
            <p className="mt-1 text-sm text-[#676879]">
              Attach a clear photo of the bill. Once approved, reimbursement is automatic.
            </p>
            <form onSubmit={submitBill} className="mt-4 space-y-3">
              <input
                autoFocus
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What is this bill for? (e.g. Client lunch)"
                className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Amount (₹)"
                  className="w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-[#d0d4e4] bg-white px-3 py-2.5 text-sm text-[#323338]"
                >
                  <option value="">Category…</option>
                  {["Travel", "Food", "Office supplies", "Software", "Internet/Phone", "Other"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>

              <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[#d0d4e4] p-4 text-center transition hover:border-[#6161ff]">
                {preview ? (
                  <span className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Bill preview"
                      className="mx-auto max-h-40 rounded-lg object-contain"
                    />
                    <span className="mt-2 block text-xs text-[#6161ff]">
                      Click to change photo
                    </span>
                  </span>
                ) : (
                  <span className="block text-sm text-[#676879]">
                    📷 <span className="font-medium text-[#6161ff]">Upload bill photo</span>
                    <span className="mt-1 block text-xs">JPG, PNG, WEBP or GIF · max 5 MB</span>
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
                />
              </label>

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
                  {saving ? "Submitting…" : "Submit bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setViewPhoto(null)}
        >
          <div className="max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/bills/${viewPhoto.id}/photo`}
              alt={`Bill: ${viewPhoto.title}`}
              className="max-h-[80vh] rounded-xl object-contain"
            />
            <p className="mt-3 text-center text-sm text-white">
              {viewPhoto.title} · {formatAmount(viewPhoto.amount)} — click anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
