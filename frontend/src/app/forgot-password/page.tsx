"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    setBusy(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      setMsg("If an account exists for that email, we sent reset instructions.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-50" />
      <div className="relative z-10 w-full max-w-md glass-light rounded-3xl p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Forgot password</h1>
        <p className="text-sm text-slate-500 mb-6">We will email you a secure link (expires in 1 hour).</p>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">{msg}</p>}
          <Button type="submit" variant="gradient" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
