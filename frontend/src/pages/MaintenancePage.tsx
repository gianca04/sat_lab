import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, Pencil, Plus, Trash2, X } from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { api } from "@/lib/apiClient"
import type {
  AssetType,
  Device,
  Equipment,
  MaintenanceAlert,
  MaintenanceLog,
  MaintenanceRule,
  Node,
  TriggerType,
} from "@/types/models"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RuleForm {
  asset_type: AssetType
  asset_id: string
  name: string
  description: string
  trigger_type: TriggerType
  threshold_value: number | ""
  is_active: boolean
}

const EMPTY_FORM: RuleForm = {
  asset_type: "EQUIPMENT",
  asset_id: "",
  name: "",
  description: "",
  trigger_type: "HOURS",
  threshold_value: "",
  is_active: true,
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  HOURS: "Horas de operación",
  CYCLES: "Ciclos de trabajo",
  STARTUPS: "Arranques",
  CALENDAR_DAYS: "Días calendario",
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  EQUIPMENT: "Equipo",
  DEVICE: "Dispositivo PLC",
  NODE: "Edge Node",
}

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: "Preventivo",
  CORRECTIVE: "Correctivo",
  PREDICTIVE: "Predictivo",
  CALIBRATION: "Calibración",
  FIRMWARE_UPDATE: "Actualización Firmware",
  INSPECTION: "Inspección",
  OVERHAUL: "Overhaul",
  EMERGENCY: "Emergencia",
}

// ─── Form Panels ──────────────────────────────────────────────────────────────

interface RuleFormPanelProps {
  initial?: MaintenanceRule | null
  onSave: (rule: MaintenanceRule) => void
  onCancel: () => void
}

function RuleFormPanel({ initial, onSave, onCancel }: RuleFormPanelProps) {
  const [form, setForm] = useState<RuleForm>(
    initial
      ? {
        asset_type: initial.asset_type,
        asset_id: initial.asset_id,
        name: initial.name,
        description: initial.description ?? "",
        trigger_type: initial.trigger_type,
        threshold_value: initial.threshold_value,
        is_active: initial.is_active,
      }
      : EMPTY_FORM,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Asset lists fetched from existing endpoints ───────────────────────────
  const { data: nodes, loading: nodesLoading } = useApi<Node[]>(
    form.asset_type === "NODE" ? "/api/nodes" : null,
  )
  const { data: devices, loading: devicesLoading } = useApi<Device[]>(
    form.asset_type === "DEVICE" ? "/api/devices" : null,
  )
  const { data: equipments, loading: equipLoading } = useApi<Equipment[]>(
    form.asset_type === "EQUIPMENT" ? "/api/equipments" : null,
  )

  const assetOptions = useMemo((): { value: string; label: string }[] => {
    if (form.asset_type === "NODE") return (nodes ?? []).map((n) => ({ value: n.tag_name, label: n.tag_name }))
    if (form.asset_type === "DEVICE") return (devices ?? []).map((d) => ({ value: d.tag_name, label: `${d.tag_name} (${d.node_tag})` }))
    return (equipments ?? []).map((e) => ({ value: e.tag_name, label: e.tag_name }))
  }, [form.asset_type, nodes, devices, equipments])

  const assetsLoading = nodesLoading || devicesLoading || equipLoading

  const set = (key: keyof RuleForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset_id.trim()) { setError("asset_id es obligatorio"); return }
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return }
    if (form.threshold_value === "" || Number(form.threshold_value) < 0) {
      setError("El umbral debe ser un número >= 0")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        threshold_value: Number(form.threshold_value),
        description: form.description || null,
      }

      let result: MaintenanceRule
      if (initial) {
        // PATCH — only editable fields
        result = await api.patch<MaintenanceRule>(
          `/api/maintenance/rules/${initial.id}`,
          {
            name: payload.name,
            description: payload.description,
            trigger_type: payload.trigger_type,
            threshold_value: payload.threshold_value,
            is_active: payload.is_active,
          },
        )
      } else {
        result = await api.post<MaintenanceRule>("/api/maintenance/rules", payload)
      }
      onSave(result)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gf-panel">
      <div className="gf-panel-header">
        <span className="gf-panel-title">
          {initial ? `Editar regla #${initial.id}` : "Nueva regla de mantenimiento"}
        </span>
        <button className="gf-btn gf-btn-ghost" onClick={onCancel} style={{ height: 22 }}>
          <X size={12} /> Cancelar
        </button>
      </div>
      <div className="gf-panel-body">
        <form onSubmit={handleSubmit}>
          <div className="gf-form-grid-3">

            {/* asset_type — inmutable en edición */}
            <div>
              <label className="gf-label">asset_type *</label>
              <select
                className="gf-input"
                value={form.asset_type}
                disabled={!!initial}
                onChange={(e) => {
                  set("asset_type", e.target.value as AssetType)
                  set("asset_id", "") // reset al cambiar tipo
                }}
              >
                {(["EQUIPMENT", "DEVICE", "NODE"] as AssetType[]).map((t) => (
                  <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                ))}
              </select>
              {initial && (
                <div style={{ fontSize: 11, color: "#52545b", marginTop: 3 }}>
                  Inmutable para preservar historial de alertas
                </div>
              )}
            </div>

            {/* asset_id — select dinámico desde el endpoint correspondiente */}
            <div>
              <label className="gf-label">asset_id *</label>
              {initial ? (
                // En edición es inmutable — mostrar como input readonly
                <input
                  className="gf-input"
                  value={form.asset_id}
                  readOnly
                />
              ) : (
                <select
                  className="gf-input"
                  value={form.asset_id}
                  disabled={assetsLoading || assetOptions.length === 0}
                  onChange={(e) => set("asset_id", e.target.value)}
                >
                  <option value="">
                    {assetsLoading
                      ? "Cargando…"
                      : assetOptions.length === 0
                        ? `Sin ${ASSET_TYPE_LABELS[form.asset_type].toLowerCase()}s registrados`
                        : `— Selecciona ${ASSET_TYPE_LABELS[form.asset_type].toLowerCase()} —`}
                  </option>
                  {assetOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              {initial && (
                <div style={{ fontSize: 11, color: "#52545b", marginTop: 3 }}>
                  Inmutable para preservar historial de alertas
                </div>
              )}
            </div>

            {/* name */}
            <div>
              <label className="gf-label">Nombre de la regla *</label>
              <input
                className="gf-input"
                value={form.name}
                placeholder="Ej: Mantenimiento preventivo 500h"
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            {/* trigger_type */}
            <div>
              <label className="gf-label">trigger_type *</label>
              <select
                className="gf-input"
                value={form.trigger_type}
                onChange={(e) => set("trigger_type", e.target.value)}
              >
                {(["HOURS", "CYCLES", "STARTUPS", "CALENDAR_DAYS"] as TriggerType[]).map((t) => (
                  <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* threshold_value */}
            <div>
              <label className="gf-label">threshold_value *</label>
              <input
                className="gf-input"
                type="number"
                min={0}
                step={form.trigger_type === "HOURS" ? "any" : "1"}
                value={form.threshold_value}
                placeholder={form.trigger_type === "HOURS" ? "Ej: 2.5 (2 horas y media)" : "Ej: 500"}
                onChange={(e) => set("threshold_value", e.target.value === "" ? "" : Number(e.target.value))}
              />
              {form.trigger_type === "HOURS" && (
                <div style={{ fontSize: 11, color: "#52545b", marginTop: 3 }}>
                  Usa formato decimal (Ej: 2.5 para 2 horas y media). No uses formato de reloj (HH:MM).
                </div>
              )}
            </div>

            {/* is_active */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label className="gf-label">is_active</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28 }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  style={{ accentColor: "#3274d9", width: 14, height: 14, cursor: "pointer" }}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
                <label htmlFor="is_active" style={{ fontSize: 13, color: "#d8d9da", cursor: "pointer" }}>
                  Regla activa
                </label>
              </div>
            </div>
          </div>

          {/* description — full width */}
          <div style={{ marginBottom: 12 }}>
            <label className="gf-label">Descripción</label>
            <input
              className="gf-input"
              value={form.description}
              placeholder="Descripción opcional de la regla"
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#f2495c", marginBottom: 10 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="gf-btn gf-btn-primary" disabled={saving}>
              {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear regla"}
            </button>
            <button type="button" className="gf-btn gf-btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface LogForm {
  asset_type: AssetType
  asset_id: string
  maintenance_type: string
  technician: string
  description: string
}

const EMPTY_LOG_FORM: LogForm = {
  asset_type: "EQUIPMENT",
  asset_id: "",
  maintenance_type: "PREVENTIVE",
  technician: "",
  description: "",
}

interface LogFormPanelProps {
  initial?: MaintenanceLog | null
  onSave: (log: MaintenanceLog) => void
  onCancel: () => void
}

function LogFormPanel({ initial, onSave, onCancel }: LogFormPanelProps) {
  const [form, setForm] = useState<LogForm>(
    initial 
      ? {
        asset_type: initial.asset_type,
        asset_id: initial.asset_id,
        maintenance_type: initial.maintenance_type,
        technician: initial.technician ?? "",
        description: initial.description ?? ""
      }
      : EMPTY_LOG_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: nodes, loading: nodesLoading } = useApi<Node[]>(
    form.asset_type === "NODE" ? "/api/nodes" : null,
  )
  const { data: devices, loading: devicesLoading } = useApi<Device[]>(
    form.asset_type === "DEVICE" ? "/api/devices" : null,
  )
  const { data: equipments, loading: equipLoading } = useApi<Equipment[]>(
    form.asset_type === "EQUIPMENT" ? "/api/equipments" : null,
  )

  const assetOptions = useMemo((): { value: string; label: string }[] => {
    if (form.asset_type === "NODE") return (nodes ?? []).map((n) => ({ value: n.tag_name, label: n.tag_name }))
    if (form.asset_type === "DEVICE") return (devices ?? []).map((d) => ({ value: d.tag_name, label: `${d.tag_name} (${d.node_tag})` }))
    return (equipments ?? []).map((e) => ({ value: e.tag_name, label: e.tag_name }))
  }, [form.asset_type, nodes, devices, equipments])

  const assetsLoading = nodesLoading || devicesLoading || equipLoading

  const set = (key: keyof LogForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset_id.trim()) { setError("asset_id es obligatorio"); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        technician: form.technician || null,
        description: form.description || null,
      }
      
      let result: MaintenanceLog
      if (initial) {
        result = await api.patch<MaintenanceLog>(`/api/maintenance/logs/${initial.id}`, payload)
      } else {
        result = await api.post<MaintenanceLog>("/api/maintenance/logs", payload)
      }
      onSave(result)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gf-panel">
      <div className="gf-panel-header">
        <span className="gf-panel-title">
          {initial ? `Editar Registro #${initial.id}` : "Nuevo Registro de Mantenimiento"}
        </span>
        <button className="gf-btn gf-btn-ghost" onClick={onCancel} style={{ height: 22 }}>
          <X size={12} /> Cancelar
        </button>
      </div>
      <div className="gf-panel-body">
        <form onSubmit={handleSubmit}>
          <div className="gf-form-grid-3">
            <div>
              <label className="gf-label">Tipo de Activo *</label>
              <select
                className="gf-input"
                value={form.asset_type}
                disabled={!!initial}
                onChange={(e) => {
                  set("asset_type", e.target.value as AssetType)
                  set("asset_id", "")
                }}
              >
                {(["EQUIPMENT", "DEVICE", "NODE"] as AssetType[]).map((t) => (
                  <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="gf-label">Identificador *</label>
              {initial ? (
                <input className="gf-input" value={form.asset_id} readOnly />
              ) : (
                <select
                  className="gf-input"
                  value={form.asset_id}
                  disabled={assetsLoading || assetOptions.length === 0}
                  onChange={(e) => set("asset_id", e.target.value)}
                >
                  <option value="">
                    {assetsLoading
                      ? "Cargando…"
                      : assetOptions.length === 0
                        ? `Sin ${ASSET_TYPE_LABELS[form.asset_type].toLowerCase()}s`
                        : `— Selecciona ${ASSET_TYPE_LABELS[form.asset_type].toLowerCase()} —`}
                  </option>
                  {assetOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="gf-label">Tipo de Mantenimiento *</label>
              <select
                className="gf-input"
                value={form.maintenance_type}
                onChange={(e) => set("maintenance_type", e.target.value)}
              >
                {Object.entries(MAINTENANCE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="gf-label">Técnico</label>
              <input
                className="gf-input"
                value={form.technician}
                placeholder="Nombre del técnico"
                onChange={(e) => set("technician", e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="gf-label">Descripción de la intervención</label>
            <input
              className="gf-input"
              value={form.description}
              placeholder="¿Qué se realizó durante el mantenimiento?"
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {error && <div style={{ fontSize: 12, color: "#f2495c", marginBottom: 10 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="gf-btn gf-btn-primary" disabled={saving}>
              {saving ? "Guardando…" : initial ? "Guardar cambios" : "Registrar Intervención"}
            </button>
            <button type="button" className="gf-btn gf-btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MaintenancePage() {
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [editingRule, setEditingRule] = useState<MaintenanceRule | null>(null)
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null)
  const [confirmDeleteRule, setConfirmDeleteRule] = useState<number | null>(null)
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const { data: rules, loading: rLoading, error: rError, refetch: refetchRules } =
    useApi<MaintenanceRule[]>("/api/maintenance/rules")

  const { data: logs, loading: lLoading, error: lError, refetch: refetchLogs } =
    useApi<MaintenanceLog[]>("/api/maintenance/logs")

  const { data: alerts, refetch: refetchAlerts } =
    useApi<MaintenanceAlert[]>("/api/maintenance/alerts")

  const activeAlerts = useMemo(
    () => (alerts ?? []).filter((a) => a.status === "PENDING" || a.status === "ACKNOWLEDGED"),
    [alerts],
  )

  const handleSavedRule = useCallback(() => {
    setShowRuleForm(false)
    setEditingRule(null)
    setFeedback({ message: "Regla guardada correctamente.", type: "success" })
    refetchRules()
  }, [refetchRules])

  const handleSavedLog = useCallback(() => {
    setShowLogForm(false)
    setEditingLog(null)
    setFeedback({ message: "Registro de mantenimiento guardado.", type: "success" })
    refetchLogs()
    refetchRules()
    refetchAlerts()
  }, [refetchLogs, refetchRules, refetchAlerts])

  const handleDeleteRule = async (id: number) => {
    setDeleting(true)
    try {
      await api.delete(`/api/maintenance/rules/${id}`)
      setConfirmDeleteRule(null)
      setFeedback({ message: `Regla #${id} eliminada correctamente.`, type: "success" })
      refetchRules()
    } catch (err) {
      setFeedback({ message: (err as Error).message ?? "Error al eliminar la regla", type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteLog = async (id: number) => {
    setDeleting(true)
    try {
      await api.delete(`/api/maintenance/logs/${id}`)
      setConfirmDeleteLog(null)
      setFeedback({ message: `Registro de mantenimiento #${id} eliminado.`, type: "success" })
      refetchLogs()
    } catch (err) {
      setFeedback({ message: (err as Error).message ?? "Error al eliminar el registro", type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  const openCreateRule = () => { setEditingRule(null); setShowRuleForm(true); setShowLogForm(false) }
  const openEditRule = (r: MaintenanceRule) => { setEditingRule(r); setShowRuleForm(true); setShowLogForm(false) }
  const closeRuleForm = () => { setShowRuleForm(false); setEditingRule(null) }

  const openCreateLog = () => { setEditingLog(null); setShowLogForm(true); setShowRuleForm(false) }
  const openEditLog = (l: MaintenanceLog) => { setEditingLog(l); setShowLogForm(true); setShowRuleForm(false) }
  const closeLogForm = () => { setShowLogForm(false); setEditingLog(null) }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Page Header */}
      <div className="gf-page-header">
        <h1 className="gf-page-title">Mantenimiento Industrial & Bitácora</h1>
      </div>

      {/* Stat Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <div className="gf-stat">
          <div className="gf-stat-label">Reglas configuradas</div>
          <div className="gf-stat-value">{rules?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Reglas activas</div>
          <div className="gf-stat-value" style={{ color: "#73bf69" }}>
            {rules ? rules.filter((r) => r.is_active).length : "—"}
          </div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Intervenciones registradas</div>
          <div className="gf-stat-value">{logs?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Alertas activas</div>
          <div
            className="gf-stat-value gf-stat-value-sm"
            style={{ color: activeAlerts.length > 0 ? "#f2495c" : "#73bf69" }}
          >
            {activeAlerts.length > 0 ? `${activeAlerts.length} pendientes` : "Normal"}
          </div>
          <div style={{ fontSize: 11, color: "#52545b", marginTop: 2 }}>
            {activeAlerts.length > 0 ? "Requiere inspección" : "Sin incidentes críticos"}
          </div>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`gf-alert ${feedback.type === "success" ? "gf-alert-success" : "gf-alert-error"}`}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className="gf-btn gf-btn-ghost"
            style={{ height: 18, width: 18, padding: 0 }}
            onClick={() => setFeedback(null)}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div
          style={{
            background: "rgba(242, 73, 92, 0.1)",
            border: "1px solid #f2495c",
            borderRadius: 2,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={16} style={{ color: "#f2495c", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#d8d9da" }}>
              Hay <strong>{activeAlerts.length} alerta{activeAlerts.length > 1 ? "s" : ""} de mantenimiento activa{activeAlerts.length > 1 ? "s" : ""}</strong> pendiente{activeAlerts.length > 1 ? "s" : ""} de atención ({activeAlerts.map(a => a.asset_id).join(", ")}).
            </span>
          </div>
          <Link
            to="/alerts"
            className="gf-btn gf-btn-secondary"
            style={{
              height: 24,
              fontSize: 11,
              gap: 6,
              textDecoration: "none",
              color: "#f2495c",
              borderColor: "rgba(242, 73, 92, 0.4)",
            }}
          >
            Ver Módulo de Alertas &rarr;
          </Link>
        </div>
      )}

      {/* Form panels */}
      {showRuleForm && (
        <RuleFormPanel
          initial={editingRule}
          onSave={handleSavedRule}
          onCancel={closeRuleForm}
        />
      )}
      
      {showLogForm && (
        <LogFormPanel
          initial={editingLog}
          onSave={handleSavedLog}
          onCancel={closeLogForm}
        />
      )}

      {/* Rules panel */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">
            Reglas de Mantenimiento ({rules?.length ?? 0})
          </span>
          {!showRuleForm && (
            <button className="gf-btn gf-btn-primary" style={{ height: 22 }} onClick={openCreateRule}>
              <Plus size={12} /> Nueva regla
            </button>
          )}
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th style={{ width: 100 }}>Tipo Activo</th>
                <th style={{ width: 160 }}>Activo</th>
                <th>Nombre de Regla</th>
                <th style={{ width: 140 }}>Tipo de Disparo</th>
                <th style={{ width: 90, textAlign: "right" }}>Umbral</th>
                <th style={{ width: 70, textAlign: "center" }}>Estado</th>
                <th style={{ width: 80, textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rLoading && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Cargando…</td></tr>
              )}
              {rError && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#f2495c", height: 48 }}>{rError}</td></tr>
              )}
              {!rLoading && !rError && (!rules || rules.length === 0) && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Sin reglas. Crea la primera con "Nueva regla".</td></tr>
              )}
              {rules?.map((r) => (
                <>
                  <tr key={r.id} style={{ background: confirmDeleteRule === r.id ? "rgba(242,73,92,0.06)" : undefined }}>
                    <td className="muted">{r.id}</td>
                    <td>
                      <span className="gf-badge gf-badge-neutral">{r.asset_type}</span>
                    </td>
                    <td className="link">{r.asset_id}</td>
                    <td>{r.name}</td>
                    <td className="muted">{TRIGGER_LABELS[r.trigger_type]}</td>
                    <td className="muted" style={{ textAlign: "right" }}>
                      {r.threshold_value.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`gf-badge ${r.is_active ? "gf-badge-online" : "gf-badge-offline"}`}>
                        {r.is_active ? "SÍ" : "NO"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button
                          className="gf-btn gf-btn-ghost"
                          style={{ height: 22, padding: "0 6px" }}
                          title="Editar"
                          onClick={() => openEditRule(r)}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="gf-btn gf-btn-ghost"
                          style={{ height: 22, padding: "0 6px", color: "#f2495c" }}
                          title="Eliminar"
                          onClick={() => setConfirmDeleteRule(r.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Confirm delete row */}
                  {confirmDeleteRule === r.id && (
                    <tr key={`del-rule-${r.id}`} style={{ background: "rgba(242,73,92,0.08)" }}>
                      <td colSpan={8} style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#f2495c" }}>
                            ¿Eliminar regla <strong>#{r.id} {r.name}</strong>? Sus alertas asociadas se borrarán en cascada.
                          </span>
                          <button
                            className="gf-btn gf-btn-ghost"
                            style={{ height: 22, color: "#f2495c", borderColor: "#f2495c" }}
                            disabled={deleting}
                            onClick={() => handleDeleteRule(r.id)}
                          >
                            {deleting ? "Eliminando…" : "Confirmar"}
                          </button>
                          <button
                            className="gf-btn gf-btn-ghost"
                            style={{ height: 22 }}
                            onClick={() => setConfirmDeleteRule(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance logs panel */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Bitácora de Intervenciones ({logs?.length ?? 0})</span>
          <div style={{ display: "flex", gap: 8 }}>
            {!showLogForm && (
              <button className="gf-btn gf-btn-primary" style={{ height: 22 }} onClick={openCreateLog}>
                <Plus size={12} /> Nuevo Registro
              </button>
            )}
            <button className="gf-btn gf-btn-ghost" style={{ height: 22 }} onClick={refetchLogs}>
              Actualizar
            </button>
          </div>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th style={{ width: 110 }}>Tipo Activo</th>
                <th>Activo</th>
                <th style={{ width: 130 }}>Tipo Intervención</th>
                <th style={{ width: 150 }}>Técnico</th>
                <th>Descripción</th>
                <th style={{ width: 160, textAlign: "right" }}>Fecha de Ejecución</th>
                <th style={{ width: 80, textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lLoading && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#52545b", height: 40 }}>Cargando…</td></tr>
              )}
              {lError && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#f2495c", height: 40 }}>{lError}</td></tr>
              )}
              {!lLoading && !lError && (!logs || logs.length === 0) && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#52545b", height: 40 }}>Sin intervenciones registradas.</td></tr>
              )}
              {logs?.map((l) => (
                <>
                <tr key={l.id} style={{ background: confirmDeleteLog === l.id ? "rgba(242,73,92,0.06)" : undefined }}>
                  <td className="muted">{l.id}</td>
                  <td><span className="gf-badge gf-badge-neutral">{l.asset_type}</span></td>
                  <td className="link">
                    {l.asset_id}
                    {l.alert_id && (
                      <span
                        className="gf-badge"
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          background: "rgba(115, 191, 105, 0.15)",
                          color: "#73bf69",
                          border: "1px solid #73bf69",
                          verticalAlign: "middle",
                        }}
                        title={`Intervención asociada a Alerta #${l.alert_id}`}
                      >
                        Alerta #{l.alert_id}
                      </span>
                    )}
                  </td>
                  <td className="muted">{l.maintenance_type}</td>
                  <td className="muted">{l.technician ?? "—"}</td>
                  <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.description ?? "—"}
                  </td>
                  <td className="muted" style={{ textAlign: "right" }}>
                    {new Date(l.created_at).toLocaleString("es-CO")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button
                        className="gf-btn gf-btn-ghost"
                        style={{ height: 22, padding: "0 6px" }}
                        title="Editar"
                        onClick={() => openEditLog(l)}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="gf-btn gf-btn-ghost"
                        style={{ height: 22, padding: "0 6px", color: "#f2495c" }}
                        title="Eliminar"
                        onClick={() => setConfirmDeleteLog(l.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Confirm delete row */}
                {confirmDeleteLog === l.id && (
                  <tr key={`del-log-${l.id}`} style={{ background: "rgba(242,73,92,0.08)" }}>
                    <td colSpan={8} style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#f2495c" }}>
                          ¿Eliminar registro de mantenimiento <strong>#{l.id}</strong> de {l.asset_id}?
                        </span>
                        <button
                          className="gf-btn gf-btn-ghost"
                          style={{ height: 22, color: "#f2495c", borderColor: "#f2495c" }}
                          disabled={deleting}
                          onClick={() => handleDeleteLog(l.id)}
                        >
                          {deleting ? "Eliminando…" : "Confirmar"}
                        </button>
                        <button
                          className="gf-btn gf-btn-ghost"
                          style={{ height: 22 }}
                          onClick={() => setConfirmDeleteLog(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
