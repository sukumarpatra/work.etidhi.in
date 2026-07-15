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
    "w-full rounded-lg border border-[#d0d4e4] px-4 py-2.5 text-[15px] transition focus:border-[#6161ff] focus:ring-2 focus:ring-[#6161ff]/20";

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-gradient-to-br from-[#6161ff] via-[#5a4bdb] to-[#3d2fa8] p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Etidhi logo"
              className="h-full w-full object-cover"
              style={{ transform: "scale(1.55)", transformOrigin: "50% 38%" }}
            />
          </div>
          <span className="text-2xl font-semibold tracking-tight">Etidhi Work OS</span>
        </div>
        <div>
          <div className="mb-8 w-56 rounded-2xl bg-white p-4 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Etidhi — Collaborate. Solve. Differentiate." className="w-full" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            One platform for all of
            <br />
            Etidhi&apos;s work.
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Plan, track, and deliver projects together — boards, kanban, dashboards, and
            team activity in one place.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              ["Boards", "Organize any workflow"],
              ["Kanban", "Visualize progress"],
              ["Dashboards", "Track everything"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <div className="font-semibold">{t}</div>
                <div className="mt-1 text-xs text-white/70">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/60">© 2026 Etidhi. Internal use only.</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#f0f1f5] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Etidhi logo"
                className="h-full w-full object-cover"
                style={{ transform: "scale(1.55)", transformOrigin: "50% 38%" }}
              />
            </div>
            <span className="text-xl font-semibold">Etidhi Work OS</span>
          </div>

          {mode === "login" ? (
            <>
              <h2 className="text-3xl font-bold text-[#323338]">Welcome back</h2>
              <p className="mt-2 text-[#676879]">
                Sign in with your Etidhi account. Access is restricted to{" "}
                <span className="font-medium text-[#323338]">@etidhi.in</span> emails.
              </p>

              {notice && (
                <div className="mt-4 rounded-lg bg-[#00c875]/10 px-4 py-3 text-sm font-medium text-[#00764a]">
                  {notice}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#323338]">
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
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-[#323338]">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                        setNotice("");
                      }}
                      className="text-sm font-medium text-[#6161ff] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-[#df2f4a]/10 px-4 py-3 text-sm font-medium text-[#df2f4a]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#6161ff] py-3 font-semibold text-white transition hover:bg-[#5151d5] disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-[#323338]">Reset your password</h2>
              <p className="mt-2 text-[#676879]">
                Choose your preferred new password. An Etidhi admin will approve the request,
                and then you can sign in with it.
              </p>

              <form onSubmit={handleForgot} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#323338]">
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
                  <label className="mb-1.5 block text-sm font-medium text-[#323338]">
                    New password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#323338]">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat the new password"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-[#df2f4a]/10 px-4 py-3 text-sm font-medium text-[#df2f4a]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#6161ff] py-3 font-semibold text-white transition hover:bg-[#5151d5] disabled:opacity-60"
                >
                  {loading ? "Sending request…" : "Request password reset"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="w-full text-sm font-medium text-[#676879] hover:text-[#323338]"
                >
                  ← Back to sign in
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
