import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function CompanyPage() {
  return (
    <MarketingPageShell
      eyebrow="Company"
      title="Built for clinics that want a simpler digital front desk"
      subtitle="Tenivra helps clinics publish a patient-ready page, answer common questions, and manage appointment requests without extra operational complexity."
    >
      <h2>About Tenivra</h2>
      <p>
        Tenivra is an early-stage clinic automation platform focused on Indian clinics.
        Our goal is to make it easy for clinics to get online, share one trusted link with
        patients, and reduce repetitive calls about timings, doctors, services, fees, and
        appointment availability.
      </p>
      <h2>What Makes Us Different</h2>
      <ul>
        <li>Each clinic gets its own branded public page and isolated workspace.</li>
        <li>Bookings are validated against clinic timings, doctor availability, and appointment rules.</li>
        <li>The assistant answers from clinic-configured data instead of generic internet information.</li>
        <li>Clinic admins, receptionists, patients, and platform admins have separate workspaces.</li>
      </ul>
      <h2>Current Stage</h2>
      <p>
        Tenivra is currently onboarding early clinics. Features and pricing may evolve as we
        learn from real clinic workflows and patient usage.
      </p>
    </MarketingPageShell>
  );
}
