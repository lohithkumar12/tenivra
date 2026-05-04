import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact Us"
      title="We'd Love to Hear From You"
      subtitle="Whether you're a clinic owner, a patient, or just curious about Tenivra — reach out anytime."
    >
      <h2>General Inquiries</h2>
      <p>
        For questions about the product, onboarding, partnerships, or anything else, drop us an email at{" "}
        <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>. We typically respond within 24 hours.
      </p>

      <h2>For Clinic Owners</h2>
      <p>
        Interested in getting your clinic online? You can{" "}
        <Link href="/signup">create your clinic account here</Link> — it takes less than 60 seconds and is completely free during early access.
      </p>
      <p>
        If you'd like a walkthrough or have questions before signing up, feel free to email us and we'll schedule a quick call.
      </p>

      <h2>For Patients</h2>
      <p>
        If you need help with an appointment — rescheduling, cancellations, or medical queries — please contact your clinic directly using the phone number shown on the clinic's page.
      </p>
      <p>
        For issues with your Tenivra patient account (login problems, password reset, etc.), email us and we'll help you out.
      </p>

      <h2>Report a Problem</h2>
      <p>
        Found a bug or something not working right? Email us at{" "}
        <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a> with a description of what happened and we'll fix it as soon as possible.
      </p>
    </MarketingPageShell>
  );
}
