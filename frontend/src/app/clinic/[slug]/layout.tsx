"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { Spinner } from "@/components/ui";

interface Profile { name: string; slug: string; description: string; }

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;
  const path = usePathname();
  const [clinic, setClinic] = useState<Profile | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get<Profile>(`/api/public/${slug}/profile`).then(setClinic).catch(() => setErr(true));
  }, [slug]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">Clinic not found.</p>
    </div>
  );
  if (!clinic) return <Spinner />;

  const tabs = [
    { href: `/clinic/${slug}`,            label: "Home" },
    { href: `/clinic/${slug}/services`,   label: "Services" },
    { href: `/clinic/${slug}/doctors`,    label: "Doctors" },
    { href: `/clinic/${slug}/assistant`,  label: "Ask Us" },
    { href: `/clinic/${slug}/book`,       label: "Book" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-brand-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
          {clinic.description && <p className="text-brand-100 text-sm mt-1 line-clamp-2 max-w-xl">{clinic.description}</p>}
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto pb-px">
          {tabs.map(t => (
            <Link key={t.href} href={t.href}
              className={`px-4 py-2 rounded-t-lg text-sm whitespace-nowrap transition-colors ${
                path === t.href ? "bg-white text-brand-700 font-medium" : "text-brand-100 hover:bg-brand-600"
              }`}>{t.label}</Link>
          ))}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      <footer className="text-center py-6 text-xs text-slate-400">
        Powered by <Link href="/" className="text-brand-600 hover:underline">Tenivra</Link>
      </footer>
    </div>
  );
}
