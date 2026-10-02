import logging
import os
from typing import Any, Dict

from models import (
    MaintenanceAlert,
    MaintenanceLog,
    SparkplugLifecycleEvent,
)

logger = logging.getLogger("industrial_notifications")


class NotificationService:
    """
    Centralized service for dispatching notifications across industrial events.
    Supports email, MQTT, webhooks, or logging without polluting database models.
    """

    @staticmethod
    def send_sparkplug_lifecycle_notification(event: SparkplugLifecycleEvent) -> None:
        """
        Dispatches notification when a Sparkplug B Node or Device changes state
        (e.g., NDEATH/DDEATH indicates asset went offline).
        """
        target_name = event.device_id if event.device_id else event.node_id
        target_type = "Dispositivo" if event.device_id else "Nodo Edge"
        
        if event.status.value == "OFFLINE":
            header = "⚠️ [DESCONEXIÓN DE RED]"
            action = "ha perdido conexión con la red (DDEATH/NDEATH)."
            request_photo = True
        else:
            header = "✅ [CONEXIÓN RESTABLECIDA]"
            action = "se ha conectado exitosamente a la red (DBIRTH/NBIRTH)."
            request_photo = False
            
        message = (
            f"<b>{header}</b>\n"
            f"El {target_type} <b>{target_name}</b> {action}\n\n"
            f"<code>"
            f"ID Evento  : {event.id}\n"
            f"Estado     : {event.status.value}\n"
            f"Hora (UTC) : {event.event_time.strftime('%Y-%m-%d %H:%M:%S')}"
            f"</code>\n\n"
            f"{'Por favor, verifique el estado físico del equipo en campo.' if request_photo else 'Operación normal restablecida.'}"
        )

        logger.info(f"Lifecycle Event: {event.status.value} - {target_name}")

        try:
            import json
            from services.mqtt_worker import mqtt_worker
            payload = {
                "message": message,
                "take_photo": request_photo
            }
            topic = os.getenv("MQTT_TOPIC_NOTIFICATIONS", "lab_sat/notifications")
            mqtt_worker.client.publish(topic, json.dumps(payload), qos=1)
        except Exception as e:
            logger.error(f"Error publicando lifecycle a MQTT: {e}")

    @staticmethod
    def send_maintenance_alert_notification(alert: MaintenanceAlert, is_warning: bool = False) -> None:
        """
        Dispatches high-priority alert notification when an operational threshold is violated.
        """
        if is_warning:
            header = "⚠️ [AVISO PREVENTIVO]"
            body = (
                f"El activo <b>{alert.asset_id}</b> ({alert.asset_type.value}) está próximo a requerir mantenimiento.\n\n"
                f"<code>"
                f"Métrica Actual  : {alert.calculated_value}\n"
                f"Límite (Umbral) : {alert.threshold_value}\n"
                f"Progreso        : {int((alert.calculated_value / alert.threshold_value) * 100)}%\n"
                f"Estado          : {alert.status.value}"
                f"</code>\n\n"
                f"Se recomienda programar la intervención para evitar paradas no planificadas."
            )
        else:
            header = "🛑 [MANTENIMIENTO REQUERIDO]"
            body = (
                f"El activo <b>{alert.asset_id}</b> ({alert.asset_type.value}) ha superado su límite de operación segura.\n\n"
                f"<code>"
                f"Métrica Actual  : {alert.calculated_value}\n"
                f"Límite (Umbral) : {alert.threshold_value}\n"
                f"Estado          : CRÍTICO"
                f"</code>\n\n"
                f"Se requiere intervención de mantenimiento a la brevedad."
            )

        message = f"<b>{header}</b>\n\n{body}"
        logger.critical(f"[{alert.id}] {header} - {alert.asset_id}")

        # Publicar vía MQTT para que sat_telegram_notifier lo recoja
        try:
            import json
            from services.mqtt_worker import mqtt_worker
            
            payload = {
                "message": message,
                "take_photo": True
            }
            
            topic = os.getenv("MQTT_TOPIC_NOTIFICATIONS", "lab_sat/notifications")
            mqtt_worker.client.publish(topic, json.dumps(payload), qos=1)
            logger.info(f"Notificación de alerta enviada al broker MQTT: {topic}")
        except Exception as e:
            logger.error(f"Error publicando alerta a MQTT: {e}")

    @staticmethod
    def send_maintenance_log_notification(log_entry: MaintenanceLog) -> None:
        """
        Notifies maintenance supervisors upon logging new preventive/corrective actions.
        """
        message = (
            f"[MAINTENANCE LOG #{log_entry.id}] {log_entry.maintenance_type.value} maintenance "
            f"registered for {log_entry.asset_type.value} '{log_entry.asset_id}' "
            f"by technician '{log_entry.technician or 'Unassigned'}'"
        )
        logger.info(message)
