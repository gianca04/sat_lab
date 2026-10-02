import os
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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

# Use SQLite in-memory for this isolated test
engine = create_engine("sqlite:///:memory:", echo=False)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(bind=engine)

def evaluate_maintenance_rules(db):
    """
    Simulates the Rule Engine evaluating if a new maintenance alert should be fired.
    """
    print("\n--- Evaluando Reglas de Mantenimiento ---")
    rules = db.query(MaintenanceRule).filter_by(is_active=True).all()
    
    alerts_generated = 0
    
    for rule in rules:
        # Get current meter for the asset
        meter = db.query(AssetMeter).filter_by(
            asset_type=rule.asset_type, 
            asset_id=rule.asset_id
        ).first()
        
        if not meter:
            continue
            
        # Get the latest maintenance log of this type to know the snapshot
        # For simplicity in this test, we assume rules map to PREVENTIVE maintenance.
        # In a real app, the Rule might specify the MaintenanceType.
        last_log = db.query(MaintenanceLog).filter_by(
            asset_type=rule.asset_type,
            asset_id=rule.asset_id,
            maintenance_type=MaintenanceType.PREVENTIVE
        ).order_by(MaintenanceLog.completed_at.desc()).first()
        
        # Calculate next threshold target
        target_value = rule.threshold_value
        
        if last_log:
            if rule.trigger_type == TriggerType.CYCLES and last_log.cycles_at_execution is not None:
                target_value = last_log.cycles_at_execution + rule.threshold_value
            elif rule.trigger_type == TriggerType.HOURS and last_log.hours_at_execution is not None:
                target_value = last_log.hours_at_execution + rule.threshold_value
            elif rule.trigger_type == TriggerType.STARTUPS and last_log.startups_at_execution is not None:
                target_value = last_log.startups_at_execution + rule.threshold_value
        
        # Current value based on trigger type
        current_value = 0
        if rule.trigger_type == TriggerType.CYCLES:
            current_value = meter.total_cycles
        elif rule.trigger_type == TriggerType.HOURS:
            current_value = meter.total_hours
        elif rule.trigger_type == TriggerType.STARTUPS:
            current_value = meter.total_startups
            
        print(f"[Regla: {rule.name}] Equipo: {rule.asset_id} | Tipo: {rule.trigger_type.value}")
        print(f"   -> Odómetro actual: {current_value}")
        print(f"   -> Próximo Mantenimiento (Target): {target_value}")
        
        # Check if an active alert already exists so we don't spam
        existing_alert = db.query(MaintenanceAlert).filter_by(
            rule_id=rule.id,
            status=AlertStatus.PENDING
        ).first()
        
        if current_value >= target_value:
            if not existing_alert:
                alert = MaintenanceAlert(
                    id=int(datetime.now().timestamp() * 1000) % 1000000,
                    rule_id=rule.id,
                    asset_type=rule.asset_type,
                    asset_id=rule.asset_id,
                    calculated_value=current_value,
                    threshold_value=target_value,
                    status=AlertStatus.PENDING
                )
                db.add(alert)
                alerts_generated += 1
                print(f"   >>> ¡ALERTA GENERADA! Límite alcanzado/superado. ({current_value} >= {target_value})")
            else:
                print("   >>> Ya existe una alerta PENDIENTE. No se genera una nueva.")
        else:
            print("   >>> Todo OK. No se requiere mantenimiento aún.")
            
    db.commit()
    return alerts_generated


def main():
    db = SessionLocal()
    
    # 1. SETUP: Create Asset, Meter and Rule
    print("1. Configurando Base de Datos (Equipo, Medidor, Regla)...")
    valvula = Equipment(tag_name="VALVULA_2", name="Válvula de Presión 2")
    db.add(valvula)
    
    meter = AssetMeter(
        id=1,
        asset_type=AssetType.EQUIPMENT,
        asset_id="VALVULA_2",
        total_cycles=5  # Actualmente la válvula tiene 5 ciclos físicos
    )
    db.add(meter)
    
    rule = MaintenanceRule(
        id=1,
        name="Mantenimiento de Válvula cada 5 ciclos",
        asset_type=AssetType.EQUIPMENT,
        asset_id="VALVULA_2",
        trigger_type=TriggerType.CYCLES,
        threshold_value=5
    )
    db.add(rule)
    db.commit()
    
    # 2. RUN ENGINE (First check)
    # Expected: The meter is at 5, threshold is 5, there is no previous maintenance.
    # It should generate an Alert.
    print("\n[ESCENARIO 1] La válvula ha completado 5 ciclos. Evaluamos:")
    evaluate_maintenance_rules(db)
    
    # 3. PERFORM MAINTENANCE
    print("\n3. Técnico realiza el mantenimiento y crea el log...")
    
    # El técnico resuelve la alerta (opcional, pero buena práctica)
    alert = db.query(MaintenanceAlert).filter_by(status=AlertStatus.PENDING).first()
    if alert:
        alert.status = AlertStatus.RESOLVED
    
    log = MaintenanceLog(
        id=int(datetime.now().timestamp() * 1000) % 1000000,
        asset_type=AssetType.EQUIPMENT,
        asset_id="VALVULA_2",
        maintenance_type=MaintenanceType.PREVENTIVE,
        technician="Giancarlo",
        description="Lubricación y cambio de sellos tras 5 ciclos",
        executed_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        
        # ¡SNAPSHOT DEL ODÓMETRO EN ESTE MOMENTO EXACTO!
        cycles_at_execution=meter.total_cycles  # Guardará '5'
    )
    db.add(log)
    db.commit()
    print(f"Log guardado. Mantenimiento registrado en {meter.total_cycles} ciclos.")
    
    # 4. RUN ENGINE (Second check)
    # Expected: Meter is 5, threshold is 5. But previous log was at 5. Target = 5 + 5 = 10.
    # Meter (5) < Target (10). Should NOT generate alert.
    print("\n[ESCENARIO 2] Justo después del mantenimiento. Evaluamos:")
    evaluate_maintenance_rules(db)
    
    # 5. FAST FORWARD (Válvula sigue trabajando)
    print("\n5. Simulando que la válvula trabaja hasta llegar a 10 ciclos...")
    meter.total_cycles = 10
    db.commit()
    
    # 6. RUN ENGINE (Third check)
    # Expected: Meter is 10. Target is 10. Should generate a new Alert.
    print("\n[ESCENARIO 3] La válvula alcanza los 10 ciclos. Evaluamos:")
    evaluate_maintenance_rules(db)

if __name__ == "__main__":
    main()
