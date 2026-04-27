import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact Us"
      title="Talk to Tenivra"
      subtitle="Whether you are a clinic owner, receptionist, patient, or partner, we would be happy to hear from you."
    >
      <h2>Email</h2>
      <p>
        For product, onboarding, support, or partnership questions, email us at{" "}
        <a href="mailto:vemuboddupalli@gmail.com">vemuboddupalli@gmail.com</a>.
      </p>
      <h2>For Clinics</h2>
      <p>
        If you want to try Tenivra, you can create a clinic account and set up your public page
        in a few minutes.
      </p>
      <p>
        <Link href="/signup">Create your clinic account</Link>
      </p>
      <h2>For Patients</h2>
      <p>
        For appointment changes, cancellations, medical questions, or emergency help, please
        contact the clinic directly using the phone number shown on that clinic's public page.
      </p>
    </MarketingPageShell>
  );
}
