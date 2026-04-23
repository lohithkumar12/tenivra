"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Card } from "@/components/ui";

interface Msg { role: "user" | "assistant"; text: string; }

export default function AssistantPage() {
  const { slug } = useParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Hi! I can help you with clinic timings, services, doctor availability, and fees. What would you like to know?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs(prev => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(`/api/public/${slug}/assistant`, { message: text });
      setMsgs(prev => [...prev, { role: "assistant", text: res.message }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Ask Us</h2>
      <Card className="max-w-2xl flex flex-col" style={{ height: "480px" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-brand-600 text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"
              }`}>{m.text}</div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-400 px-4 py-2.5 rounded-2xl text-sm rounded-bl-md">Typing...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t p-3 flex gap-2">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            placeholder="Ask about timings, fees, doctors..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()}>Send</Button>
        </div>
      </Card>
    </div>
  );
}
