from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.agents.graph import insureiq_graph
from backend.agents.state import InsureIQState
from backend.auth import get_current_user
from backend.database.db import get_db
from backend.database.models import Policy, Report, User

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


def _policy_to_dict(policy: Policy) -> dict:
    return {
        "policy_number": policy.policy_number,
        "policyholder_name": policy.policyholder_name,
        "vehicle_make": policy.vehicle_make,
        "vehicle_model": policy.vehicle_model,
        "vehicle_year": policy.vehicle_year,
        "engine_cc": policy.engine_cc,
        "insured_value": policy.insured_value,
        "premium_amount": policy.premium_amount,
        "prior_claims_count": policy.prior_claims_count,
        "city": policy.city,
    }


@router.post("/generate")
def generate_report(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    policy_id = str(payload.get("policy_id", "")).strip()
    if not policy_id:
        raise HTTPException(status_code=400, detail={"error": "FIELD_VALIDATION_ERROR", "field": "policy_id", "detail": "policy_id is required"})

    policy = (
        db.query(Policy)
        .filter(Policy.id == policy_id, Policy.user_id == user.id, Policy.is_active.is_(True))
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Policy not found"})

    state: InsureIQState = {
        "policy_id": policy.id,
        "policy_data": _policy_to_dict(policy),
        "user_query": "full_report",
        "messages": [],
        "session_id": f"report-{policy.id}",
        "_app": request.app,
        "_db": db,
        "_user_id": user.id,
        "_policy": policy,
    }
    out = insureiq_graph.invoke(state)
    return {
        "id": out.get("report_id") or f"rpt-{policy.id}-{int(datetime.utcnow().timestamp())}",
        "report_id": out.get("report_id"),
        "policy_id": policy.id,
        "risk_score": out.get("risk_score"),
        "risk_band": out.get("risk_band"),
        "claim_probability": out.get("claim_probability") or 0.0,
        "current_premium": float(policy.premium_amount or 0),
        "premium_min": out.get("premium_min"),
        "premium_max": out.get("premium_max"),
        "content": out.get("final_report") or "Analysis complete.",
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("")
def list_reports(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reports = db.query(Report).filter(Report.user_id == user.id).order_by(Report.created_at.desc()).all()
    out = []
    for r in reports:
        policy = db.query(Policy).filter(Policy.id == r.policy_id).first()
        out.append({
            "id": r.id,
            "policyId": r.policy_id,
            "holder": policy.policyholder_name if policy else "Unknown",
            "type": r.report_type.value if hasattr(r.report_type, 'value') else str(r.report_type),
            "date": r.created_at.isoformat() if r.created_at else "",
            "status": "COMPLETE"
        })
    return out


@router.get("/{report_id}/pdf")
def report_pdf(report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": "SERVER_ERROR", "detail": "reportlab is required for PDF generation"},
        ) from exc

    try:
        report = db.query(Report).filter(Report.id == report_id, Report.user_id == user.id).first()
        if not report:
            raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "detail": "Report not found"})

        packet = BytesIO()
        c = canvas.Canvas(packet, pagesize=A4)
        width, height = A4
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, height - 40, "InsureIQ Underwriting Report")
        c.setFont("Helvetica", 10)

        y = height - 70
        content_lines = (report.content or "").splitlines()
        
        import textwrap
        for line in content_lines:
            wrapped_lines = textwrap.wrap(line, width=100)
            if not wrapped_lines:
                y -= 14
                continue
                
            for wrapped in wrapped_lines:
                if y < 50:
                    c.showPage()
                    c.setFont("Helvetica", 10)
                    y = height - 40
                
                # Sanitize line to remove or replace non-Latin1 characters
                safe_line = wrapped.encode('latin-1', 'replace').decode('latin-1')
                c.drawString(40, y, safe_line)
                y -= 14

        c.save()
        packet.seek(0)
        filename = f"insureiq-report-{report_id}.pdf"
        
        return Response(
            content=packet.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"PDF Generation Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={"error": "PDF_GENERATION_FAILED", "detail": str(e)}
        )

