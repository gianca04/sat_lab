import json
from datetime import datetime, timezone
import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    Equipment,
    EquipmentHistoryStatus,
    EquipmentOperatingStatus,
    TypeEquipment,
)
from services.equipment_service import equipment_service
from services.equipment_status_service import equipment_status_service
from services.mqtt_worker import mqtt_worker


class MockMQTTMessage:
    """Mock object simulating a Paho-MQTT message."""
    def __init__(self, topic: str, payload_dict: dict):
        self.topic = topic
        self.payload = json.dumps(payload_dict).encode("utf-8")


@pytest.fixture(scope="module")
def db_session():
    """Provides a transactional database session for tests with clean teardown."""
    session: Session = SessionLocal()
    # Preload caches for the services
    equipment_service.preload_cache(session)
    equipment_status_service.preload_cache(session)
    yield session
    # Cleanup any test tags created
    try:
        session.execute(text("DELETE FROM equipment_history_statuses WHERE equipment_id LIKE '%_TEST_%'"))
        session.execute(text("DELETE FROM equipments WHERE tag_name LIKE '%_TEST_%'"))
        session.execute(text("DELETE FROM devices WHERE tag_name LIKE '%_TEST_%'"))
        session.execute(text("DELETE FROM nodes WHERE tag_name LIKE '%_TEST_%'"))
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()


class TestEquipmentAndStatusIntegrationFlow:
    """
    Integration test suite verifying the strict sequential order:
    1. Priority 1: Asset / Equipment Auto-discovery and registration.
    2. Priority 2: State transition recording (Report-by-Exception) in equipment_history_statuses.
    """

    def test_priority_1_equipment_created_before_status(self, db_session: Session):
        """
        Tests that an unseen valve 'VAL_TEST_101' is registered first in 'equipments',
        and subsequently its 'RUNNING' status is saved in 'equipment_history_statuses'.
        """
        node_id = "GW_TEST_01"
        device_id = "PLC_TEST_01"
        equipment_tag = "VAL_TEST_101"
        metric_name = "State"
        value = 1.0  # Open / Running
        event_time = datetime.now(timezone.utc)

        # Ensure clean state for this tag
        db_session.execute(text("DELETE FROM equipment_history_statuses WHERE equipment_id = :tag"), {"tag": equipment_tag})
        db_session.execute(text("DELETE FROM equipments WHERE tag_name = :tag"), {"tag": equipment_tag})
        db_session.commit()

        # Verify equipment does NOT exist initially
        initial_eq = db_session.execute(
            select(Equipment).where(Equipment.tag_name == equipment_tag)
        ).scalar_one_or_none()
        assert initial_eq is None, "Equipment should not exist prior to test"

        # Simulate incoming MQTT packet
        topic = f"sat_lab/telemetry/{node_id}/{device_id}/{equipment_tag}/{metric_name}"
        msg = MockMQTTMessage(topic, {"value": value, "timestamp": int(event_time.timestamp() * 1000)})

        # Execute worker message processing
        mqtt_worker._on_message(None, None, msg)

        # 1. VERIFY PRIORITY 1: Equipment must exist in DB with correct classification
        eq = db_session.execute(
            select(Equipment).where(Equipment.tag_name == equipment_tag)
        ).scalar_one_or_none()
        assert eq is not None, "Priority 1 failed: Equipment was not created"
        assert eq.tag_name == equipment_tag
        assert eq.device_id == device_id
        
        # Verify type inferred as VALVE (VAL_ prefix)
        valve_type = db_session.execute(
            select(TypeEquipment).where(TypeEquipment.name == "VALVE")
        ).scalar_one_or_none()
        assert eq.type_equipment_id == valve_type.id, "Equipment type was not inferred as VALVE"

        # 2. VERIFY PRIORITY 2: EquipmentHistoryStatus must exist referencing the new equipment
        history = db_session.execute(
            select(EquipmentHistoryStatus)
            .where(EquipmentHistoryStatus.equipment_id == equipment_tag)
            .order_by(EquipmentHistoryStatus.id.desc())
        ).scalars().all()

        assert len(history) == 1, "Priority 2 failed: Exactly 1 status transition should be recorded"
        assert history[0].status == EquipmentOperatingStatus.RUNNING
        assert history[0].equipment_id == equipment_tag

    def test_report_by_exception_deduplication(self, db_session: Session):
        """
        Tests that repeated telemetry with the SAME status does NOT write redundant rows.
        """
        node_id = "GW_TEST_01"
        device_id = "PLC_TEST_01"
        equipment_tag = "VAL_TEST_101"
        metric_name = "State"
        value = 1.0  # Still 1.0 (no transition)
        event_time = datetime.now(timezone.utc)

        topic = f"sat_lab/telemetry/{node_id}/{device_id}/{equipment_tag}/{metric_name}"
        
        # Send 3 identical messages
        for _ in range(3):
            msg = MockMQTTMessage(topic, {"value": value, "timestamp": int(event_time.timestamp() * 1000)})
            mqtt_worker._on_message(None, None, msg)

        # Verify that history row count is STILL 1
        history_count = db_session.execute(
            text("SELECT count(*) FROM equipment_history_statuses WHERE equipment_id = :tag"),
            {"tag": equipment_tag},
        ).scalar()

        assert history_count == 1, f"Expected 1 history row due to RBE deduplication, but found {history_count}"

    def test_state_transition_triggers_new_history_row(self, db_session: Session):
        """
        Tests that when status actually changes (1.0 -> 0.0), a new transition is logged.
        """
        node_id = "GW_TEST_01"
        device_id = "PLC_TEST_01"
        equipment_tag = "VAL_TEST_101"
        metric_name = "State"
        value = 0.0  # Transition to STOPPED / Closed
        event_time = datetime.now(timezone.utc)

        topic = f"sat_lab/telemetry/{node_id}/{device_id}/{equipment_tag}/{metric_name}"
        msg = MockMQTTMessage(topic, {"value": value, "timestamp": int(event_time.timestamp() * 1000)})
        mqtt_worker._on_message(None, None, msg)

        # Verify that history now has 2 rows: [RUNNING, STOPPED]
        rows = db_session.execute(
            select(EquipmentHistoryStatus)
            .where(EquipmentHistoryStatus.equipment_id == equipment_tag)
            .order_by(EquipmentHistoryStatus.id.asc())
        ).scalars().all()

        assert len(rows) == 2, "Expected 2 transitions (RUNNING -> STOPPED)"
        assert rows[0].status == EquipmentOperatingStatus.RUNNING
        assert rows[1].status == EquipmentOperatingStatus.STOPPED

    def test_motor_and_pump_state_transitions(self, db_session: Session):
        """
        Tests that Motors ('MOT_TEST_01') and Pumps ('BOMBA_TEST_01') also follow the exact same flow.
        """
        # A. Motor Test
        topic_mot = "sat_lab/telemetry/GW_TEST_01/PLC_TEST_01/MOT_TEST_01/Running"
        msg_mot = MockMQTTMessage(topic_mot, {"value": 1.0, "timestamp": 1790900000000})
        mqtt_worker._on_message(None, None, msg_mot)

        eq_mot = db_session.execute(
            select(Equipment).where(Equipment.tag_name == "MOT_TEST_01")
        ).scalar_one_or_none()
        assert eq_mot is not None, "Motor equipment must be registered"
        
        motor_type = db_session.execute(select(TypeEquipment).where(TypeEquipment.name == "MOTOR")).scalar_one()
        assert eq_mot.type_equipment_id == motor_type.id

        hist_mot = db_session.execute(
            select(EquipmentHistoryStatus).where(EquipmentHistoryStatus.equipment_id == "MOT_TEST_01")
        ).scalars().all()
        assert len(hist_mot) == 1
        assert hist_mot[0].status == EquipmentOperatingStatus.RUNNING

        # B. Pump Test
        topic_pump = "sat_lab/telemetry/GW_TEST_01/PLC_TEST_01/BOMBA_TEST_01/State"
        msg_pump = MockMQTTMessage(topic_pump, {"value": 1.0, "timestamp": 1790900000000})
        mqtt_worker._on_message(None, None, msg_pump)

        eq_pump = db_session.execute(
            select(Equipment).where(Equipment.tag_name == "BOMBA_TEST_01")
        ).scalar_one_or_none()
        assert eq_pump is not None, "Pump equipment must be registered"

        pump_type = db_session.execute(select(TypeEquipment).where(TypeEquipment.name == "PUMP")).scalar_one()
        assert eq_pump.type_equipment_id == pump_type.id

        hist_pump = db_session.execute(
            select(EquipmentHistoryStatus).where(EquipmentHistoryStatus.equipment_id == "BOMBA_TEST_01")
        ).scalars().all()
        assert len(hist_pump) == 1
        assert hist_pump[0].status == EquipmentOperatingStatus.RUNNING

    def test_sensors_do_not_record_history_status(self, db_session: Session):
        """
        Tests that an analog sensor ('PIT_TEST_555') IS registered in equipments (Priority 1),
        but DOES NOT create records in equipment_history_statuses (only for Valves/Motors/Pumps).
        """
        topic = "sat_lab/telemetry/GW_TEST_01/PLC_TEST_01/PIT_TEST_555/Pressure"
        msg = MockMQTTMessage(topic, {"value": 14.7, "timestamp": 1790900000000})
        mqtt_worker._on_message(None, None, msg)

        # 1. Equipment must be registered
        eq = db_session.execute(
            select(Equipment).where(Equipment.tag_name == "PIT_TEST_555")
        ).scalar_one_or_none()
        assert eq is not None, "Sensor equipment must be registered"
        sensor_type = db_session.execute(select(TypeEquipment).where(TypeEquipment.name == "SENSOR")).scalar_one()
        assert eq.type_equipment_id == sensor_type.id

        # 2. NO history status should be recorded for sensors
        sensor_hist = db_session.execute(
            select(EquipmentHistoryStatus).where(EquipmentHistoryStatus.equipment_id == "PIT_TEST_555")
        ).scalars().all()
        assert len(sensor_hist) == 0, "Sensors should not generate discrete operating status history"
