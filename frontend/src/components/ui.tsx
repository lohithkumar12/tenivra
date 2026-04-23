"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";

/* ── Button ──────────────────────────────────────────────────────────── */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg" | "xl";
}

const btnBase = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
const btnVariants: Record<string, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-md hover:shadow-lg",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-brand-500 shadow-sm hover:shadow-md",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md",
  ghost: "text-slate-600 hover:bg-slate-100 focus:ring-brand-500",
  gradient: "bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 text-white hover:opacity-90 focus:ring-brand-500 shadow-lg hover:shadow-xl glow-brand",
};
const btnSizes: Record<string, string> = {
  sm: "px-3.5 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
  xl: "px-8 py-4 text-lg",
};

export function Button({ variant = "primary", size = "md", className, children, ...p }: BtnProps) {
  return <button className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...p}>{children}</button>;
}

/* ── Input ───────────────────────────────────────────────────────────── */

interface InpProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }

export function Input({ label, error, className, ...p }: InpProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <input className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all shadow-sm", error && "border-red-500", className)} {...p} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Select ──────────────────────────────────────────────────────────── */

interface SelProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { value: string; label: string }[]; }

export function Select({ label, options, className, ...p }: SelProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none shadow-sm", className)} {...p}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────────────── */

interface TaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; }

export function Textarea({ label, className, ...p }: TaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all min-h-[80px] shadow-sm", className)} {...p} />
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────── */

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm", className)}>{children}</span>;
}

/* ── Card ────────────────────────────────────────────────────────────── */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "hover";
}

export function Card({ children, className, variant = "default", ...rest }: CardProps) {
  const variants: Record<string, string> = {
    default: "bg-white rounded-2xl border border-slate-100 shadow-sm",
    glass: "glass-light rounded-2xl",
    hover: "bg-white rounded-2xl border border-slate-100 shadow-sm hover-lift",
  };
  return <div className={cn(variants[variant], className)} {...rest}>{children}</div>;
}

/* ── Modal ───────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────────────── */

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-brand-200" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600 animate-spin" />
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────── */

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
      </div>
      <p className="text-slate-500">{message}</p>
    </div>
  );
}

/* ── Toggle ──────────────────────────────────────────────────────────── */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={cn("relative w-11 h-6 rounded-full transition-colors duration-200", checked ? "bg-brand-600" : "bg-slate-300")} onClick={() => onChange(!checked)}>
        <div className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200", checked && "translate-x-5")} />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

/* ── Animated Counter ────────────────────────────────────────────────── */

export function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const step = value / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Gradient Text ───────────────────────────────────────────────────── */

export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-gradient", className)}>{children}</span>;
}
