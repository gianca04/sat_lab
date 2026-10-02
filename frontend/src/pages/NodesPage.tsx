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
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
          <input
            className="gf-input"
            placeholder="Buscar por tag o nombre..."
            style={{ width: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="gf-btn gf-btn-secondary">Buscar</button>
          {query && (
            <button type="button" className="gf-btn gf-btn-ghost" onClick={() => { setSearch(""); setQuery("") }}>
              Limpiar
            </button>
          )}
        </form>
        <button className="gf-btn gf-btn-ghost" onClick={refetch}>Actualizar</button>
      </div>

      {/* Nodes */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">nodes {nodes ? `— ${nodes.length} registros` : ""}</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th>tag_name</th>
                <th>name</th>
                <th style={{ width: 180, textAlign: "right" }}>created_at</th>
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
          <span className="gf-panel-title">devices {devices ? `— ${devices.length} registros` : ""}</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th>tag_name</th>
                <th>name</th>
                <th style={{ width: 180 }}>node_tag</th>
                <th style={{ width: 180, textAlign: "right" }}>created_at</th>
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
