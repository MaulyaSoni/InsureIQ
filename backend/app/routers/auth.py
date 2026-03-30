from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, UserLoginRequest, UserOut, UserSignupRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(payload: UserSignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    settings = get_settings()
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expiry_hours * 3600,
        user=UserOut(id=user.id, email=user.email, name=user.name),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id, user.email)
    settings = get_settings()
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expiry_hours * 3600,
        user=UserOut(id=user.id, email=user.email, name=user.name),
    )
