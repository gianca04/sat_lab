import logging
import threading
from datetime import datetime, timezone
from typing import Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from models import EquipmentHistoryStatus, EquipmentOperatingStatus

logger = logging.getLogger("equipment_status_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [STATUS_SVC] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class EquipmentStatusService:
    """
    Manages operational status tracking for discrete industrial assets (Valves, Motors, Pumps).
    Applies Report-by-Exception (RBE) state transition logging to minimize database storage
    while maintaining clean intervals for OEE, run hours, and cycle counts.
    """

    TARGET_DISCRETE_TYPES = {"VALVE", "MOTOR", "PUMP"}

    def __init__(self):
        self._cache_lock = threading.Lock()
        self._equipment_last_status: Dict[str, EquipmentOperatingStatus] = {}

    def preload_cache(self, db: Session) -> None:
        """
        Loads the most recent operating status for each equipment from PostgreSQL into memory.
        Establishes the baseline state so subsequent incoming telemetry only triggers writes on changes.
        """
        logger.debug("Pre-loading last recorded equipment operating statuses from database...")
        try:
            last_statuses = db.execute(text("""
                SELECT DISTINCT ON (equipment_id) equipment_id, status
                FROM equipment_history_statuses
                ORDER BY equipment_id, event_time DESC, id DESC
            """)).fetchall()

            with self._cache_lock:
                self._equipment_last_status = {
                    r[0]: EquipmentOperatingStatus(r[1]) for r in last_statuses
                }

            logger.debug(
                "Status transition baseline ready: %d equipments with previous state.",
                len(self._equipment_last_status),
            )
        except Exception as e:
            logger.error("Failed to preload equipment status cache: %s", e)

    def is_target_equipment(self, equipment_tag: str, equipment_type: Optional[str]) -> bool:
        """
        Verifies if an asset qualifies for discrete state tracking (Valves, Motors, Pumps).
        Checks both formal catalog classification and standard ISA-5.1 naming prefixes.
        """
        if equipment_type and equipment_type.upper() in self.TARGET_DISCRETE_TYPES:
            return True

        tag_upper = equipment_tag.upper()
        return any(
            tag_upper.startswith(prefix)
            for prefix in (
                "VAL_", "VALVULA_", "VLV_", "VALVE_",
                "MOTOR_", "MTR_", "MOT_",
                "BOMBA_", "PUMP_"
            )
        )

    def record_status_transition(
        self,
        db: Session,
        equipment_tag: str,
        equipment_type: Optional[str],
        metric_name: str,
        value: float,
        event_time: datetime,
    ) -> Optional[EquipmentHistoryStatus]:
        """
        Evaluates incoming telemetry for a potential state change.
        Inserts an EquipmentHistoryStatus record ONLY IF the status transitioned from its previous state.
        """
        metric_lower = metric_name.lower()
        tag_upper = equipment_tag.upper()

        # 1. Filter: Only status-related metrics on Valves, Motors, and Pumps
        is_status_metric = (
            metric_lower in ("running", "status", "state", "run")
            or tag_upper.endswith("_STATUS")
        )

        if not (self.is_target_equipment(equipment_tag, equipment_type) and is_status_metric):
            return None

        # 2. Map telemetry value to operational status enum
        current_status = EquipmentOperatingStatus.UNKNOWN
        if value in (1, 1.0, True):
            current_status = EquipmentOperatingStatus.RUNNING
        elif value in (0, 0.0, False):
            current_status = EquipmentOperatingStatus.STOPPED

        # 3. Check against last known status (Report-by-Exception)
        with self._cache_lock:
            last_status = self._equipment_last_status.get(equipment_tag)

        # 4. If status has NOT changed, do nothing (zero database overhead)
        if current_status == last_status:
            return None

        # 5. State transition detected! Record event
        logger.debug(
            "State transition on '%s': %s -> %s (val=%s, time=%s)",
            equipment_tag,
            last_status.value if last_status else "INITIAL",
            current_status.value,
            value,
            event_time,
        )

        status_entry = EquipmentHistoryStatus(
            equipment_id=equipment_tag,
            status=current_status,
            event_time=event_time,
            created_at=datetime.now(timezone.utc),
        )
        db.add(status_entry)
        db.commit()

        # Update in-memory state
        with self._cache_lock:
            self._equipment_last_status[equipment_tag] = current_status

        return status_entry


# Singleton instance
equipment_status_service = EquipmentStatusService()
