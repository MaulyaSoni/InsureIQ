from pydantic import BaseModel, EmailStr, Field, computed_field, model_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def resolve_full_name(self):
        if self.full_name and self.full_name.strip():
            self.full_name = self.full_name.strip()
        elif self.name and self.name.strip():
            self.full_name = self.name.strip()
        else:
            self.full_name = self.email.split("@")[0]
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenUserOut(BaseModel):
    id: str
    email: str
    full_name: str

    @computed_field
    @property
    def name(self) -> str:
        return self.full_name


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: TokenUserOut
