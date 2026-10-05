import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/sat_lab_db")

# Allow SQLite for local tests/development if configured in .env
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

pool_kwargs = {}
if not DATABASE_URL.startswith("sqlite"):
    # Must exceed the API thread limit (see main.py) + background workers,
    # otherwise sync endpoints can deadlock waiting for connections.
    pool_kwargs = {"pool_size": 20, "max_overflow": 10, "pool_timeout": 15, "pool_recycle": 1800}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
    **pool_kwargs,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass


def get_db():
    """FastAPI dependency to provide a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
