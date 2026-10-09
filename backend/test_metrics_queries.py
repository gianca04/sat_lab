import os
from sqlalchemy import text
from database import SessionLocal, engine
from models import TriggerType, AssetType
from services.maintenance_metrics import MaintenanceMetricsCalculator

def main():
    db = SessionLocal()
    
    print("--- 1. Actualizando y verificando métricas (Lógica Python) ---")
    # Buscar dinámicamente todos los tags de equipos
    result = db.execute(text("SELECT tag_name, name FROM equipments")).fetchall()
    equipments = [row[0] for row in result]
    
    if not equipments:
        print("No hay equipos registrados en la base de datos.")
    
    for eq_id in equipments:
        hours = MaintenanceMetricsCalculator.accumulated_hours(db, eq_id)
        cycles = MaintenanceMetricsCalculator.startup_cycles(db, eq_id)
        print(f"[{eq_id}] Lógica Python -> Horas: {hours:.2f} | Ciclos: {cycles}")
        
        # Sincronizar asset_meters
        MaintenanceMetricsCalculator.get_current_value(db, eq_id, TriggerType.HOURS)
        MaintenanceMetricsCalculator.get_current_value(db, eq_id, TriggerType.CYCLES)
    
    print("\n--- 2. Probando la consulta SQL (Para Grafana) ---")
    
    sql_motores = """
    SELECT 
        e.tag_name AS motor_id,
        m.total_hours AS horas_totales
    FROM asset_meters m
    JOIN equipments e ON m.asset_id = e.tag_name AND m.asset_type = 'EQUIPMENT'
    JOIN type_equipments te ON e.type_equipment_id = te.id
    WHERE te.name = 'MOTOR';
    """
    
    sql_valvulas = """
    SELECT 
        e.tag_name AS valvula_id,
        m.total_cycles AS ciclos_totales
    FROM asset_meters m
    JOIN equipments e ON m.asset_id = e.tag_name AND m.asset_type = 'EQUIPMENT'
    JOIN type_equipments te ON e.type_equipment_id = te.id
    WHERE te.name = 'VALVE';
    """
    
    with engine.connect() as conn:
        print(">> MOTORES (Horas):")
        rows = conn.execute(text(sql_motores)).fetchall()
        for row in rows:
            print(f"   - {row[0]}: {row[1]} horas")
            
        print("\n>> VALVULAS (Ciclos):")
        rows = conn.execute(text(sql_valvulas)).fetchall()
        for row in rows:
            print(f"   - {row[0]}: {row[1]} ciclos")
            
    db.close()

if __name__ == "__main__":
    main()
