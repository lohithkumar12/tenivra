"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";

interface TrendPoint { date: string; clinics: number; patients: number; bookings: number; }
interface TopItem { name: string; count: number; }
interface ClinicInsights {
  id: string; name: string; slug: string;
  city: string | null;
  plan: string;
  subscription_status: string;
  monthly_price_cents: number;
  signed_up_at: string;
  days_active: number;
  total_bookings: number;
  bookings_last_window: number;
  pending_bookings: number;
  completed_bookings: number;
  doctors_count: number;
  services_count: number;
  last_booking_at: string | null;
  trend: TrendPoint[];
  top_services: TopItem[];
  top_doctors: TopItem[];
  admin_email: string | null;
}

const RANGE_OPTIONS = [
  { v: 7, label: "7d" },
  { v: 30, label: "30d" },
  { v: 90, label: "90d" },
  { v: 365, label: "1y" },
];
const PLANS = ["free", "starter", "pro", "enterprise"] as const;
const STATUSES = ["trial", "active", "past_due", "cancelled"] as const;
const PLAN_DEFAULTS: Record<string, number> = {
  free: 0, starter: 99900, pro: 299900, enterprise: 999900,
};

function formatINR(cents: number): string {
  const r = cents / 100;
  if (r === 0) return "Free";
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L/mo`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(0)}k/mo`;
  return `₹${r.toFixed(0)}/mo`;
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const seconds = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function MiniBarChart({ data }: { data: TrendPoint[] }) {
  const max = useMemo(() => Math.max(1, ...data.map(d => d.bookings)), [data]);
  const W = 800, H = 180, P = { l: 30, r: 10, t: 16, b: 24 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const barW = innerW / data.length * 0.7;
  const xAt = (i: number) => P.l + (i + 0.5) * (innerW / data.length);
  const yAt = (v: number) => P.t + innerH - (v / max) * innerH;
  const yTicks = [0, max / 2, max].map(v => Math.round(v));
  const xTickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={yAt(t)} y2={yAt(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
          <text x={P.l - 6} y={yAt(t) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = xAt(i);
        const y = yAt(d.bookings);
        const h = P.t + innerH - y;
        return (
          <g key={i}>
            <rect x={x - barW / 2} y={y} width={barW} height={Math.max(0, h)} rx="2" fill="#6366f1" opacity={d.bookings === 0 ? 0.15 : 0.9}>
              <title>{`${d.date}: ${d.bookings} booking(s)`}</title>
            </rect>
            {i % xTickEvery === 0 && (
              <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date.slice(5)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ClinicDrillDown() {
  const { id } = useParams() as { id: string };
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ClinicInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Plan editor state
  const [plan, setPlan] = useState("free");
  const [price, setPrice] = useState(0);
  const [status, setStatus] = useState("trial");
  const [city, setCity] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planMsg, setPlanMsg] = useState("");

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    api.get<ClinicInsights>(`/api/admin/clinics/${id}/insights?days=${days}`, token)
      .then(d => {
        setData(d);
        setPlan(d.plan);
        setPrice(d.monthly_price_cents);
        setStatus(d.subscription_status);
        setCity(d.city || "");
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, id, days]);

  const savePlan = async () => {
    if (!token) return;
    setSavingPlan(true); setPlanMsg("");
    try {
      await api.patch(`/api/admin/tenants/${id}`, {
        plan, monthly_price_cents: price, subscription_status: status, city: city || null,
      }, token);
      setPlanMsg("Saved.");
      setTimeout(() => setPlanMsg(""), 2000);
    } catch (e: unknown) {
      setPlanMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingPlan(false);
    }
  };

  const onPlanChange = (newPlan: string) => {
    setPlan(newPlan);
    setPrice(PLAN_DEFAULTS[newPlan] ?? 0);
  };

  if (loading && !data) return <Spinner />;
  if (err || !data) return <EmptyState message={err || "Clinic not found"} />;

  const conversionRate = data.total_bookings > 0
    ? Math.round((data.completed_bookings / data.total_bookings) * 100)
    : 0;
  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    trial: "bg-blue-100 text-blue-700",
    past_due: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-200 text-slate-600",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Link href="/super" className="text-sm text-brand-600 hover:underline">&larr; Back to dashboard</Link>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-500/30 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Clinic Insights</p>
            <h1 className="text-3xl font-extrabold mt-1">{data.name}</h1>
            <p className="text-slate-300 text-sm mt-1">
              <span className="capitalize">{data.plan}</span> plan ·
              {" "}<span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[data.subscription_status] || "bg-slate-100 text-slate-700"}`}>{data.subscription_status}</span>
              {" "}· {formatINR(data.monthly_price_cents)}
              {data.city && <> · {data.city}</>}
              {" "}· {data.days_active} days active
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/clinic/${data.slug}`} target="_blank">
              <Button variant="secondary" size="md" className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur">
                View public page
              </Button>
            </Link>
            {data.admin_email && (
              <a href={`mailto:${data.admin_email}`}>
                <Button variant="secondary" size="md" className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur">
                  Email admin
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Total bookings", value: data.total_bookings, accent: "from-brand-500 to-brand-700" },
          { label: `Last ${days}d bookings`, value: data.bookings_last_window, accent: "from-violet-500 to-purple-700" },
          { label: "Pending", value: data.pending_bookings, accent: "from-amber-500 to-orange-600" },
          { label: "Completed", value: data.completed_bookings, accent: "from-emerald-500 to-teal-600" },
          { label: "Doctors", value: data.doctors_count, accent: "from-pink-500 to-rose-600" },
          { label: "Services", value: data.services_count, accent: "from-cyan-500 to-blue-700" },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 text-white bg-gradient-to-br ${k.accent}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{k.label}</p>
            <p className="text-2xl font-extrabold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Booking trend</h2>
            <p className="text-sm text-slate-500">
              {data.last_booking_at ? `Last booking ${relativeTime(data.last_booking_at)}` : "No bookings yet."}
              {" "}· Conversion {conversionRate}% (completed / total)
            </p>
          </div>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map(o => (
              <button
                key={o.v}
                onClick={() => setDays(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${days === o.v ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <MiniBarChart data={data.trend} />
      </Card>

      {/* Top services / doctors / plan editor */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Top services</h3>
          {data.top_services.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No bookings yet</p>
          ) : (
            <ul className="space-y-2">
              {data.top_services.map(s => (
                <li key={s.name} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm text-slate-700 truncate">{s.name}</span>
                  <span className="text-sm font-bold text-slate-800">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Top doctors</h3>
          {data.top_doctors.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No bookings yet</p>
          ) : (
            <ul className="space-y-2">
              {data.top_doctors.map(d => (
                <li key={d.name} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm text-slate-700 truncate">{d.name}</span>
                  <span className="text-sm font-bold text-slate-800">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Plan & billing</h3>
            <Badge className="bg-slate-100 text-slate-600 text-[10px]">Stripe-ready</Badge>
          </div>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Plan</span>
              <select
                value={plan}
                onChange={e => onPlanChange(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 capitalize">
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Monthly price (paise)</span>
              <input
                type="number" min={0}
                value={price}
                onChange={e => setPrice(Number(e.target.value || 0))}
                className="w-full mt-1 border rounded-lg px-3 py-2"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">= {formatINR(price)}</span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Subscription status</span>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">City</span>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="w-full mt-1 border rounded-lg px-3 py-2"
              />
            </label>
            <Button variant="gradient" size="sm" className="w-full" onClick={savePlan} disabled={savingPlan}>
              {savingPlan ? "Saving..." : "Save"}
            </Button>
            {planMsg && <p className="text-xs text-emerald-600 text-center">{planMsg}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
