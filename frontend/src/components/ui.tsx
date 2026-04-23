"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

/* ── Button ──────────────────────────────────────────────────────────── */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const btnBase = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
const btnVariants: Record<string, string> = {
  primary:   "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-brand-500",
  danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  ghost:     "text-slate-600 hover:bg-slate-100 focus:ring-brand-500",
};
const btnSizes: Record<string, string> = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

export function Button({ variant = "primary", size = "md", className, children, ...p }: BtnProps) {
  return <button className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...p}>{children}</button>;
}

/* ── Input ───────────────────────────────────────────────────────────── */

interface InpProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }

export function Input({ label, error, className, ...p }: InpProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <input className={cn("w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition", error && "border-red-500", className)} {...p} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Select ──────────────────────────────────────────────────────────── */

interface SelProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { value: string; label: string }[]; }

export function Select({ label, options, className, ...p }: SelProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select className={cn("w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none bg-white", className)} {...p}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────────────── */

interface TaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; }

export function Textarea({ label, className, ...p }: TaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea className={cn("w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition min-h-[80px]", className)} {...p} />
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────── */

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", className)}>{children}</span>;
}

/* ── Card ────────────────────────────────────────────────────────────── */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>{children}</div>;
}

/* ── Modal ───────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────────────── */

export function Spinner() {
  return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>;
}

/* ── Empty state ─────────────────────────────────────────────────────── */

export function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-12 text-slate-500"><p>{message}</p></div>;
}

/* ── Toggle ──────────────────────────────────────────────────────────── */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={cn("relative w-11 h-6 rounded-full transition-colors", checked ? "bg-brand-600" : "bg-slate-300")} onClick={() => onChange(!checked)}>
        <div className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", checked && "translate-x-5")} />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}
