"use client";

/**
 * Tenivra analytics — thin wrapper around PostHog.
 *
 * Activates only when NEXT_PUBLIC_POSTHOG_KEY is set; otherwise every method
 * is a safe no-op so the rest of the app never has to feature-flag analytics.
 *
 * Add your key in Vercel → Settings → Environment Variables to light it up.
 */

import { useEffect } from "react";
import posthog from "posthog-js";

let initialized = false;

function init() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
    autocapture: false,
  });
  initialized = true;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function track(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!initialized) init();
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identify(userId: string, traits: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!initialized) init();
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  if (!initialized) return;
  posthog.reset();
}

/** Mount once near the top of the tree — initializes PostHog client-side. */
export function AnalyticsProvider() {
  useEffect(() => {
    init();
  }, []);
  return null;
}

/** Standardized event names so the dashboard funnel stays consistent. */
export const Events = {
  LandingViewed: "landing_viewed",
  ClinicsDirectoryViewed: "clinics_directory_viewed",
  ClinicViewed: "clinic_viewed",
  ClinicSignupCompleted: "clinic_signup_completed",
  PatientSignupCompleted: "patient_signup_completed",
  LoginCompleted: "login_completed",
  BookingStarted: "booking_started",
  BookingCompleted: "booking_completed",
  AssistantMessage: "assistant_message",
} as const;
