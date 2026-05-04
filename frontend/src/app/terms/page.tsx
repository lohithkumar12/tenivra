import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Terms of Service"
      title="Terms of Service"
      subtitle="Please read these terms carefully before using Tenivra. By using our platform, you agree to these terms."
    >
      <p><strong>Last updated:</strong> May 4, 2026</p>

      <h2>1. About Tenivra</h2>
      <p>
        Tenivra is a platform that helps clinics manage their online presence, accept appointment bookings, and communicate with patients through automated tools. We provide the technology — clinics provide the healthcare.
      </p>

      <h2>2. Who Can Use Tenivra</h2>
      <p>
        Tenivra is available to clinic owners, medical professionals, receptionists, and patients in India. By creating an account, you confirm that the information you provide is accurate and that you are authorized to use the platform for its intended purpose.
      </p>

      <h2>3. Medical Disclaimer</h2>
      <p>
        <strong>Tenivra is not a healthcare provider.</strong> We do not provide medical advice, diagnosis, or treatment. All medical information displayed on the platform is provided by the respective clinics. The AI assistant answers questions based on clinic-configured data and should not be treated as a substitute for professional medical advice.
      </p>
      <p>
        In case of a medical emergency, please call your local emergency number immediately.
      </p>

      <h2>4. Appointments</h2>
      <p>
        Appointment requests made through Tenivra are subject to confirmation by the clinic. A booking request does not guarantee an appointment. Clinics may accept, reschedule, or decline requests based on doctor availability, clinic hours, and their own policies.
      </p>

      <h2>5. Your Account</h2>
      <p>
        You are responsible for keeping your login credentials secure. Do not share your password or allow others to access your account. If you suspect unauthorized access, contact us immediately.
      </p>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Provide false or misleading information</li>
        <li>Attempt to access other users' accounts or clinic data</li>
        <li>Use the platform for any unlawful or harmful purpose</li>
        <li>Abuse, spam, or misuse the AI assistant</li>
        <li>Scrape, copy, or redistribute content from the platform</li>
      </ul>

      <h2>7. Changes to These Terms</h2>
      <p>
        We may update these terms as our platform evolves. When we make significant changes, we'll notify registered users. Continued use of Tenivra after changes are published means you accept the updated terms.
      </p>

      <h2>8. Contact</h2>
      <p>
        If you have questions about these terms, reach out to us at{" "}
        <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>.
      </p>
    </MarketingPageShell>
  );
}
