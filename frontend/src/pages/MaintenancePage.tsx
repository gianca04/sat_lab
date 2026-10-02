import { useCallback, useMemo, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { api } from "@/lib/apiClient"
import type { AssetType, Device, Equipment, MaintenanceLog, MaintenanceRule, Node, TriggerType } from "@/types/models"

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
  STARTUPS: "Arranques de motor",
  CALENDAR_DAYS: "Días calendario",
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  EQUIPMENT: "Equipo",
  DEVICE: "Dispositivo PLC",
  NODE: "Edge Node",
}

// ─── Form Panel ───────────────────────────────────────────────────────────────

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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>

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
                value={form.threshold_value}
                placeholder="Ej: 500"
                onChange={(e) => set("threshold_value", e.target.value === "" ? "" : Number(e.target.value))}
              />
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MaintenancePage() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MaintenanceRule | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: rules, loading: rLoading, error: rError, refetch: refetchRules } =
    useApi<MaintenanceRule[]>("/api/maintenance/rules")

  const { data: logs, loading: lLoading, error: lError, refetch: refetchLogs } =
    useApi<MaintenanceLog[]>("/api/maintenance/logs")

  const handleSaved = useCallback(() => {
    setShowForm(false)
    setEditing(null)
    refetchRules()
  }, [refetchRules])

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await api.delete(`/api/maintenance/rules/${id}`)
      setConfirmDelete(null)
      refetchRules()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const openCreate = () => { setEditing(null); setShowForm(true) }
  const openEdit = (r: MaintenanceRule) => { setEditing(r); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Form panel (create / edit) */}
      {showForm && (
        <RuleFormPanel
          initial={editing}
          onSave={handleSaved}
          onCancel={closeForm}
        />
      )}

      {/* Rules panel */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">
            maintenance_rules {rules ? `— ${rules.length} reglas` : ""}
          </span>
          {!showForm && (
            <button className="gf-btn gf-btn-primary" style={{ height: 22 }} onClick={openCreate}>
              <Plus size={12} /> Nueva regla
            </button>
          )}
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>id</th>
                <th style={{ width: 90 }}>asset_type</th>
                <th style={{ width: 160 }}>asset_id</th>
                <th>nombre</th>
                <th style={{ width: 130 }}>trigger_type</th>
                <th style={{ width: 90, textAlign: "right" }}>threshold</th>
                <th style={{ width: 70, textAlign: "center" }}>activa</th>
                <th style={{ width: 80, textAlign: "right" }}>acciones</th>
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
                  <tr key={r.id} style={{ background: confirmDelete === r.id ? "rgba(242,73,92,0.06)" : undefined }}>
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
                          onClick={() => openEdit(r)}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="gf-btn gf-btn-ghost"
                          style={{ height: 22, padding: "0 6px", color: "#f2495c" }}
                          title="Eliminar"
                          onClick={() => setConfirmDelete(r.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Confirm delete row */}
                  {confirmDelete === r.id && (
                    <tr key={`del-${r.id}`} style={{ background: "rgba(242,73,92,0.08)" }}>
                      <td colSpan={8} style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 12, color: "#f2495c" }}>
                            ¿Eliminar regla <strong>#{r.id} {r.name}</strong>? Sus alertas asociadas se borrarán en cascada.
                          </span>
                          <button
                            className="gf-btn gf-btn-ghost"
                            style={{ height: 22, color: "#f2495c", borderColor: "#f2495c" }}
                            disabled={deleting}
                            onClick={() => handleDelete(r.id)}
                          >
                            {deleting ? "Eliminando…" : "Confirmar"}
                          </button>
                          <button
                            className="gf-btn gf-btn-ghost"
                            style={{ height: 22 }}
                            onClick={() => setConfirmDelete(null)}
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
          <span className="gf-panel-title">maintenance_logs {logs ? `— ${logs.length} registros` : ""}</span>
          <button className="gf-btn gf-btn-ghost" style={{ height: 22 }} onClick={refetchLogs}>
            Actualizar
          </button>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>id</th>
                <th style={{ width: 100 }}>asset_type</th>
                <th>asset_id</th>
                <th style={{ width: 120 }}>tipo</th>
                <th style={{ width: 150 }}>técnico</th>
                <th>descripción</th>
                <th style={{ width: 160, textAlign: "right" }}>created_at</th>
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
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#52545b", height: 40 }}>Sin intervenciones registradas.</td></tr>
              )}
              {logs?.map((l) => (
                <tr key={l.id}>
                  <td className="muted">{l.id}</td>
                  <td><span className="gf-badge gf-badge-neutral">{l.asset_type}</span></td>
                  <td className="link">{l.asset_id}</td>
                  <td className="muted">{l.maintenance_type}</td>
                  <td className="muted">{l.technician ?? "—"}</td>
                  <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.description ?? "—"}
                  </td>
                  <td className="muted" style={{ textAlign: "right" }}>
                    {new Date(l.created_at).toLocaleString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
