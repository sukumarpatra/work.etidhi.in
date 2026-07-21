"use client";

import { useState, useMemo } from "react";
import Avatar from "./Avatar";
import type { Bill, User } from "@/lib/types";

const STATUS_STYLES: Record<Bill["status"], { bg: string; text: string; label: string }> = {
  Pending: { bg: "#fdecc8", text: "#d9730d", label: "Pending" },
  Reimbursed: { bg: "#dbeddb", text: "#0f7b6c", label: "Reimbursed" },
  Rejected: { bg: "#ffe2dd", text: "#e03e3e", label: "Rejected" },
};

function formatAmount(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return d.slice(0, 10);
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Bill["status"]>("All");

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

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      const d = b.created_at.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [bills, statusFilter, dateFrom, dateTo]);

  const pendingTotal = bills.filter((b) => b.status === "Pending").reduce((s, b) => s + b.amount, 0);
  const reimbursedTotal = bills.filter((b) => b.status === "Reimbursed").reduce((s, b) => s + b.amount, 0);

  const payableSummary = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<number, { name: string; total: number; count: number }>();
    for (const b of bills) {
      if (b.status !== "Pending") continue;
      const existing = map.get(b.user_id);
      if (existing) {
        existing.total += b.amount;
        existing.count += 1;
      } else {
        map.set(b.user_id, { name: b.submitter_name, total: b.amount, count: 1 });
      }
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [bills, isAdmin]);

  const inputCls =
    "w-full rounded-md border border-[#e8e5e0] px-3 py-2 text-sm text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]/30";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">Bills & Reimbursements</h1>
          <p className="mt-1 text-[13px] text-[#9b9a97]">
            {isAdmin
              ? "Manage all submitted bills -- approve, reject, or track reimbursements."
              : "Submit bills and track your reimbursement status."}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full rounded-md bg-[#2383e2] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1b6ec2] sm:w-auto"
        >
          + Submit bill
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-lg border border-[#e8e5e0] p-4">
          <div className="text-xl font-bold text-[#d9730d]">{formatAmount(pendingTotal)}</div>
          <div className="mt-0.5 text-[12px] text-[#9b9a97]">Awaiting approval</div>
        </div>
        <div className="rounded-lg border border-[#e8e5e0] p-4">
          <div className="text-xl font-bold text-[#0f7b6c]">{formatAmount(reimbursedTotal)}</div>
          <div className="mt-0.5 text-[12px] text-[#9b9a97]">Reimbursed</div>
        </div>
        <div className="rounded-lg border border-[#e8e5e0] p-4">
          <div className="text-xl font-bold text-[#37352f]">{filteredBills.length}</div>
          <div className="mt-0.5 text-[12px] text-[#9b9a97]">
            {filteredBills.length === bills.length ? "Total bills" : `Showing of ${bills.length}`}
          </div>
        </div>
      </div>

      {isAdmin && payableSummary.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#9b9a97]">
            Payable to individuals
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {payableSummary.map(([userId, info]) => (
              <div
                key={userId}
                className="flex items-center gap-3 rounded-lg border border-[#e8e5e0] p-3"
              >
                <Avatar id={userId} name={info.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#37352f]">{info.name}</div>
                  <div className="text-[11px] text-[#9b9a97]">{info.count} pending</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-[#e03e3e]">{formatAmount(info.total)}</div>
                  <div className="text-[10px] font-medium uppercase text-[#e03e3e]/70">Payable</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-md border border-[#e8e5e0] bg-[#f7f6f3] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9b9a97]">Filter</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-[#e8e5e0] bg-white px-2 py-1 text-[12px] text-[#37352f]"
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Reimbursed">Reimbursed</option>
          <option value="Rejected">Rejected</option>
        </select>
        <div className="flex items-center gap-1">
          <label className="text-[12px] text-[#9b9a97]">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-[#e8e5e0] bg-white px-2 py-1 text-[12px] text-[#37352f]"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[12px] text-[#9b9a97]">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-[#e8e5e0] bg-white px-2 py-1 text-[12px] text-[#37352f]"
          />
        </div>
        {(dateFrom || dateTo || statusFilter !== "All") && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("All"); }}
            className="rounded-md px-2 py-1 text-[12px] text-[#2383e2] transition hover:bg-[#e8f0fe]"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {filteredBills.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#e8e5e0] p-8 text-center text-[13px] text-[#9b9a97]">
            {bills.length === 0
              ? "No bills yet. Submit your first bill with a photo to get reimbursed."
              : "No bills match the current filters."}
          </div>
        )}

        {filteredBills.map((bill) => {
          const style = STATUS_STYLES[bill.status];
          const canDecide =
            bill.status === "Pending" &&
            bill.user_id !== currentUserId &&
            (isAdmin || bill.approver_id === currentUserId);
          const canAcknowledge =
            bill.status === "Reimbursed" &&
            !bill.acknowledged_at &&
            bill.user_id === currentUserId;
          return (
            <div key={bill.id} className="rounded-lg border border-[#e8e5e0] p-4 transition hover:bg-[#fafaf8]">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setViewPhoto(bill)}
                  title="View bill photo"
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[#e8e5e0] transition hover:ring-2 hover:ring-[#2383e2]/30"
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
                    <span className="font-medium text-[#37352f]">{bill.title}</span>
                    <span className="text-base font-bold text-[#37352f]">{formatAmount(bill.amount)}</span>
                    {bill.category && (
                      <span className="rounded bg-[#f1f1ef] px-1.5 py-0.5 text-[11px] text-[#787774]">
                        {bill.category}
                      </span>
                    )}
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                    {bill.acknowledged_at && (
                      <span className="rounded bg-[#dbeddb] px-1.5 py-0.5 text-[11px] font-medium text-[#0f7b6c]">
                        Acknowledged
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#9b9a97]">
                    <span className="inline-flex items-center gap-1">
                      <Avatar id={bill.user_id} name={bill.submitter_name} size={16} />
                      <span className="text-[#787774]">{bill.submitter_name}</span>
                    </span>
                    <span>{formatDate(bill.created_at)}</span>
                    {bill.status === "Reimbursed" && bill.ref_no && (
                      <span className="text-[#0f7b6c]">Ref {bill.ref_no}</span>
                    )}
                    {bill.status === "Reimbursed" && bill.acknowledged_at && (
                      <span className="text-[#0f7b6c]">Acknowledged {formatDate(bill.acknowledged_at)}</span>
                    )}
                    {bill.status === "Rejected" && (
                      <span className="text-[#e03e3e]">
                        Rejected{bill.reject_reason ? `: ${bill.reject_reason}` : ""}
                        {bill.approver_name ? ` (by ${bill.approver_name})` : ""}
                      </span>
                    )}
                  </div>

                  {bill.status === "Pending" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isAdmin ? (
                        <label className="flex items-center gap-1.5 text-[12px] text-[#9b9a97]">
                          Approver:
                          <select
                            value={bill.approver_id ?? ""}
                            disabled={busyId === bill.id}
                            onChange={(e) =>
                              patchBill(bill.id, {
                                approverId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="rounded-md border border-[#e8e5e0] bg-white px-2 py-1 text-[12px] text-[#37352f]"
                          >
                            <option value="">Not assigned</option>
                            {users
                              .filter((u) => u.id !== bill.user_id)
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}{u.role === "admin" ? " (admin)" : ""}
                                </option>
                              ))}
                          </select>
                        </label>
                      ) : (
                        <span className="text-[12px] text-[#9b9a97]">
                          Approver: <span className="text-[#37352f]">{bill.approver_name ?? "Not assigned"}</span>
                        </span>
                      )}
                      {canDecide && (
                        <>
                          <button
                            onClick={() => patchBill(bill.id, { action: "approve" })}
                            disabled={busyId === bill.id}
                            className="rounded-md bg-[#0f7b6c] px-2.5 py-1 text-[12px] font-medium text-white transition hover:bg-[#0a6b5e] disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectBill(bill)}
                            disabled={busyId === bill.id}
                            className="rounded-md border border-[#e03e3e] px-2.5 py-1 text-[12px] font-medium text-[#e03e3e] transition hover:bg-[#ffe2dd] disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {canAcknowledge && (
                    <div className="mt-2">
                      <button
                        onClick={() => patchBill(bill.id, { action: "acknowledge" })}
                        disabled={busyId === bill.id}
                        className="rounded-md bg-[#2383e2] px-3 py-1 text-[12px] font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-50"
                      >
                        I received the payment
                      </button>
                    </div>
                  )}

                  {rowError?.id === bill.id && (
                    <p className="mt-1.5 text-[12px] text-[#e03e3e]">{rowError.msg}</p>
                  )}
                </div>

                {bill.status !== "Reimbursed" &&
                  (bill.user_id === currentUserId || isAdmin) && (
                    <button
                      onClick={() => deleteBill(bill)}
                      disabled={busyId === bill.id}
                      title="Delete bill"
                      className="shrink-0 rounded-md px-1.5 py-1 text-[13px] text-[#c3c2bf] transition hover:bg-[#ffe2dd] hover:text-[#e03e3e]"
                    >
                      &times;
                    </button>
                  )}
              </div>
            </div>
          );
        })}
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
            <h3 className="text-base font-semibold text-[#37352f]">Submit a bill</h3>
            <p className="mt-1 text-[13px] text-[#9b9a97]">
              Attach a clear photo. Once approved, reimbursement is automatic.
            </p>
            <form onSubmit={submitBill} className="mt-4 space-y-3">
              <input
                autoFocus
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What is this bill for?"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Amount"
                  className={inputCls}
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Category...</option>
                  {["Travel", "Food", "Office supplies", "Software", "Internet/Phone", "Other"].map(
                    (c) => <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>

              <label className="block cursor-pointer rounded-md border border-dashed border-[#e8e5e0] p-4 text-center transition hover:border-[#2383e2] hover:bg-[#f7f6f3]">
                {preview ? (
                  <span className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Bill preview" className="mx-auto max-h-32 rounded-md object-contain" />
                    <span className="mt-1.5 block text-[12px] text-[#2383e2]">Click to change</span>
                  </span>
                ) : (
                  <span className="block text-[13px] text-[#9b9a97]">
                    <span className="font-medium text-[#2383e2]">Upload bill photo</span>
                    <span className="mt-0.5 block text-[11px]">JPG, PNG, WEBP or GIF - max 5 MB</span>
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
                />
              </label>

              {error && <p className="text-[13px] text-[#e03e3e]">{error}</p>}
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
                  disabled={saving}
                  className="rounded-md bg-[#2383e2] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8"
          onClick={() => setViewPhoto(null)}
        >
          <div className="max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/bills/${viewPhoto.id}/photo`}
              alt={`Bill: ${viewPhoto.title}`}
              className="max-h-[80vh] rounded-lg object-contain"
            />
            <p className="mt-2 text-center text-[13px] text-white/80">
              {viewPhoto.title} &middot; {formatAmount(viewPhoto.amount)} -- click anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
