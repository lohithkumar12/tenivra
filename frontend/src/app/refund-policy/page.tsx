import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function RefundPolicyPage() {
  return (
    <MarketingPageShell
      eyebrow="Cancellation & Refunds"
      title="Cancellation & Refund Policy"
      subtitle="Transparent policies for both clinics and patients using Tenivra."
    >
      <p><strong>Last updated:</strong> May 4, 2026</p>

      <h2>Current Pricing</h2>
      <p>
        Tenivra is currently <strong>free for all clinics</strong> during our early access period. No credit card is required, and no subscription fees are collected. This means there are no platform charges to refund at this stage.
      </p>

      <h2>When Paid Plans Launch</h2>
      <p>
        When we introduce paid plans in the future, clear pricing and refund terms will be displayed before any payment is processed. In general:
      </p>
      <ul>
        <li>Refund requests must be raised within <strong>7 days</strong> of payment</li>
        <li>Refunds will be processed to the original payment method within 5–10 business days</li>
        <li>Specific plans or offers may have different refund windows, which will be clearly stated</li>
      </ul>

      <h2>Appointment Cancellations</h2>
      <p>
        Patients can cancel appointments through their Tenivra dashboard or via the tracking page. Cancellation is free and instant on Tenivra.
      </p>
      <p>
        <strong>Important:</strong> If you paid a consultation fee directly to a clinic (in person, via UPI, or any other method), that payment is between you and the clinic. Tenivra does not process or control clinic service payments, and refunds for those must be handled directly with the clinic.
      </p>

      <h2>Clinic Account Cancellation</h2>
      <p>
        Clinic owners can stop using Tenivra at any time. During the free period, simply stop logging in — there are no cancellation fees or lock-in contracts. If you'd like your clinic data to be deleted, email us and we'll handle it within 7 business days.
      </p>

      <h2>Contact</h2>
      <p>
        For billing questions, refund requests, or account cancellations, email us at{" "}
        <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>.
      </p>
    </MarketingPageShell>
  );
}
