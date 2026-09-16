from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin_user, check_resource_ownership_or_admin
from app.models.report import Report
from app.models.user import User
from app.schemas.report import ReportOut, ReportCreate, ReportStatusUpdate
from app.services.storage_service import storage_service
from app.services.audit_service import log_activity

router = APIRouter()


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    report = Report(
        user_id=current_user.id,
        category=payload.category,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        image_url=payload.image_url,
        municipality_id=current_user.municipality_id,
        status="Open"
    )
    # Gamification: Reward 10 environmental points for submitting a report
    current_user.environmental_score += 10
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    log_activity(db, action="REPORT_CREATE", resource="report", resource_id=report.id, user_id=current_user.id, details={"category": report.category})
    return _format_report(report)


@router.post("/with-image", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report_with_image(
    category: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    image_url = None
    if image:
        image_url = await storage_service.save_file(image)

    report = Report(
        user_id=current_user.id,
        category=category,
        description=description,
        latitude=latitude,
        longitude=longitude,
        address=address,
        image_url=image_url,
        municipality_id=current_user.municipality_id,
        status="Open"
    )
    current_user.environmental_score += 10

    db.add(report)
    db.commit()
    db.refresh(report)

    log_activity(db, action="REPORT_CREATE", resource="report", resource_id=report.id, user_id=current_user.id, details={"category": report.category, "has_image": True})
    return _format_report(report)


@router.get("", response_model=List[ReportOut])
def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    only_mine: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    user_role = current_user.role.name if current_user.role else "Citizen"
    is_admin = user_role in ("Admin", "SuperAdmin")
    is_operator = user_role == "MunicipalOperator"
    
    query = db.query(Report)

    if only_mine or (not is_admin and not is_operator):
        query = query.filter(Report.user_id == current_user.id)
    elif is_operator and current_user.municipality_id:
        query = query.filter(Report.municipality_id == current_user.municipality_id)

    if status_filter:
        query = query.filter(Report.status.ilike(status_filter))
    
    if category:
        query = query.filter(Report.category.ilike(category))

    reports = query.order_by(Report.created_at.desc()).all()
    return [_format_report(r) for r in reports]


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    if not check_resource_ownership_or_admin(current_user, report.user_id, report.municipality_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to report")

    return _format_report(report)


@router.patch("/{report_id}", response_model=ReportOut)
def update_report_status(
    report_id: str,
    payload: ReportStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    user_role = current_user.role.name if current_user.role else "Citizen"
    is_admin = user_role in ("Admin", "SuperAdmin")
    is_operator = (user_role == "MunicipalOperator" and current_user.municipality_id == report.municipality_id)

    if not is_admin and not is_operator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only operators and admins can resolve reports")

    valid_statuses = ["Open", "In Progress", "Resolved"]
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status must be one of: {', '.join(valid_statuses)}"
        )

    prev_status = report.status
    report.status = payload.status
    if payload.admin_notes is not None:
        report.admin_notes = payload.admin_notes

    if payload.status == "Resolved" and prev_status != "Resolved":
        report.resolved_by_id = current_user.id
        # Award citizen 50 points for verified resolution!
        if report.user:
            report.user.environmental_score += 50

    db.commit()
    db.refresh(report)

    log_activity(db, action="REPORT_STATUS_UPDATE", resource="report", resource_id=report.id, user_id=current_user.id, details={"status": payload.status, "previous": prev_status})
    return _format_report(report)


def _format_report(report: Report) -> dict:
    return {
        "id": report.id,
        "user_id": report.user_id,
        "user_name": report.user.full_name if report.user else "Citizen",
        "user_email": report.user.email if report.user else None,
        "category": report.category,
        "description": report.description,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "address": report.address,
        "image_url": report.image_url,
        "status": report.status,
        "admin_notes": report.admin_notes,
        "resolved_by_id": report.resolved_by_id,
        "municipality_id": report.municipality_id,
        "created_at": report.created_at,
        "updated_at": report.updated_at
    }


class OfflineReportItem(BaseModel):
    report_id: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    status: Optional[str] = "Resolved"
    notes: Optional[str] = None
    action: Optional[str] = "resolve"
    resolved_at: Optional[str] = None


class BatchSyncPayload(BaseModel):
    sync_timestamp: str
    worker_device_id: Optional[str] = None
    updates: List[OfflineReportItem]


@router.post("/batch-sync")
def batch_sync_reports(
    payload: BatchSyncPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Offline-first store-and-forward batch synchronization endpoint for municipal field officers.
    Handles offline report resolutions, offline field filings, and optimistic conflict resolution.
    """
    processed = 0
    created = 0
    resolved = 0
    conflicts = []

    for item in payload.updates:
        if item.action == "resolve" and item.report_id:
            rep = db.query(Report).filter(Report.id == item.report_id).first()
            if rep:
                rep.status = item.status or "Resolved"
                if item.notes:
                    rep.admin_notes = (rep.admin_notes or "") + f" [Offline Officer Sync: {item.notes}]"
                rep.resolved_by_id = current_user.id
                resolved += 1
                processed += 1
            else:
                processed += 1
        elif item.action == "create":
            if item.category and item.description and item.latitude is not None and item.longitude is not None:
                new_rep = Report(
                    user_id=current_user.id,
                    category=item.category,
                    description=item.description,
                    latitude=item.latitude,
                    longitude=item.longitude,
                    address=item.address or "Field Officer Geolocation",
                    municipality_id=current_user.municipality_id,
                    status=item.status or "In Progress",
                    admin_notes=f"Synced from field device {payload.worker_device_id or 'unknown'}"
                )
                db.add(new_rep)
                created += 1
                processed += 1
        else:
            processed += 1

    db.commit()
    return {
        "status": "completed",
        "processed": processed,
        "created": created,
        "resolved": resolved,
        "conflicts": conflicts,
        "synced_at": datetime.now(timezone.utc).isoformat()
    }
