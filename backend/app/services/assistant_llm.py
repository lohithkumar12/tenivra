"""
LLM-powered clinic assistant using OpenAI Chat Completions.

Falls back to rule-based `process_query` when OPENAI_API_KEY is missing or on API errors.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.config import get_settings
from app.schemas import AssistantResponse, BookingPrefill
from app.services.assistant import process_query

logger = logging.getLogger(__name__)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

BOOKING_TOOL = {
    "type": "function",
    "function": {
        "name": "suggest_booking_handoff",
        "description": (
            "When the user wants to book or you have gathered service/doctor/date/time. "
            "Use ONLY service_id and doctor_id UUIDs copied exactly from clinic facts. "
            "Date YYYY-MM-DD, time HH:MM 24h. Tenivra will verify the slot is free."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "service_id": {"type": "string"},
                "doctor_id": {"type": "string"},
                "preferred_date": {"type": "string"},
                "preferred_time": {"type": "string"},
                "notes_for_staff": {"type": "string"},
            },
        },
    },
}


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
        "You are the AI receptionist for this clinic on Tenivra — a platform built for Indian clinics with "
        "**verified slots** (no double-booking at the same doctor & time), smart notifications, and Pulse onboarding. "
        "You are more capable than generic chatbots because you only use live clinic data.\n\n"
        "RULES:\n"
        "1. Answer ONLY using the clinic facts below. If missing, say so and suggest calling the clinic phone.\n"
        "2. Never invent doctors, prices, timings, or policies.\n"
        "3. Be concise. Warm and professional. If the user writes Hindi or another language, reply in that language.\n"
        "4. When someone is ready to book, call suggest_booking_handoff with real UUIDs from the facts. "
        "Remind them Tenivra will verify the slot against clinic hours before confirming.\n"
        "5. Do not diagnose or prescribe; encourage seeing a clinician for medical concerns.\n\n"
        f"CLINIC FACTS:\n{ctx}"
    )

    client = OpenAI(api_key=settings.openai_api_key)
    messages: list[Any] = [{"role": "system", "content": system}]
    messages.extend(_history_to_messages(history))
    messages.append({"role": "user", "content": message.strip()[:8000]})

    resp = client.chat.completions.create(
        model=settings.assistant_model,
        messages=messages,
        tools=[BOOKING_TOOL],
        tool_choice="auto",
        temperature=0.45,
        max_tokens=900,
    )
    msg = resp.choices[0].message
    text = (msg.content or "").strip()
    prefill: BookingPrefill | None = None
    tool_calls = getattr(msg, "tool_calls", None)
    if tool_calls:
        for tc in tool_calls:
            if tc.function.name == "suggest_booking_handoff":
                try:
                    raw = json.loads(tc.function.arguments or "{}")
                    data = {k: raw[k] for k in BookingPrefill.model_fields if k in raw and raw[k] not in (None, "")}
                    prefill = BookingPrefill(**data) if data else None
                except Exception as ex:
                    logger.debug("prefill parse: %s", ex)
        if not text:
            text = (
                "I've carried your choices from this chat to our booking page. Continue there to confirm — "
                "Tenivra checks clinic hours and blocks double-booked slots automatically."
            )

    if not text and not prefill:
        return None

    if not text:
        text = "Use the booking button below with the details we discussed."

    return AssistantResponse(
        message=text,
        type="llm",
        data={"model": settings.assistant_model},
        booking_prefill=prefill,
    )


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
