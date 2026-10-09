import json
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
import paho.mqtt.client as mqtt
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from models import AssetType, MaintenanceRule
from services.equipment_service import equipment_service
from services.equipment_status_service import equipment_status_service
from services.maintenance_metrics import maintenance_metrics
from services.maintenance_service import MaintenanceService

load_dotenv()

logger = logging.getLogger("mqtt_worker")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [MQTT_WORKER] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class MqttWorker:
    """
    Industrial MQTT Telemetry Worker.
    
    Acts as a lean network ingestion bridge:
    - Subscribes to republished UNS telemetry topics (e.g. `sat_lab/telemetry/#`).
    - Decodes incoming topics and JSON payloads.
    - Delegates asset auto-discovery to `EquipmentService`.
    - Delegates state transitions (RBE) to `EquipmentStatusService`.
    - Delegates rule evaluation and alert dispatch to `MaintenanceService`.
    """

    def __init__(self):
        self.broker = os.getenv("MQTT_BROKER", "192.168.10.208")
        self.port = int(os.getenv("MQTT_PORT", 1883))
        self.user = os.getenv("MQTT_USER", "sat_lab")
        self.password = os.getenv("MQTT_PASSWORD", "&HjVFmrhuBK")
        self.topic_sub = os.getenv("MQTT_TOPIC_SUB", "sat_lab/telemetry/#")
        self.client_id = os.getenv("MQTT_CLIENT_ID", "sat_lab_backend_worker")

        # MQTT Client instance (Paho-MQTT v2)
        self.client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=self.client_id,
        )
        if self.user and self.password:
            self.client.username_pw_set(self.user, self.password)

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

        self._is_running = False

    def preload_caches(self) -> None:
        """Initializes in-memory caches across all domain services."""
        logger.debug("Initializing domain service caches...")
        db: Session = SessionLocal()
        try:
            equipment_service.preload_cache(db)
            equipment_status_service.preload_cache(db)
        finally:
            db.close()

    def _evaluate_maintenance_rules(
        self,
        db: Session,
        equipment_tag: str,
        status_changed: bool,
    ) -> None:
        """
        Evaluates active maintenance rules for an equipment asset after a status transition.

        For each rule:
          - HOURS        : calculated from accumulated RUNNING intervals in equipment_history_statuses
          - CYCLES       : counted from STOPPED→RUNNING transitions (motor startups / valve cycles)
          - CALENDAR_DAYS: days since last maintenance log or first status record

        Only runs after a state transition (status_changed=True) to avoid redundant DB reads.
        """
        if not status_changed:
            return

        rules = db.execute(
            select(MaintenanceRule).where(
                MaintenanceRule.is_active == True,
                MaintenanceRule.asset_type == AssetType.EQUIPMENT,
                MaintenanceRule.asset_id == equipment_tag,
            )
        ).scalars().all()

        if not rules:
            logger.debug(f"ℹ️ [RULES] No active maintenance rules found for {equipment_tag}")
            return
            
        logger.debug(f"⚙️ [RULES] Evaluating {len(rules)} active rules for {equipment_tag}")

        for rule in rules:
            # Calculate the real accumulated metric for this trigger type
            current_value = maintenance_metrics.get_current_value(
                db=db,
                equipment_id=equipment_tag,
                trigger_type=rule.trigger_type,
            )

            logger.debug(
                f"🧮 [EVALUATE] Rule #{rule.id} [{rule.name}] | Trigger: {rule.trigger_type.value} | Current: {current_value} | Threshold: {rule.threshold_value}"
            )

            alert = MaintenanceService.generate_maintenance_alert(
                db=db,
                rule=rule,
                current_value=current_value,
                notify=True,
            )
            
            if alert:
                logger.debug(f"🚨 [ALERT GENERATED] Rule #{rule.id} triggered alert #{alert.id}")
            else:
                logger.debug(f"✅ [RULE OK] Rule #{rule.id} is within limits")

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code == 0:
            logger.debug("Connected to MQTT Broker (%s:%d)", self.broker, self.port)
            client.subscribe(self.topic_sub, qos=0)
            logger.debug("Subscribed to telemetry topic: '%s'", self.topic_sub)
        else:
            logger.error("Failed to connect to MQTT broker, reason_code: %s", reason_code)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        logger.warning("Disconnected from MQTT Broker (reason_code: %s). Auto-reconnecting...", reason_code)

    def _on_message(self, client, userdata, msg):
        """
        Processes incoming telemetry message.
        Expected topic format: sat_lab/telemetry/{node_id}/{device_id}/{equipment_tag}/{metric_name}
        Expected payload: {"value": ..., "timestamp": ...}
        """
        try:
            tokens = msg.topic.split("/")
            logger.debug(f"📥 [MQTT RECV] Topic: {msg.topic} | Payload: {msg.payload.decode('utf-8')}")
            
            if len(tokens) < 5:
                logger.warning(f"⚠️ [MQTT] Topic format invalid. Expected at least 5 levels, got {len(tokens)}")
                return

            node_id = tokens[2]
            device_id = tokens[3]
            equipment_tag = tokens[4]
            metric_name = "/".join(tokens[5:]) if len(tokens) > 5 else "Telemetry"

            # Parse JSON payload
            raw_payload = msg.payload.decode("utf-8")
            data = json.loads(raw_payload)
            value = float(data.get("value", 0.0))
            ts_ms = data.get("timestamp")

            if ts_ms and ts_ms > 1e11:
                event_time = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
            elif ts_ms:
                event_time = datetime.fromtimestamp(ts_ms, tz=timezone.utc)
            else:
                event_time = datetime.now(timezone.utc)

            logger.debug(f"🔍 [MQTT PARSED] Node: {node_id}, Device: {device_id}, Asset: {equipment_tag}, Metric: {metric_name}, Value: {value}")

            # Process in thread-safe DB session
            db: Session = SessionLocal()
            try:
                # 1. Asset auto-discovery & provisioning
                equipment_service.ensure_assets(db, node_id, device_id, equipment_tag)
                eq_type = equipment_service.get_equipment_type(equipment_tag)

                # 2. State transition tracking (Report-by-Exception for Valves, Motors, Pumps)
                status_entry = equipment_status_service.record_status_transition(
                    db=db,
                    equipment_tag=equipment_tag,
                    equipment_type=eq_type,
                    metric_name=metric_name,
                    value=value,
                    event_time=event_time,
                )

                if status_entry:
                    logger.debug(f"🔄 [STATE TRANSITION] {equipment_tag} changed state to {status_entry.status.value}")
                else:
                    logger.debug(f"ℹ️ [NO TRANSITION] {equipment_tag} state unchanged.")

                # 3. Evaluate maintenance rules — only on status transitions
                self._evaluate_maintenance_rules(
                    db=db,
                    equipment_tag=equipment_tag,
                    status_changed=(status_entry is not None),
                )

            finally:
                db.close()

        except Exception as e:
            logger.error("Error processing MQTT message on topic '%s': %s", msg.topic, e, exc_info=False)

    def start(self) -> None:
        """Starts the MQTT worker in a background thread."""
        if self._is_running:
            return

        self.preload_caches()
        logger.debug("Starting MQTT background worker...")
        try:
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()
            self._is_running = True
            logger.debug("MQTT Worker started successfully.")
        except Exception as e:
            logger.error("Could not start MQTT Worker: %s", e)

    def stop(self) -> None:
        """Stops the MQTT worker."""
        if not self._is_running:
            return
        logger.debug("Stopping MQTT Worker...")
        try:
            self.client.loop_stop()
            self.client.disconnect()
        except Exception as e:
            logger.warning("Error during MQTT Worker stop: %s", e)
        finally:
            self._is_running = False
            logger.debug("MQTT Worker stopped.")

    def run_forever(self) -> None:
        """Runs the MQTT worker synchronously (blocking mode for standalone CLI daemon)."""
        self.preload_caches()
        logger.debug("Connecting to MQTT Broker in standalone daemon mode...")
        self.client.connect(self.broker, self.port, keepalive=60)
        self._is_running = True
        try:
            self.client.loop_forever()
        except KeyboardInterrupt:
            logger.debug("MQTT Worker interrupted by user. Exiting...")
        finally:
            self.stop()


# Singleton instance
mqtt_worker = MqttWorker()


if __name__ == "__main__":
    logger.debug("Starting standalone Industrial MQTT Worker...")
    mqtt_worker.run_forever()
