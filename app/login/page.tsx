"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setNotice(data.message ?? "Request received.");
      setMode("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-[#e8e5e0] px-3.5 py-2.5 text-sm text-[#37352f] placeholder:text-[#c3c2bf] transition focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]/30";

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#f7f6f3] p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Etidhi logo"
              className="h-full w-full object-cover"
              style={{ transform: "scale(1.55)", transformOrigin: "50% 38%" }}
            />
          </div>
          <span className="text-xl font-semibold text-[#37352f]">Etidhi</span>
        </div>
        <div>
          <div className="mb-8 w-48 rounded-xl bg-white p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Etidhi" className="w-full" />
          </div>
          <h1 className="text-4xl font-bold leading-tight text-[#37352f]">
            One platform for all of
            <br />
            Etidhi&apos;s work.
          </h1>
          <p className="mt-4 max-w-md text-[15px] text-[#787774]">
            Plan, track, and deliver projects together -- boards, kanban, dashboards, and
            team activity in one place.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              ["Boards", "Organize any workflow"],
              ["Kanban", "Visualize progress"],
              ["Dashboards", "Track everything"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-[#e8e5e0] bg-white p-3">
                <div className="text-sm font-semibold text-[#37352f]">{t}</div>
                <div className="mt-0.5 text-[11px] text-[#9b9a97]">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#c3c2bf]">&copy; 2026 Etidhi. Internal use only.</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#e8e5e0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Etidhi logo"
                className="h-full w-full object-cover"
                style={{ transform: "scale(1.55)", transformOrigin: "50% 38%" }}
              />
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Etidhi</span>
          </div>

          {mode === "login" ? (
            <>
              <h2 className="text-2xl font-bold text-[#37352f]">Welcome back</h2>
              <p className="mt-1.5 text-[13px] text-[#9b9a97]">
                Sign in with your @etidhi.in email.
              </p>

              {notice && (
                <div className="mt-4 rounded-md bg-[#dbeddb] px-3 py-2.5 text-sm text-[#0f7b6c]">
                  {notice}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-[#37352f]">
                    Work email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@etidhi.in"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-[13px] font-medium text-[#37352f]">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                        setNotice("");
                      }}
                      className="text-[13px] text-[#2383e2] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-[#ffe2dd] px-3 py-2.5 text-sm text-[#e03e3e]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[#2383e2] py-2.5 text-sm font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#37352f]">Reset your password</h2>
              <p className="mt-1.5 text-[13px] text-[#9b9a97]">
                Choose a new password. An admin will approve the request.
              </p>

              <form onSubmit={handleForgot} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-[#37352f]">
                    Work email
                  </label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@etidhi.in" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-[#37352f]">
                    New password
                  </label>
                  <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-[#37352f]">
                    Confirm new password
                  </label>
                  <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat the new password" className={inputCls} />
                </div>

                {error && (
                  <div className="rounded-md bg-[#ffe2dd] px-3 py-2.5 text-sm text-[#e03e3e]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[#2383e2] py-2.5 text-sm font-medium text-white transition hover:bg-[#1b6ec2] disabled:opacity-60"
                >
                  {loading ? "Sending request..." : "Request password reset"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="w-full text-[13px] text-[#9b9a97] hover:text-[#37352f]"
                >
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
