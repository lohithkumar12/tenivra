import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Terms & Conditions"
      title="Terms for using Tenivra"
      subtitle="These terms explain how clinics, patients, and visitors should use Tenivra."
    >
      <p><strong>Last updated:</strong> April 27, 2026</p>
      <h2>1. Use of Service</h2>
      <p>
        Tenivra provides software tools for clinic profile management, patient information
        display, AI-assisted answers, and appointment request workflows. Clinics are responsible
        for keeping their own information accurate and up to date.
      </p>
      <h2>2. Medical Disclaimer</h2>
      <p>
        Tenivra is not a hospital, clinic, doctor, or emergency medical service. Information
        shown on Tenivra is provided by clinics or generated from clinic-configured data. It
        should not replace professional medical advice, diagnosis, or treatment.
      </p>
      <h2>3. Appointments</h2>
      <p>
        Appointment requests are subject to clinic confirmation, rules, doctor availability,
        and operational constraints. Tenivra helps validate and route booking requests but does
        not guarantee medical service availability.
      </p>
      <h2>4. Accounts</h2>
      <p>
        Users must provide accurate information, keep passwords secure, and avoid unauthorized
        use of any account or clinic workspace.
      </p>
      <h2>5. Prohibited Use</h2>
      <p>
        Users may not misuse Tenivra, scrape data, attempt unauthorized access, abuse the AI
        assistant, or use the platform for unlawful, misleading, or harmful activity.
      </p>
      <h2>6. Changes</h2>
      <p>
        Tenivra may update features, pricing, and these terms as the product evolves. Continued
        use of the service means you accept the updated terms.
      </p>
    </MarketingPageShell>
  );
}
