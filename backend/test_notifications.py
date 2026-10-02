import time
from datetime import datetime, timezone
import os

from dotenv import load_dotenv
load_dotenv()

from models import (
    SparkplugLifecycleEvent,
    MaintenanceAlert,
    NetworkStatus,
    SparkplugEventType,
    AssetType,
    AlertStatus
)
from services.notification_service import NotificationService
from services.mqtt_worker import mqtt_worker

def main():
    print(f"Configuración MQTT: {mqtt_worker.broker}:{mqtt_worker.port}")
    print(f"Tópico MQTT: {os.getenv('MQTT_TOPIC_NOTIFICATIONS', 'lab_sat/notifications')}")
    print("Conectando al broker MQTT...")
    
    # Connect and start background thread for processing network traffic
    mqtt_worker.client.connect(mqtt_worker.broker, mqtt_worker.port)
    mqtt_worker.client.loop_start()
    
    # Wait briefly to ensure connection is established
    time.sleep(1)
    
    print("\n--- Test 1: Sparkplug Lifecycle Event (OFFLINE - Requiere Foto) ---")
    event_offline = SparkplugLifecycleEvent(
        id=1001,
        event_time=datetime.now(timezone.utc),
        event_type=SparkplugEventType.NDEATH,
        node_id="EdgeNode-01",
        device_id=None,
        status=NetworkStatus.OFFLINE
    )
    NotificationService.send_sparkplug_lifecycle_notification(event_offline)
    
    time.sleep(1)
    
    print("\n--- Test 2: Sparkplug Lifecycle Event (ONLINE - Sin Foto) ---")
    event_online = SparkplugLifecycleEvent(
        id=1002,
        event_time=datetime.now(timezone.utc),
        event_type=SparkplugEventType.NBIRTH,
        node_id="EdgeNode-01",
        device_id=None,
        status=NetworkStatus.ONLINE
    )
    NotificationService.send_sparkplug_lifecycle_notification(event_online)
    
    time.sleep(1)
    
    print("\n--- Test 3: Maintenance Alert (WARNING - Requiere Foto) ---")
    alert_warning = MaintenanceAlert(
        id=2001,
        rule_id=1,
        asset_type=AssetType.EQUIPMENT,
        asset_id="PUMP-01",
        calculated_value=950,
        threshold_value=1000,
        status=AlertStatus.PENDING,
        triggered_at=datetime.now(timezone.utc)
    )
    NotificationService.send_maintenance_alert_notification(alert_warning, is_warning=True)
    
    time.sleep(1)
    
    print("\n--- Test 4: Maintenance Alert (CRITICAL - Requiere Foto) ---")
    alert_critical = MaintenanceAlert(
        id=2002,
        rule_id=1,
        asset_type=AssetType.EQUIPMENT,
        asset_id="PUMP-01",
        calculated_value=1050,
        threshold_value=1000,
        status=AlertStatus.PENDING,
        triggered_at=datetime.now(timezone.utc)
    )
    NotificationService.send_maintenance_alert_notification(alert_critical, is_warning=False)
    
    # Give Paho MQTT time to publish the messages
    time.sleep(2)
    print("\nTest finalizado. Desconectando de MQTT...")
    mqtt_worker.client.loop_stop()
    mqtt_worker.client.disconnect()

if __name__ == "__main__":
    main()
