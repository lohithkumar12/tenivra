"""
WhatsApp Business Cloud API integration via Meta's Graph API.

Uses pre-approved message templates for outbound (business-initiated) messages
and falls back to freeform text for messages within a 24-hour conversation window.
Without credentials configured, messages are logged so dev never fails.

Required templates to create in Meta WhatsApp Manager:
  - booking_confirmation  (params: patient_name, clinic_name, service, date_time, status, tracking_url)
  - appointment_status    (params: patient_name, clinic_name, status, date_time, tracking_url)
  - clinic_new_booking    (params: patient_name, patient_phone, service, date_time)

If templates aren't approved yet, falls back to freeform text (only works if
the recipient has messaged the business number in the last 24 hours).
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v21.0"


def _format_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    if phone.strip().startswith("+"):
        return digits
    return digits


def _get_credentials() -> tuple[str, str] | None:
    s = get_settings()
    if not s.whatsapp_token or not s.whatsapp_phone_number_id:
        return None
    return s.whatsapp_token, s.whatsapp_phone_number_id


def _send_request(phone_id: str, token: str, payload: dict) -> bool:
    try:
        r = httpx.post(
            f"{GRAPH_API}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"messaging_product": "whatsapp", **payload},
            timeout=15.0,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.warning("WhatsApp send failed: %s", e)
        return False


def send_whatsapp_template(
    to_phone: str,
    template_name: str,
    parameters: list[str],
    language: str = "en",
) -> bool:
    """Send a pre-approved template message (works for business-initiated conversations)."""
    creds = _get_credentials()
    if not creds:
        logger.info("[whatsapp template skipped] To=%s template=%s", to_phone, template_name)
        return False
    token, phone_id = creds
    components = []
    if parameters:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in parameters],
        })
    return _send_request(phone_id, token, {
        "to": _format_phone(to_phone),
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
            "components": components,
        },
    })


def send_whatsapp_text(to_phone: str, body: str) -> bool:
    """Send freeform text (only works within 24-hour conversation window)."""
    creds = _get_credentials()
    if not creds:
        logger.info("[whatsapp skipped] To=%s Body=%s...", to_phone, body[:60])
        return False
    token, phone_id = creds
    return _send_request(phone_id, token, {
        "to": _format_phone(to_phone),
        "type": "text",
        "text": {"body": body},
    })


def _send_with_template_fallback(
    to_phone: str,
    template_name: str,
    parameters: list[str],
    fallback_text: str,
) -> bool:
    """Try template first; if it fails (not approved yet), fall back to freeform text."""
    ok = send_whatsapp_template(to_phone, template_name, parameters)
    if not ok:
        logger.info("[whatsapp] template %s failed, trying freeform", template_name)
        return send_whatsapp_text(to_phone, fallback_text)
    return True


def notify_booking_whatsapp(
    *,
    patient_phone: str,
    patient_name: str,
    clinic_name: str,
    service_name: str,
    preferred_date: str,
    preferred_time: str,
    status: str,
    tracking_url: str,
):
    fallback = (
        f"Hi {patient_name}! Your appointment at *{clinic_name}* is recorded.\n\n"
        f"Service: {service_name}\n"
        f"When: {preferred_date} at {preferred_time}\n"
        f"Status: {status.upper()}\n\n"
        f"Track live: {tracking_url}\n\n"
        f"— Tenivra"
    )
    _send_with_template_fallback(
        patient_phone,
        "booking_confirmation",
        [patient_name, clinic_name, service_name, f"{preferred_date} at {preferred_time}", status.upper(), tracking_url],
        fallback,
    )


def notify_clinic_whatsapp(
    *,
    clinic_phone: Optional[str],
    patient_name: str,
    patient_phone: str,
    service_name: str,
    preferred_date: str,
    preferred_time: str,
    appointment_id: str,
):
    if not clinic_phone:
        return
    fallback = (
        f"New appointment request!\n\n"
        f"Patient: {patient_name} ({patient_phone})\n"
        f"Service: {service_name}\n"
        f"When: {preferred_date} at {preferred_time}\n\n"
        f"Open your Tenivra dashboard to confirm or reject."
    )
    _send_with_template_fallback(
        clinic_phone,
        "clinic_new_booking",
        [patient_name, patient_phone, service_name, f"{preferred_date} at {preferred_time}"],
        fallback,
    )


def notify_status_whatsapp(
    *,
    patient_phone: str,
    patient_name: str,
    clinic_name: str,
    status: str,
    preferred_date: str,
    preferred_time: str,
    tracking_url: str,
):
    fallback = (
        f"Hi {patient_name}, your appointment at *{clinic_name}* is now *{status.upper()}*.\n\n"
        f"Date: {preferred_date} at {preferred_time}\n"
        f"Track: {tracking_url}\n\n"
        f"— Tenivra"
    )
    _send_with_template_fallback(
        patient_phone,
        "appointment_status",
        [patient_name, clinic_name, status.upper(), f"{preferred_date} at {preferred_time}", tracking_url],
        fallback,
    )
