from datetime import datetime, timezone
import enum
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ============================================================================
# ENUMERATIONS
# ============================================================================

class SparkplugEventType(str, enum.Enum):
    NBIRTH = "NBIRTH"
    NDEATH = "NDEATH"
    DBIRTH = "DBIRTH"
    DDEATH = "DDEATH"


class NetworkStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


class EquipmentOperatingStatus(str, enum.Enum):
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    UNKNOWN = "UNKNOWN"


class AssetType(str, enum.Enum):
    EQUIPMENT = "EQUIPMENT"
    DEVICE = "DEVICE"
    NODE = "NODE"


class MaintenanceType(str, enum.Enum):
    PREVENTIVE = "PREVENTIVE"
    CORRECTIVE = "CORRECTIVE"
    PREDICTIVE = "PREDICTIVE"
    CALIBRATION = "CALIBRATION"
    FIRMWARE_UPDATE = "FIRMWARE_UPDATE"
    INSPECTION = "INSPECTION"
    OVERHAUL = "OVERHAUL"
    EMERGENCY = "EMERGENCY"


class TriggerType(str, enum.Enum):
    HOURS = "HOURS"
    CYCLES = "CYCLES"
    STARTUPS = "STARTUPS"
    CALENDAR_DAYS = "CALENDAR_DAYS"


class AlertStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


# ============================================================================
# NETWORK TOPOLOGY & SPARKPLUG B
# ============================================================================

class Node(Base):
    """
    Sparkplug B Edge Node entity.
    Represents physical or logical gateway running the Sparkplug Edge application.
    """
    __tablename__ = "nodes"

    tag_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    devices: Mapped[List["Device"]] = relationship(
        back_populates="node",
        cascade="all, delete-orphan",
    )
    sparkplug_events: Mapped[List["SparkplugLifecycleEvent"]] = relationship(
        back_populates="node",
        cascade="all, delete-orphan",
    )


class Device(Base):
    """
    Sparkplug B End Device entity.
    Represents an industrial field device (PLC, RTU, sensor bank) connected to a Node.
    """
    __tablename__ = "devices"

    tag_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    node_tag: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("nodes.tag_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    node: Mapped["Node"] = relationship(back_populates="devices")
    equipments: Mapped[List["Equipment"]] = relationship(back_populates="device")
    sparkplug_events: Mapped[List["SparkplugLifecycleEvent"]] = relationship(
        back_populates="device",
        cascade="all, delete-orphan",
    )


class SparkplugLifecycleEvent(Base):
    """
    Lifecycle event log for Sparkplug B (NBIRTH, NDEATH, DBIRTH, DDEATH).
    High-volume event log table.
    """
    __tablename__ = "sparkplug_lifecycle_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    event_type: Mapped[SparkplugEventType] = mapped_column(
        Enum(SparkplugEventType, name="sparkplug_event_type_enum"),
        nullable=False,
    )
    node_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("nodes.tag_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        ForeignKey("devices.tag_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    status: Mapped[NetworkStatus] = mapped_column(
        Enum(NetworkStatus, name="network_status_enum"),
        nullable=False,
    )

    # Relationships
    node: Mapped["Node"] = relationship(back_populates="sparkplug_events")
    device: Mapped[Optional["Device"]] = relationship(back_populates="sparkplug_events")

    __table_args__ = (
        Index("ix_sparkplug_node_time", "node_id", "event_time"),
        Index("ix_sparkplug_device_time", "device_id", "event_time"),
    )


# ============================================================================
# PHYSICAL ASSETS (ISA-95)
# ============================================================================

class TypeEquipment(Base):
    """
    Equipment category/type definition (e.g. Centrifugal Pump, Conveyor, Motor, Reactor).
    """
    __tablename__ = "type_equipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    equipments: Mapped[List["Equipment"]] = relationship(back_populates="equipment_type")


# Alias for idiomatic English naming
EquipmentType = TypeEquipment


class Equipment(Base):
    """
    Physical industrial equipment asset (ISA-95 Level 1/2).
    """
    __tablename__ = "equipments"

    tag_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type_equipment_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("type_equipments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    device_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        ForeignKey("devices.tag_name", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_tag: Mapped[Optional[str]] = mapped_column(
        String(100),
        ForeignKey("equipments.tag_name", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    equipment_type: Mapped["TypeEquipment"] = relationship(back_populates="equipments")
    device: Mapped[Optional["Device"]] = relationship(back_populates="equipments")
    parent: Mapped[Optional["Equipment"]] = relationship(
        "Equipment",
        remote_side="[Equipment.tag_name]",
        back_populates="children",
    )
    children: Mapped[List["Equipment"]] = relationship(
        "Equipment",
        back_populates="parent",
    )
    history_statuses: Mapped[List["EquipmentHistoryStatus"]] = relationship(
        back_populates="equipment",
        cascade="all, delete-orphan",
    )


class EquipmentHistoryStatus(Base):
    """
    Append-only time-series status log for physical equipment.
    Tracks state transitions: RUNNING, STOPPED, UNKNOWN.
    """
    __tablename__ = "equipment_history_statuses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    equipment_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("equipments.tag_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[EquipmentOperatingStatus] = mapped_column(
        Enum(EquipmentOperatingStatus, name="equipment_operating_status_enum"),
        nullable=False,
    )
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    equipment: Mapped["Equipment"] = relationship(back_populates="history_statuses")

    __table_args__ = (
        Index("ix_equipment_history_status_time", "equipment_id", "event_time"),
    )


class AssetMeter(Base):
    """
    Absolute cumulative counters (Odometer) for any asset type.
    These values are strictly increasing and periodically updated 
    (either directly from PLC via Sparkplug B or by a backend worker).
    """
    __tablename__ = "asset_meters"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type_enum"),
        nullable=False,
    )
    asset_id: Mapped[str] = mapped_column(String(100), nullable=False)
    
    total_hours: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_cycles: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_startups: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_asset_meter_asset", "asset_type", "asset_id", unique=True),
    )


# ============================================================================
# MAINTENANCE MANAGEMENT & RULES
# ============================================================================

class MaintenanceRule(Base):
    """
    Threshold rule for triggering maintenance alerts on any asset (Node, Device, Equipment).
    """
    __tablename__ = "maintenance_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type_enum"),
        nullable=False,
    )
    asset_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trigger_type: Mapped[TriggerType] = mapped_column(
        Enum(TriggerType, name="trigger_type_enum"),
        nullable=False,
    )
    threshold_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    alerts: Mapped[List["MaintenanceAlert"]] = relationship(
        back_populates="rule",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_maintenance_rule_asset", "asset_type", "asset_id"),
    )


class MaintenanceAlert(Base):
    """
    Maintenance alert instance fired when a rule threshold is exceeded.
    """
    __tablename__ = "maintenance_alerts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("maintenance_rules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type_enum"),
        nullable=False,
    )
    asset_id: Mapped[str] = mapped_column(String(100), nullable=False)
    calculated_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    threshold_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status_enum"),
        default=AlertStatus.PENDING,
        nullable=False,
    )
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    rule: Mapped["MaintenanceRule"] = relationship(back_populates="alerts")

    __table_args__ = (
        Index("ix_maintenance_alert_asset_status", "asset_type", "asset_id", "status"),
        Index("ix_maintenance_alert_triggered_at", "triggered_at"),
    )


class MaintenanceLog(Base):
    """
    Operational maintenance execution logbook.
    Tracks scheduled and executed maintenance interventions on any asset.
    """
    __tablename__ = "maintenance_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type_enum"),
        nullable=False,
    )
    asset_id: Mapped[str] = mapped_column(String(100), nullable=False)
    maintenance_type: Mapped[MaintenanceType] = mapped_column(
        Enum(MaintenanceType, name="maintenance_type_enum"),
        nullable=False,
    )
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    technician: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Odometers snapshot at the exact time of maintenance execution
    hours_at_execution: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    cycles_at_execution: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    startups_at_execution: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_maintenance_log_asset_created", "asset_type", "asset_id", "created_at"),
    )


# ============================================================================
# USER & AUTHENTICATION
# ============================================================================

class User(Base):
    """
    Application user for authentication and role-based access.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="operator", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
