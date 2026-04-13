import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
