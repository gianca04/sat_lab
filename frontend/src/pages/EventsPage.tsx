import { useState } from "react"
import { useApi } from "@/hooks/useApi"
import type { SparkplugLifecycleEvent } from "@/types/models"

const EVENT_COLORS: Record<string, string> = {
  NBIRTH: "#5794f2",
  DBIRTH: "#5794f2",
  NDEATH: "#f2495c",
  DDEATH: "#f2495c",
}

export function EventsPage() {
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [eventType, setEventType] = useState("")

  const params: Record<string, string> = {}
  if (query) params.q = query
  if (eventType) params.event_type = eventType

  const { data: events, loading, error, refetch } = useApi<SparkplugLifecycleEvent[]>(
    "/api/events",
    Object.keys(params).length ? params : undefined,
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6, flex: 1 }}>
          <input
            className="gf-input"
            placeholder="Buscar por node_id o device_id…"
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="gf-input"
            style={{ width: 140 }}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option>NBIRTH</option>
            <option>NDEATH</option>
            <option>DBIRTH</option>
            <option>DDEATH</option>
          </select>
          <button type="submit" className="gf-btn gf-btn-secondary">Filtrar</button>
          {(query || eventType) && (
            <button type="button" className="gf-btn gf-btn-ghost" onClick={() => { setSearch(""); setQuery(""); setEventType("") }}>
              Limpiar
            </button>
          )}
        </form>
        <button className="gf-btn gf-btn-ghost" onClick={refetch}>Actualizar</button>
      </div>

      {/* Table */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">sparkplug_lifecycle_events {events ? `— ${events.length} registros` : ""}</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>id</th>
                <th style={{ width: 180 }}>event_time</th>
                <th style={{ width: 100 }}>event_type</th>
                <th>node_id</th>
                <th>device_id</th>
                <th style={{ width: 100, textAlign: "right" }}>status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Cargando…</td></tr>
              )}
              {error && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#f2495c", height: 48 }}>{error}</td></tr>
              )}
              {!loading && !error && (!events || events.length === 0) && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#52545b", height: 48 }}>Sin eventos registrados.</td></tr>
              )}
              {events?.map((ev) => (
                <tr key={ev.id}>
                  <td className="muted">{ev.id}</td>
                  <td className="muted">{new Date(ev.event_time).toLocaleString("es-CO")}</td>
                  <td style={{ color: EVENT_COLORS[ev.event_type] ?? "#d8d9da" }}>{ev.event_type}</td>
                  <td>{ev.node_id}</td>
                  <td className="muted">{ev.device_id ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`gf-badge ${ev.status === "ONLINE" ? "gf-badge-online" : "gf-badge-offline"}`}>
                      {ev.status}
                    </span>
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
