// ─── Enums (mirror de models.py) ─────────────────────────────────────────────

export type SparkplugEventType = "NBIRTH" | "NDEATH" | "DBIRTH" | "DDEATH"
export type NetworkStatus = "ONLINE" | "OFFLINE"
export type EquipmentOperatingStatus = "RUNNING" | "STOPPED" | "UNKNOWN"
export type AssetType = "EQUIPMENT" | "DEVICE" | "NODE"
export type MaintenanceType =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "PREDICTIVE"
  | "CALIBRATION"
  | "FIRMWARE_UPDATE"
  | "INSPECTION"
  | "OVERHAUL"
  | "EMERGENCY"
export type TriggerType = "HOURS" | "CYCLES" | "STARTUPS" | "CALENDAR_DAYS"
export type AlertStatus = "PENDING" | "ACKNOWLEDGED" | "RESOLVED"

// ─── Models ───────────────────────────────────────────────────────────────────

export interface Node {
  tag_name: string
  name: string
  created_at: string
}

export interface Device {
  tag_name: string
  node_tag: string
  name: string
  created_at: string
}

export interface TypeEquipment {
  id: number
  name: string
  description: string | null
}

export interface Equipment {
  tag_name: string
  name: string
  type_equipment_id: number | null
  device_id: string | null
  parent_tag: string | null
}

export interface SparkplugLifecycleEvent {
  id: number
  event_time: string
  event_type: SparkplugEventType
  node_id: string
  device_id: string | null
  status: NetworkStatus
}

export interface MaintenanceRule {
  id: number
  asset_type: AssetType
  asset_id: string
  name: string
  description: string | null
  trigger_type: TriggerType
  threshold_value: number
  is_active: boolean
}

export interface MaintenanceAlert {
  id: number
  rule_id: number
  asset_type: AssetType
  asset_id: string
  calculated_value: number
  threshold_value: number
  status: AlertStatus
  triggered_at: string
  rule?: MaintenanceRule | null
}

export interface MaintenanceLog {
  id: number
  asset_type: AssetType
  asset_id: string
  maintenance_type: MaintenanceType
  alert_id?: number | null
  scheduled_at: string | null
  executed_at: string | null
  completed_at: string | null
  technician: string | null
  description: string | null
  notes: string | null
  hours_at_execution?: number | null
  cycles_at_execution?: number | null
  startups_at_execution?: number | null
  created_at: string
  alert?: MaintenanceAlert | null
}
