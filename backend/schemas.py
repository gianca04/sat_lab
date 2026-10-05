from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import (
    AlertStatus,
    AssetType,
    EquipmentOperatingStatus,
    MaintenanceType,
    NetworkStatus,
    SparkplugEventType,
    TriggerType,
)


# ============================================================================
# NETWORK TOPOLOGY & SPARKPLUG B SCHEMAS
# ============================================================================

class NodeBase(BaseModel):
    tag_name: str = Field(..., max_length=100, description="Unique tag identifier for the Edge Node")
    name: str = Field(..., max_length=255, description="Human-readable node name")


class NodeCreate(NodeBase):
    pass


class NodeRead(NodeBase):
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeviceBase(BaseModel):
    tag_name: str = Field(..., max_length=100, description="Unique tag identifier for the Device")
    node_tag: str = Field(..., max_length=100, description="Parent Edge Node tag")
    name: str = Field(..., max_length=255, description="Human-readable device name")


class DeviceCreate(DeviceBase):
    pass


class DeviceRead(DeviceBase):
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SparkplugLifecycleEventBase(BaseModel):
    event_time: datetime
    event_type: SparkplugEventType
    node_id: str = Field(..., max_length=100)
    device_id: Optional[str] = Field(None, max_length=100)
    status: NetworkStatus


class SparkplugLifecycleEventCreate(SparkplugLifecycleEventBase):
    pass


class SparkplugLifecycleEventRead(SparkplugLifecycleEventBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PHYSICAL ASSETS (ISA-95) SCHEMAS
# ============================================================================

class TypeEquipmentBase(BaseModel):
    name: str = Field(..., max_length=100, description="Equipment category name (e.g. Pump, Motor)")
    description: Optional[str] = Field(None, max_length=255, description="Category description")


class TypeEquipmentCreate(TypeEquipmentBase):
    pass


class TypeEquipmentRead(TypeEquipmentBase):
    id: int
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EquipmentBase(BaseModel):
    tag_name: str = Field(..., max_length=100, description="Unique asset tag (e.g. EQ-PUMP-01)")
    name: str = Field(..., max_length=255)
    type_equipment_id: Optional[int] = Field(None, description="Catalog ID (can be assigned manually later)")
    device_id: Optional[str] = Field(None, max_length=100)
    parent_tag: Optional[str] = Field(None, max_length=100, description="Parent equipment tag (e.g. Line or Unit)")


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentRead(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)


class EquipmentHistoryStatusBase(BaseModel):
    equipment_id: str = Field(..., max_length=100)
    status: EquipmentOperatingStatus
    event_time: datetime


class EquipmentHistoryStatusCreate(EquipmentHistoryStatusBase):
    pass


class EquipmentHistoryStatusRead(EquipmentHistoryStatusBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# MAINTENANCE MANAGEMENT SCHEMAS
# ============================================================================

class MaintenanceRuleBase(BaseModel):
    asset_type: AssetType
    asset_id: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    trigger_type: TriggerType
    threshold_value: int = Field(..., ge=0)
    is_active: bool = True


class MaintenanceRuleCreate(MaintenanceRuleBase):
    pass


class MaintenanceRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    trigger_type: Optional[TriggerType] = None
    threshold_value: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class MaintenanceRuleRead(MaintenanceRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaintenanceAlertBase(BaseModel):
    rule_id: int
    asset_type: AssetType
    asset_id: str = Field(..., max_length=100)
    calculated_value: int
    threshold_value: int
    status: AlertStatus = AlertStatus.PENDING


class MaintenanceAlertCreate(MaintenanceAlertBase):
    pass


class MaintenanceAlertUpdate(BaseModel):
    status: AlertStatus


class MaintenanceAlertRead(MaintenanceAlertBase):
    id: int
    triggered_at: datetime
    rule: Optional[MaintenanceRuleRead] = None

    model_config = ConfigDict(from_attributes=True)


class MaintenanceLogBase(BaseModel):
    asset_type: AssetType
    asset_id: str = Field(..., max_length=100)
    maintenance_type: MaintenanceType
    alert_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    technician: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceLogCreate(MaintenanceLogBase):
    pass


class MaintenanceLogUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    technician: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceLogRead(MaintenanceLogBase):
    id: int
    created_at: datetime
    hours_at_execution: Optional[int] = None
    cycles_at_execution: Optional[int] = None
    startups_at_execution: Optional[int] = None
    alert: Optional[MaintenanceAlertRead] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# AUTHENTICATION & USER SCHEMAS
# ============================================================================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100, description="Unique username")
    email: EmailStr = Field(..., description="User contact and identification email")
    full_name: Optional[str] = Field(None, max_length=255, description="Full name")
    role: Optional[str] = Field("operator", max_length=50, description="User role (e.g. admin, operator, technician)")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128, description="Plain text password")


class UserLogin(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)
