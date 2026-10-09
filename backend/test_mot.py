from database import SessionLocal
from models import AssetMeter, MaintenanceRule, MaintenanceLog, MaintenanceAlert

def setup_test():
    db = SessionLocal()
    
    try:
        # Delete existing data for Mot_Comp_001
        db.query(MaintenanceAlert).filter(MaintenanceAlert.asset_id == 'Mot_Comp_001').delete()
        db.query(MaintenanceLog).filter(MaintenanceLog.asset_id == 'Mot_Comp_001').delete()
        db.query(MaintenanceRule).filter(MaintenanceRule.asset_id == 'Mot_Comp_001').delete()
        db.query(AssetMeter).filter(AssetMeter.asset_id == 'Mot_Comp_001').delete()
        
        # 1. Create AssetMeter for Mot_Comp_001 with 0 hours
        meter = AssetMeter(
            asset_id='Mot_Comp_001',
            asset_type='EQUIPMENT',
            total_hours=0.0,
            total_cycles=0,
            total_startups=0
        )
        db.add(meter)
        
        # 2. Create Rule for Mot_Comp_001 (5 minutes = 5 / 60 = 0.083333 hours)
        threshold_hours = 5.0 / 60.0
        rule = MaintenanceRule(
            asset_id='Mot_Comp_001',
            asset_type='EQUIPMENT',
            name='Test 5 Minutos',
            description='Regla de prueba de 5 minutos',
            trigger_type='HOURS',
            threshold_value=threshold_hours,
            is_active=True
        )
        db.add(rule)
        
        db.commit()
        print(f" [OK] Creado AssetMeter para Mot_Comp_001 con 0 horas.")
        print(f" [OK] Creada Regla de Mantenimiento para Mot_Comp_001: umbral {threshold_hours:.4f} horas (5 min).")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    setup_test()
