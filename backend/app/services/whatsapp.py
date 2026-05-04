"""
WhatsApp Business Cloud API integration via Meta's Graph API.
Sends template messages for booking confirmations and status updates.
Without credentials configured, messages are logged so dev never fails.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v19.0"


def _format_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    if phone.strip().startswith("+"):
        return digits
    return digits


def send_whatsapp_text(to_phone: str, body: str) -> bool:
    settings = get_settings()
    token = settings.whatsapp_token
    phone_id = settings.whatsapp_phone_number_id
    if not token or not phone_id:
        logger.info("[whatsapp skipped] To=%s Body=%s...", to_phone, body[:60])
        return False
    try:
        r = httpx.post(
            f"{GRAPH_API}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "messaging_product": "whatsapp",
                "to": _format_phone(to_phone),
                "type": "text",
                "text": {"body": body},
            },
            timeout=15.0,
        )
        r.raise_for_status()
        logger.info("[whatsapp] sent to %s", to_phone)
        return True
    except Exception as e:
        logger.warning("WhatsApp send failed: %s", e)
        return False


def send_whatsapp_interactive(to_phone: str, body: str, buttons: list[dict]) -> bool:
    """Send interactive button message (max 3 buttons)."""
    settings = get_settings()
    token = settings.whatsapp_token
    phone_id = settings.whatsapp_phone_number_id
    if not token or not phone_id:
        logger.info("[whatsapp interactive skipped] To=%s", to_phone)
        return False
    try:
        btn_rows = [{"type": "reply", "reply": {"id": b["id"], "title": b["title"]}} for b in buttons[:3]]
        r = httpx.post(
            f"{GRAPH_API}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "messaging_product": "whatsapp",
                "to": _format_phone(to_phone),
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": body},
                    "action": {"buttons": btn_rows},
                },
            },
            timeout=15.0,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.warning("WhatsApp interactive failed: %s", e)
        return False


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
    body = (
        f"Hi {patient_name}! Your appointment at *{clinic_name}* is recorded.\n\n"
        f"Service: {service_name}\n"
        f"When: {preferred_date} at {preferred_time}\n"
        f"Status: {status.upper()}\n\n"
        f"Track live: {tracking_url}\n\n"
        f"— Tenivra"
    )
    send_whatsapp_text(patient_phone, body)


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
    body = (
        f"New appointment request!\n\n"
        f"Patient: {patient_name} ({patient_phone})\n"
        f"Service: {service_name}\n"
        f"When: {preferred_date} at {preferred_time}\n\n"
        f"Open your Tenivra dashboard to confirm or reject."
    )
    send_whatsapp_interactive(
        clinic_phone,
        body,
        [
            {"id": f"confirm_{appointment_id}", "title": "Confirm"},
            {"id": f"reject_{appointment_id}", "title": "Reject"},
        ],
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
    body = (
        f"Hi {patient_name}, your appointment at *{clinic_name}* is now *{status.upper()}*.\n\n"
        f"Date: {preferred_date} at {preferred_time}\n"
        f"Track: {tracking_url}\n\n"
        f"— Tenivra"
    )
    send_whatsapp_text(patient_phone, body)
