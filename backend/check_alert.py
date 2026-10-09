import sys
from database import SessionLocal
from models import AssetMeter, MaintenanceAlert

def check_results():
    db = SessionLocal()
    try:
        meter = db.query(AssetMeter).filter(AssetMeter.asset_id == 'Mot_Comp_001').first()
        if meter:
            print(f"Estado de Mot_Comp_001:")
            print(f" - Horas acumuladas: {meter.total_hours} (Aprox. {meter.total_hours * 60:.2f} minutos)")
        else:
            print("No se encontró el medidor para Mot_Comp_001")
            
        alerts = db.query(MaintenanceAlert).filter(MaintenanceAlert.asset_id == 'Mot_Comp_001').all()
        if alerts:
            print(f"\n[ÉXITO] ¡Alerta encontrada! Cantidad: {len(alerts)}")
            for alert in alerts:
                print(f" - Alerta ID: {alert.id}, Regla ID: {alert.rule_id}, Creada en: {alert.created_at}")
        else:
            print("\n[FALLO] No se generaron alertas aún.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    check_results()
