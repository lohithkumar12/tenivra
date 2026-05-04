"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Spinner } from "@/components/ui";

function SuccessInner() {
  const { slug } = useParams();
  const sp = useSearchParams();
  const status = sp.get("status") || "pending";
  const trackCode = sp.get("track") || "";

  const isConfirmed = status === "confirmed";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="max-w-md w-full p-6 sm:p-8 text-center">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 sm:mb-6 rounded-full flex items-center justify-center ${isConfirmed ? "bg-emerald-100" : "bg-brand-100"}`}>
          <svg className={`w-8 h-8 sm:w-10 sm:h-10 ${isConfirmed ? "text-emerald-600" : "text-brand-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={isConfirmed ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"} />
          </svg>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
          {isConfirmed ? "Appointment Confirmed!" : "Booking Received!"}
        </h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          {isConfirmed
            ? "Your appointment has been automatically confirmed. See you there!"
            : "Your appointment request is pending review. The clinic will confirm it shortly."}
        </p>

        {trackCode && (
          <div className="mt-5 sm:mt-6 bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-4 sm:p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Tracking Code</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-brand-700 tracking-widest break-all">{trackCode}</p>
            <p className="text-xs text-slate-500 mt-2">Share this code to let anyone check your appointment status.</p>
            <Link href={`/track/${trackCode}`} className="block mt-3">
              <Button variant="gradient" size="md" className="w-full">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Track Live Status
              </Button>
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link href={`/clinic/${slug}`} className="flex-1">
            <Button variant="secondary" className="w-full">Back to Clinic</Button>
          </Link>
          <Link href="/clinics" className="flex-1">
            <Button variant="ghost" className="w-full">Browse Clinics</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SuccessInner />
    </Suspense>
  );
}
