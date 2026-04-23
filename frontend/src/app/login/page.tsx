"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, Input, Card } from "@/components/ui";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      router.push(user.role === "super_admin" ? "/super" : "/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand-700">Tenivra</Link>
          <p className="text-slate-500 mt-1">Sign in to your clinic dashboard</p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@clinic.com" required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>

        <div className="mt-6 pt-4 border-t text-center text-xs text-slate-400 space-y-1">
          <p>Clinic admin: <span className="font-mono">admin@sunriseclinic.in</span> / <span className="font-mono">admin123</span></p>
          <p>Super admin: <span className="font-mono">super@tenivra.com</span> / <span className="font-mono">super123</span></p>
        </div>
      </Card>
    </div>
  );
}
