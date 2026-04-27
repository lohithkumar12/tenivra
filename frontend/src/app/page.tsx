"use client";

import Link from "next/link";
import { Button, AnimatedCounter, GradientText } from "@/components/ui";

const FEATURES = [
  { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", title: "Multi-Tenant", desc: "Each clinic gets its own isolated workspace with separate data, branding, and configuration." },
  { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "Smart Assistant", desc: "Patients get instant answers about timings, fees, doctors, and services from your configured data." },
  { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Appointment Flow", desc: "Online booking requests land in your dashboard for instant approval or rejection." },
  { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", title: "Doctor Profiles", desc: "Showcase your doctors with specializations, availability, fees, and professional bios." },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: "Service Catalog", desc: "Define services with durations, fees, and linked doctors. Patients see a clean service menu." },
  { icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", title: "Fully Configurable", desc: "Timings, appointment rules, FAQs, walk-in policies — control every detail from one dashboard." },
];

const STEPS = [
  { num: "01", title: "Set Up Your Clinic", desc: "Add your doctors, services, timings, fees, and FAQs in minutes." },
  { num: "02", title: "Share Your Page", desc: "Get a unique clinic page link. Share via WhatsApp, QR code, or your website." },
  { num: "03", title: "Patients Book Instantly", desc: "Patients ask questions, view services, and request appointments — you approve from your dashboard." },
];

const STATS = [
  { value: 60, suffix: "s", label: "Setup Time" },
  { value: 0, suffix: "", label: "Hidden Fees", display: "Free" },
  { value: 24, suffix: "/7", label: "AI Assistant" },
  { value: 100, suffix: "%", label: "Your Data, Your Clinic" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-xl font-bold text-white hover:text-white/90 transition-colors">
            Tenivra
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/clinics" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Find a Clinic</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="gradient" size="sm">List Your Clinic</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center bg-surface-900 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-80" />
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float delay-300" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/10 text-sm text-brand-200 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Now live — free for early clinics
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight animate-fade-in-up">
            Your Clinic,{" "}
            <GradientText className="text-gradient-light">Automated</GradientText>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200 opacity-0">
            Define your services, timings, doctors, and rules once.
            Tenivra turns that into a patient-facing assistant that handles
            questions, appointments, and more.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-300 opacity-0">
            <Link href="/clinics">
              <Button variant="gradient" size="xl">Find a Clinic & Book</Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary" size="xl" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                List Your Clinic
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400 animate-fade-in-up delay-300 opacity-0">
            Patients book in seconds. Clinics get online in 60 seconds.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-16 z-20 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="glass-light rounded-2xl p-6 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-600">
                {"display" in s && s.display ? s.display : <AnimatedCounter value={s.value} suffix={s.suffix} />}
              </p>
              <p className="text-sm text-slate-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Everything Your Clinic Needs
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              One platform to manage your clinic and delight your patients. No tech skills required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover-lift animate-fade-in-up opacity-0 delay-${(i + 1) * 100}`}>
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              3 Easy Steps to Get Started
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
              Go from signup to live patient bookings in under 10 minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className={`relative animate-fade-in-up opacity-0 delay-${(i + 1) * 100}`}>
                <div className="text-6xl font-black text-brand-500/20 mb-2">{s.num}</div>
                <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <p className="text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 sm:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-400/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Ready to Automate Your Clinic?
              </h2>
              <p className="text-brand-200 text-lg mb-8 max-w-lg mx-auto">
                Set up your clinic in 60 seconds. Let patients book, ask questions, and get instant answers — all automated.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="xl" className="bg-white text-brand-700 hover:bg-brand-50 shadow-xl">Get Started Free</Button>
                </Link>
                <Link href="/clinic/sunrise-clinic">
                  <Button size="xl" variant="ghost" className="text-white border border-white/30 hover:bg-white/10">View Demo</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-900 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10">
            <div className="sm:col-span-2">
              <h3 className="text-xl font-bold mb-3">Tenivra</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                The multi-tenant SaaS platform that turns clinic data into automated patient experiences. Built for Indian clinics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up Free</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/clinic/sunrise-clinic" className="hover:text-white transition-colors">Live Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link href="/company" className="hover:text-white transition-colors">Company</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Tenivra. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
