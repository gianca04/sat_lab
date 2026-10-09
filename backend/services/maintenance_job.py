import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import SessionLocal
from models import MaintenanceRule, AssetType, TriggerType
from services.maintenance_metrics import maintenance_metrics
from services.maintenance_service import MaintenanceService

logger = logging.getLogger("maintenance_job")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [MAINT_JOB] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class MaintenanceJob:
    """
    Background job that periodically evaluates maintenance rules.
    
    This is necessary because some metrics (HOURS, CALENDAR_DAYS) accumulate continuously
    without relying on discrete state transitions. This job ensures alerts are triggered
    even if the equipment state hasn't changed recently.
    """
    
    def __init__(self, interval_seconds: int = 60): # 1 minute for near real-time evaluation
        self.interval_seconds = interval_seconds
        self._is_running = False
        self._task = None

    async def _run_loop(self):
        logger.debug(f"Starting periodic maintenance evaluator job (interval={self.interval_seconds}s)")
        while self._is_running:
            try:
                self.evaluate_all_rules()
            except Exception as e:
                logger.error(f"Error evaluating maintenance rules: {e}", exc_info=True)
            
            await asyncio.sleep(self.interval_seconds)

    def evaluate_all_rules(self):
        db: Session = SessionLocal()
        try:
            # Only evaluate active equipment rules that are time-based.
            # CYCLES and STARTUPS are purely event-driven and already handled by mqtt_worker in real-time.
            rules = db.execute(
                select(MaintenanceRule).where(
                    MaintenanceRule.is_active == True,
                    MaintenanceRule.asset_type == AssetType.EQUIPMENT,
                    MaintenanceRule.trigger_type.notin_([TriggerType.CYCLES, TriggerType.STARTUPS])
                )
            ).scalars().all()

            for rule in rules:
                current_value = maintenance_metrics.get_current_value(
                    db=db,
                    equipment_id=rule.asset_id,
                    trigger_type=rule.trigger_type,
                )
                
                # generate_maintenance_alert already has duplicate guards
                MaintenanceService.generate_maintenance_alert(
                    db=db,
                    rule=rule,
                    current_value=current_value,
                    notify=True,
                )
        finally:
            db.close()

    def start(self):
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        self._is_running = False
        if self._task:
            self._task.cancel()

# Singleton instance
maintenance_job = MaintenanceJob(interval_seconds=60) # Run every minute in production
