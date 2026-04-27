"""
Transactional notifications — email (Resend) + SMS (Twilio).
Without API keys, messages are logged so dev/staging never silently fails.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def _tenivra_email_shell(title: str, inner_html: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:16px;padding:20px 24px;color:#fff;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">Tenivra</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px;">{title}</div>
      <div style="font-size:13px;opacity:.9;margin-top:8px;">Smart clinic automation — verified slots, AI receptionist, instant updates.</div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:24px;margin-top:16px;box-shadow:0 4px 24px rgba(15,23,42,.06);color:#0f172a;font-size:15px;line-height:1.6;">
      {inner_html}
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:20px;">You received this because of an appointment on Tenivra.</p>
  </div>
</body></html>"""


def send_email_resend(to: str, subject: str, html: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.info("[email skipped] To=%s Subject=%s", to, subject)
        return False
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=15.0,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.warning("Resend email failed: %s", e)
        return False


def send_sms_twilio(to_e164: str, body: str) -> bool:
    settings = get_settings()
    sid = settings.twilio_account_sid
    token = settings.twilio_auth_token
    from_num = settings.twilio_from_number
    if not sid or not token or not from_num:
        logger.info("[sms skipped] To=%s Body=%s...", to_e164, body[:40])
        return False
    try:
        r = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            auth=(sid, token),
            data={"From": from_num, "To": to_e164, "Body": body},
            timeout=15.0,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.warning("Twilio SMS failed: %s", e)
        return False


def notify_booking_created(
    *,
    patient_email: Optional[str],
    patient_phone: str,
    patient_name: str,
    clinic_name: str,
    clinic_email: Optional[str],
    service_name: str,
    status: str,
    preferred_date: str,
    preferred_time: str,
    public_book_url: str,
):
    settings = get_settings()
    inner = f"""
      <p>Hi <strong>{patient_name}</strong>,</p>
      <p>Your appointment request at <strong>{clinic_name}</strong> is recorded.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;">Service</td><td style="font-weight:600;">{service_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">When</td><td style="font-weight:600;">{preferred_date} at {preferred_time}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="font-weight:600;">{status}</td></tr>
      </table>
      <p>This slot was checked against clinic hours — no double-booking at the same doctor &amp; time.</p>
      <p style="margin-top:20px;"><a href="{public_book_url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">View clinic page</a></p>
    """
    html = _tenivra_email_shell("Appointment request received", inner)
    subj = f"{clinic_name} — booking received ({preferred_date})"
    if patient_email:
        send_email_resend(patient_email, subj, html)
    if clinic_email:
        adm = f"""
          <p>New booking request from <strong>{patient_name}</strong> ({patient_phone}).</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr><td style="padding:6px 0;color:#64748b;">Service</td><td style="font-weight:600;">{service_name}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">When</td><td style="font-weight:600;">{preferred_date} {preferred_time}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="font-weight:600;">{status}</td></tr>
          </table>
          <p>Open your Tenivra dashboard to confirm or reschedule.</p>
        """
        send_email_resend(clinic_email, f"[Tenivra] New booking — {patient_name}", _tenivra_email_shell("New patient request", adm))

    # SMS — rough India format: assume +91 if digits only
    digits = "".join(c for c in patient_phone if c.isdigit())
    sms_to = patient_phone.strip()
    if len(digits) == 10:
        sms_to = f"+91{digits}"
    elif patient_phone.strip().startswith("+"):
        sms_to = patient_phone.strip()
    msg = f"{clinic_name}: Hi {patient_name}, we received your request for {preferred_date} {preferred_time}. Status: {status}. Powered by Tenivra."
    if len(msg) > 480:
        msg = msg[:477] + "..."
    send_sms_twilio(sms_to, msg)


def send_password_reset_email(to: str, name: str, reset_link: str) -> bool:
    inner = f"""
      <p>Hi <strong>{name}</strong>,</p>
      <p>We received a request to reset your Tenivra password. This link expires in one hour.</p>
      <p style="margin-top:20px;"><a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">Reset password</a></p>
      <p style="font-size:14px;color:#64748b;">If you did not ask for this, you can ignore this email.</p>
    """
    html = _tenivra_email_shell("Password reset", inner)
    return send_email_resend(to, "Reset your Tenivra password", html)


def notify_appointment_status_change(
    *,
    patient_email: Optional[str],
    patient_phone: str,
    patient_name: str,
    clinic_name: str,
    status: str,
    preferred_date: str,
    preferred_time: str,
):
    inner = f"""
      <p>Hi <strong>{patient_name}</strong>,</p>
      <p>Your appointment at <strong>{clinic_name}</strong> is now <strong>{status.upper()}</strong>.</p>
      <p>{preferred_date} at {preferred_time}</p>
      <p style="margin-top:16px;color:#64748b;font-size:14px;">Tenivra keeps patients and clinics in sync automatically.</p>
    """
    html = _tenivra_email_shell("Appointment updated", inner)
    if patient_email:
        send_email_resend(patient_email, f"{clinic_name} — appointment {status}", html)
    digits = "".join(c for c in patient_phone if c.isdigit())
    sms_to = f"+91{digits}" if len(digits) == 10 else patient_phone.strip()
    send_sms_twilio(sms_to, f"{clinic_name}: Your appointment on {preferred_date} is now {status}. — Tenivra")
