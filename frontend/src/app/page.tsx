"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-brand-700">Tenivra</span>
        <div className="flex gap-3">
          <Link href="/clinic/sunrise-clinic">
            <Button variant="ghost" size="sm">Demo Clinic</Button>
          </Link>
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
          Your clinic, <span className="text-brand-600">automated</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Define your services, timings, doctors, and rules once.
          Tenivra turns that into a patient-facing assistant that handles
          questions, appointments, and more — so your front desk can breathe.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/clinic/sunrise-clinic">
            <Button size="lg">See live demo</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">Admin dashboard</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { title: "Multi-tenant", desc: "Each clinic gets its own workspace — data is fully isolated." },
            { title: "Smart assistant", desc: "Patients get instant answers from your clinic's configured data." },
            { title: "Appointment flow", desc: "Online booking requests land in your dashboard for approval." },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-brand-700 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-slate-400">
        Tenivra &copy; {new Date().getFullYear()}. Built for clinic operators.
      </footer>
    </div>
  );
}
