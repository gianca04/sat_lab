import logging
from sqlalchemy import text
from sqlalchemy.engine import Engine

from database import Base, engine

logger = logging.getLogger("database_initializer")


class DatabaseInitializer:
    """
    Manages automated database schema setup, triggers, and PostgreSQL procedural routines.
    Ensures tables, enums, triggers, and stored functions are deployed idempotently.
    """

    SPARKPLUG_EVENT_ROUTINE_SQL = """
    CREATE OR REPLACE FUNCTION register_sparkplug_lifecycle_event(
        p_event_type VARCHAR(20),
        p_node_id VARCHAR(100),
        p_device_id VARCHAR(100),
        p_status VARCHAR(20),
        p_event_time TIMESTAMPTZ
    ) RETURNS void AS $$
    BEGIN
        -- 1. Auto-register Node if not exists (Self-discovery)
        INSERT INTO nodes (tag_name, name, created_at)
        VALUES (p_node_id, p_node_id, p_event_time)
        ON CONFLICT (tag_name) DO NOTHING;

        -- 2. Auto-register Device if provided in the event (DBIRTH / DDEATH)
        IF p_device_id IS NOT NULL AND p_device_id <> '' AND p_device_id <> 'null' THEN
            INSERT INTO devices (tag_name, node_tag, name, created_at)
            VALUES (p_device_id, p_node_id, p_device_id, p_event_time)
            ON CONFLICT (tag_name) DO UPDATE 
                SET node_tag = EXCLUDED.node_tag;
        END IF;

        -- 3. Insert lifecycle event log
        INSERT INTO sparkplug_lifecycle_events (
            event_type,
            node_id,
            device_id,
            status,
            event_time
        ) VALUES (
            p_event_type::sparkplug_event_type_enum,
            p_node_id,
            CASE 
                WHEN p_device_id IS NULL OR p_device_id = '' OR p_device_id = 'null' THEN NULL 
                ELSE p_device_id 
            END,
            p_status::network_status_enum,
            p_event_time
        );
    END;
    $$ LANGUAGE plpgsql;
    """

    TRIGGER_AUTO_PROVISION_SQL = """
    -- Trigger function that auto-provisions Node & Device BEFORE an INSERT occurs on sparkplug_lifecycle_events
    CREATE OR REPLACE FUNCTION trg_auto_provision_sparkplug_assets()
    RETURNS TRIGGER AS $$
    BEGIN
        -- 1. Auto-register Node if not exists
        INSERT INTO nodes (tag_name, name, created_at)
        VALUES (NEW.node_id, NEW.node_id, NEW.event_time)
        ON CONFLICT (tag_name) DO NOTHING;

        -- 2. Auto-register Device if provided
        IF NEW.device_id IS NOT NULL AND NEW.device_id <> '' AND NEW.device_id <> 'null' THEN
            INSERT INTO devices (tag_name, node_tag, name, created_at)
            VALUES (NEW.device_id, NEW.node_id, NEW.device_id, NEW.event_time)
            ON CONFLICT (tag_name) DO UPDATE 
                SET node_tag = EXCLUDED.node_tag;
        ELSE
            NEW.device_id := NULL;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Attach trigger to sparkplug_lifecycle_events
    DROP TRIGGER IF EXISTS trg_before_insert_sparkplug_event ON sparkplug_lifecycle_events;
    CREATE TRIGGER trg_before_insert_sparkplug_event
    BEFORE INSERT ON sparkplug_lifecycle_events
    FOR EACH ROW
    EXECUTE FUNCTION trg_auto_provision_sparkplug_assets();
    """

    DEFAULT_EQUIPMENT_TYPES = [
        ("MOTOR", "Motores eléctricos, servomotores y moto-reductores"),
        ("PUMP", "Bombas centrífugas, dosificadoras y de vacío"),
        ("VALVE", "Válvulas de control neumáticas, motorizadas y solenoides"),
        ("ACTUATOR", "Actuadores neumáticos, hidráulicos o lineales"),
        ("SENSOR", "Sensores e instrumentación (temperatura, presión, nivel, flujo, vibración)"),
        ("CONVEYOR", "Bandas transportadoras, rodillos y cadenas de transferencia"),
        ("COMPRESSOR", "Compresores de aire y sistemas de refrigeración"),
        ("LINE", "Línea de producción o envasado (Agrupador jerárquico ISA-95 Nivel 2)"),
        ("UNIT", "Unidad o celda de proceso integrada (ISA-95 Nivel 1/2)"),
    ]

    ADDITIONAL_MAINTENANCE_TYPES = [
        "PREDICTIVE",
        "INSPECTION",
        "OVERHAUL",
        "EMERGENCY",
    ]

    @classmethod
    def create_tables(cls, target_engine: Engine = engine) -> None:
        """Creates all SQLAlchemy declarative model tables and enums if they do not exist."""
        logger.debug("Verifying and creating database tables...")
        Base.metadata.create_all(bind=target_engine)
        logger.debug("Tables checked/created successfully.")

    @classmethod
    def create_routines(cls, target_engine: Engine = engine) -> None:
        """Creates custom PostgreSQL functions, triggers, and stored procedures."""
        if target_engine.dialect.name != "postgresql":
            logger.debug("Skipping stored function creation: engine dialect is '%s'.", target_engine.dialect.name)
            return

        logger.debug("Registering PostgreSQL stored procedures and triggers...")
        with target_engine.begin() as connection:
            connection.execute(text(cls.SPARKPLUG_EVENT_ROUTINE_SQL))
            connection.execute(text(cls.TRIGGER_AUTO_PROVISION_SQL))
        logger.debug("Functions and triggers created/updated successfully.")

    @classmethod
    def seed_catalogs(cls, target_engine: Engine = engine) -> None:
        """
        Seeds standard industrial catalogs and applies idempotent schema updates.
        1. Adds missing values to PostgreSQL enums (e.g. maintenance_type_enum).
        2. Adds optional columns (description, parent_tag) if not present.
        3. Populates type_equipments with standard industrial categories.
        """
        logger.debug("Verifying and seeding industrial catalogs...")

        # 1. Update PostgreSQL Enums & Schema columns if dialect is PostgreSQL
        if target_engine.dialect.name == "postgresql":
            with target_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                # Add enum values
                for val in cls.ADDITIONAL_MAINTENANCE_TYPES:
                    try:
                        conn.execute(text(f"ALTER TYPE maintenance_type_enum ADD VALUE IF NOT EXISTS '{val}';"))
                    except Exception as e:
                        logger.debug("Enum value %s notice: %s", val, e)

                # Ensure columns exist and constraints are aligned
                conn.execute(text("ALTER TABLE type_equipments ADD COLUMN IF NOT EXISTS description VARCHAR(255);"))
                conn.execute(text("ALTER TABLE equipments ALTER COLUMN type_equipment_id DROP NOT NULL;"))
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name='equipments' AND column_name='parent_tag'
                        ) THEN
                            ALTER TABLE equipments ADD COLUMN parent_tag VARCHAR(100) 
                            REFERENCES equipments(tag_name) ON UPDATE CASCADE ON DELETE SET NULL;
                        END IF;
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name='maintenance_logs' AND column_name='alert_id'
                        ) THEN
                            ALTER TABLE maintenance_logs ADD COLUMN alert_id BIGINT 
                            REFERENCES maintenance_alerts(id) ON UPDATE CASCADE ON DELETE SET NULL;
                        END IF;
                    END $$;
                """))

        # 2. Seed type_equipments
        with target_engine.begin() as conn:
            for name, desc in cls.DEFAULT_EQUIPMENT_TYPES:
                if target_engine.dialect.name == "postgresql":
                    conn.execute(
                        text("""
                            INSERT INTO type_equipments (name, description)
                            VALUES (:name, :desc)
                            ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
                        """),
                        {"name": name, "desc": desc},
                    )
                else:
                    conn.execute(
                        text("""
                            INSERT OR IGNORE INTO type_equipments (name, description)
                            VALUES (:name, :desc);
                        """),
                        {"name": name, "desc": desc},
                    )

        logger.debug("Catalogs verified and seeded successfully.")

    @classmethod
    def init_database(cls, target_engine: Engine = engine) -> None:
        """
        Orchestrates complete database setup:
        1. Tables and indexes (via SQLAlchemy Base.metadata)
        2. Stored functions and triggers for broker auto-provisioning
        3. Industrial catalogs seeding & schema migrations
        """
        cls.create_tables(target_engine)
        cls.create_routines(target_engine)
        cls.seed_catalogs(target_engine)
