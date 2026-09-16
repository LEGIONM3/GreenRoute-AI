from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: Optional[str] = payload.get("sub")
    token_type: Optional[str] = payload.get("type")
    
    if user_id is None or token_type != "access":
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    allowed_roles = {"admin", "superadmin"}
    current_role = current_user.role.name.lower() if current_user.role else ""
    if current_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user


def require_permission(permission_code: str):
    """Dependency factory checking whether the authenticated user has a specific permission code."""
    def permission_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.has_permission(permission_code):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: requires '{permission_code}'"
        )
    return permission_dependency


def require_roles(*allowed_roles: str):
    """Dependency factory checking whether the user holds one of the allowed roles."""
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        user_roles = set()
        if current_user.role:
            user_roles.add(current_user.role.name)
        if current_user.roles:
            for r in current_user.roles:
                user_roles.add(r.name)
        if "SuperAdmin" in user_roles:
            return current_user
        if any(role in user_roles for role in allowed_roles):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: required role in {list(allowed_roles)}"
        )
    return role_dependency


def check_resource_ownership_or_admin(
    current_user: User,
    resource_owner_id: str,
    resource_municipality_id: Optional[str] = None
) -> bool:
    """ACL Guardrail: Citizen owns resource, MunicipalOperator oversees municipality, Admin/SuperAdmin is universal."""
    if current_user.role and current_user.role.name in ("Admin", "SuperAdmin"):
        return True
    if current_user.id == resource_owner_id:
        return True
    if current_user.role and current_user.role.name == "MunicipalOperator":
        if current_user.municipality_id and resource_municipality_id and current_user.municipality_id == resource_municipality_id:
            return True
    return False


def get_optional_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False))
) -> Optional[User]:
    if not token:
        return None
    try:
        return get_current_user(db=db, token=token)
    except Exception:
        return None
