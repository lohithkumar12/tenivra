import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function RefundPolicyPage() {
  return (
    <MarketingPageShell
      eyebrow="Refund Policy"
      title="Refunds and cancellations"
      subtitle="Tenivra is currently free for early clinics. This policy will apply when paid plans or paid add-ons are introduced."
    >
      <p><strong>Last updated:</strong> April 27, 2026</p>
      <h2>Current Early Access</h2>
      <p>
        Tenivra is currently offered free for selected early clinics. Since no subscription fee
        is currently collected through Tenivra, there are no platform subscription refunds at
        this stage.
      </p>
      <h2>Future Paid Plans</h2>
      <p>
        When paid plans are introduced, refund terms will be shown clearly before payment. In
        general, eligible refund requests should be raised within 7 days of payment unless a
        different period is specified for a particular plan or offer.
      </p>
      <h2>Clinic Service Payments</h2>
      <p>
        Any fees paid directly to clinics for consultations, procedures, or medical services are
        controlled by the respective clinic's own cancellation and refund policy. Tenivra does
        not process or guarantee clinic service refunds unless explicitly stated.
      </p>
      <h2>Contact</h2>
      <p>
        For billing or refund questions, contact <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>.
      </p>
    </MarketingPageShell>
  );
}
