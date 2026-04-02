from datetime import datetime, timedelta, timezone

import jwt


def create_access_token(data: dict) -> str:
    from backend.config import get_settings

    s = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=s.jwt_expiry_hours)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, s.jwt_secret, algorithm=s.jwt_algorithm)


def verify_access_token(token: str) -> dict | None:
    from backend.config import get_settings

    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError:
        return None
