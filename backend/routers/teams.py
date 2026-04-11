from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.database.db import get_db
from backend.database.models import AuditLog, Organization, Policy, User, UserRole
from backend.auth.password import hash_password

router = APIRouter(prefix="/teams", tags=["teams"], dependencies=[Depends(get_current_user)])


class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class PlanEnum(str, Enum):
    TRIAL = "TRIAL"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum = RoleEnum.ANALYST


class UpdateRoleRequest(BaseModel):
    role: RoleEnum


def _require_admin(user: User) -> None:
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN", "detail": "Admin role required"})


def _require_manager_or_admin(user: User) -> None:
    if user.role not in (UserRole.ADMIN.value, UserRole.MANAGER.value):
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN", "detail": "Manager or Admin role required"})


def _require_active_org(user: User, db: Session) -> Organization:
    if not user.organization_id:
        raise HTTPException(status_code=400, detail={"error": "NO_ORGANIZATION", "detail": "User is not part of any organization"})
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(status_code=400, detail={"error": "ORG_NOT_FOUND", "detail": "Organization not found"})
    return org


@router.post("/invite")
def invite_member(
    payload: InviteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)

    if not user.organization_id:
        raise HTTPException(status_code=400, detail={"error": "NO_ORGANIZATION", "detail": "Admin must belong to an organization"})

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail={"error": "CONFLICT", "detail": "User with this email already exists"})

    temp_password = str(uuid.uuid4())[:12]
    hashed = hash_password(temp_password)

    new_user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hashed,
        is_active=True,
        organization_id=user.organization_id,
        role=payload.role.value,
        invited_by=user.id,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)

    print(f"[INSUREIQ] Invitation sent to {payload.email}")
    print(f"[INSUREIQ] Temp password: {temp_password}")
    print(f"[INSUREIQ] Role: {payload.role.value}")
    print(f"[INSUREIQ] Organization: {user.organization_id}")

    db.commit()
    db.refresh(new_user)

    return {
        "message": "Invitation sent",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "temp_password": temp_password,
    }


@router.get("/members")
def list_members(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_manager_or_admin(user)

    if not user.organization_id:
        raise HTTPException(status_code=400, detail={"error": "NO_ORGANIZATION", "detail": "User is not part of any organization"})

    members = db.query(User).filter(User.organization_id == user.organization_id).all()

    results = []
    for m in members:
        policy_count = db.query(Policy).filter(Policy.user_id == m.id, Policy.is_active.is_(True)).count()
        decisions_count = 0

        results.append({
            "id": m.id,
            "email": m.email,
            "full_name": m.full_name,
            "role": m.role,
            "is_active": m.is_active,
            "last_login": m.last_login.isoformat() if m.last_login else None,
            "policy_count": policy_count,
            "invited_by": m.invited_by,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    results.sort(key=lambda x: x["created_at"] or "")
    return {"total": len(results), "members": results}


@router.put("/members/{user_id}/role")
def update_member_role(
    user_id: str,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)

    target = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not target:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Target user not found"})

    if target.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN", "detail": "Cannot modify users outside your organization"})

    if target.id == user.id:
        raise HTTPException(status_code=400, detail={"error": "SELF_MODIFICATION", "detail": "Cannot change your own role"})

    target.role = payload.role.value
    db.commit()

    return {"message": "Role updated", "user_id": target.id, "role": target.role}


@router.post("/deactivate/{user_id}")
def deactivate_member(
    user_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)

    target = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not target:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Target user not found"})

    if target.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN", "detail": "Cannot modify users outside your organization"})

    if target.id == user.id:
        raise HTTPException(status_code=400, detail={"error": "SELF_MODIFICATION", "detail": "Cannot deactivate yourself"})

    target.is_active = False
    db.commit()

    return {"message": "User deactivated", "user_id": target.id}


@router.get("/activity")
def get_team_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_manager_or_admin(user)

    if not user.organization_id:
        return {"total": 0, "activities": []}

    member_ids = [m.id for m in db.query(User.id).filter(User.organization_id == user.organization_id).all()]

    activities = (
        db.query(AuditLog)
        .filter(AuditLog.user_id.in_(member_ids))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for a in activities:
        actor = db.query(User).filter(User.id == a.user_id).first()
        results.append({
            "id": a.id,
            "action": a.action,
            "resource_type": a.resource_type,
            "resource_id": a.resource_id,
            "user_name": actor.full_name if actor else "Unknown",
            "user_email": actor.email if actor else "Unknown",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {"total": len(results), "activities": results}


@router.get("/organization")
def get_organization(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.organization_id:
        return {"has_organization": False}

    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        return {"has_organization": False}

    member_count = db.query(User).filter(User.organization_id == org.id).count()

    return {
        "has_organization": True,
        "id": org.id,
        "name": org.name,
        "irdai_registration_no": org.irdai_registration_no,
        "plan": org.plan,
        "member_count": member_count,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.post("/organization")
def create_organization(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "detail": "Organization name is required"})

    if user.organization_id:
        raise HTTPException(status_code=409, detail={"error": "ALREADY_HAS_ORG", "detail": "User already belongs to an organization"})

    org = Organization(
        id=str(uuid.uuid4()),
        name=name,
        irdai_registration_no=payload.get("irdai_registration_no"),
        plan=payload.get("plan", "PROFESSIONAL"),
        created_at=datetime.utcnow(),
    )
    db.add(org)

    user.organization_id = org.id
    user.role = UserRole.ADMIN.value

    db.commit()
    db.refresh(org)

    return {
        "message": "Organization created",
        "id": org.id,
        "name": org.name,
        "plan": org.plan,
    }
