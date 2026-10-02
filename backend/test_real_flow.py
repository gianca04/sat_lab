import os
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import SessionLocal, engine
from models import (
    Base,
    Equipment,
    MaintenanceRule,
    AssetMeter,
    MaintenanceLog,
    MaintenanceAlert,
    AssetType,
    MaintenanceType,
    TriggerType,
    AlertStatus
)
from services.maintenance_metrics import MaintenanceMetricsCalculator

def main():
    db = SessionLocal()
    
    print("--- 1. MIGRANDO ESTADOS HISTÓRICOS A ASSET METER ---")
    equipments = db.query(Equipment).all()
    
    for eq in equipments:
        # Calcular totales históricos usando tu clase existente
        total_hours = int(MaintenanceMetricsCalculator.accumulated_hours(db, eq.tag_name))
        total_cycles = MaintenanceMetricsCalculator.startup_cycles(db, eq.tag_name)
        
        meter = db.query(AssetMeter).filter_by(asset_type=AssetType.EQUIPMENT, asset_id=eq.tag_name).first()
        if not meter:
            meter = AssetMeter(
                asset_type=AssetType.EQUIPMENT,
                asset_id=eq.tag_name,
                total_hours=total_hours,
                total_cycles=total_cycles,
                total_startups=total_cycles  # Asumiendo 1 a 1 para esta prueba
            )
            db.add(meter)
            print(f" [+] Creado AssetMeter para {eq.tag_name}: {total_hours}h, {total_cycles} ciclos")
        else:
            meter.total_hours = total_hours
            meter.total_cycles = total_cycles
            meter.total_startups = total_cycles
            print(f" [*] Actualizado AssetMeter para {eq.tag_name}: {total_hours}h, {total_cycles} ciclos")
            
    db.commit()
    
    print("\n--- 2. EVALUANDO REGLAS CON NUEVA LÓGICA (AssetMeter) ---")
    rules = db.query(MaintenanceRule).filter_by(is_active=True).all()
    
    if not rules:
        print("No tienes reglas activas en tu base de datos real.")
        
    for rule in rules:
        meter = db.query(AssetMeter).filter_by(
            asset_type=rule.asset_type, 
            asset_id=rule.asset_id
        ).first()
        
        if not meter:
            print(f" [!] Medidor no encontrado para {rule.asset_id}")
            continue
            
        last_log = db.query(MaintenanceLog).filter_by(
            asset_type=rule.asset_type,
            asset_id=rule.asset_id,
            maintenance_type=MaintenanceType.PREVENTIVE
        ).order_by(MaintenanceLog.completed_at.desc()).first()
        
        target_value = rule.threshold_value
        
        if last_log:
            if rule.trigger_type == TriggerType.CYCLES and last_log.cycles_at_execution is not None:
                target_value = last_log.cycles_at_execution + rule.threshold_value
            elif rule.trigger_type == TriggerType.HOURS and last_log.hours_at_execution is not None:
                target_value = last_log.hours_at_execution + rule.threshold_value
            elif rule.trigger_type == TriggerType.STARTUPS and last_log.startups_at_execution is not None:
                target_value = last_log.startups_at_execution + rule.threshold_value
        
        current_value = 0
        if rule.trigger_type == TriggerType.CYCLES:
            current_value = meter.total_cycles
        elif rule.trigger_type == TriggerType.HOURS:
            current_value = meter.total_hours
        elif rule.trigger_type == TriggerType.STARTUPS:
            current_value = meter.total_startups
            
        print(f"\nRegla: '{rule.name}' | Equipo: {rule.asset_id} | Disparador: {rule.trigger_type.value}")
        print(f"  -> Odómetro Actual  : {current_value}")
        print(f"  -> Objetivo (Target): {target_value}")
        
        if current_value >= target_value:
            print("  >>> ESTADO: ¡Mantenimiento REQUERIDO! (Generaría Alerta)")
        else:
            faltan = target_value - current_value
            print(f"  >>> ESTADO: OK (Faltan {faltan} para el próximo mantenimiento)")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine) # Ensure new table AssetMeter is created in the real DB
    main()
