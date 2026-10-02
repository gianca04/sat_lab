import os
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import SessionLocal
from models import (
    EquipmentHistoryStatus,
    EquipmentOperatingStatus,
    MaintenanceRule,
    AssetMeter,
    AssetType,
    TriggerType
)
from services.maintenance_metrics import MaintenanceMetricsCalculator

def main():
    db = SessionLocal()
    
    # 1. Crear regla de mantenimiento para MOTOR_01
    rule = db.query(MaintenanceRule).filter_by(asset_id="MOTOR_01", trigger_type=TriggerType.HOURS).first()
    if not rule:
        rule = MaintenanceRule(
            name="Mantenimiento preventivo Motor 01 (2 Horas)",
            asset_type=AssetType.EQUIPMENT,
            asset_id="MOTOR_01",
            trigger_type=TriggerType.HOURS,
            threshold_value=2
        )
        db.add(rule)
        print(" [+] Regla de 2 horas creada para MOTOR_01.")
    
    # 2. Obtener historial existente para calcular cuánto falta para 01:55 (115 minutos)
    current_hours = MaintenanceMetricsCalculator.accumulated_hours(db, "MOTOR_01")
    target_hours = 115 / 60.0 # 1.91666 hours
    
    if current_hours < target_hours:
        diff_seconds = (target_hours - current_hours) * 3600
        
        # Insertar un bloque de tiempo (RUNNING -> STOPPED) artificial en el pasado reciente
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(seconds=diff_seconds + 60)
        end_time = start_time + timedelta(seconds=diff_seconds)
        
        run_event = EquipmentHistoryStatus(
            equipment_id="MOTOR_01",
            status=EquipmentOperatingStatus.RUNNING,
            event_time=start_time
        )
        stop_event = EquipmentHistoryStatus(
            equipment_id="MOTOR_01",
            status=EquipmentOperatingStatus.STOPPED,
            event_time=end_time
        )
        
        db.add(run_event)
        db.add(stop_event)
        print(f" [+] Insertado historial artificial de {diff_seconds / 60:.2f} minutos.")
        db.commit()
    
    # 3. Actualizar AssetMeter
    new_hours = MaintenanceMetricsCalculator.accumulated_hours(db, "MOTOR_01")
    new_cycles = MaintenanceMetricsCalculator.startup_cycles(db, "MOTOR_01")
    
    meter = db.query(AssetMeter).filter_by(asset_id="MOTOR_01").first()
    if not meter:
        meter = AssetMeter(
            asset_type=AssetType.EQUIPMENT,
            asset_id="MOTOR_01",
            total_hours=int(new_hours),
            total_cycles=new_cycles,
            total_startups=new_cycles
        )
        db.add(meter)
    else:
        meter.total_hours = int(new_hours)
        meter.total_cycles = new_cycles
        meter.total_startups = new_cycles
        
    db.commit()
    
    print("\n=== RESUMEN DE LA PREPARACIÓN ===")
    print(f"Horas reales acumuladas (float) : {new_hours:.4f} horas ({new_hours * 60:.2f} minutos)")
    print(f"Horas en AssetMeter (int)       : {meter.total_hours} horas")
    print(f"Umbral de la regla              : {rule.threshold_value} horas")
    print("---------------------------------")
    print("TODO LISTO. Faltan aproximadamente 5 minutos de uso para que el odómetro interno")
    print("alcance las 2.0000 horas reales y el int(hours) pase de 1 a 2, disparando la alerta.")

if __name__ == "__main__":
    main()
