import { Fragment, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  X,
} from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { api, BASE_URL, getToken } from "@/lib/apiClient"
import type {
  AlertStatus,
  AssetType,
  Device,
  Equipment,
  MaintenanceAlert,
  MaintenanceRule,
  MaintenanceType,
  Node,
  TriggerType,
} from "@/types/models"

// ─── Constants & Labels ───────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<TriggerType, string> = {
  HOURS: "Horas de operación",
  CYCLES: "Ciclos de trabajo",
  STARTUPS: "Arranques",
  CALENDAR_DAYS: "Días calendario",
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  EQUIPMENT: "Equipo",
  DEVICE: "Dispositivo",
  NODE: "Edge Node",
}

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: "CORRECTIVE", label: "Correctivo (Levantamiento de Falla)" },
  { value: "PREVENTIVE", label: "Preventivo Programado" },
  { value: "PREDICTIVE", label: "Predictivo / Condición" },
  { value: "INSPECTION", label: "Inspección Técnica" },
  { value: "CALIBRATION", label: "Calibración" },
  { value: "OVERHAUL", label: "Overhaul / Reparación Mayor" },
  { value: "EMERGENCY", label: "Emergencia de Planta" },
  { value: "FIRMWARE_UPDATE", label: "Actualización Firmware" },
]

// ─── Maintenance Lift / Resolve Full View (No Modales) ──────────────────────

interface MaintenanceLogFullViewProps {
  alert: MaintenanceAlert
  onCancel: () => void
  onSuccess: () => void
}

function MaintenanceLogFullView({ alert: targetAlert, onCancel, onSuccess }: MaintenanceLogFullViewProps) {
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("CORRECTIVE")
  const [technician, setTechnician] = useState("")
  const [description, setDescription] = useState(
    `Levantamiento de Alerta #${targetAlert.id} por regla "${targetAlert.rule?.name ?? targetAlert.rule_id}". Disparo en ${targetAlert.calculated_value}/${targetAlert.threshold_value}. Se realizó la inspección y normalización del activo.`,
  )
  const [notes, setNotes] = useState("")
  const [executedAt, setExecutedAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post("/api/maintenance/logs", {
        asset_type: targetAlert.asset_type,
        asset_id: targetAlert.asset_id,
        maintenance_type: maintenanceType,
        alert_id: targetAlert.id,
        technician: technician.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        executed_at: executedAt ? new Date(executedAt).toISOString() : null,
        completed_at: new Date().toISOString(),
      })
      onSuccess()
    } catch (err) {
      setError((err as Error).message ?? "Error al registrar el levantamiento")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gf-panel" style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
      {/* Vista Completa Header con botón Volver a Alertas */}
      <div
        className="gf-panel-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 40,
          padding: "8px 14px",
          borderBottom: "1px solid #22252b",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="gf-btn gf-btn-secondary"
            style={{ height: 26, padding: "0 10px", gap: 6, flexShrink: 0 }}
            onClick={onCancel}
            title="Regresar a la lista de alertas"
          >
            <ArrowLeft size={13} />
            <span>Volver a Alertas</span>
          </button>
          <span className="gf-panel-title" style={{ fontSize: 13, fontWeight: 600 }}>
            Levantamiento de Alerta #{targetAlert.id} &mdash; {targetAlert.asset_id}
          </span>
        </div>
        <button
          type="button"
          className="gf-btn gf-btn-ghost"
          style={{ height: 24, padding: "0 8px", color: "#8e8e93", flexShrink: 0 }}
          onClick={onCancel}
        >
          <X size={13} /> Cancelar
        </button>
      </div>

      <div className="gf-panel-body" style={{ padding: "14px 16px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div className="gf-alert gf-alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* Context Banner */}
          <div
            style={{
              background: "#14171b",
              border: "1px solid #22252b",
              borderRadius: 2,
              padding: "10px 14px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: "#8e8e93", display: "block", fontSize: 11, marginBottom: 2 }}>Activo Supervisado:</span>
              <span style={{ fontWeight: 600, color: "#cbd5e1", fontSize: 13 }}>
                {targetAlert.asset_id}
              </span>
              <span style={{ fontSize: 11, color: "#8e8e93", marginLeft: 6 }}>
                ({ASSET_TYPE_LABELS[targetAlert.asset_type]})
              </span>
            </div>
            <div>
              <span style={{ color: "#8e8e93", display: "block", fontSize: 11, marginBottom: 2 }}>Causa / Regla Disparada:</span>
              <span style={{ color: "#d8d9da", fontWeight: 500 }}>
                {targetAlert.rule?.name ?? `Regla #${targetAlert.rule_id}`}
              </span>
            </div>
            <div>
              <span style={{ color: "#8e8e93", display: "block", fontSize: 11, marginBottom: 2 }}>Métrica y Umbral de Disparo:</span>
              <span style={{ color: "#e57373", fontWeight: 600 }}>
                {targetAlert.calculated_value.toLocaleString()} / {targetAlert.threshold_value.toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: "#8e8e93", marginLeft: 6 }}>
                {targetAlert.rule?.trigger_type ? `(${TRIGGER_LABELS[targetAlert.rule.trigger_type]})` : ""}
              </span>
            </div>
            <div>
              <span style={{ color: "#8e8e93", display: "block", fontSize: 11, marginBottom: 2 }}>Fecha de Detección:</span>
              <span style={{ color: "#d8d9da" }}>
                {new Date(targetAlert.triggered_at).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          {/* Inputs Grid */}
          <div className="gf-form-grid-3">
            <div>
              <label className="gf-label">Tipo de Intervención *</label>
              <select
                className="gf-input"
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              >
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="gf-label">Técnico Responsable</label>
              <input
                className="gf-input"
                placeholder="Ej. Ing. Operador Planta"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
              />
            </div>

            <div>
              <label className="gf-label">Fecha y Hora de Ejecución *</label>
              <input
                type="datetime-local"
                className="gf-input"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="gf-label">Diagnóstico y Acciones de Levantamiento *</label>
            <textarea
              className="gf-input"
              rows={3}
              style={{ height: "auto", resize: "vertical", padding: "6px 8px" }}
              required
              placeholder="Describa la corrección técnica o procedimiento realizado para normalizar el activo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="gf-label">Piezas / Repuestos / Observaciones Adicionales</label>
            <textarea
              className="gf-input"
              rows={2}
              style={{ height: "auto", resize: "vertical", padding: "6px 8px" }}
              placeholder="Repuestos reemplazados, lubricantes usados, verificación de parámetros post-intervención..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              borderTop: "1px solid #22252b",
              paddingTop: 12,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="gf-btn gf-btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Volver a la lista
            </button>
            <button
              type="submit"
              className="gf-btn gf-btn-primary"
              disabled={saving}
            >
              <CheckCircle2 size={13} />
              {saving ? "Registrando…" : "Confirmar Levantamiento y Resolver Alerta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ─── Rule Creation / Edit Full View (No Modales) ─────────────────────────────

interface RuleForm {
  asset_type: AssetType
  asset_id: string
  name: string
  description: string
  trigger_type: TriggerType
  threshold_value: number | ""
  is_active: boolean
}

const EMPTY_RULE_FORM: RuleForm = {
  asset_type: "EQUIPMENT",
  asset_id: "",
  name: "",
  description: "",
  trigger_type: "HOURS",
  threshold_value: "",
  is_active: true,
}

interface RuleFormFullViewProps {
  initial?: MaintenanceRule | null
  onSave: (rule: MaintenanceRule) => void
  onCancel: () => void
}

function RuleFormFullView({ initial, onSave, onCancel }: RuleFormFullViewProps) {
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
      : EMPTY_RULE_FORM,
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

  const set = (key: keyof RuleForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset_id.trim()) { setError("El activo (asset_id) es obligatorio"); return }
    if (!form.name.trim()) { setError("El nombre de la regla es obligatorio"); return }
    if (form.threshold_value === "" || Number(form.threshold_value) < 0) {
      setError("El umbral de disparo debe ser un número mayor o igual a 0")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        threshold_value: Number(form.threshold_value),
        description: form.description.trim() || null,
      }

      let result: MaintenanceRule
      if (initial) {
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
      setError((err as Error).message ?? "Error al procesar la regla")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gf-panel" style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
      {/* Vista Completa Header con botón Volver */}
      <div
        className="gf-panel-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 40,
          padding: "8px 14px",
          borderBottom: "1px solid #22252b",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="gf-btn gf-btn-secondary"
            style={{ height: 26, padding: "0 10px", gap: 6, flexShrink: 0 }}
            onClick={onCancel}
            title="Regresar a la lista de reglas"
          >
            <ArrowLeft size={13} />
            <span>Volver a Reglas</span>
          </button>
          <span className="gf-panel-title" style={{ fontSize: 13, fontWeight: 600 }}>
            {initial ? `Editar Regla #${initial.id}: ${initial.name}` : "Nueva Regla de Mantenimiento"}
          </span>
        </div>
        <button
          type="button"
          className="gf-btn gf-btn-ghost"
          style={{ height: 24, padding: "0 8px", color: "#8e8e93", flexShrink: 0 }}
          onClick={onCancel}
        >
          <X size={13} /> Cancelar
        </button>
      </div>

      <div className="gf-panel-body" style={{ padding: "14px 16px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div className="gf-alert gf-alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="gf-form-grid-3">
            {/* asset_type */}
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
              {initial && (
                <div style={{ fontSize: 11, color: "#52545b", marginTop: 3 }}>
                  Inmutable para preservar historial de alertas
                </div>
              )}
            </div>

            {/* asset_id */}
            <div>
              <label className="gf-label">Activo a Supervisar *</label>
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
                      ? "Cargando activos…"
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
            </div>

            {/* name */}
            <div>
              <label className="gf-label">Nombre de la Regla *</label>
              <input
                className="gf-input"
                value={form.name}
                required
                placeholder="Ej. Inspección periódica 100 horas"
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            {/* trigger_type */}
            <div>
              <label className="gf-label">Variable / Métrica de Disparo *</label>
              <select
                className="gf-input"
                value={form.trigger_type}
                onChange={(e) => set("trigger_type", e.target.value as TriggerType)}
              >
                {(["HOURS", "CYCLES", "STARTUPS", "CALENDAR_DAYS"] as TriggerType[]).map((t) => (
                  <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* threshold_value */}
            <div>
              <label className="gf-label">Umbral de Disparo *</label>
              <input
                className="gf-input"
                type="number"
                min={0}
                required
                value={form.threshold_value}
                placeholder="Ej. 100"
                onChange={(e) => set("threshold_value", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            {/* is_active */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label className="gf-label">Estado de Supervisión</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28 }}>
                <input
                  type="checkbox"
                  id="rule_is_active"
                  checked={form.is_active}
                  style={{ accentColor: "#3274d9", width: 14, height: 14, cursor: "pointer" }}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
                <label htmlFor="rule_is_active" style={{ fontSize: 13, color: "#d8d9da", cursor: "pointer" }}>
                  Regla activa (evaluación continua)
                </label>
              </div>
            </div>
          </div>

          {/* description */}
          <div>
            <label className="gf-label">Descripción / Procedimiento Recomendado</label>
            <textarea
              className="gf-input"
              rows={3}
              style={{ height: "auto", resize: "vertical", padding: "6px 8px" }}
              placeholder="Instrucciones operativas cuando la regla active una alerta preventiva o correctiva..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              borderTop: "1px solid #22252b",
              paddingTop: 12,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="gf-btn gf-btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Volver a la lista
            </button>
            <button
              type="submit"
              className="gf-btn gf-btn-primary"
              disabled={saving}
            >
              <CheckCircle2 size={13} />
              {saving ? "Guardando…" : initial ? "Actualizar Regla" : "Crear Regla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Alerts Page & Standalone Grafana View ───────────────────────────────

interface AlertsPageProps {
  standalone?: boolean
}

export function AlertsPage({ standalone = false }: AlertsPageProps) {
  const [searchParams] = useSearchParams()
  const isEmbedded = standalone || searchParams.get("embed") === "true"

  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAlertForLog, setSelectedAlertForLog] = useState<MaintenanceAlert | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const { data: initialAlerts, loading: initialLoading, error, refetch } = useApi<MaintenanceAlert[]>("/api/maintenance/alerts")
  const [liveAlerts, setLiveAlerts] = useState<MaintenanceAlert[] | null>(null)

  // Sincronizar liveAlerts con initialAlerts cuando se ejecuta la carga inicial o refetch manual
  useEffect(() => {
    if (initialAlerts) {
      setLiveAlerts(initialAlerts)
    }
  }, [initialAlerts])

  // Subscripción en tiempo real vía Server-Sent Events (SSE)
  useEffect(() => {
    const token = getToken()
    const sseUrl = `${BASE_URL}/api/maintenance/alerts/sse${token ? `?token=${encodeURIComponent(token)}` : ""}`

    let es: EventSource | null = null
    try {
      es = new EventSource(sseUrl)

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as MaintenanceAlert[]
          if (Array.isArray(data)) {
            setLiveAlerts(data)
          }
        } catch (err) {
          console.error("Error al procesar mensaje SSE:", err)
        }
      }
    } catch (err) {
      console.error("Error al inicializar SSE EventSource:", err)
    }

    return () => {
      if (es) {
        es.close()
      }
    }
  }, [])

  // Live alerts vs initial alerts
  const alerts = liveAlerts ?? initialAlerts
  const loading = initialLoading && !alerts

  // Tab & Rules State
  const [activeTab, setActiveTab] = useState<"alerts" | "rules">("alerts")
  const [ruleViewMode, setRuleViewMode] = useState<"list" | "create" | "edit">("list")
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<MaintenanceRule | null>(null)
  const [confirmDeleteRule, setConfirmDeleteRule] = useState<number | null>(null)
  const [deletingRule, setDeletingRule] = useState(false)
  const [ruleSearchTerm, setRuleSearchTerm] = useState("")

  const {
    data: rules,
    loading: rulesLoading,
    error: rulesError,
    refetch: refetchRules,
  } = useApi<MaintenanceRule[]>("/api/maintenance/rules")

  const handleDeleteRule = async (ruleId: number) => {
    setDeletingRule(true)
    try {
      await api.delete(`/api/maintenance/rules/${ruleId}`)
      setConfirmDeleteRule(null)
      showToast(`Regla #${ruleId} eliminada correctamente.`, "success")
      refetchRules()
      refetch()
    } catch (err) {
      showToast((err as Error).message ?? "Error al eliminar la regla", "error")
    } finally {
      setDeletingRule(false)
    }
  }

  const handleToggleRuleActive = async (rule: MaintenanceRule) => {
    try {
      await api.patch(`/api/maintenance/rules/${rule.id}`, { is_active: !rule.is_active })
      showToast(`Regla #${rule.id} ${!rule.is_active ? "activada" : "pausada"}.`, "success")
      refetchRules()
    } catch (err) {
      showToast((err as Error).message ?? "Error al cambiar estado de regla", "error")
    }
  }

  const filteredRules = useMemo(() => {
    if (!rules) return []
    if (!ruleSearchTerm.trim()) return rules
    const term = ruleSearchTerm.toLowerCase()
    return rules.filter((r) =>
      r.name.toLowerCase().includes(term) ||
      r.asset_id.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term)),
    )
  }, [rules, ruleSearchTerm])

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Direct status update
  const handleUpdateStatus = async (alertId: number, nextStatus: AlertStatus) => {
    setActionLoading(alertId)
    try {
      await api.patch(`/api/maintenance/alerts/${alertId}`, { status: nextStatus })
      showToast(`Alerta #${alertId} actualizada a "${nextStatus}".`, "success")
      refetch()
    } catch (err) {
      showToast(`Error al actualizar estado: ${(err as Error).message}`, "error")
    } finally {
      setActionLoading(null)
    }
  }

  // Counters
  const counts = useMemo(() => {
    const all = alerts ?? []
    return {
      all: all.length,
      pending: all.filter((a) => a.status === "PENDING").length,
      acknowledged: all.filter((a) => a.status === "ACKNOWLEDGED").length,
      resolved: all.filter((a) => a.status === "RESOLVED").length,
    }
  }, [alerts])

  // Filtered list
  const filteredAlerts = useMemo(() => {
    if (!alerts) return []
    return alerts.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase()
        const matchesAsset = a.asset_id.toLowerCase().includes(term)
        const matchesRule = a.rule?.name.toLowerCase().includes(term) ?? false
        if (!matchesAsset && !matchesRule) return false
      }
      return true
    })
  }, [alerts, statusFilter, searchTerm])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isEmbedded ? 8 : 12,
        height: isEmbedded ? "100%" : undefined,
        minHeight: isEmbedded ? "100vh" : undefined,
        width: "100%",
        margin: 0,
        padding: isEmbedded ? "8px 0" : 0,
        boxSizing: "border-box",
        background: isEmbedded ? "#111217" : "transparent",
        color: "#d8d9da",
        overflowY: isEmbedded ? "auto" : undefined,
        overflowX: isEmbedded ? "hidden" : undefined,
      }}
    >
      {/* Page Header (Desktop View) */}
      {!isEmbedded && (
        <div className="gf-page-header">
          <h1 className="gf-page-title">Mantenimiento y Supervisión</h1>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="gf-page-tabs">
        <button
          type="button"
          className={`gf-page-tab ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("alerts")
            setRuleViewMode("list")
          }}
        >
          <span>Alertas de Mantenimiento</span>
          {counts.pending > 0 && (
            <span
              className="gf-page-tab-badge"
              style={{
                background: "rgba(229, 115, 115, 0.2)",
                color: "#e57373",
                fontWeight: 600,
              }}
            >
              {counts.pending}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`gf-page-tab ${activeTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveTab("rules")}
        >
          <Sliders size={12} />
          <span>Reglas de Mantenimiento</span>
          <span className="gf-page-tab-badge">
            {rules?.length ?? 0}
          </span>
        </button>
      </div>

      {/* Toast Notification (Flat, Grafana Sobriety) */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
            background: "#181b1f",
            border: `1px solid ${toast.type === "success" ? "#73bf69" : "#f2495c"}`,
            color: toast.type === "success" ? "#73bf69" : "#f2495c",
            padding: "6px 12px",
            borderRadius: 2,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Alerts View Tab */}
      {activeTab === "alerts" && (
        selectedAlertForLog ? (
          <MaintenanceLogFullView
            alert={selectedAlertForLog}
            onCancel={() => setSelectedAlertForLog(null)}
            onSuccess={() => {
              const resolvedId = selectedAlertForLog.id
              setSelectedAlertForLog(null)
              showToast(`Levantamiento registrado y Alerta #${resolvedId} resuelta con éxito.`, "success")
              refetch()
            }}
          />
        ) : (
          <>
            {/* Stat Panels */}
            <div className="gf-stat-grid">
              <div
                className="gf-stat"
                style={{ cursor: "pointer", borderColor: statusFilter === "ALL" ? "#4a5568" : undefined }}
                onClick={() => setStatusFilter("ALL")}
                title="Ver todas las alertas"
              >
                <div className="gf-stat-label">Total alertas</div>
                <div className="gf-stat-value">{counts.all}</div>
              </div>
              <div
                className="gf-stat"
                style={{ cursor: "pointer", borderColor: statusFilter === "PENDING" ? "#5a3034" : undefined }}
                onClick={() => setStatusFilter("PENDING")}
                title="Filtrar alertas pendientes"
              >
                <div className="gf-stat-label">Alertas pendientes</div>
                <div className="gf-stat-value" style={{ color: counts.pending > 0 ? "#e57373" : undefined }}>
                  {counts.pending}
                </div>
              </div>
              <div
                className="gf-stat"
                style={{ cursor: "pointer", borderColor: statusFilter === "ACKNOWLEDGED" ? "#544622" : undefined }}
                onClick={() => setStatusFilter("ACKNOWLEDGED")}
                title="Filtrar alertas reconocidas"
              >
                <div className="gf-stat-label">Reconocidas</div>
                <div className="gf-stat-value" style={{ color: counts.acknowledged > 0 ? "#d4af37" : undefined }}>
                  {counts.acknowledged}
                </div>
              </div>
              <div
                className="gf-stat"
                style={{ cursor: "pointer", borderColor: statusFilter === "RESOLVED" ? "#2d4432" : undefined }}
                onClick={() => setStatusFilter("RESOLVED")}
                title="Filtrar alertas resueltas"
              >
                <div className="gf-stat-label">Resueltas</div>
                <div className="gf-stat-value" style={{ color: counts.resolved > 0 ? "#81c784" : undefined }}>
                  {counts.resolved}
                </div>
              </div>
            </div>

            {/* Main Panel with Filter Toolbar & Table */}
            <div className="gf-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {/* Header / Filter Toolbar */}
              <div
                className="gf-panel-header"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  minHeight: 38,
                  height: "auto",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                }}
              >
                {/* Title */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span className="gf-panel-title">
                    Registro de Alertas ({filteredAlerts.length})
                  </span>
                </div>

                {/* Controls: Search, Status Filter, Auto-refresh */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    flex: "1 1 auto",
                    justifyContent: "flex-end",
                    minWidth: 0,
                  }}
                >
                  {/* Search */}
                  <div
                    className="gf-search"
                    style={{
                      flex: "1 1 140px",
                      minWidth: 120,
                      maxWidth: 220,
                      height: 24,
                    }}
                  >
                    <Search className="gf-search-icon" size={12} />
                    <input
                      className="gf-search-input"
                      type="text"
                      placeholder="Buscar activo/regla..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ fontSize: 11 }}
                    />
                    {searchTerm && (
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "#8e8e93",
                          cursor: "pointer",
                          padding: "0 4px",
                          position: "absolute",
                          right: 4,
                        }}
                        onClick={() => setSearchTerm("")}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Status Tabs */}
                  <div className="gf-status-tabs" style={{ flexShrink: 0 }}>
                    {(["ALL", "PENDING", "ACKNOWLEDGED", "RESOLVED"] as const).map((st) => {
                      const isActive = statusFilter === st
                      const label = st === "ALL" ? "Todas" : st === "PENDING" ? "Pend." : st === "ACKNOWLEDGED" ? "Recon." : "Resueltas"
                      return (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          style={{
                            background: isActive ? "#22252b" : "transparent",
                            color: isActive ? "#ffffff" : "#8e8e93",
                            border: "none",
                            fontSize: 10,
                            padding: "2px 6px",
                            cursor: "pointer",
                            borderRadius: 1,
                            fontWeight: isActive ? 600 : 400,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Manual Refresh */}
                  <button
                    className="gf-btn gf-btn-secondary"
                    style={{ height: 24, padding: "0 8px", gap: 4, fontSize: 11, flexShrink: 0 }}
                    onClick={refetch}
                    title="Actualizar ahora"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="gf-table-wrap" style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
                <table className="gf-table" style={{ width: "100%", minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>ID</th>
                      <th style={{ width: 110 }}>Estado</th>
                      <th style={{ width: 140 }}>Activo</th>
                      <th>Regla de Mantenimiento</th>
                      <th style={{ width: 140, textAlign: "right" }}>Valor / Umbral</th>
                      <th style={{ width: 150, textAlign: "right" }}>Fecha y Hora</th>
                      <th style={{ width: 170, textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#52545b", height: 50 }}>
                          Cargando alertas de mantenimiento…
                        </td>
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#f2495c", height: 50 }}>
                          {error}
                        </td>
                      </tr>
                    )}
                    {!loading && !error && filteredAlerts.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#8e8e93", height: 50 }}>
                          No hay alertas {statusFilter !== "ALL" ? `con estado "${statusFilter}"` : "registradas"}.
                        </td>
                      </tr>
                    )}
                    {filteredAlerts.map((alert) => {
                      const isPending = alert.status === "PENDING"
                      const isAck = alert.status === "ACKNOWLEDGED"
                      const isResolved = alert.status === "RESOLVED"
                      const isOperating = actionLoading === alert.id

                      return (
                        <Fragment key={alert.id}>
                          <tr
                            style={{
                              background: isPending
                                ? "rgba(229, 115, 115, 0.04)"
                                : isAck
                                  ? "rgba(212, 175, 55, 0.03)"
                                  : undefined,
                            }}
                          >
                            <td className="muted" style={{ fontWeight: 600 }}>
                              #{alert.id}
                            </td>

                            {/* Status Badge */}
                            <td>
                              {isPending && (
                                <span
                                  className="gf-badge"
                                  style={{
                                    background: "rgba(229, 115, 115, 0.12)",
                                    color: "#e57373",
                                    border: "1px solid rgba(229, 115, 115, 0.25)",
                                    fontWeight: 600,
                                    fontSize: 11,
                                  }}
                                >
                                  Pendiente
                                </span>
                              )}
                              {isAck && (
                                <span
                                  className="gf-badge"
                                  style={{
                                    background: "rgba(212, 175, 55, 0.12)",
                                    color: "#d4af37",
                                    border: "1px solid rgba(212, 175, 55, 0.25)",
                                    fontWeight: 600,
                                    fontSize: 11,
                                  }}
                                >
                                  Reconocida
                                </span>
                              )}
                              {isResolved && (
                                <span
                                  className="gf-badge gf-badge-online"
                                  style={{
                                    background: "rgba(129, 199, 132, 0.12)",
                                    color: "#81c784",
                                    border: "1px solid rgba(129, 199, 132, 0.25)",
                                    fontWeight: 600,
                                    fontSize: 11,
                                  }}
                                >
                                  Resuelta
                                </span>
                              )}
                            </td>

                            {/* Asset info */}
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <span style={{ fontWeight: 600, color: "#cbd5e1", fontSize: 12 }}>
                                  {alert.asset_id}
                                </span>
                                <span style={{ fontSize: 10, color: "#8e8e93" }}>
                                  {ASSET_TYPE_LABELS[alert.asset_type] ?? alert.asset_type}
                                </span>
                              </div>
                            </td>

                            {/* Rule info */}
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <span style={{ fontWeight: 600, color: "#d8d9da", fontSize: 12 }}>
                                  {alert.rule?.name ?? `Regla #${alert.rule_id}`}
                                </span>
                                {alert.rule?.trigger_type && (
                                  <span style={{ fontSize: 10, color: "#8e8e93" }}>
                                    {TRIGGER_LABELS[alert.rule.trigger_type]}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Value vs Threshold */}
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: isResolved ? "#81c784" : "#e57373",
                                    fontSize: 12,
                                  }}
                                >
                                  {alert.calculated_value.toLocaleString()} / {alert.threshold_value.toLocaleString()}
                                </span>
                                <span style={{ fontSize: 9, color: "#8e8e93" }}>
                                  {alert.calculated_value >= alert.threshold_value ? "Exceso umbral" : "Bajo umbral"}
                                </span>
                              </div>
                            </td>

                            {/* Triggered Date */}
                            <td className="muted" style={{ textAlign: "right", fontSize: 11 }}>
                              {new Date(alert.triggered_at).toLocaleString("es-CO", {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            {/* Quick Action: Registrar Levantamiento */}
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                                {!isResolved && (
                                  <button
                                    className="gf-btn gf-btn-secondary"
                                    style={{
                                      height: 24,
                                      padding: "0 8px",
                                      gap: 4,
                                      fontSize: 11,
                                      fontWeight: 500,
                                      background: "#1e2228",
                                      borderColor: "#2c3235",
                                      color: "#d8d9da",
                                    }}
                                    title="Registrar levantamiento de mantenimiento y resolver alerta (vista completa)"
                                    onClick={() => setSelectedAlertForLog(alert)}
                                    disabled={isOperating}
                                  >
                                    <FileCheck2 size={12} style={{ color: "#81c784" }} />
                                    Levantar
                                  </button>
                                )}

                                {isPending && (
                                  <button
                                    className="gf-btn gf-btn-secondary"
                                    style={{
                                      height: 24,
                                      padding: "0 6px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      background: "#1e2228",
                                      borderColor: "#2c3235",
                                      color: "#d4af37",
                                    }}
                                    title="Reconocer alerta"
                                    onClick={() => handleUpdateStatus(alert.id, "ACKNOWLEDGED")}
                                    disabled={isOperating}
                                  >
                                    Reconocer
                                  </button>
                                )}

                                {isResolved && (
                                  <button
                                    className="gf-btn gf-btn-ghost"
                                    style={{
                                      height: 24,
                                      padding: "0 6px",
                                      fontSize: 11,
                                      color: "#8e8e93",
                                    }}
                                    title="Reabrir alerta a estado Pendiente"
                                    onClick={() => handleUpdateStatus(alert.id, "PENDING")}
                                    disabled={isOperating}
                                  >
                                    Reabrir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}

      {/* Rules View Tab */}
      {activeTab === "rules" && (
        ruleViewMode !== "list" ? (
          <RuleFormFullView
            initial={ruleViewMode === "edit" ? selectedRuleForEdit : null}
            onSave={(saved) => {
              showToast(
                ruleViewMode === "edit"
                  ? `Regla #${saved.id} "${saved.name}" actualizada.`
                  : `Regla #${saved.id} "${saved.name}" creada con éxito.`,
                "success",
              )
              refetchRules()
              refetch()
              setRuleViewMode("list")
              setSelectedRuleForEdit(null)
            }}
            onCancel={() => {
              setRuleViewMode("list")
              setSelectedRuleForEdit(null)
            }}
          />
        ) : (
          <div className="gf-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Panel Header */}
            <div
              className="gf-panel-header"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                minHeight: 38,
                height: "auto",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Sliders size={14} style={{ color: "#ff7800" }} />
                <span className="gf-panel-title">
                  Reglas de Supervisión ({filteredRules.length})
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  flex: "1 1 auto",
                  minWidth: 0,
                }}
              >
                {/* Search */}
                <div
                  className="gf-search"
                  style={{
                    flex: "1 1 140px",
                    minWidth: 120,
                    maxWidth: 220,
                    height: 24,
                  }}
                >
                  <Search className="gf-search-icon" size={12} />
                  <input
                    className="gf-search-input"
                    type="text"
                    placeholder="Buscar regla..."
                    value={ruleSearchTerm}
                    onChange={(e) => setRuleSearchTerm(e.target.value)}
                    style={{ fontSize: 11 }}
                  />
                  {ruleSearchTerm && (
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "#8e8e93",
                        cursor: "pointer",
                        padding: "0 4px",
                        position: "absolute",
                        right: 4,
                      }}
                      onClick={() => setRuleSearchTerm("")}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="gf-btn gf-btn-secondary"
                  style={{ height: 24, padding: "0 8px", gap: 4, fontSize: 11, flexShrink: 0 }}
                  onClick={refetchRules}
                  title="Actualizar reglas"
                >
                  <RefreshCw size={11} />
                </button>

                {/* Button to switch to full-view creation */}
                <button
                  type="button"
                  className="gf-btn gf-btn-primary"
                  style={{ height: 24, padding: "0 10px", gap: 5, fontSize: 11, flexShrink: 0 }}
                  onClick={() => {
                    setSelectedRuleForEdit(null)
                    setRuleViewMode("create")
                  }}
                >
                  <Plus size={12} />
                  <span>Nueva Regla</span>
                </button>
              </div>
            </div>

            {/* Rules Table */}
            <div className="gf-table-wrap" style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              <table className="gf-table" style={{ width: "100%", minWidth: 620 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th style={{ width: 85, textAlign: "center" }}>Estado</th>
                    <th style={{ width: 140 }}>Activo</th>
                    <th>Nombre y Procedimiento</th>
                    <th style={{ width: 150 }}>Métrica Disparo</th>
                    <th style={{ width: 100, textAlign: "right" }}>Umbral</th>
                    <th style={{ width: 90, textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rulesLoading && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#52545b", height: 50 }}>
                        Cargando reglas de mantenimiento…
                      </td>
                    </tr>
                  )}
                  {rulesError && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#f2495c", height: 50 }}>
                        {rulesError}
                      </td>
                    </tr>
                  )}
                  {!rulesLoading && !rulesError && filteredRules.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#8e8e93", padding: "24px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <span>No hay reglas configuradas {ruleSearchTerm ? "que coincidan con la búsqueda" : ""}.</span>
                          <button
                            type="button"
                            className="gf-btn gf-btn-primary"
                            style={{ height: 26, fontSize: 11 }}
                            onClick={() => {
                              setSelectedRuleForEdit(null)
                              setRuleViewMode("create")
                            }}
                          >
                            <Plus size={12} /> Crear primera regla
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredRules.map((rule) => {
                    const isDeletingThis = confirmDeleteRule === rule.id
                    return (
                      <Fragment key={rule.id}>
                        <tr style={{ background: isDeletingThis ? "rgba(242, 73, 92, 0.05)" : undefined }}>
                          <td className="muted" style={{ fontWeight: 600 }}>
                            #{rule.id}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleRuleActive(rule)}
                              title={rule.is_active ? "Pausar regla" : "Activar regla"}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              <span className={`gf-badge ${rule.is_active ? "gf-badge-online" : "gf-badge-offline"}`}>
                                {rule.is_active ? "ACTIVA" : "PAUSADA"}
                              </span>
                            </button>
                          </td>

                          {/* Asset info */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <span style={{ fontWeight: 600, color: "#cbd5e1", fontSize: 12 }}>
                                {rule.asset_id}
                              </span>
                              <span style={{ fontSize: 10, color: "#8e8e93" }}>
                                {ASSET_TYPE_LABELS[rule.asset_type] ?? rule.asset_type}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontWeight: 600, color: "#d8d9da", fontSize: 12 }}>
                                {rule.name}
                              </span>
                              {rule.description && (
                                <span style={{ fontSize: 11, color: "#8e8e93" }}>
                                  {rule.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="muted" style={{ fontSize: 11 }}>
                            {TRIGGER_LABELS[rule.trigger_type] ?? rule.trigger_type}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "#d8d9da", fontSize: 12 }}>
                            {rule.threshold_value.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                              <button
                                type="button"
                                className="gf-btn gf-btn-secondary"
                                style={{ height: 22, padding: "0 6px", fontSize: 11 }}
                                title="Editar regla (vista completa)"
                                onClick={() => {
                                  setSelectedRuleForEdit(rule)
                                  setRuleViewMode("edit")
                                }}
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                className="gf-btn gf-btn-ghost"
                                style={{ height: 22, padding: "0 6px", fontSize: 11, color: "#f2495c" }}
                                title="Eliminar regla"
                                onClick={() => setConfirmDeleteRule(rule.id)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Confirm Delete Row */}
                        {isDeletingThis && (
                          <tr key={`del-${rule.id}`} style={{ background: "rgba(242, 73, 92, 0.08)" }}>
                            <td colSpan={7} style={{ padding: "8px 12px", borderBottom: "1px solid #22252b" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                                <span style={{ fontSize: 12, color: "#f2495c" }}>
                                  ¿Eliminar regla <strong>#{rule.id} {rule.name}</strong>? Las alertas históricas asociadas serán removidas.
                                </span>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    className="gf-btn gf-btn-secondary"
                                    style={{ height: 22, padding: "0 8px", fontSize: 11 }}
                                    onClick={() => setConfirmDeleteRule(null)}
                                    disabled={deletingRule}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    className="gf-btn gf-btn-danger"
                                    style={{ height: 22, padding: "0 8px", fontSize: 11, background: "#84232a", borderColor: "#f2495c" }}
                                    onClick={() => handleDeleteRule(rule.id)}
                                    disabled={deletingRule}
                                  >
                                    {deletingRule ? "Eliminando…" : "Sí, eliminar"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

    </div>
  )
}
