import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Privacy Policy"
      title="How Tenivra handles information"
      subtitle="We collect only the information needed to run clinic pages, accounts, appointment workflows, and support."
    >
      <p><strong>Last updated:</strong> April 27, 2026</p>
      <h2>Information We Collect</h2>
      <ul>
        <li>Clinic details such as name, address, timings, doctors, services, fees, and FAQs.</li>
        <li>Account details such as name, email, phone number, role, and password hash.</li>
        <li>Appointment details such as patient name, contact details, selected service, date, time, and notes.</li>
        <li>Usage and technical information needed for security, debugging, and product improvement.</li>
      </ul>
      <h2>How We Use Information</h2>
      <p>
        We use information to operate the Tenivra platform, show clinic pages, route appointment
        requests, send notifications, help clinics manage their workflows, and improve reliability.
      </p>
      <h2>AI Assistant</h2>
      <p>
        The assistant uses clinic-configured information and patient questions to provide helpful
        responses. Users should not enter sensitive medical details unless needed for the clinic
        appointment workflow.
      </p>
      <h2>Data Sharing</h2>
      <p>
        We do not sell personal data. We may use trusted service providers for hosting, email,
        analytics, and AI processing where needed to operate the product.
      </p>
      <h2>Security</h2>
      <p>
        We use authentication, role-based access, password hashing, rate limiting, and tenant
        separation to protect platform data. No system is perfect, but we work to reduce risk.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy questions, contact us at <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>.
      </p>
    </MarketingPageShell>
  );
}
