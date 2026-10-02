import logging
import threading
from typing import Dict, Optional, Set

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from models import TypeEquipment

logger = logging.getLogger("equipment_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [EQUIPMENT_SVC] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class EquipmentService:
    """
    Manages physical asset lifecycle, auto-provisioning, and ISA-5.1 category classification.
    Maintains thread-safe in-memory sets of known nodes, devices, and equipments for O(1) checks.
    """

    def __init__(self):
        self._cache_lock = threading.Lock()
        self._known_nodes: Set[str] = set()
        self._known_devices: Set[str] = set()
        self._known_equipments: Set[str] = set()
        self._type_id_map: Dict[str, int] = {}
        self._equipment_types: Dict[str, Optional[str]] = {}

    def preload_cache(self, db: Session) -> None:
        """
        Loads existing asset tags and category catalogs from PostgreSQL into memory.
        Enables O(1) existence checks with zero query latency during high-frequency ingestion.
        """
        logger.info("Pre-loading equipment and asset topology cache from database...")
        try:
            # 1. Type catalog map (e.g. {"SENSOR": 5, "MOTOR": 1, ...})
            types = db.execute(select(TypeEquipment.name, TypeEquipment.id)).all()
            with self._cache_lock:
                self._type_id_map = {name.upper(): type_id for name, type_id in types}

            # 2. Known Nodes
            nodes = db.execute(text("SELECT tag_name FROM nodes")).fetchall()
            with self._cache_lock:
                self._known_nodes = {r[0] for r in nodes}

            # 3. Known Devices
            devices = db.execute(text("SELECT tag_name FROM devices")).fetchall()
            with self._cache_lock:
                self._known_devices = {r[0] for r in devices}

            # 4. Known Equipments & Type Classifications
            equipments = db.execute(text("""
                SELECT e.tag_name, t.name 
                FROM equipments e 
                LEFT JOIN type_equipments t ON e.type_equipment_id = t.id
            """)).fetchall()
            with self._cache_lock:
                self._known_equipments = {r[0] for r in equipments}
                self._equipment_types = {r[0]: (r[1].upper() if r[1] else None) for r in equipments}

            logger.info(
                "Equipment cache ready: %d nodes, %d devices, %d equipments, %d type categories.",
                len(self._known_nodes),
                len(self._known_devices),
                len(self._known_equipments),
                len(self._type_id_map),
            )
        except Exception as e:
            logger.error("Failed to preload equipment cache: %s", e)

    def infer_type_equipment_id(self, tag_name: str) -> Optional[int]:
        """
        Suggests an initial type_equipment_id based on standard ISA-5.1 tagging conventions.
        Returns None if no standard prefix is matched, leaving it for manual assignment.
        """
        tag_upper = tag_name.upper()

        # Instrumentation sensors (Pressure, Temperature, Level, Flow, Vibration)
        if any(tag_upper.startswith(prefix) for prefix in ("PIT_", "LIT_", "FIT_", "TT_", "TE_", "PT_", "LT_", "FT_")):
            return self._type_id_map.get("SENSOR")

        # Pumps
        if any(tag_upper.startswith(prefix) for prefix in ("BOMBA_", "PUMP_")):
            return self._type_id_map.get("PUMP")

        # Motors
        if any(tag_upper.startswith(prefix) for prefix in ("MOTOR_", "MTR_", "MOT_")):
            return self._type_id_map.get("MOTOR")

        # Valves
        if any(tag_upper.startswith(prefix) for prefix in ("VALVULA_", "VLV_", "VALVE_", "VAL_")):
            return self._type_id_map.get("VALVE")

        # Actuators
        if any(tag_upper.startswith(prefix) for prefix in ("ACTUADOR_", "ACT_")):
            return self._type_id_map.get("ACTUATOR")

        # Conveyors
        if any(tag_upper.startswith(prefix) for prefix in ("CONVEYOR_", "FAJA_", "BANDA_")):
            return self._type_id_map.get("CONVEYOR")

        # Compressors
        if any(tag_upper.startswith(prefix) for prefix in ("COMPRESOR_", "COMP_")):
            return self._type_id_map.get("COMPRESSOR")

        # Default fallback: None (manual assignment later)
        return None

    def get_equipment_type(self, equipment_tag: str) -> Optional[str]:
        """Returns the cached category name for an equipment (e.g. 'VALVE', 'MOTOR', 'PUMP')."""
        with self._cache_lock:
            return self._equipment_types.get(equipment_tag)

    def ensure_assets(
        self,
        db: Session,
        node_id: str,
        device_id: str,
        equipment_tag: str,
    ) -> None:
        """
        Ensures Node, Device, and Equipment exist in the database with minimum overhead.
        Uses in-memory cached lookups to bypass database queries if assets are already known.
        """
        with self._cache_lock:
            node_known = node_id in self._known_nodes
            device_known = device_id in self._known_devices
            equipment_known = equipment_tag in self._known_equipments

        # 1. Ensure Node
        if not node_known:
            db.execute(
                text("""
                    INSERT INTO nodes (tag_name, name, created_at)
                    VALUES (:tag, :name, NOW())
                    ON CONFLICT (tag_name) DO NOTHING;
                """),
                {"tag": node_id, "name": node_id},
            )
            with self._cache_lock:
                self._known_nodes.add(node_id)

        # 2. Ensure Device
        if not device_known:
            db.execute(
                text("""
                    INSERT INTO devices (tag_name, node_tag, name, created_at)
                    VALUES (:tag, :node_tag, :name, NOW())
                    ON CONFLICT (tag_name) DO UPDATE 
                        SET node_tag = EXCLUDED.node_tag;
                """),
                {"tag": device_id, "node_tag": node_id, "name": device_id},
            )
            with self._cache_lock:
                self._known_devices.add(device_id)

        # 3. Ensure Equipment (Auto-discovery)
        if not equipment_known:
            suggested_type_id = self.infer_type_equipment_id(equipment_tag)
            type_name = None
            if suggested_type_id:
                for name, tid in self._type_id_map.items():
                    if tid == suggested_type_id:
                        type_name = name
                        break

            db.execute(
                text("""
                    INSERT INTO equipments (tag_name, name, device_id, type_equipment_id)
                    VALUES (:tag_name, :name, :device_id, :type_id)
                    ON CONFLICT (tag_name) DO UPDATE 
                        SET device_id = COALESCE(equipments.device_id, EXCLUDED.device_id);
                """),
                {
                    "tag_name": equipment_tag,
                    "name": equipment_tag,
                    "device_id": device_id,
                    "type_id": suggested_type_id,
                },
            )
            with self._cache_lock:
                self._known_equipments.add(equipment_tag)
                self._equipment_types[equipment_tag] = type_name

            logger.info(
                "Auto-registered new Equipment: '%s' (Device: '%s', Type: %s)",
                equipment_tag,
                device_id,
                type_name or "Unassigned",
            )

        db.commit()


# Singleton instance
equipment_service = EquipmentService()
