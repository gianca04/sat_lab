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
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
          <input
            className="gf-input"
            placeholder="Buscar por tag, nombre o device…"
            style={{ width: 280 }}
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

      {/* Table */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">equipments {equipments ? `— ${equipments.length} registros` : ""}</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th>tag_name</th>
                <th>name</th>
                <th style={{ width: 140 }}>type_equipment_id</th>
                <th style={{ width: 180 }}>device_id</th>
                <th style={{ width: 140 }}>parent_tag</th>
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
