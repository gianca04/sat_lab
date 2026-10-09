import os
from database import SessionLocal
from models import (
    MaintenanceLog,
    MaintenanceAlert,
    MaintenanceRule,
    EquipmentHistoryStatus,
    AssetMeter
)

def clear_data():
    db = SessionLocal()
    try:
        print("--- Iniciando limpieza de tablas ---")
        
        # El orden es importante por las claves foráneas (Foreign Keys)
        
        # 1. Eliminar logs (tienen FK hacia maintenance_alerts)
        deleted_logs = db.query(MaintenanceLog).delete()
        print(f" [✅] MaintenanceLog: {deleted_logs} registros eliminados.")
        
        # 2. Eliminar alertas (tienen FK hacia maintenance_rules)
        deleted_alerts = db.query(MaintenanceAlert).delete()
        print(f" [✅] MaintenanceAlert: {deleted_alerts} registros eliminados.")
        
        # 3. Eliminar reglas
        deleted_rules = db.query(MaintenanceRule).delete()
        print(f" [✅] MaintenanceRule: {deleted_rules} registros eliminados.")
        
        # 4. Eliminar el historial de estados de equipos
        deleted_history = db.query(EquipmentHistoryStatus).delete()
        print(f" [✅] EquipmentHistoryStatus: {deleted_history} registros eliminados.")
        
        # 5. Eliminar odómetros (AssetMeter)
        deleted_meters = db.query(AssetMeter).delete()
        print(f" [✅] AssetMeter: {deleted_meters} registros eliminados.")
        
        db.commit()
        print("\n🏆 ¡Todas las tablas solicitadas fueron limpiadas con éxito!")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error durante la limpieza: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
