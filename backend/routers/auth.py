from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.auth.jwt_handler import create_access_token
from backend.auth.password import hash_password, verify_password
from backend.database.db import get_db
from backend.database.models import User
from backend.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse
from backend.utils.errors import error_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        error_response(status.HTTP_400_BAD_REQUEST, "EMAIL_ALREADY_REGISTERED", "Email already registered", "email")

    user = User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()

    password_ok = False
    if user:
        try:
            password_ok = verify_password(payload.password, user.hashed_password)
        except Exception:
            password_ok = False

    if not user or not password_ok:
        error_response(status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials")
    
    if not user.is_active:
        error_response(status.HTTP_401_UNAUTHORIZED, "ACCOUNT_DISABLED", "Account disabled")

    user.last_login = datetime.utcnow()
    db.add(user)
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
    )


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user)):
    return UserResponse.model_validate(current)
