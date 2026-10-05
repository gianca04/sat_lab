import { useState } from "react"
import { useApi } from "@/hooks/useApi"
import type { Device, Node } from "@/types/models"

export function NodesPage() {
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")

  const { data: nodes, loading, error, refetch } = useApi<Node[]>("/api/nodes", query ? { q: query } : undefined)
  const { data: devices } = useApi<Device[]>("/api/devices")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Page Header */}
      <div className="gf-page-header">
        <h1 className="gf-page-title">Topología de Red & Nodos</h1>
      </div>

      {/* Stat Panels */}
      <div className="gf-stat-grid">
        <div className="gf-stat">
          <div className="gf-stat-label">Edge Nodes</div>
          <div className="gf-stat-value">{nodes?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Dispositivos PLC</div>
          <div className="gf-stat-value">{devices?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Nodos con Dispositivos</div>
          <div className="gf-stat-value">
            {devices ? new Set(devices.map((d) => d.node_tag)).size : "—"}
          </div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Protocolo Sparkplug B</div>
          <div className="gf-stat-value gf-stat-value-sm" style={{ color: "#73bf69" }}>
            ACTIVO
          </div>
          <div style={{ fontSize: 11, color: "#52545b", marginTop: 2 }}>
            MQTT v3.1.1 · ISO/IEC 20237
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gf-toolbar">
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: "1 1 280px", maxWidth: 440 }}>
          <input
            className="gf-input"
            placeholder="Buscar por tag o nombre…"
            style={{ flex: "1 1 180px", minWidth: 140 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="gf-btn gf-btn-secondary" style={{ flexShrink: 0 }}>Buscar</button>
          {query && (
            <button type="button" className="gf-btn gf-btn-ghost" style={{ flexShrink: 0 }} onClick={() => { setSearch(""); setQuery("") }}>
              Limpiar
            </button>
          )}
        </form>
        <button className="gf-btn gf-btn-ghost" style={{ flexShrink: 0 }} onClick={refetch}>Actualizar</button>
      </div>

      {/* Nodes */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Edge Nodes ({nodes?.length ?? 0})</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Nombre</th>
                <th style={{ width: 180, textAlign: "right" }}>Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Cargando…</td></tr>
              )}
              {error && (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "#f2495c", height: 48 }}>{error}</td></tr>
              )}
              {!loading && !error && (!nodes || nodes.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Sin nodos registrados.</td></tr>
              )}
              {nodes?.map((n) => (
                <tr key={n.tag_name}>
                  <td className="link">{n.tag_name}</td>
                  <td className="muted">{n.name}</td>
                  <td className="muted" style={{ textAlign: "right" }}>
                    {new Date(n.created_at).toLocaleString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Devices */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Dispositivos PLC ({devices?.length ?? 0})</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Nombre</th>
                <th style={{ width: 180 }}>Nodo Asociado</th>
                <th style={{ width: 180, textAlign: "right" }}>Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              {!devices || devices.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "#52545b", height: 40 }}>Sin dispositivos.</td></tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.tag_name}>
                    <td className="link">{d.tag_name}</td>
                    <td className="muted">{d.name}</td>
                    <td className="muted">{d.node_tag}</td>
                    <td className="muted" style={{ textAlign: "right" }}>
                      {new Date(d.created_at).toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
