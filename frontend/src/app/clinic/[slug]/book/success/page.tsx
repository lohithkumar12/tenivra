"use client";

import { Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import Link from "next/link";

function SuccessContent() {
  const { slug } = useParams();
  const status = useSearchParams().get("status") || "pending";

  return (
    <div className="flex items-center justify-center min-h-[50vh] animate-fade-in-up">
      <Card className="p-10 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg animate-pulse-glow" style={{ boxShadow: "0 0 30px rgba(34, 197, 94, 0.3)" }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold mb-3">Appointment Requested!</h2>
        <p className="text-slate-600 leading-relaxed">
          {status === "confirmed"
            ? "Your appointment has been confirmed. See you soon!"
            : "Your request has been submitted and is pending confirmation from the clinic."}
        </p>
        <p className="text-sm text-slate-400 mt-2 mb-8">The clinic will get back to you shortly.</p>
        <div className="flex justify-center gap-3">
          <Link href={`/clinic/${slug}`}><Button variant="secondary">Back to Clinic</Button></Link>
          <Link href={`/clinic/${slug}/book`}><Button variant="gradient">Book Another</Button></Link>
        </div>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
