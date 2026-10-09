import os
from sqlalchemy import text
from database import Base, engine
import models
from database_initializer import DatabaseInitializer
from create_grafana_view import create_view

def reset_db():
    print("Dropping views and tables...")
    with engine.begin() as conn:
        conn.execute(text("DROP VIEW IF EXISTS vw_maintenance_compliance;"))
    
    Base.metadata.drop_all(engine)
    
    print("Initializing Database (Creates tables, triggers, enums and seeds)...")
    DatabaseInitializer.init_database(engine)
    
    print("Creating Grafana view...")
    create_view()
    
    print("Database reset and seeded successfully!")

if __name__ == "__main__":
    reset_db()
