"""
Rule-based clinic assistant. Designed so an LLM or RAG layer can replace
process_query() later without changing the API contract.
"""

from app.schemas import AssistantResponse

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

TIMING_KW = {"timing", "timings", "time", "hours", "open", "close", "when", "schedule"}
FEE_KW = {"fee", "fees", "cost", "price", "charge", "charges", "consultation", "pay", "payment", "rate"}
DOC_KW = {"doctor", "doctors", "dr", "available", "specialist", "who"}
SVC_KW = {"service", "services", "treatment", "treatments", "offer", "procedure", "procedures", "what", "do"}
BOOK_KW = {"book", "booking", "appointment", "reserve", "schedule", "walk-in", "walkin", "slot"}


def _match_faq(msg_words: set[str], faqs: list[dict]) -> tuple[dict | None, int]:
    best, score = None, 0
    for faq in faqs:
        q_words = set(faq["question"].lower().split())
        overlap = len(q_words & msg_words)
        if overlap > score:
            score = overlap
            best = faq
    return best, score


def _fmt_timings(timings: list[dict]) -> str:
    lines = []
    for t in sorted(timings, key=lambda x: x["day_of_week"]):
        day = DAY_NAMES[t["day_of_week"]] if t["day_of_week"] < 7 else f"Day {t['day_of_week']}"
        if t["is_open"]:
            line = f"{day}: {t.get('open_time', '?')} – {t.get('close_time', '?')}"
            if t.get("break_start") and t.get("break_end"):
                line += f"  (break {t['break_start']}–{t['break_end']})"
        else:
            line = f"{day}: Closed"
        lines.append(line)
    return "\n".join(lines)


def process_query(message: str, clinic_data: dict) -> AssistantResponse:
    words = set(message.lower().split())

    faqs = clinic_data.get("faqs", [])
    best_faq, faq_score = _match_faq(words, faqs)

    if best_faq and faq_score >= 2:
        return AssistantResponse(message=best_faq["answer"], type="faq")

    if words & TIMING_KW:
        timings = clinic_data.get("timings", [])
        if not timings:
            return AssistantResponse(message="Clinic timings are not yet configured.", type="timings")
        return AssistantResponse(
            message=f"Here are our clinic timings:\n\n{_fmt_timings(timings)}",
            type="timings",
            data={"timings": timings},
        )

    if words & FEE_KW:
        svcs = clinic_data.get("services", [])
        docs = clinic_data.get("doctors", [])
        lines = [f"• {s['name']}: ₹{s['fee']} ({s['duration_minutes']} min)" for s in svcs]
        for d in docs:
            if d.get("consultation_fee"):
                lines.append(f"• Dr. {d['name']}: ₹{d['consultation_fee']} (consultation)")
        if not lines:
            return AssistantResponse(message="Fee information is not available yet.", type="fees")
        return AssistantResponse(message="Here are our fees:\n\n" + "\n".join(lines), type="fees", data={"services": svcs})

    if words & DOC_KW:
        docs = clinic_data.get("doctors", [])
        if not docs:
            return AssistantResponse(message="Doctor information is not available yet.", type="doctors")
        lines = []
        for d in docs:
            line = f"• {d['name']}"
            if d.get("specialization"):
                line += f" ({d['specialization']})"
            days = ", ".join(d.get("available_days", []))
            if days:
                line += f" — {days}"
            if d.get("available_from") and d.get("available_to"):
                line += f", {d['available_from']}–{d['available_to']}"
            lines.append(line)
        return AssistantResponse(message="Our doctors:\n\n" + "\n".join(lines), type="doctors", data={"doctors": docs})

    if words & SVC_KW:
        svcs = clinic_data.get("services", [])
        if not svcs:
            return AssistantResponse(message="Service information is not available yet.", type="services")
        lines = []
        for s in svcs:
            line = f"• {s['name']}"
            if s.get("description"):
                line += f" — {s['description']}"
            line += f"  (₹{s['fee']}, {s['duration_minutes']} min)"
            lines.append(line)
        return AssistantResponse(message="Here are our services:\n\n" + "\n".join(lines), type="services", data={"services": svcs})

    if words & BOOK_KW:
        return AssistantResponse(
            message="You can request an appointment through our booking page. Select a service, pick a date/time, and we'll confirm it.",
            type="booking",
        )

    if best_faq and faq_score >= 1:
        return AssistantResponse(message=best_faq["answer"], type="faq")

    name = clinic_data.get("profile", {}).get("name", "our clinic")
    return AssistantResponse(
        message=(
            f"Welcome to {name}! I can help you with:\n\n"
            "• Clinic timings\n• Services & fees\n• Doctor availability\n• Booking an appointment\n\n"
            "What would you like to know?"
        ),
        type="welcome",
    )
