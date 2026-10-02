import sys
from sqlalchemy.orm import Session
from database import SessionLocal
from models import MaintenanceRule, AssetType, TriggerType

def setup():
    db: Session = SessionLocal()
    try:
        # Check if rule already exists
        existing = db.query(MaintenanceRule).filter_by(
            name="Mantenimiento de Válvula 002 (Ciclos)",
            asset_id="Val_002"
        ).first()

        if existing:
            print(f"Rule already exists: ID={existing.id}")
            # Reset values for clean test
            existing.threshold_value = 5
            existing.trigger_type = TriggerType.CYCLES
            existing.is_active = True
            db.commit()
            print("Rule reset to 5 cycles.")
            return

        rule = MaintenanceRule(
            name="Mantenimiento de Válvula 002 (Ciclos)",
            description="Regla de prueba de integración generada automáticamente.",
            asset_type=AssetType.EQUIPMENT,
            asset_id="Val_002",
            trigger_type=TriggerType.CYCLES,
            threshold_value=5,
            is_active=True
        )
        db.add(rule)
        db.commit()
        print("Integration test rule created successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    setup()
