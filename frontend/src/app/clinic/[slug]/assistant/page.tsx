"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { track, Events } from "@/lib/analytics";
import { Button, Card } from "@/components/ui";

interface Msg { role: "user" | "assistant"; text: string; }

export default function AssistantPage() {
  const { slug } = useParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Hi — I'm your AI assistant for this clinic. Ask me anything about timings, doctors, services, fees, or how to book. I answer from this clinic's live profile (and you can always book below).",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const historyPayload = msgs.map(m => ({ role: m.role, content: m.text }));
    setInput("");
    setMsgs(prev => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await api.post<{ message: string; type?: string }>(
        `/api/public/${slug}/assistant`,
        { message: text, history: historyPayload },
      );
      track(Events.AssistantMessage, { slug, response_type: res.type ?? "text" });
      setMsgs(prev => [...prev, { role: "assistant", text: res.message }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ["What are your timings?", "What is the consultation fee?", "Which doctors are available?"];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">AI Assistant</h2>
          <p className="text-slate-500 text-sm mt-1">Powered by your clinic data — accurate, up-to-date answers.</p>
        </div>
        <Link href={`/clinic/${slug}/book`}>
          <Button variant="gradient" size="md" className="whitespace-nowrap shadow-lg shadow-brand-500/25">
            Book appointment
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl flex flex-col overflow-hidden" style={{ height: "520px" }}>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 mt-1">
                  AI
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl rounded-br-md shadow-md"
                  : "bg-white text-slate-700 rounded-2xl rounded-bl-md shadow-sm border border-slate-100"
              }`}>{m.text}</div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 mt-1">AI</div>
              <div className="bg-white text-slate-400 px-4 py-3 rounded-2xl rounded-bl-md text-sm shadow-sm border border-slate-100">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {msgs.length <= 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-white flex gap-2 overflow-x-auto">
            {suggestions.map(s => (
              <button key={s} type="button" onClick={() => { setInput(s); }} className="px-3 py-1.5 text-xs rounded-full border border-brand-200 text-brand-600 hover:bg-brand-50 whitespace-nowrap transition-colors font-medium">{s}</button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 p-4 flex gap-3 bg-white">
          <input
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-slate-50"
            placeholder="Ask about timings, fees, doctors..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={busy}
          />
          <Button variant="gradient" onClick={send} disabled={busy || !input.trim()}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </Button>
        </div>
      </Card>

      <p className="text-xs text-slate-400 mt-3 max-w-2xl">
        AI answers use this clinic&apos;s published information. For emergencies, call your local emergency number or visit the nearest hospital.
        Bookings are completed on the{" "}
        <Link href={`/clinic/${slug}/book`} className="text-brand-600 hover:underline font-medium">booking page</Link>.
      </p>
    </div>
  );
}
