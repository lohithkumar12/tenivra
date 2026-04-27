"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function MarketingPageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-surface-900 text-white">
        <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Tenivra</Link>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/login" className="hover:text-white">Sign In</Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl bg-white text-brand-700 font-semibold hover:bg-brand-50">
              List Your Clinic
            </Link>
          </div>
        </nav>
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-300">{eyebrow}</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold">{title}</h1>
          <p className="mt-5 text-lg text-slate-300 leading-relaxed">{subtitle}</p>
        </section>
      </header>
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 prose prose-slate max-w-none">
          {children}
        </div>
      </section>
    </main>
  );
}
