import os
import time
import hmac
import struct
import base64
import hashlib
import secrets
from typing import List, Tuple
from urllib.parse import quote


class MFAService:
    """
    RFC 6238 compliant Time-based One-Time Password (TOTP) Service.
    Compatible with Google Authenticator, Microsoft Authenticator, and 1Password.
    """

    INTERVAL = 30  # seconds
    DIGITS = 6

    @classmethod
    def generate_secret(cls) -> str:
        """Generates a cryptographically secure Base32 encoded 160-bit secret."""
        random_bytes = secrets.token_bytes(20)
        return base64.b32encode(random_bytes).decode("utf-8").replace("=", "")

    @classmethod
    def generate_totp_code(cls, secret: str, for_time: float = None) -> str:
        """Calculates the 6-digit TOTP token for a given timestamp."""
        if for_time is None:
            for_time = time.time()
        
        counter = int(for_time // cls.INTERVAL)
        counter_bytes = struct.pack(">Q", counter)

        # Pad base32 secret if necessary
        secret_padded = secret + "=" * ((8 - len(secret) % 8) % 8)
        key = base64.b32decode(secret_padded, casefold=True)

        mac = hmac.new(key, counter_bytes, hashlib.sha1).digest()
        offset = mac[-1] & 0x0F
        truncated = struct.unpack(">I", mac[offset:offset + 4])[0] & 0x7FFFFFFF
        code = truncated % (10 ** cls.DIGITS)
        return f"{code:0{cls.DIGITS}d}"

    @classmethod
    def verify_totp_code(cls, secret: str, user_code: str, window: int = 1) -> bool:
        """
        Verifies a user-provided 6-digit TOTP code against the secret.
        Allows a clock drift window of ±window intervals (e.g. ±30s).
        """
        user_code = user_code.strip()
        if len(user_code) != cls.DIGITS or not user_code.isdigit():
            return False

        now = time.time()
        for i in range(-window, window + 1):
            valid_code = cls.generate_totp_code(secret, now + (i * cls.INTERVAL))
            if hmac.compare_digest(valid_code, user_code):
                return True
        return False

    @classmethod
    def get_provisioning_uri(cls, secret: str, user_email: str, issuer: str = "WasteCare Civic Platform") -> str:
        """Generates the standard otpauth:// URL for scanning via mobile authenticator QR codes."""
        encoded_issuer = quote(issuer)
        encoded_email = quote(user_email)
        return f"otpauth://totp/{encoded_issuer}:{encoded_email}?secret={secret}&issuer={encoded_issuer}&algorithm=SHA1&digits={cls.DIGITS}&period={cls.INTERVAL}"

    @classmethod
    def generate_backup_codes(cls, count: int = 8) -> List[str]:
        """Generates emergency one-time recovery backup codes."""
        codes = []
        for _ in range(count):
            c = f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
            codes.append(c)
        return codes


mfa_service = MFAService()
