"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import type { SessionUser } from "@/lib/auth";

export default function Topbar({ user }: { user: SessionUser }) {
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
    "w-full rounded-lg border border-[#d0d4e4] px-3.5 py-2.5 text-sm focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#d0d4e4] bg-white px-6">
      <div className="text-sm text-[#676879]">
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
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[#f6f7fb]"
        >
          <Avatar id={user.id} name={user.name} size={32} />
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight text-[#323338]">
              {user.name}
            </div>
            <div className="text-[11px] leading-tight text-[#676879]">{user.email}</div>
          </div>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="menu-pop absolute right-0 z-50 mt-1 w-52 rounded-xl border border-[#d0d4e4] bg-white py-1.5 shadow-xl">
              <div className="border-b border-[#f0f1f5] px-4 py-2 text-xs text-[#676879]">
                Signed in as <span className="font-medium text-[#323338]">{user.role}</span>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowPwModal(true);
                  setPwError("");
                }}
                className="w-full px-4 py-2 text-left text-sm text-[#323338] transition hover:bg-[#f6f7fb]"
              >
                Change password
              </button>
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-sm text-[#df2f4a] transition hover:bg-[#f6f7fb]"
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>

      {showPwModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPwModal(false)}
        >
          <div
            className="menu-pop w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#323338]">Change password</h3>
            {pwDone ? (
              <p className="mt-4 rounded-lg bg-[#00c875]/10 px-4 py-3 text-sm font-medium text-[#00764a]">
                ✓ Password updated.
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
                {pwError && <p className="text-sm text-[#df2f4a]">{pwError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPwModal(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#676879] hover:bg-[#f6f7fb]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#6161ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5151d5] disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Update password"}
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
