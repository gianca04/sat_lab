import os
from sqlalchemy import text
from database import engine

def test_query():
    print("--- 1. Probando la consulta SQL antes de crear la vista ---")
    
    test_sql = """
    SELECT 
        r.name AS rule_name,
        r.asset_id,
        r.trigger_type,
        r.threshold_value,
        CASE 
            WHEN r.trigger_type = 'HOURS' THEN m.total_hours
            WHEN r.trigger_type = 'CYCLES' THEN m.total_cycles
            WHEN r.trigger_type = 'STARTUPS' THEN m.total_startups
            ELSE 0 
        END AS current_value,
        
        COALESCE(
            CASE 
                WHEN r.trigger_type = 'HOURS' THEN l.hours_at_execution
                WHEN r.trigger_type = 'CYCLES' THEN l.cycles_at_execution
                WHEN r.trigger_type = 'STARTUPS' THEN l.startups_at_execution
                ELSE 0 
            END, 0
        ) AS last_log_value,
        
        ROUND(
            (
                (
                    CASE 
                        WHEN r.trigger_type = 'HOURS' THEN m.total_hours
                        WHEN r.trigger_type = 'CYCLES' THEN m.total_cycles
                        WHEN r.trigger_type = 'STARTUPS' THEN m.total_startups
                        ELSE 0 
                    END 
                    - 
                    COALESCE(
                        CASE 
                            WHEN r.trigger_type = 'HOURS' THEN l.hours_at_execution
                            WHEN r.trigger_type = 'CYCLES' THEN l.cycles_at_execution
                            WHEN r.trigger_type = 'STARTUPS' THEN l.startups_at_execution
                            ELSE 0 
                        END, 0
                    )
                ) * 100.0 / NULLIF(r.threshold_value, 0)
            )::numeric, 2
        ) AS percentage

    FROM maintenance_rules r
    JOIN asset_meters m 
        ON r.asset_type = m.asset_type AND r.asset_id = m.asset_id
    LEFT JOIN (
        SELECT ml.*
        FROM maintenance_logs ml
        INNER JOIN (
            SELECT asset_type, asset_id, MAX(id) as max_id 
            FROM maintenance_logs 
            WHERE maintenance_type IN ('PREVENTIVE', 'CORRECTIVE') 
            GROUP BY asset_type, asset_id
        ) latest ON ml.id = latest.max_id
    ) l 
        ON r.asset_type = l.asset_type AND r.asset_id = l.asset_id
    WHERE r.is_active = true;
    """

    with engine.connect() as conn:
        result = conn.execute(text(test_sql))
        rows = result.fetchall()
        
        if not rows:
            print(" [i] La consulta se ejecutó sin errores SQL, pero no hay reglas activas que coincidan.")
        else:
            for row in rows:
                print(f" [OK] Regla evaluada: {row.rule_name} | Equipo: {row.asset_id} | Progreso: {row.percentage}%")
        
        return True

def create_view():
    print("\n--- 2. Creando la Vista en la Base de Datos ---")
    
    view_sql = """
    CREATE OR REPLACE VIEW vw_maintenance_compliance AS
    SELECT 
        r.name AS rule_name,
        r.asset_id,
        r.trigger_type,
        r.threshold_value,
        CASE 
            WHEN r.trigger_type = 'HOURS' THEN m.total_hours
            WHEN r.trigger_type = 'CYCLES' THEN m.total_cycles
            WHEN r.trigger_type = 'STARTUPS' THEN m.total_startups
            ELSE 0 
        END AS current_value,
        
        COALESCE(
            CASE 
                WHEN r.trigger_type = 'HOURS' THEN l.hours_at_execution
                WHEN r.trigger_type = 'CYCLES' THEN l.cycles_at_execution
                WHEN r.trigger_type = 'STARTUPS' THEN l.startups_at_execution
                ELSE 0 
            END, 0
        ) AS last_log_value,
        
        ROUND(
            (
                (
                    CASE 
                        WHEN r.trigger_type = 'HOURS' THEN m.total_hours
                        WHEN r.trigger_type = 'CYCLES' THEN m.total_cycles
                        WHEN r.trigger_type = 'STARTUPS' THEN m.total_startups
                        ELSE 0 
                    END 
                    - 
                    COALESCE(
                        CASE 
                            WHEN r.trigger_type = 'HOURS' THEN l.hours_at_execution
                            WHEN r.trigger_type = 'CYCLES' THEN l.cycles_at_execution
                            WHEN r.trigger_type = 'STARTUPS' THEN l.startups_at_execution
                            ELSE 0 
                        END, 0
                    )
                ) * 100.0 / NULLIF(r.threshold_value, 0)
            )::numeric, 2
        ) AS percentage

    FROM maintenance_rules r
    JOIN asset_meters m 
        ON r.asset_type = m.asset_type AND r.asset_id = m.asset_id
    LEFT JOIN (
        SELECT ml.*
        FROM maintenance_logs ml
        INNER JOIN (
            SELECT asset_type, asset_id, MAX(id) as max_id 
            FROM maintenance_logs 
            WHERE maintenance_type IN ('PREVENTIVE', 'CORRECTIVE') 
            GROUP BY asset_type, asset_id
        ) latest ON ml.id = latest.max_id
    ) l 
        ON r.asset_type = l.asset_type AND r.asset_id = l.asset_id
    WHERE r.is_active = true;
    """
    
    try:
        with engine.begin() as conn:
            conn.execute(text(view_sql))
        print(" [OK] ¡Vista 'vw_maintenance_compliance' creada exitosamente!")
    except Exception as e:
        print(f" [FAIL] Error al crear la vista: {e}")

def verify_view():
    print("\n--- 3. Verificando la Consulta a la Vista ---")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM vw_maintenance_compliance"))
            rows = result.fetchall()
            if not rows:
                print(" [i] La vista funciona, pero devolvió 0 filas.")
            for row in rows:
                print(f" [OK] VISTA - [{row.asset_id}] {row.rule_name} -> {row.percentage}%")
    except Exception as e:
        print(f" [FAIL] Error al consultar la vista: {e}")

if __name__ == "__main__":
    try:
        if test_query():
            create_view()
            verify_view()
    except Exception as e:
        print(f"Error fatal: {e}")
