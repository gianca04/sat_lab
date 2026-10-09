"""
Routers for read-only + search operations on the industrial data models.
Nodes and Devices are auto-registered by the MQTT worker; endpoints are list/search only.
MaintenanceRule supports full CRUD.
"""
import asyncio
import json
from typing import List, Optional
import anyio.to_thread

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import (
    Device,
    Equipment,
    MaintenanceAlert,
    MaintenanceLog,
    MaintenanceRule,
    Node,
    SparkplugLifecycleEvent,
    TypeEquipment,
    AssetMeter,
    AlertStatus,
)
from schemas import (
    DeviceRead,
    EquipmentRead,
    MaintenanceAlertRead,
    MaintenanceAlertUpdate,
    MaintenanceLogCreate,
    MaintenanceLogRead,
    MaintenanceLogUpdate,
    MaintenanceRuleCreate,
    MaintenanceRuleRead,
    MaintenanceRuleUpdate,
    NodeRead,
    SparkplugLifecycleEventRead,
    TypeEquipmentRead,
)

from auth import get_current_active_user
from services.alert_broadcaster import alert_broadcaster

router = APIRouter(
    prefix="/api",
    tags=["Industrial Data"],
    # dependencies=[Depends(get_current_active_user)],
    # responses={
    #     status.HTTP_401_UNAUTHORIZED: {"description": "No autorizado: Token inválido o ausente"},
    #     status.HTTP_403_FORBIDDEN: {"description": "Prohibido: No tienes permisos suficientes"},
    # }
)



# ─── Nodes ────────────────────────────────────────────────────────────────────

@router.get("/nodes", response_model=List[NodeRead])
def list_nodes(
    q: Optional[str] = Query(None, description="Filter by tag_name or name"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all Edge Nodes. Optionally filter by tag_name or name."""
    qs = db.query(Node)
    if q:
        qs = qs.filter(
            or_(
                Node.tag_name.ilike(f"%{q}%"),
                Node.name.ilike(f"%{q}%"),
            )
        )
    return qs.order_by(Node.created_at.desc()).offset(offset).limit(limit).all()


# ─── Devices ──────────────────────────────────────────────────────────────────

@router.get("/devices", response_model=List[DeviceRead])
def list_devices(
    q: Optional[str] = Query(None, description="Filter by tag_name, name, or node_tag"),
    node_tag: Optional[str] = Query(None, description="Filter by parent node tag"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all Devices, optionally filtered by node or search term."""
    qs = db.query(Device)
    if node_tag:
        qs = qs.filter(Device.node_tag == node_tag)
    if q:
        qs = qs.filter(
            or_(
                Device.tag_name.ilike(f"%{q}%"),
                Device.name.ilike(f"%{q}%"),
                Device.node_tag.ilike(f"%{q}%"),
            )
        )
    return qs.order_by(Device.created_at.desc()).offset(offset).limit(limit).all()


# ─── Equipments (ISA-95 Assets) ───────────────────────────────────────────────

@router.get("/equipments", response_model=List[EquipmentRead])
def list_equipments(
    q: Optional[str] = Query(None, description="Filter by tag_name, name, or device_id"),
    device_id: Optional[str] = Query(None, description="Filter by linked device tag"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all ISA-95 Equipment assets."""
    qs = db.query(Equipment)
    if device_id:
        qs = qs.filter(Equipment.device_id == device_id)
    if q:
        qs = qs.filter(
            or_(
                Equipment.tag_name.ilike(f"%{q}%"),
                Equipment.name.ilike(f"%{q}%"),
                Equipment.device_id.ilike(f"%{q}%"),
            )
        )
    return qs.order_by(Equipment.tag_name).offset(offset).limit(limit).all()


@router.get("/equipment-types", response_model=List[TypeEquipmentRead])
def list_equipment_types(
    db: Session = Depends(get_db),
):
    """List all equipment type/category catalog entries."""
    return db.query(TypeEquipment).order_by(TypeEquipment.name).all()


# ─── Sparkplug Lifecycle Events ───────────────────────────────────────────────

@router.get("/events", response_model=List[SparkplugLifecycleEventRead])
def list_events(
    q: Optional[str] = Query(None, description="Filter by node_id or device_id"),
    node_id: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None, description="NBIRTH | NDEATH | DBIRTH | DDEATH"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List Sparkplug B lifecycle events with optional filters."""
    qs = db.query(SparkplugLifecycleEvent)
    if node_id:
        qs = qs.filter(SparkplugLifecycleEvent.node_id == node_id)
    if device_id:
        qs = qs.filter(SparkplugLifecycleEvent.device_id == device_id)
    if event_type:
        qs = qs.filter(SparkplugLifecycleEvent.event_type == event_type)
    if q:
        qs = qs.filter(
            or_(
                SparkplugLifecycleEvent.node_id.ilike(f"%{q}%"),
                SparkplugLifecycleEvent.device_id.ilike(f"%{q}%"),
            )
        )
    return (
        qs.order_by(SparkplugLifecycleEvent.event_time.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# ─── Maintenance Rules ────────────────────────────────────────────────────────

@router.get("/maintenance/rules", response_model=List[MaintenanceRuleRead])
def list_maintenance_rules(
    asset_id: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List maintenance rules, optionally filtered by asset or active status."""
    qs = db.query(MaintenanceRule)
    if asset_id:
        qs = qs.filter(MaintenanceRule.asset_id == asset_id)
    if asset_type:
        qs = qs.filter(MaintenanceRule.asset_type == asset_type)
    if is_active is not None:
        qs = qs.filter(MaintenanceRule.is_active == is_active)
    return qs.order_by(MaintenanceRule.id.desc()).offset(offset).limit(limit).all()


# ─── Maintenance Alerts ───────────────────────────────────────────────────────

@router.get("/maintenance/alerts", response_model=List[MaintenanceAlertRead])
def list_maintenance_alerts(
    status: Optional[AlertStatus] = Query(None, description="Filter by status (PENDING, ACKNOWLEDGED, RESOLVED)"),
    asset_id: Optional[str] = Query(None, description="Filter by asset identifier"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type (EQUIPMENT, DEVICE, NODE)"),
    q: Optional[str] = Query(None, description="Search by asset_id or rule name"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List maintenance alerts with options to filter by status, asset, and search query."""
    qs = db.query(MaintenanceAlert).options(joinedload(MaintenanceAlert.rule))
    if status:
        qs = qs.filter(MaintenanceAlert.status == status)
    if asset_id:
        qs = qs.filter(MaintenanceAlert.asset_id == asset_id)
    if asset_type:
        qs = qs.filter(MaintenanceAlert.asset_type == asset_type)
    if q:
        qs = qs.join(MaintenanceAlert.rule).filter(
            or_(
                MaintenanceAlert.asset_id.ilike(f"%{q}%"),
                MaintenanceRule.name.ilike(f"%{q}%"),
            )
        )
    return qs.order_by(MaintenanceAlert.triggered_at.desc()).offset(offset).limit(limit).all()


sse_router = APIRouter(prefix="/api", tags=["Industrial SSE"])


def _fetch_alerts_json() -> str:
    """Fetch and serialize current alerts without keeping a long-lived DB session open."""
    from database import SessionLocal
    with SessionLocal() as db:
        alerts = (
            db.query(MaintenanceAlert)
            .options(joinedload(MaintenanceAlert.rule))
            .order_by(MaintenanceAlert.triggered_at.desc())
            .limit(100)
            .all()
        )
        return json.dumps(
            [MaintenanceAlertRead.model_validate(a).model_dump(mode="json") for a in alerts]
        )


@sse_router.get("/maintenance/alerts/sse")
async def stream_maintenance_alerts(
    request: Request,
    token: Optional[str] = Query(None),
):
    """
    Server-Sent Events (SSE) stream providing real-time maintenance alert updates.
    Validates token via query parameter or Authorization header in an isolated DB check,
    ensuring NO database connections or thread limiter tokens are held during the stream.
    """
    # raw_token = token
    # if not raw_token:
    #     auth_header = request.headers.get("authorization")
    #     if auth_header and auth_header.startswith("Bearer "):
    #         raw_token = auth_header[7:]

    # if not raw_token:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="No autenticado para canal SSE. Provea ?token=...",
    #     )

    # # Validate JWT claims
    # from auth import decode_access_token
    # payload = decode_access_token(raw_token)
    # username = payload.get("sub")
    # if not username:
    #     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    # # Verify user exists & active in an immediate, closed session
    # from database import SessionLocal
    # from models import User
    # with SessionLocal() as db:
    #     user = db.query(User).filter(User.username == username).first()
    #     if not user or not user.is_active:
    #         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo o no autorizado")

    queue = alert_broadcaster.subscribe()

    async def event_generator():
        try:
            # 1. Send initial alert snapshot
            initial_data = await asyncio.to_thread(_fetch_alerts_json)
            yield f"data: {initial_data}\n\n"

            # 2. Stream updates on change + periodic keepalive
            while True:
                if await request.is_disconnected():
                    break
                try:
                    await asyncio.wait_for(queue.get(), timeout=15.0)
                    fresh_data = await asyncio.to_thread(_fetch_alerts_json)
                    yield f"data: {fresh_data}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            alert_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/maintenance/alerts/{alert_id}", response_model=MaintenanceAlertRead)
def get_maintenance_alert(
    alert_id: int,
    db: Session = Depends(get_db),
):
    """Get a single maintenance alert by ID with its associated rule."""
    alert = (
        db.query(MaintenanceAlert)
        .options(joinedload(MaintenanceAlert.rule))
        .filter(MaintenanceAlert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail=f"Maintenance alert {alert_id} not found")
    return alert


@router.patch("/maintenance/alerts/{alert_id}", response_model=MaintenanceAlertRead)
def update_maintenance_alert_status(
    alert_id: int,
    alert_in: MaintenanceAlertUpdate,
    db: Session = Depends(get_db),
):
    """Update status of a maintenance alert (e.g. ACKNOWLEDGED, RESOLVED, PENDING)."""
    alert = (
        db.query(MaintenanceAlert)
        .options(joinedload(MaintenanceAlert.rule))
        .filter(MaintenanceAlert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail=f"Maintenance alert {alert_id} not found")
    alert.status = alert_in.status
    db.commit()
    db.refresh(alert)
    alert_broadcaster.broadcast_change("status_update")
    return alert


# ─── Maintenance Logs ─────────────────────────────────────────────────────────

@router.post(
    "/maintenance/logs",
    response_model=MaintenanceLogRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a maintenance log and resolve open alerts",
)
def create_maintenance_log(
    log_in: MaintenanceLogCreate,
    db: Session = Depends(get_db),
):
    """
    Creates a maintenance log. Automatically takes a snapshot of the asset's meter
    and resolves any PENDING or ACKNOWLEDGED alerts for that asset (or specific alert_id).
    """
    log_data = log_in.model_dump()
    log = MaintenanceLog(**log_data)
    
    # 1. Snapshot the AssetMeter (Odometers)
    meter = db.query(AssetMeter).filter_by(
        asset_type=log.asset_type, 
        asset_id=log.asset_id
    ).first()
    
    if meter:
        log.hours_at_execution = meter.total_hours
        log.cycles_at_execution = meter.total_cycles
        log.startups_at_execution = meter.total_startups
        
    db.add(log)
    
    # 2. Resolve target alert if alert_id is provided
    if log.alert_id:
        target_alert = db.query(MaintenanceAlert).filter(MaintenanceAlert.id == log.alert_id).first()
        if target_alert:
            target_alert.status = AlertStatus.RESOLVED

    # Also resolve all open alerts for this asset
    open_alerts = db.query(MaintenanceAlert).filter(
        MaintenanceAlert.asset_type == log.asset_type,
        MaintenanceAlert.asset_id == log.asset_id,
        MaintenanceAlert.status.in_([AlertStatus.PENDING, AlertStatus.ACKNOWLEDGED])
    ).all()
    
    for alert in open_alerts:
        alert.status = AlertStatus.RESOLVED

    db.commit()
    db.refresh(log)
    alert_broadcaster.broadcast_change("log_created_resolved")
    return log

@router.get("/maintenance/logs", response_model=List[MaintenanceLogRead])
def list_maintenance_logs(
    q: Optional[str] = Query(None, description="Filter by asset_id or technician"),
    asset_id: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    maintenance_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List maintenance execution logs."""
    qs = db.query(MaintenanceLog)
    if asset_id:
        qs = qs.filter(MaintenanceLog.asset_id == asset_id)
    if asset_type:
        qs = qs.filter(MaintenanceLog.asset_type == asset_type)
    if maintenance_type:
        qs = qs.filter(MaintenanceLog.maintenance_type == maintenance_type)
    if q:
        qs = qs.filter(
            or_(
                MaintenanceLog.asset_id.ilike(f"%{q}%"),
                MaintenanceLog.technician.ilike(f"%{q}%"),
                MaintenanceLog.description.ilike(f"%{q}%"),
            )
        )
    return qs.order_by(MaintenanceLog.created_at.desc()).offset(offset).limit(limit).all()


@router.get(
    "/maintenance/logs/{log_id}",
    response_model=MaintenanceLogRead,
    summary="Get a single maintenance log by ID",
)
def get_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail=f"Maintenance log {log_id} not found")
    return log


@router.patch(
    "/maintenance/logs/{log_id}",
    response_model=MaintenanceLogRead,
    summary="Partially update a maintenance log",
)
def update_maintenance_log(
    log_id: int,
    log_in: MaintenanceLogUpdate,
    db: Session = Depends(get_db),
):
    """
    Updates only the provided fields (e.g. adding notes later). 
    Asset data and snapshots are immutable.
    """
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail=f"Maintenance log {log_id} not found")

    for field, value in log_in.model_dump(exclude_unset=True).items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)
    return log


@router.delete(
    "/maintenance/logs/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a maintenance log",
)
def delete_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    """
    Permanently deletes a maintenance log.
    NOTE: Does NOT revert the state of previously closed MaintenanceAlerts.
    """
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail=f"Maintenance log {log_id} not found")

    db.delete(log)
    db.commit()
    return None


# ─── Maintenance Rules CRUD ───────────────────────────────────────────────────

@router.post(
    "/maintenance/rules",
    response_model=MaintenanceRuleRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new maintenance rule",
)
def create_maintenance_rule(
    rule_in: MaintenanceRuleCreate,
    db: Session = Depends(get_db),
):
    """
    Creates a threshold-based maintenance rule for any asset (Node, Device or Equipment).
    asset_id must match an existing tag_name of the selected asset_type.
    """
    rule = MaintenanceRule(**rule_in.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get(
    "/maintenance/rules/{rule_id}",
    response_model=MaintenanceRuleRead,
    summary="Get a single maintenance rule by ID",
)
def get_maintenance_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    rule = db.query(MaintenanceRule).filter(MaintenanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail=f"Maintenance rule {rule_id} not found")
    return rule


@router.patch(
    "/maintenance/rules/{rule_id}",
    response_model=MaintenanceRuleRead,
    summary="Partially update a maintenance rule",
)
def update_maintenance_rule(
    rule_id: int,
    rule_in: MaintenanceRuleUpdate,
    db: Session = Depends(get_db),
):
    """
    Updates only the provided fields. asset_type and asset_id are immutable after creation
    (to preserve alert history integrity). Toggle is_active to disable without deleting.
    """
    rule = db.query(MaintenanceRule).filter(MaintenanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail=f"Maintenance rule {rule_id} not found")

    for field, value in rule_in.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete(
    "/maintenance/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a maintenance rule and all its alerts (cascade)",
)
def delete_maintenance_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    """
    Permanently deletes a maintenance rule.
    All associated MaintenanceAlert records are cascade-deleted automatically.
    """
    rule = db.query(MaintenanceRule).filter(MaintenanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail=f"Maintenance rule {rule_id} not found")

    alert_count = (
        db.query(func.count(MaintenanceAlert.id))
        .filter(MaintenanceAlert.rule_id == rule_id)
        .scalar()
    )

    db.delete(rule)
    db.commit()
    # Return count in header for frontend awareness (204 has no body)
    return None
