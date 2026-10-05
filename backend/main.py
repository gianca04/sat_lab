import asyncio
from contextlib import asynccontextmanager
import anyio.to_thread
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from database import engine
from database_initializer import DatabaseInitializer
import models  # Ensures all models are registered with Base metadata
from routers import router as data_router, sse_router
from services.mqtt_worker import mqtt_worker
from services.maintenance_job import maintenance_job
from services.alert_broadcaster import alert_broadcaster


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Automatically creates/verifies tables, types, and PostgreSQL stored procedures on startup.
    Starts the MQTT background telemetry worker and the maintenance periodic evaluator.
    Initializes SSE alert broadcaster loop.
    """
    # Keep sync-endpoint threads below the DB pool capacity (see database.py)
    anyio.to_thread.current_default_thread_limiter().total_tokens = 20
    alert_broadcaster.set_loop(asyncio.get_running_loop())
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication Router
app.include_router(auth_router)

# SSE Real-time Streaming Router (Included before data_router so /sse is matched before /{alert_id})
app.include_router(sse_router)

# Industrial Data Router (Nodes, Devices, Equipments, Events, Maintenance)
app.include_router(data_router)



@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service status (Unprotected)."""
    return {"status": "ok", "service": "industrial-logs-backend"}
