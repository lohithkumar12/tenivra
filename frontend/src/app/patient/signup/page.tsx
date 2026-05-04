"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button, Input } from "@/components/ui";

export default function PatientSignupPage() {
  const { patientSignup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await patientSignup(form);
      router.push("/clinics");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
          <div className="flex items-center gap-2">
            <Link href="/clinics">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 hidden sm:inline-flex">Find a Clinic</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 bg-hero-gradient opacity-60" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent-500/15 rounded-full blur-3xl animate-float delay-300" />

      <div className="flex-1 flex items-center justify-center pt-20 pb-12 px-4">
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="glass-light rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-7">
            <Link href="/" className="text-2xl font-bold text-gradient inline-block">Tenivra</Link>
            <h1 className="text-xl font-bold text-slate-800 mt-3">Create your patient account</h1>
            <p className="text-slate-500 text-sm mt-1">Book appointments and track them in one place.</p>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <Input
              label="Your Name"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="Your full name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
              required
            />
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={busy}>
              {busy ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6">
            Already have a patient account?{" "}
            <Link href="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
          <p className="text-xs text-slate-400 text-center mt-1">
            Are you a clinic?{" "}
            <Link href="/signup" className="text-brand-600 font-semibold hover:underline">List your clinic</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
