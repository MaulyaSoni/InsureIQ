from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.auth.jwt_handler import create_access_token
from backend.auth.password import hash_password, verify_password
from backend.config import get_settings
from backend.database.db import get_db
from backend.database.models import User
from backend.schemas.auth import AuthResponse, LoginRequest, SignupRequest, TokenUserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "FIELD_VALIDATION_ERROR", "detail": "Email already registered", "field": "email"},
        )

    user = User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name or payload.email.split("@")[0],
        hashed_password=hash_password(payload.password),
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    settings = get_settings()
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expiry_hours * 3600,
        user=TokenUserOut(id=user.id, email=user.email, full_name=user.full_name),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "HTTP_ERROR", "detail": "Invalid credentials"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "HTTP_ERROR", "detail": "Account disabled"},
        )

    user.last_login = datetime.utcnow()
    db.add(user)
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email})
    settings = get_settings()
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expiry_hours * 3600,
        user=TokenUserOut(id=user.id, email=user.email, full_name=user.full_name),
    )


@router.get("/me", response_model=TokenUserOut)
def me(current: User = Depends(get_current_user)):
    return TokenUserOut(id=current.id, email=current.email, full_name=current.full_name)
