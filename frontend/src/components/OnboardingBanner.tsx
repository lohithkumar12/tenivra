"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card } from "@/components/ui";

interface OnboardingState {
  onboarding_completed: boolean;
  has_doctors: boolean;
  has_services: boolean;
  has_open_days: boolean;
  public_clinic_url: string;
  brand_tagline: string;
}

export function OnboardingBanner() {
  const { token, user } = useAuth();
  const [st, setSt] = useState<OnboardingState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "clinic_admin") return;
    api.get<OnboardingState>("/api/clinic/onboarding", token).then(setSt).catch(() => setSt(null));
  }, [token, user]);

  useEffect(() => {
    const onDone = () => {
      if (!token) return;
      api.get<OnboardingState>("/api/clinic/onboarding", token).then(setSt).catch(() => {});
    };
    window.addEventListener("tenivra:onboarding-refresh", onDone);
    return () => window.removeEventListener("tenivra:onboarding-refresh", onDone);
  }, [token]);

  if (!st || st.onboarding_completed) return null;

  const checklist = [
    { ok: st.has_doctors, label: "Add at least one doctor", href: "/admin/doctors" },
    { ok: st.has_services, label: "Add at least one service", href: "/admin/services" },
    { ok: st.has_open_days, label: "Set clinic timings (open days)", href: "/admin/timings" },
  ];
  const allGreen = checklist.every(c => c.ok);

  const complete = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await api.post("/api/clinic/onboarding/complete", {}, token);
      setSt({ ...st, onboarding_completed: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-8 overflow-hidden border-brand-200/80 bg-gradient-to-r from-brand-50/90 via-white to-accent-50/80 p-0">
      <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Tenivra Pulse</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Finish launch checklist</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">{st.brand_tagline}</p>
          <ul className="mt-3 space-y-2">
            {checklist.map(c => (
              <li key={c.href} className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${c.ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {c.ok ? "✓" : "•"}
                </span>
                {c.ok ? (
                  <span className="text-slate-700">{c.label}</span>
                ) : (
                  <Link href={c.href} className="text-brand-700 font-semibold hover:underline">{c.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link href={st.public_clinic_url} target="_blank" className="text-center text-sm font-semibold text-brand-600 hover:underline">
            Preview public page →
          </Link>
          {allGreen && (
            <Button variant="gradient" size="md" onClick={complete} disabled={busy}>
              {busy ? "Saving…" : "Mark setup complete"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
