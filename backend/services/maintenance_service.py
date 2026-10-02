from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from models import (
    AlertStatus,
    AssetType,
    MaintenanceAlert,
    MaintenanceRule,
)
from services.notification_service import NotificationService


class MaintenanceService:
    """
    Service containing business logic for maintenance rules and alert evaluation.
    """

    @staticmethod
    def generate_maintenance_alert(
        db: Session,
        rule: MaintenanceRule,
        current_value: int,
        notify: bool = True,
    ) -> Optional[MaintenanceAlert]:
        """
        Evaluates current metric against a maintenance rule and creates an alert if violated.

        Logic:
          - 85% of threshold = WARNING
          - 100% of threshold = CRITICAL
        """
        if not rule.is_active:
            return None

        warning_threshold = int(rule.threshold_value * 0.85)

        # Si aún no llegamos ni al 85%, no hacemos nada
        if current_value < warning_threshold:
            return None

        is_critical = current_value >= rule.threshold_value

        # Buscar si ya hay una alerta no resuelta para esta regla
        existing = (
            db.query(MaintenanceAlert)
            .filter(
                MaintenanceAlert.rule_id == rule.id,
                MaintenanceAlert.status.in_([AlertStatus.PENDING, AlertStatus.ACKNOWLEDGED]),
            )
            .first()
        )

        if existing:
            # Si ya cruzó el 100% antes, no volvemos a generar alertas
            if existing.calculated_value >= rule.threshold_value:
                return None
            
            # Si era un warning (estaba en 85%+) y AHORA cruzó a 100% (Crítico), actualizamos y notificamos
            if is_critical and existing.calculated_value < rule.threshold_value:
                existing.calculated_value = current_value
                db.commit()
                if notify:
                    NotificationService.send_maintenance_alert_notification(existing, is_warning=False)
                return existing
            
            # Si sigue en zona de warning (85-99%), no hacemos spam
            return None

        # Si no existía alerta, creamos una nueva (ya sea warning o critical)
        alert = MaintenanceAlert(
            rule_id=rule.id,
            asset_type=rule.asset_type,
            asset_id=rule.asset_id,
            calculated_value=current_value,
            threshold_value=rule.threshold_value,
            status=AlertStatus.PENDING,
            triggered_at=datetime.now(timezone.utc),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        if notify:
            NotificationService.send_maintenance_alert_notification(alert, is_warning=not is_critical)

        return alert
