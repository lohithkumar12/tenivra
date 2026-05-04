import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      subtitle="Your privacy matters. Here's exactly what we collect, why, and how we protect it."
    >
      <p><strong>Last updated:</strong> May 4, 2026</p>

      <h2>What We Collect</h2>
      <p>We only collect information that's necessary to run the platform:</p>
      <ul>
        <li><strong>Clinic information</strong> — name, address, phone number, timings, doctors, services, fees, and FAQs that clinics enter to set up their profile.</li>
        <li><strong>Account information</strong> — name, email address, phone number, and an encrypted password when you create an account (clinic admin, receptionist, or patient).</li>
        <li><strong>Appointment details</strong> — patient name, phone number, email, selected service, preferred date and time, and any notes provided during booking.</li>
        <li><strong>Usage data</strong> — basic technical data like pages visited, device type, and error logs to help us improve the platform and fix bugs.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>Your information is used to:</p>
      <ul>
        <li>Display clinic profiles and services to patients</li>
        <li>Process and manage appointment bookings</li>
        <li>Send notifications via email, SMS, and WhatsApp</li>
        <li>Power the AI assistant with clinic-specific answers</li>
        <li>Improve platform reliability and user experience</li>
      </ul>

      <h2>AI Assistant</h2>
      <p>
        Our AI assistant uses information configured by clinics (services, timings, FAQs) to answer patient questions. We do not use patient conversations to train AI models. Please avoid sharing sensitive medical information in the chat unless it's required for the booking process.
      </p>

      <h2>Data Sharing</h2>
      <p>
        <strong>We do not sell your personal data.</strong> We may share data with trusted service providers (hosting, email delivery, SMS, WhatsApp messaging) strictly to operate the platform. These providers are bound by their own privacy and security standards.
      </p>

      <h2>Data Security</h2>
      <p>
        We take security seriously. Your data is protected with:
      </p>
      <ul>
        <li>Encrypted passwords (never stored in plain text)</li>
        <li>Role-based access control (clinic staff only see their own clinic's data)</li>
        <li>Secure HTTPS connections for all data transfer</li>
        <li>Rate limiting to prevent abuse</li>
      </ul>
      <p>
        No system is 100% secure, but we continuously work to protect your information and reduce risk.
      </p>

      <h2>Your Rights</h2>
      <p>
        You can request access to your data, ask for corrections, or request deletion of your account at any time by emailing us. We'll respond within 7 business days.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy-related questions or requests, email us at{" "}
        <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>.
      </p>
    </MarketingPageShell>
  );
}
