"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import type { SessionUser } from "@/lib/auth";

export default function Topbar({ user, onMenuToggle }: { user: SessionUser; onMenuToggle?: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pw.next !== pw.confirm) {
      setPwError("New passwords do not match.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setPwError(data.error ?? "Could not change password.");
      return;
    }
    setPwDone(true);
    setPw({ current: "", next: "", confirm: "" });
    setTimeout(() => {
      setShowPwModal(false);
      setPwDone(false);
    }, 1500);
  }

  const inputCls =
    "w-full rounded-md border border-[#e8e5e0] px-3 py-2 text-sm text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]/30";

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#e8e5e0]/60 px-3 md:px-4">
      <div className="flex items-center gap-2">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="flex h-7 w-7 items-center justify-center rounded text-[#787774] transition hover:bg-[#f1f1ef] md:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="hidden text-[13px] text-[#9b9a97] md:block">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-[#f1f1ef]"
        >
          <Avatar id={user.id} name={user.name} size={24} />
          <span className="text-sm text-[#37352f]">{user.name}</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="menu-pop absolute right-0 z-50 mt-1 w-48 rounded-lg border border-[#e8e5e0] bg-white py-1 shadow-lg">
              <div className="border-b border-[#e8e5e0]/60 px-3 py-2">
                <div className="text-sm font-medium text-[#37352f]">{user.name}</div>
                <div className="text-[11px] text-[#9b9a97]">{user.email}</div>
                <span className="mt-1 inline-block rounded bg-[#f1f1ef] px-1.5 py-0.5 text-[10px] font-medium text-[#787774]">
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowPwModal(true);
                  setPwError("");
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-[#37352f] transition hover:bg-[#f1f1ef]"
              >
                Change password
              </button>
              <button
                onClick={logout}
                className="w-full px-3 py-1.5 text-left text-sm text-[#e03e3e] transition hover:bg-[#f1f1ef]"
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>

      {showPwModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setShowPwModal(false)}
        >
          <div
            className="menu-pop w-full max-w-sm rounded-t-xl border border-[#e8e5e0] bg-white p-5 shadow-xl sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[#37352f]">Change password</h3>
            {pwDone ? (
              <p className="mt-4 rounded-md bg-[#4dab9a]/10 px-3 py-2.5 text-sm font-medium text-[#0f7b6c]">
                Password updated.
              </p>
            ) : (
              <form onSubmit={changePassword} className="mt-4 space-y-3">
                <input
                  autoFocus
                  required
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  placeholder="Current password"
                  className={inputCls}
                />
                <input
                  required
                  type="password"
                  minLength={6}
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  placeholder="New password (min 6 chars)"
                  className={inputCls}
                />
                <input
                  required
                  type="password"
                  minLength={6}
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  placeholder="Confirm new password"
                  className={inputCls}
                />
                {pwError && <p className="text-sm text-[#e03e3e]">{pwError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPwModal(false)}
                    className="rounded-md px-3 py-1.5 text-sm text-[#787774] hover:bg-[#f1f1ef]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-[#2383e2] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Update"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
