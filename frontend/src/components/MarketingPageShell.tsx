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
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Tenivra</Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-slate-300">
            <Link href="/clinics" className="hover:text-white hidden sm:inline">Find a Clinic</Link>
            <Link href="/login" className="hover:text-white">Sign In</Link>
            <Link href="/signup" className="px-3 sm:px-4 py-2 rounded-xl bg-white text-brand-700 font-semibold hover:bg-brand-50 text-xs sm:text-sm">
              List Your Clinic
            </Link>
          </div>
        </nav>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-300">{eyebrow}</p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold">{title}</h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">{subtitle}</p>
        </section>
      </header>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="legal-content bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-10">
          {children}
        </div>
      </section>
      <footer className="text-center py-8 text-xs text-slate-400">
        <Link href="/" className="text-brand-600 hover:underline font-medium">Tenivra</Link>
        {" "}&middot;{" "}
        <Link href="/terms" className="hover:text-slate-600">Terms</Link>
        {" "}&middot;{" "}
        <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
        {" "}&middot;{" "}
        <Link href="/contact" className="hover:text-slate-600">Contact</Link>
      </footer>
    </main>
  );
}
