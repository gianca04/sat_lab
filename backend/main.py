from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from database import engine
from database_initializer import DatabaseInitializer
import models  # Ensures all models are registered with Base metadata
from routers import router as data_router
from services.mqtt_worker import mqtt_worker
from services.maintenance_job import maintenance_job


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Automatically creates/verifies tables, types, and PostgreSQL stored procedures on startup.
    Starts the MQTT background telemetry worker and the maintenance periodic evaluator.
    """
    DatabaseInitializer.init_database(engine)
    mqtt_worker.start()
    maintenance_job.start()
    yield
    maintenance_job.stop()
    mqtt_worker.stop()


app = FastAPI(
    title="Industrial Logs & Event Management API",
    description="API for Sparkplug B topology, ISA-95 asset tracking, and maintenance rules.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication Router
app.include_router(auth_router)

# Industrial Data Router (Nodes, Devices, Equipments, Events, Maintenance)
app.include_router(data_router)



@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service status (Unprotected)."""
    return {"status": "ok", "service": "industrial-logs-backend"}
