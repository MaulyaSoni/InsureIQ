from fastapi import Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from backend.auth.jwt_handler import verify_access_token
from backend.database.db import get_db
from backend.database.models import User
from typing import Optional, Union

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.query_params.get("token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == str(user_id), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def try_get_user_id_from_auth_header(request_or_header: Union[Request, Optional[str]]) -> str | None:
    token = None

    if hasattr(request_or_header, "query_params") and hasattr(request_or_header, "headers"):
        request = request_or_header
        token = request.query_params.get("token")
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
    else:
        auth_header = request_or_header
        if auth_header and isinstance(auth_header, str) and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None

    try:
        payload = verify_access_token(token)
        if not payload:
            return None
        return payload.get("sub")
    except Exception:
        return None