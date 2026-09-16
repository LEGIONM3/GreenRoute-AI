from datetime import datetime, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    generate_secure_token
)
from app.core.deps import get_current_user
from app.models.user import User
from app.models.role import Role
from app.models.user_session import UserSession
from app.models.token_models import PasswordResetToken, EmailVerificationToken
from app.services.audit_service import log_activity
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserOut,
    SessionOut,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerificationRequest,
    UserProfileUpdate,
    PasswordChangeRequest
)

router = APIRouter()


def _format_user_out(user: User) -> dict:
    perms = list(user.get_all_permissions())
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "status": user.status,
        "last_login": user.last_login,
        "email_verified": user.email_verified,
        "phone_verified": user.phone_verified,
        "environmental_score": user.environmental_score,
        "is_active": user.is_active,
        "role": user.role,
        "municipality_id": user.municipality_id,
        "permissions": perms,
        "created_at": user.created_at
    }


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    target_role_name = payload.role_name.capitalize() if payload.role_name else "Citizen"
    if target_role_name in ("Admin", "SuperAdmin"):
        user_count = db.query(User).count()
        if user_count > 0:
            target_role_name = "Citizen"

    role = db.query(Role).filter(Role.name == target_role_name).first()
    if not role:
        role = Role(name=target_role_name, description=f"{target_role_name} role")
        db.add(role)
        db.commit()
        db.refresh(role)

    user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role_id=role.id,
        is_active=True,
        status="Active",
        email_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create verification token
    raw_verify_token = generate_secure_token()
    verify_rec = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_verify_token),
        expires_at=datetime.utcnow() + timedelta(days=2)
    )
    db.add(verify_rec)
    db.commit()

    ip = request.client.host if request.client else "unknown"
    log_activity(db, action="REGISTER", resource="user", user_id=user.id, ip_address=ip, details={"email": user.email, "role": role.name})

    return _format_user_out(user)


@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown Device")

    if not user or not verify_password(payload.password, user.hashed_password):
        log_activity(db, action="LOGIN_FAILED", resource="auth", details={"attempted_email": payload.email.lower()}, ip_address=ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active or user.status == "Suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or inactive"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate tokens with role & permissions
    perms = list(user.get_all_permissions())
    role_name = user.role.name if user.role else "Citizen"
    access_token = create_access_token(subject=user.id, role=role_name, permissions=perms)
    refresh_token = create_refresh_token(subject=user.id)

    # Persist session with refresh token hash
    session_rec = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        device_name=user_agent[:120],
        ip_address=ip,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session_rec)
    db.commit()

    log_activity(db, action="LOGIN_SUCCESS", resource="auth", user_id=user.id, ip_address=ip, details={"device": user_agent[:80]})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 900
    }


@router.post("/login/oauth", response_model=Token)
def login_oauth(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    perms = list(user.get_all_permissions())
    role_name = user.role.name if user.role else "Citizen"
    access_token = create_access_token(subject=user.id, role=role_name, permissions=perms)
    refresh_token = create_refresh_token(subject=user.id)

    ip = request.client.host if request.client else "unknown"
    session_rec = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        device_name="OAuth Client",
        ip_address=ip,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session_rec)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 900
    }


@router.post("/refresh", response_model=Token)
def refresh_token(
    request: Request,
    payload: Optional[RefreshTokenRequest] = None,
    refresh_token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Any:
    raw_token = (payload.refresh_token if payload else None) or refresh_token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing refresh_token in request body or query parameter"
        )
    token_payload = decode_token(raw_token)
    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Validate active session
    r_hash = hash_token(raw_token)
    session_rec = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.refresh_token_hash == r_hash,
        UserSession.is_revoked == False,
        UserSession.expires_at > datetime.utcnow()
    ).first()

    if not session_rec:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired"
        )

    # Token Rotation: Revoke old session and issue new session
    session_rec.is_revoked = True
    
    perms = list(user.get_all_permissions())
    role_name = user.role.name if user.role else "Citizen"
    new_access_token = create_access_token(subject=user.id, role=role_name, permissions=perms)
    new_refresh_token = create_refresh_token(subject=user.id)

    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Rotated Session")
    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(new_refresh_token),
        device_name=user_agent[:120],
        ip_address=ip,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_session)
    db.commit()

    log_activity(db, action="TOKEN_ROTATION", resource="auth", user_id=user.id, ip_address=ip)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": 900
    }


@router.post("/logout")
def logout(
    payload: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    r_hash = hash_token(payload.refresh_token)
    session_rec = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.refresh_token_hash == r_hash
    ).first()
    if session_rec:
        session_rec.is_revoked = True
        db.commit()

    log_activity(db, action="LOGOUT", resource="auth", user_id=current_user.id)
    return {"message": "Successfully logged out of this session"}


@router.post("/logout-all")
def logout_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Revokes all active sessions across all devices for the current user."""
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()

    log_activity(db, action="LOGOUT_ALL", resource="auth", user_id=current_user.id)
    return {"message": "Successfully logged out of all devices and active sessions"}


@router.get("/sessions", response_model=List[SessionOut])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).order_by(UserSession.created_at.desc()).all()
    return sessions


@router.post("/password-reset-request")
def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        raw_token = generate_secure_token()
        token_rec = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.add(token_rec)
        db.commit()

        ip = request.client.host if request.client else "unknown"
        log_activity(db, action="PASSWORD_RESET_REQUESTED", resource="auth", user_id=user.id, ip_address=ip)
        return {
            "message": "Password reset instructions generated.",
            "reset_token": raw_token
        }
    return {"message": "If an account exists with this email, reset instructions have been dispatched."}


@router.post("/password-reset-confirm")
def confirm_password_reset(
    payload: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    t_hash = hash_token(payload.token)
    token_rec = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == t_hash,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not token_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    user = token_rec.user
    user.hashed_password = get_password_hash(payload.new_password)
    token_rec.used = True
    # Revoke all previous user sessions on password change
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_revoked": True})
    db.commit()

    log_activity(db, action="PASSWORD_RESET_CONFIRMED", resource="auth", user_id=user.id)
    return {"message": "Password successfully reset. Please log in with your new password."}


@router.post("/verify-email")
def verify_email(
    payload: EmailVerificationRequest,
    db: Session = Depends(get_db)
) -> Any:
    t_hash = hash_token(payload.token)
    token_rec = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == t_hash,
        EmailVerificationToken.used == False,
        EmailVerificationToken.expires_at > datetime.utcnow()
    ).first()

    if not token_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    user = token_rec.user
    user.email_verified = True
    token_rec.used = True
    db.commit()

    log_activity(db, action="EMAIL_VERIFIED", resource="auth", user_id=user.id)
    return {"message": "Email address successfully verified!"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> Any:
    return _format_user_out(current_user)


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.municipality_id is not None:
        current_user.municipality_id = payload.municipality_id

    db.commit()
    db.refresh(current_user)

    log_activity(db, action="PROFILE_UPDATE", resource="user", user_id=current_user.id)
    return _format_user_out(current_user)


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed"
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    # Revoke sessions
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).update({"is_revoked": True})
    db.commit()

    log_activity(db, action="PASSWORD_CHANGE", resource="user", user_id=current_user.id)
    return {"message": "Password changed successfully. All active sessions invalidated."}
