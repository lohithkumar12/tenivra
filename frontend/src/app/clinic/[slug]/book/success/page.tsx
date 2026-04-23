"use client";

import { Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import Link from "next/link";

function SuccessContent() {
  const { slug } = useParams();
  const status = useSearchParams().get("status") || "pending";

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Appointment requested!</h2>
        <p className="text-slate-600 mb-1">
          {status === "confirmed"
            ? "Your appointment has been confirmed."
            : "Your request has been submitted and is pending confirmation from the clinic."}
        </p>
        <p className="text-sm text-slate-400 mb-6">The clinic will get back to you soon.</p>
        <div className="flex justify-center gap-3">
          <Link href={`/clinic/${slug}`}><Button variant="secondary">Back to clinic</Button></Link>
          <Link href={`/clinic/${slug}/book`}><Button>Book another</Button></Link>
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
