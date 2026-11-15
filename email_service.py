"""
HostelCare Real Email Notification Service
Sends automated email notifications via SMTP (Gmail, Brevo, SendGrid, custom SMTP)
when hostel managers resolve resident issues.
"""

import json
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
EMAIL_CONFIG_FILE = BASE_DIR / "email_config.json"

DEFAULT_EMAIL_CONFIG = {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_password": "",
    "from_name": "HostelCare Administration",
    "from_email": "",
    "use_tls": True
}

def load_email_config():
    """Loads email configuration from file and environment variables."""
    config = DEFAULT_EMAIL_CONFIG.copy()
    if EMAIL_CONFIG_FILE.exists():
        try:
            with open(EMAIL_CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print(f"[EMAIL] Error reading email config: {e}")

    # Environment variable overrides (Standard for cloud platforms like Render)
    if os.environ.get("SMTP_HOST"):
        config["smtp_host"] = os.environ["SMTP_HOST"]
    if os.environ.get("SMTP_PORT"):
        try:
            config["smtp_port"] = int(os.environ["SMTP_PORT"])
        except ValueError:
            pass
    if os.environ.get("SMTP_USER"):
        config["smtp_user"] = os.environ["SMTP_USER"]
    if os.environ.get("SMTP_PASSWORD"):
        config["smtp_password"] = os.environ["SMTP_PASSWORD"]
    if os.environ.get("SMTP_FROM_NAME"):
        config["from_name"] = os.environ["SMTP_FROM_NAME"]
    if os.environ.get("SMTP_FROM_EMAIL"):
        config["from_email"] = os.environ["SMTP_FROM_EMAIL"]

    if not config["from_email"] and config["smtp_user"]:
        config["from_email"] = config["smtp_user"]

    return config

def save_email_config(new_config):
    """Saves updated email configuration."""
    config = load_email_config()
    config.update(new_config)
    with open(EMAIL_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    return config

def is_smtp_configured():
    """Checks whether SMTP credentials are set."""
    cfg = load_email_config()
    return bool(cfg.get("smtp_host") and cfg.get("smtp_user") and cfg.get("smtp_password"))

def send_resolution_email(recipient_email, recipient_name, reg_no, hostel, room_no, ticket_id, category, title, resolution_notes, resolved_by="Hostel Management"):
    """
    Sends an automated notification email to the student letting them know
    their reported hostel issue has been sorted out.
    """
    cfg = load_email_config()

    subject = f"[Resolved] Ticket #{ticket_id}: {title} has been sorted out - HostelCare"
    
    # 1. Plain text fallback
    plain_text = f"""Dear {recipient_name},

Great news! Your reported maintenance issue has been successfully resolved and sorted out by the hostel management team.

--- TICKET DETAILS ---
- Ticket ID: #{ticket_id}
- Hostel: {hostel}
- Room Number: {room_no}
- Registration No: {reg_no}
- Category: {category}
- Issue: {title}

--- RESOLUTION REMARKS ---
"{resolution_notes}"

Resolved By: {resolved_by}
Status: Resolved & Closed

The ticket has now been removed from the active maintenance list. If you continue experiencing issues, please log in to the resident portal to raise a new request.

Warm regards,
Hostel Management Office
Amethyst, Amber, Sapphire & Jasper Facilities
"""

    # 2. Rich HTML email template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hostel Issue Resolved</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
    .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: white; }}
    .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0; opacity: 0.9; font-size: 14px; }}
    .badge {{ display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 10px; }}
    .content {{ padding: 32px 24px; }}
    .resolved-box {{ background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px; }}
    .resolved-box h3 {{ margin: 0 0 6px; color: #065f46; font-size: 16px; display: flex; align-items: center; }}
    .resolved-box p {{ margin: 0; color: #047857; font-size: 13px; line-height: 1.5; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }}
    .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }}
    .details-table td.label {{ color: #64748b; font-weight: 600; width: 35%; }}
    .details-table td.value {{ color: #1e293b; font-weight: 500; }}
    .remarks-card {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }}
    .remarks-card h4 {{ margin: 0 0 8px; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
    .remarks-card p {{ margin: 0; color: #1e293b; font-size: 14px; font-style: italic; line-height: 1.6; }}
    .footer {{ background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
    .footer p {{ margin: 4px 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HostelCare</h1>
      <p>Campus Resident Issue Resolution Portal</p>
      <div class="badge">{hostel} Hostel • Room {room_no}</div>
    </div>
    <div class="content">
      <div class="resolved-box">
        <h3>&#10004; Issue Sorted Out & Resolved</h3>
        <p>Dear <strong>{recipient_name}</strong>, your maintenance complaint has been inspected, fixed, and verified by the hostel facilities team.</p>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Ticket ID</td>
          <td class="value"><strong style="color: #4f46e5; font-family: monospace;">#{ticket_id}</strong></td>
        </tr>
        <tr>
          <td class="label">Issue Title</td>
          <td class="value"><strong>{title}</strong></td>
        </tr>
        <tr>
          <td class="label">Category</td>
          <td class="value">{category}</td>
        </tr>
        <tr>
          <td class="label">Hostel & Room</td>
          <td class="value">{hostel} Hostel, Room {room_no}</td>
        </tr>
        <tr>
          <td class="label">Registration No</td>
          <td class="value" style="font-family: monospace;">{reg_no}</td>
        </tr>
        <tr>
          <td class="label">Status</td>
          <td class="value"><span style="color: #059669; font-weight: 700;">Resolved & Closed</span></td>
        </tr>
      </table>

      <div class="remarks-card">
        <h4>Warden & Technician Resolution Remarks</h4>
        <p>"{resolution_notes}"</p>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b; font-style: normal;">
          Resolved by: <strong>{resolved_by}</strong>
        </div>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
        This issue has now been officially removed from the active pending queue. If you still encounter problems, feel free to submit a new ticket through the HostelCare portal.
      </p>
    </div>
    <div class="footer">
      <p><strong>HostelCare Administration</strong></p>
      <p>Serving Amethyst, Amber, Sapphire, and Jasper Hostels</p>
      <p style="margin-top: 8px; font-size: 11px;">This is an automated notification sent to {recipient_email}.</p>
    </div>
  </div>
</body>
</html>
"""

    # If SMTP is not yet configured, gracefully log and return
    if not is_smtp_configured():
        msg = f"SMTP not configured (Simulated delivery logged). To send real emails, set SMTP_USER and SMTP_PASSWORD."
        print(f"[EMAIL SERVICE] {msg} -> Target: {recipient_email}")
        return False, msg

    try:
        from_email = cfg["from_email"]
        from_header = formataddr((cfg["from_name"], from_email))

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_header
        message["To"] = formataddr((recipient_name, recipient_email))

        # Attach text and HTML parts
        part1 = MIMEText(plain_text, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        # Connect to SMTP server
        host = cfg["smtp_host"]
        port = int(cfg["smtp_port"])
        use_tls = cfg.get("use_tls", True)

        if port == 465:
            # SSL connection
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=12) as server:
                server.login(cfg["smtp_user"], cfg["smtp_password"])
                server.sendmail(from_email, [recipient_email], message.as_string())
        else:
            # STARTTLS connection (Standard for port 587)
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(cfg["smtp_user"], cfg["smtp_password"])
                server.sendmail(from_email, [recipient_email], message.as_string())

        success_msg = f"Delivered to {recipient_email} via SMTP ({host})"
        print(f"[EMAIL SERVICE] SUCCESS: {success_msg}")
        return True, success_msg

    except Exception as e:
        error_msg = f"SMTP Error sending to {recipient_email}: {str(e)}"
        print(f"[EMAIL SERVICE ERROR] {error_msg}")
        return False, error_msg

def test_smtp_connection(test_email=None):
    """Verifies that the configured SMTP server and credentials work."""
    cfg = load_email_config()
    if not is_smtp_configured():
        return False, "SMTP username and password are required to test."

    try:
        host = cfg["smtp_host"]
        port = int(cfg["smtp_port"])
        use_tls = cfg.get("use_tls", True)

        if port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=10) as server:
                server.login(cfg["smtp_user"], cfg["smtp_password"])
        else:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(cfg["smtp_user"], cfg["smtp_password"])

        if test_email:
            send_resolution_email(
                recipient_email=test_email,
                recipient_name="Resident Test",
                reg_no="TEST001",
                hostel="Amethyst",
                room_no="101",
                ticket_id="TEST-999",
                category="Fan / Electrical",
                title="Test Issue Resolution Notification",
                resolution_notes="This is a test notification confirming that HostelCare real email delivery is active and working properly.",
                resolved_by="Hostel System Test"
            )

        return True, f"Successfully authenticated with SMTP server {host}:{port}"
    except Exception as e:
        return False, f"SMTP Connection Failed: {str(e)}"
