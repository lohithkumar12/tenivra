"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Input, Spinner } from "@/components/ui";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api.post("/api/auth/reset-password", { token, new_password: password });
      router.push("/login");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="relative z-10 w-full max-w-md glass-light rounded-3xl p-8 text-center">
        <p className="text-slate-600 mb-4">Missing reset token. Open the link from your email.</p>
        <Link href="/forgot-password" className="text-brand-600 font-semibold hover:underline">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-md glass-light rounded-3xl p-8">
      <h1 className="text-xl font-bold text-slate-900 mb-2">Set new password</h1>
      <p className="text-sm text-slate-500 mb-6">Choose a strong password for your Tenivra account.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input label="New password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" variant="gradient" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-50" />
      <Suspense fallback={<Spinner />}>
        <ResetInner />
      </Suspense>
    </div>
  );
}
