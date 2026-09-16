import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Union, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from passlib.context import CryptContext
from app.core.config import settings

# Argon2 is the primary enterprise-grade password hasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
# Legacy fallback for bcrypt hashes
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    if hashed_password.startswith("$argon2"):
        try:
            return ph.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
        except Exception:
            return False
    # Fallback to bcrypt for backward compatibility
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return ph.hash(password)


def hash_token(token: str) -> str:
    """Computes a SHA-256 hash for secure storage of refresh, reset, and verification tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_token() -> str:
    """Generates an unguessable cryptographic token for email verification and password resets."""
    return secrets.token_urlsafe(32)


def create_access_token(
    subject: Union[str, Any],
    role: Optional[str] = None,
    permissions: Optional[list] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
    }
    if role:
        to_encode["role"] = role
    if permissions is not None:
        to_encode["permissions"] = list(permissions)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "jti": secrets.token_hex(16)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None
