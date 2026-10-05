import { useState } from "react"
import { useApi } from "@/hooks/useApi"
import type { Equipment } from "@/types/models"

export function EquipmentsPage() {
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")

  const { data: equipments, loading, error, refetch } = useApi<Equipment[]>(
    "/api/equipments",
    query ? { q: query } : undefined,
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Page Header */}
      <div className="gf-page-header">
        <h1 className="gf-page-title">Activos Industriales ISA-95</h1>
      </div>

      {/* Stat Panels */}
      <div className="gf-stat-grid">
        <div className="gf-stat">
          <div className="gf-stat-label">Activos ISA-95</div>
          <div className="gf-stat-value">{equipments?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Equipos Principales</div>
          <div className="gf-stat-value">
            {equipments ? equipments.filter((e) => !e.parent_tag).length : "—"}
          </div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Sub-activos / Componentes</div>
          <div className="gf-stat-value">
            {equipments ? equipments.filter((e) => !!e.parent_tag).length : "—"}
          </div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">PLCs Mapeados</div>
          <div className="gf-stat-value gf-stat-value-sm" style={{ color: "#73bf69" }}>
            {equipments ? `${new Set(equipments.filter((e) => e.device_id).map((e) => e.device_id)).size} vinculados` : "—"}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gf-toolbar">
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: "1 1 280px", maxWidth: 440 }}>
          <input
            className="gf-input"
            placeholder="Buscar por tag, nombre o device…"
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

      {/* Table */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Activos ISA-95 ({equipments?.length ?? 0})</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Nombre</th>
                <th style={{ width: 150 }}>Tipo de Activo</th>
                <th style={{ width: 180 }}>Dispositivo PLC</th>
                <th style={{ width: 150 }}>Activo Padre</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Cargando…</td></tr>
              )}
              {error && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#f2495c", height: 48 }}>{error}</td></tr>
              )}
              {!loading && !error && (!equipments || equipments.length === 0) && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Sin activos registrados.</td></tr>
              )}
              {equipments?.map((eq) => (
                <tr key={eq.tag_name}>
                  <td className="link">{eq.tag_name}</td>
                  <td>{eq.name}</td>
                  <td className="muted">{eq.type_equipment_id ?? "—"}</td>
                  <td className="muted">{eq.device_id ?? "—"}</td>
                  <td className="muted">{eq.parent_tag ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
