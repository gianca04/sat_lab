"""
MaintenanceMetricsCalculator
============================
Derives maintenance KPIs from equipment_history_statuses for rule evaluation.

Computes:
  - HOURS        : total accumulated operating hours (sum of RUNNING intervals)
  - CYCLES       : number of STOPPED → RUNNING transitions (motor startups / valve cycles)
  - CALENDAR_DAYS: days elapsed since the last STOPPED or RUNNING event (first recorded status)

Design decisions:
  - Reads only from equipment_history_statuses (append-only, immutable log).
  - No counters or triggers needed in PostgreSQL — pure Python calculation.
  - last_maintenance_date is taken from maintenance_logs when available;
    otherwise falls back to the earliest status record for the equipment.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from models import (
    EquipmentHistoryStatus,
    EquipmentOperatingStatus,
    MaintenanceLog,
    TriggerType,
    AssetMeter,
    AssetType
)

logger = logging.getLogger("maintenance_metrics")
if not logger.handlers:
    import logging
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [METRICS] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class MaintenanceMetricsCalculator:
    """
    Stateless calculator — every call queries the DB directly.
    Intended to be called just before MaintenanceService.generate_maintenance_alert().
    """

    @staticmethod
    def accumulated_hours(db: Session, equipment_id: str) -> float:
        """
        Calculates total operating hours for an equipment asset.

        Algorithm:
          Walk the status history in chronological order.
          For each consecutive pair [RUNNING → anything], accumulate the duration.
          An open RUNNING interval (no closing event yet) is measured up to now().

        Returns:
          Float hours (e.g. 127.43)
        """
        rows: list[EquipmentHistoryStatus] = (
            db.query(EquipmentHistoryStatus)
            .filter(EquipmentHistoryStatus.equipment_id == equipment_id)
            .order_by(EquipmentHistoryStatus.event_time.asc())
            .all()
        )

        if not rows:
            return 0.0

        total_seconds = 0.0
        running_since: Optional[datetime] = None

        for row in rows:
            if row.status == EquipmentOperatingStatus.RUNNING:
                if running_since is None:
                    running_since = row.event_time
            else:
                # STOPPED or UNKNOWN closes an open RUNNING interval
                if running_since is not None:
                    delta = row.event_time - running_since
                    total_seconds += delta.total_seconds()
                    running_since = None

        # Open interval: equipment is still RUNNING right now
        if running_since is not None:
            now = datetime.now(timezone.utc)
            # Ensure timezone-aware comparison
            if running_since.tzinfo is None:
                running_since = running_since.replace(tzinfo=timezone.utc)
            delta = now - running_since
            total_seconds += max(0.0, delta.total_seconds())

        hours = total_seconds / 3600.0
        logger.debug("equipment=%s accumulated_hours=%.2f", equipment_id, hours)
        return hours

    @staticmethod
    def startup_cycles(db: Session, equipment_id: str) -> int:
        """
        Counts the number of motor startups / valve cycles.

        A cycle is defined as a STOPPED (or initial) → RUNNING transition.
        Each time the equipment goes from not-running to RUNNING = 1 arranque.

        Returns:
          Integer count of startups/cycles.
        """
        rows: list[EquipmentHistoryStatus] = (
            db.query(EquipmentHistoryStatus)
            .filter(EquipmentHistoryStatus.equipment_id == equipment_id)
            .order_by(EquipmentHistoryStatus.event_time.asc())
            .all()
        )

        if not rows:
            return 0

        cycles = 0
        prev_status: Optional[EquipmentOperatingStatus] = None

        for row in rows:
            if (
                row.status == EquipmentOperatingStatus.RUNNING
                and prev_status != EquipmentOperatingStatus.RUNNING
            ):
                cycles += 1
            prev_status = row.status

        logger.debug("equipment=%s startup_cycles=%d", equipment_id, cycles)
        return cycles

    @staticmethod
    def calendar_days_since_last_maintenance(db: Session, equipment_id: str) -> int:
        """
        Returns calendar days elapsed since the last recorded maintenance intervention.
        Falls back to days since the first status record if no maintenance log exists.

        Used for CALENDAR_DAYS trigger_type rules (e.g. "lubricate every 90 days").
        """
        # 1. Try last maintenance log for this equipment
        last_log: Optional[MaintenanceLog] = (
            db.query(MaintenanceLog)
            .filter(MaintenanceLog.asset_id == equipment_id)
            .order_by(MaintenanceLog.created_at.desc())
            .first()
        )

        if last_log:
            reference = last_log.executed_at or last_log.created_at
        else:
            # 2. Fallback: first status record (equipment commission date proxy)
            first_status: Optional[EquipmentHistoryStatus] = (
                db.query(EquipmentHistoryStatus)
                .filter(EquipmentHistoryStatus.equipment_id == equipment_id)
                .order_by(EquipmentHistoryStatus.event_time.asc())
                .first()
            )
            if not first_status:
                return 0
            reference = first_status.event_time

        now = datetime.now(timezone.utc)
        if reference.tzinfo is None:
            reference = reference.replace(tzinfo=timezone.utc)

        days = (now - reference).days
        logger.debug("equipment=%s calendar_days_since_maintenance=%d", equipment_id, days)
        return days

    @classmethod
    def get_current_value(cls, db: Session, equipment_id: str, trigger_type: TriggerType) -> float:
        """
        Main entry point: returns the integer metric that should be compared against
        a MaintenanceRule threshold_value for the given trigger_type.

        TriggerType.HOURS        → accumulated operating hours (rounded down to int)
        TriggerType.CYCLES       → number of motor startups / valve cycles
        TriggerType.CALENDAR_DAYS → days since last maintenance or first status
        """
        current_absolute = 0.0
        
        # 1. Obtener valor absoluto actual (Odómetro global)
        if trigger_type == TriggerType.HOURS:
            current_absolute = cls.accumulated_hours(db, equipment_id)
        elif trigger_type in (TriggerType.CYCLES, TriggerType.STARTUPS):
            current_absolute = cls.startup_cycles(db, equipment_id)
        elif trigger_type == TriggerType.CALENDAR_DAYS:
            return cls.calendar_days_since_last_maintenance(db, equipment_id)
            
        # Sincronizar el AssetMeter de forma pasiva para que la DB refleje la realidad
        meter = db.query(AssetMeter).filter_by(asset_id=equipment_id).first()
        if not meter:
            meter = AssetMeter(
                asset_type=AssetType.EQUIPMENT,
                asset_id=equipment_id,
                total_hours=0,
                total_cycles=0,
                total_startups=0
            )
            db.add(meter)
            
        if trigger_type == TriggerType.HOURS:
            meter.total_hours = current_absolute
        elif trigger_type in (TriggerType.CYCLES, TriggerType.STARTUPS):
            meter.total_cycles = current_absolute
            meter.total_startups = current_absolute
        db.commit()

        # 2. Obtener el snapshot del último mantenimiento registrado para este equipo
        last_log = (
            db.query(MaintenanceLog)
            .filter(MaintenanceLog.asset_id == equipment_id)
            .order_by(MaintenanceLog.created_at.desc())
            .first()
        )

        # 3. Calcular Delta (Odómetro Actual - Odómetro en el último mantenimiento)
        if not last_log:
            return current_absolute
            
        if trigger_type == TriggerType.HOURS:
            last_snapshot = last_log.hours_at_execution or 0.0
            return max(0.0, current_absolute - last_snapshot)
            
        elif trigger_type in (TriggerType.CYCLES, TriggerType.STARTUPS):
            last_snapshot = last_log.cycles_at_execution or last_log.startups_at_execution or 0
            return max(0, current_absolute - last_snapshot)

        return current_absolute


# Stateless — no singleton needed, but expose a module-level alias for convenience
maintenance_metrics = MaintenanceMetricsCalculator
