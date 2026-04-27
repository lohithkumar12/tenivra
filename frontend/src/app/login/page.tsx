"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homeForRole } from "@/lib/auth";
import { Button, Input } from "@/components/ui";
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
      router.push(homeForRole(user.role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-900 relative overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-xl font-bold text-white hover:text-white/90 transition-colors">
            Tenivra
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-hero-gradient opacity-60" />
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent-500/15 rounded-full blur-3xl animate-float delay-300" />

        <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-light rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <p className="text-slate-500">Sign in to your clinic dashboard</p>
          </div>

          <form onSubmit={handle} className="space-y-5">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@clinic.com" required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={busy}>
              {busy ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-brand-600 font-semibold hover:underline">Forgot password?</Link>
            </p>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 space-y-1">
            <p>
              Patient looking to book?{" "}
              <Link href="/patient/signup" className="text-brand-600 font-semibold hover:text-brand-700">Create a patient account</Link>
            </p>
            <p>
              New clinic?{" "}
              <Link href="/signup" className="text-brand-600 font-semibold hover:text-brand-700">List your clinic</Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">Try the Demo</p>
            <div className="bg-slate-50 rounded-xl p-3 text-xs">
              <p className="font-semibold text-slate-600 mb-1">Sample Clinic Admin</p>
              <p className="text-slate-400 font-mono">admin@sunriseclinic.in</p>
              <p className="text-slate-400 font-mono">admin123</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
