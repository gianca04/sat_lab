import os
from datetime import datetime, timezone
from sqlalchemy import text
from database import SessionLocal, engine
from models import MaintenanceLog, MaintenanceType, AssetType

def simulate_maintenance():
    db = SessionLocal()
    
    print("--- 1. Consultando la Vista ANTES del mantenimiento ---")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT rule_name, asset_id, percentage FROM vw_maintenance_compliance WHERE asset_id='MOTOR_01'"))
        row = result.first()
        print(f"Estado Actual: [{row.asset_id}] {row.rule_name} -> {row.percentage}%")
    
    print("\n--- 2. Simular que el Técnico realiza el Mantenimiento del Motor ---")
    # Para MOTOR_01, vamos a sacar su odómetro actual
    meter_result = db.execute(text("SELECT total_hours FROM asset_meters WHERE asset_id='MOTOR_01'")).first()
    current_hours = meter_result[0]
    
    log = MaintenanceLog(
        asset_type=AssetType.EQUIPMENT,
        asset_id="MOTOR_01",
        maintenance_type=MaintenanceType.PREVENTIVE,
        technician="Giancarlo (Prueba)",
        description="Mantenimiento de prueba para validar reinicio de vista en Grafana",
        completed_at=datetime.now(timezone.utc),
        hours_at_execution=current_hours # ¡SNAPSHOT!
    )
    db.add(log)
    db.commit()
    print(f"✅ MaintenanceLog guardado con hours_at_execution = {current_hours}")
    
    print("\n--- 3. Consultando la Vista DESPUÉS del mantenimiento ---")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT rule_name, asset_id, percentage FROM vw_maintenance_compliance WHERE asset_id='MOTOR_01'"))
        row = result.first()
        print(f"Nuevo Estado: [{row.asset_id}] {row.rule_name} -> {row.percentage}%")

if __name__ == "__main__":
    simulate_maintenance()
