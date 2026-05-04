"use client";

import { useEffect, useRef } from "react";

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
  ts: number;
}

const SSE_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useSSE(
  path: string | null,
  token: string | null,
  onEvent: (evt: SSEEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!path || !token) return;

    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    function connect() {
      const url = `${SSE_BASE}${path}?token=${token}`;
      es = new EventSource(url);

      es.onmessage = (e) => {
        try {
          const parsed: SSEEvent = JSON.parse(e.data);
          onEventRef.current(parsed);
        } catch {}
      };

      es.onopen = () => {
        retryCount = 0;
        console.log("[SSE] connected to", path);
      };

      es.onerror = () => {
        es?.close();
        const delay = Math.min(1000 * 2 ** retryCount, 30000);
        retryCount++;
        console.log("[SSE] reconnecting in", delay, "ms");
        retryTimeout = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [path, token]);
}

const ALERT_FREQ = 880;
const ALERT_DURATION = 0.12;

export function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const notes = [ALERT_FREQ, ALERT_FREQ * 1.25, ALERT_FREQ * 1.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * ALERT_DURATION);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i + 1) * ALERT_DURATION);
      osc.start(ctx.currentTime + i * ALERT_DURATION);
      osc.stop(ctx.currentTime + (i + 1) * ALERT_DURATION);
    });
  } catch {}
}

export function requestBrowserNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "tenivra-" + Date.now(),
  });
  if (onClick) n.onclick = onClick;
}
