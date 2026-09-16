import time
from typing import Dict, Tuple, Optional, Any
from datetime import datetime, timedelta


class SecurityMonitor:
    """
    Real-time security telemetry, brute-force defense, and account lockout manager.
    Tracks failed attempts, IP anomaly metrics, and enforces lockouts.
    """

    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION_SECONDS = 15 * 60  # 15 minutes
    WINDOW_SECONDS = 10 * 60  # 10 minutes tracking window

    def __init__(self):
        # Maps email -> list of failed attempt timestamps
        self._failed_attempts: Dict[str, list] = {}
        # Maps email -> lockout expiry timestamp
        self._lockouts: Dict[str, float] = {}
        # Known IP reputation tracker: ip -> suspicious score
        self._ip_scores: Dict[str, int] = {}

    def is_locked_out(self, identifier: str) -> Tuple[bool, int]:
        """Returns (is_locked, remaining_seconds_locked)."""
        key = identifier.lower().strip()
        lock_until = self._lockouts.get(key)
        if not lock_until:
            return False, 0

        now = time.time()
        if now < lock_until:
            remaining = int(lock_until - now)
            return True, remaining
        else:
            # Lockout expired
            del self._lockouts[key]
            self._failed_attempts.pop(key, None)
            return False, 0

    def record_failed_attempt(self, identifier: str, ip_address: Optional[str] = None) -> Tuple[bool, int]:
        """
        Records an authentication failure.
        Returns (is_now_locked, attempts_remaining_or_lockout_duration).
        """
        key = identifier.lower().strip()
        now = time.time()

        # Update attempts
        attempts = self._failed_attempts.get(key, [])
        # Prune old attempts outside window
        attempts = [t for t in attempts if now - t < self.WINDOW_SECONDS]
        attempts.append(now)
        self._failed_attempts[key] = attempts

        # Update IP score
        if ip_address:
            self._ip_scores[ip_address] = self._ip_scores.get(ip_address, 0) + 1

        if len(attempts) >= self.MAX_FAILED_ATTEMPTS:
            self._lockouts[key] = now + self.LOCKOUT_DURATION_SECONDS
            return True, self.LOCKOUT_DURATION_SECONDS

        remaining_attempts = max(0, self.MAX_FAILED_ATTEMPTS - len(attempts))
        return False, remaining_attempts

    def reset_failures(self, identifier: str, ip_address: Optional[str] = None) -> None:
        """Resets failed attempt counters upon successful login."""
        key = identifier.lower().strip()
        self._failed_attempts.pop(key, None)
        self._lockouts.pop(key, None)
        if ip_address and ip_address in self._ip_scores:
            self._ip_scores[ip_address] = max(0, self._ip_scores[ip_address] - 1)

    def check_ip_reputation(self, ip_address: str) -> Dict[str, Any]:
        """Evaluates whether an IP address shows signs of credential stuffing or scanning."""
        score = self._ip_scores.get(ip_address, 0)
        is_suspicious = score > 20
        return {
            "ip": ip_address,
            "failed_count": score,
            "is_suspicious": is_suspicious,
            "risk_level": "high" if score > 30 else "medium" if score > 10 else "low"
        }


security_monitor = SecurityMonitor()
