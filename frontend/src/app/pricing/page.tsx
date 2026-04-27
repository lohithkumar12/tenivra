import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";

const plans = [
  {
    name: "Early Clinic",
    price: "Free",
    description: "For clinics helping us validate the product.",
    features: ["Public clinic page", "Doctors and services", "Verified booking requests", "AI assistant", "Admin dashboard"],
  },
  {
    name: "Starter",
    price: "Coming soon",
    description: "For clinics ready to use Tenivra with live patients.",
    features: ["Everything in Early Clinic", "Email notifications", "More customization", "Priority onboarding support"],
  },
  {
    name: "Growth",
    price: "Coming soon",
    description: "For multi-doctor clinics that need deeper reporting and support.",
    features: ["Advanced reports", "Receptionist workflows", "Priority support", "Future billing integrations"],
  },
];

export default function PricingPage() {
  return (
    <MarketingPageShell
      eyebrow="Pricing"
      title="Simple pricing while Tenivra grows"
      subtitle="Tenivra is currently free for selected early clinics. Paid plans will be introduced after early feedback and product validation."
    >
      <div className="grid md:grid-cols-3 gap-5 not-prose">
        {plans.map(plan => (
          <div key={plan.name} className="rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
            <p className="mt-2 text-3xl font-extrabold text-brand-600">{plan.price}</p>
            <p className="mt-3 text-sm text-slate-500">{plan.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {plan.features.map(feature => <li key={feature}>- {feature}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8">
        Want to try Tenivra for your clinic? <Link href="/signup">Create your clinic account</Link>
        {" "}or <Link href="/contact">contact us</Link> for onboarding help.
      </p>
    </MarketingPageShell>
  );
}
