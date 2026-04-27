"""
LLM-powered clinic assistant using OpenAI Chat Completions.

Falls back to rule-based `process_query` when OPENAI_API_KEY is missing or on API errors.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.schemas import AssistantResponse
from app.services.assistant import process_query

logger = logging.getLogger(__name__)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _fmt_timings_compact(timings: list[dict]) -> str:
    lines = []
    for t in sorted(timings, key=lambda x: x["day_of_week"]):
        day = DAY_NAMES[t["day_of_week"]] if t["day_of_week"] < 7 else f"Day {t['day_of_week']}"
        if t.get("is_open"):
            line = f"{day}: {t.get('open_time', '?')} – {t.get('close_time', '?')}"
            if t.get("break_start") and t.get("break_end"):
                line += f" (break {t['break_start']}–{t['break_end']})"
        else:
            line = f"{day}: Closed"
        lines.append(line)
    return "\n".join(lines)


def build_clinic_context_block(clinic_data: dict, slug: str) -> str:
    """Compact plain-text facts for the system prompt (token-efficient)."""
    prof = clinic_data.get("profile") or {}
    name = prof.get("name", "Clinic")
    parts = [
        f"Clinic name: {name}",
        f"Public booking path on this website: /clinic/{slug}/book",
    ]
    if prof.get("address"):
        parts.append(f"Address: {prof['address']}")
    if prof.get("city"):
        parts.append(f"City: {prof['city']}")
    if prof.get("phone"):
        parts.append(f"Phone: {prof['phone']}")
    if prof.get("email"):
        parts.append(f"Email: {prof['email']}")
    if prof.get("description"):
        parts.append(f"About: {prof['description']}")
    specs = prof.get("specializations") or []
    if specs:
        parts.append(f"Specializations: {', '.join(specs)}")

    docs = clinic_data.get("doctors") or []
    if docs:
        lines = []
        for d in docs:
            bits = [d.get("name", "Doctor")]
            if d.get("specialization"):
                bits.append(f"({d['specialization']})")
            if d.get("qualification"):
                bits.append(f"Qualifications: {d['qualification']}")
            days = ", ".join(d.get("available_days") or [])
            if days:
                bits.append(f"Usually available: {days}")
            if d.get("available_from") and d.get("available_to"):
                bits.append(f"Hours: {d['available_from']}–{d['available_to']}")
            if d.get("consultation_fee"):
                bits.append(f"Consultation fee hint: ₹{d['consultation_fee']}")
            lines.append(" • " + " ".join(bits))
        parts.append("Doctors:\n" + "\n".join(lines))

    svcs = clinic_data.get("services") or []
    if svcs:
        lines = []
        for s in svcs:
            sid = s.get("id", "")
            desc = (s.get("description") or "").strip()
            if len(desc) > 180:
                desc = desc[:180] + "…"
            line = (
                f" • id={sid} | {s.get('name', '')} | ₹{s.get('fee', 0)} | {s.get('duration_minutes', 30)} min"
            )
            if desc:
                line += f" | {desc}"
            lines.append(line)
        parts.append("Services (use exact names & fees when quoting):\n" + "\n".join(lines))

    faqs = clinic_data.get("faqs") or []
    if faqs:
        fq_lines = []
        for f in sorted(faqs, key=lambda x: x.get("sort_order", 0)):
            fq_lines.append(f"Q: {f.get('question','')}\nA: {f.get('answer','')}")
        parts.append("Official FAQs:\n" + "\n\n".join(fq_lines))

    timings = clinic_data.get("timings") or []
    if timings:
        parts.append("Clinic timings:\n" + _fmt_timings_compact(timings))

    rules = clinic_data.get("appointment_rules") or {}
    if rules:
        parts.append(
            "Appointment rules: "
            f"same-day booking {'allowed' if rules.get('allow_same_day') else 'not allowed'}; "
            f"minimum notice {rules.get('minimum_notice_hours', 2)} hours; "
            f"book up to {rules.get('max_advance_days', 30)} days ahead; "
            f"walk-ins {'allowed' if rules.get('walk_in_allowed') else 'not listed'}; "
            f"requests {'require staff approval before confirmation' if rules.get('manual_approval_required') else 'may auto-confirm'}."
        )

    return "\n\n".join(parts)


def _history_to_messages(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for h in history[-get_settings().assistant_max_history :]:
        role = h.get("role")
        content = (h.get("content") or "").strip()
        if not content or role not in ("user", "assistant"):
            continue
        out.append({"role": role, "content": content[:8000]})
    return out


def run_llm_assistant(
    slug: str,
    message: str,
    history: list[dict[str, Any]],
    clinic_data: dict,
) -> AssistantResponse | None:
    """
    Returns AssistantResponse on success, or None to signal caller should fall back.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        return None

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("openai package not installed; using rule-based assistant")
        return None

    ctx = build_clinic_context_block(clinic_data, slug)
    system = (
        "You are the friendly virtual receptionist for this healthcare clinic on the Tenivra platform.\n\n"
        "RULES:\n"
        "1. Answer ONLY using the clinic facts below. If something is not listed, say you do not have that "
        "detail and suggest calling the clinic phone number from the facts.\n"
        "2. Never invent doctors, prices, timings, or policies.\n"
        "3. Be concise (2–6 short paragraphs max unless the user asks for a list). Warm and professional.\n"
        "4. If the user writes in Hindi or another language, reply in the same language.\n"
        "5. For booking: explain they can use the Book Appointment page on this site (path given below). "
        "You cannot book for them in chat—direct them to that page with name, phone, preferred date/time, and service.\n"
        "6. Do not give medical diagnoses or treatment advice; suggest seeing a doctor for clinical concerns.\n\n"
        f"CLINIC FACTS:\n{ctx}"
    )

    client = OpenAI(api_key=settings.openai_api_key)
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages.extend(_history_to_messages(history))
    messages.append({"role": "user", "content": message.strip()[:8000]})

    resp = client.chat.completions.create(
        model=settings.assistant_model,
        messages=messages,
        temperature=0.5,
        max_tokens=900,
    )
    text = (resp.choices[0].message.content or "").strip()
    if not text:
        return None

    return AssistantResponse(message=text, type="llm", data={"model": settings.assistant_model})


def assistant_reply(
    slug: str,
    message: str,
    history: list[dict[str, Any]],
    clinic_data: dict,
) -> AssistantResponse:
    """Try LLM first; fall back to rule-based assistant."""
    try:
        llm = run_llm_assistant(slug, message, history, clinic_data)
        if llm:
            return llm
    except Exception as e:
        logger.warning("LLM assistant failed: %s", e, exc_info=False)

    return process_query(message, clinic_data)
