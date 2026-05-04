"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner, Button, Input } from "@/components/ui";
import Link from "next/link";

interface JourneyStep {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
  ts: string | null;
}

interface TrackingData {
  tracking_code: string;
  patient_name: string;
  service_name: string | null;
  doctor_name: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  preferred_date: string;
  preferred_time: string;
  status: string;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  journey: JourneyStep[];
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pending:   { color: "text-amber-600",   bg: "bg-amber-50",   icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  confirmed: { color: "text-emerald-600", bg: "bg-emerald-50", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  rejected:  { color: "text-red-600",     bg: "bg-red-50",     icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  completed: { color: "text-blue-600",    bg: "bg-blue-50",    icon: "M5 13l4 4L19 7" },
  cancelled: { color: "text-slate-500",   bg: "bg-slate-50",   icon: "M6 18L18 6M6 6l12 12" },
};

export default function TrackPage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [phone, setPhone] = useState("");
  const [cancelErr, setCancelErr] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!code) return;
    const fetchData = () => {
      fetch(`/api/track/${code}`)
        .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
        .then(setData)
        .catch(() => setError("Tracking code not found. Please check and try again."))
        .finally(() => setLoading(false));
    };
    fetchData();
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, [code]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Spinner />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Not Found</h1>
        <p className="text-slate-500 mb-6">{error}</p>
        <Link href="/" className="text-brand-600 font-semibold hover:underline">Go to Tenivra</Link>
      </div>
    </div>
  );

  const canCancel = data.status === "pending" || data.status === "confirmed";

  const handleCancel = async () => {
    setCancelErr("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setCancelErr("Enter a valid 10-digit phone number");
      return;
    }
    setCancelling(true);
    try {
      const r = await fetch(`/api/track/${code}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error(b?.detail || "Failed to cancel");
      }
      setData({ ...data, status: "cancelled", journey: [...data.journey.slice(0, 1), { key: "cancelled", label: "Cancelled", done: true, active: true, ts: new Date().toISOString() }] });
      setShowCancel(false);
      setPhone("");
    } catch (e: unknown) {
      setCancelErr(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  const sc = STATUS_CONFIG[data.status] || STATUS_CONFIG.pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 text-white">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link href="/" className="text-sm font-medium text-white/70 hover:text-white">Tenivra</Link>
          <h1 className="text-2xl font-extrabold mt-2">Appointment Tracker</h1>
          <p className="text-brand-200 mt-1 text-sm font-mono tracking-wider">#{data.tracking_code}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-4">
        {/* Status card */}
        <div className={`${sc.bg} rounded-2xl p-6 shadow-lg border border-white/50`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${sc.color} bg-white/80 flex items-center justify-center shadow-sm`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={sc.icon} />
              </svg>
            </div>
            <div>
              <p className={`text-xl font-extrabold ${sc.color}`}>{data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>
              <p className="text-sm text-slate-500">Current status</p>
            </div>
          </div>
        </div>

        {/* Journey tracker — pizza tracker style */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-lg text-slate-800 mb-6">Appointment Journey</h2>
          <div className="relative">
            {data.journey.map((step, i) => {
              const isLast = i === data.journey.length - 1;
              const isRejected = step.key === "rejected";
              const isCancelled = step.key === "cancelled";
              const dotColor = step.done
                ? isRejected ? "bg-red-500" : isCancelled ? "bg-slate-400" : "bg-emerald-500"
                : "bg-slate-200";
              const lineColor = step.done ? "bg-emerald-400" : "bg-slate-200";
              const pulseClass = step.active && step.done ? "animate-pulse" : "";

              return (
                <div key={step.key} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${dotColor} ${pulseClass} flex items-center justify-center shadow-md z-10`}>
                      {step.done && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          {isRejected ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            : isCancelled ? <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />}
                        </svg>
                      )}
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 min-h-[40px] ${lineColor}`} />}
                  </div>
                  <div className={`pb-8 ${step.done ? "" : "opacity-40"}`}>
                    <p className={`font-bold text-base ${step.active ? "text-brand-700" : "text-slate-700"}`}>{step.label}</p>
                    {step.ts && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(step.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at{" "}
                        {new Date(step.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointment details */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-12">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Appointment Details</h2>
          <div className="space-y-3 text-sm">
            <Row label="Patient" value={data.patient_name} />
            {data.clinic_name && <Row label="Clinic" value={data.clinic_name} />}
            {data.clinic_address && <Row label="Address" value={data.clinic_address} />}
            {data.service_name && <Row label="Service" value={data.service_name} />}
            {data.doctor_name && <Row label="Doctor" value={data.doctor_name} />}
            <Row label="Date" value={data.preferred_date} />
            <Row label="Time" value={data.preferred_time} />
            {data.admin_notes && <Row label="Clinic Note" value={data.admin_notes} />}
          </div>
          <p className="text-xs text-slate-400 mt-6 text-center">This page refreshes automatically every 15 seconds.</p>
        </div>

        {/* Cancel section */}
        {canCancel && !showCancel && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
            <p className="text-sm text-slate-500 mb-3">Need to cancel this appointment?</p>
            <Button variant="secondary" size="sm" onClick={() => setShowCancel(true)}>
              Cancel Appointment
            </Button>
          </div>
        )}

        {canCancel && showCancel && (
          <div className="mt-6 bg-red-50 rounded-2xl border border-red-100 p-6">
            <h3 className="font-bold text-red-800 mb-1">Cancel Appointment</h3>
            <p className="text-sm text-red-600 mb-4">
              To verify your identity, enter the phone number you used when booking.
            </p>
            <Input
              label="Phone number"
              type="tel"
              placeholder="Enter the phone used during booking"
              value={phone}
              onChange={e => { setPhone(e.target.value); setCancelErr(""); }}
            />
            {cancelErr && (
              <p className="text-sm text-red-600 mt-2 bg-red-100 px-3 py-2 rounded-lg">{cancelErr}</p>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={cancelling} className="flex-1">
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowCancel(false); setCancelErr(""); setPhone(""); }}>
                Go Back
              </Button>
            </div>
          </div>
        )}

        {data.status === "cancelled" && (
          <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-slate-500 text-sm">This appointment has been cancelled.</p>
          </div>
        )}

        <div className="h-12" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 text-right">{value}</span>
    </div>
  );
}
