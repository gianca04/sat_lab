import sys
from database import SessionLocal
from models import AssetMeter, MaintenanceAlert
from services.maintenance_job import MaintenanceJob

def add_hours_and_check():
    db = SessionLocal()
    
    try:
        # Get meter
        meter = db.query(AssetMeter).filter(AssetMeter.asset_id == 'Mot_Comp_001').first()
        if not meter:
            print("No meter found")
            return
            
        # Add 6 minutes (0.1 hours)
        meter.total_hours = 0.1
        db.commit()
        print("Updated Mot_Comp_001 to 0.1 hours (6 minutes).")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()
        
    print("Checking alerts...")
    job = MaintenanceJob()
    job.evaluate_all_rules()
    
    db = SessionLocal()
    try:
        # Verify alert
        alerts = db.query(MaintenanceAlert).filter(MaintenanceAlert.asset_id == 'Mot_Comp_001').all()
        if alerts:
            print(f" [OK] Alerta generada! Encontradas {len(alerts)} alertas.")
            for alert in alerts:
                print(f"      - ID: {alert.id}, Regla: {alert.rule_id}, Descripción: {alert.description}")
        else:
            print(" [FAIL] No se generaron alertas.")
    finally:
        db.close()

if __name__ == '__main__':
    add_hours_and_check()
