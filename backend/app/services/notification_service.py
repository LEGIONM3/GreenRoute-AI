from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger("app.notifications")


class NotificationGateway:
    """
    Multi-Channel Citizen Notification Gateway.
    Delivers transactional updates via Email, SMS, WhatsApp, and WebPush.
    """

    def __init__(self):
        self._delivery_log: List[Dict[str, Any]] = []

    def dispatch(
        self,
        recipient: str,
        channel: str,  # "email", "sms", "whatsapp", "push"
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Dispatches an alert to the requested communication channel."""
        record = {
            "recipient": recipient,
            "channel": channel.lower(),
            "title": title,
            "message": message,
            "metadata": metadata or {},
            "status": "delivered",
            "timestamp": datetime.utcnow().isoformat()
        }

        # Simulated cloud carrier dispatch
        logger.info(f"[{channel.upper()}] Notification to {recipient}: {title} - {message}")
        self._delivery_log.append(record)
        return record

    def notify_report_status_update(
        self,
        recipient_email: str,
        report_id: str,
        new_status: str,
        admin_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Specific helper for civic sanitation complaint status updates."""
        title = f"WasteCare: Sanitation Report #{report_id[:8]} Updated to {new_status}"
        msg = f"Your report status is now '{new_status}'."
        if admin_notes:
            msg += f" Officer Note: {admin_notes}"
        return self.dispatch(recipient_email, "email", title, msg, {"report_id": report_id, "status": new_status})

    def get_recent_deliveries(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._delivery_log[-limit:]


notification_gateway = NotificationGateway()
