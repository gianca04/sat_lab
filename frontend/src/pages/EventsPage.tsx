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
      {/* Page Header */}
      <div className="gf-page-header">
        <h1 className="gf-page-title">Eventos de Ciclo de Vida Sparkplug B</h1>
      </div>

      {/* Stat Panels */}
      <div className="gf-stat-grid">
        <div className="gf-stat">
          <div className="gf-stat-label">Total eventos</div>
          <div className="gf-stat-value">{events?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Eventos Online (Birth)</div>
          <div className="gf-stat-value" style={{ color: "#5794f2" }}>
            {events ? events.filter((e) => ["NBIRTH", "DBIRTH"].includes(e.event_type)).length : "—"}
          </div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Eventos Desconexión (Death)</div>
          <div className="gf-stat-value" style={{ color: "#f2495c" }}>
            {events ? events.filter((e) => ["NDEATH", "DDEATH"].includes(e.event_type)).length : "—"}
          </div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Último estado registrado</div>
          {events && events.length > 0 ? (
            <>
              <div
                className="gf-stat-value gf-stat-value-sm"
                style={{ color: events[0].status === "ONLINE" ? "#73bf69" : "#f2495c" }}
              >
                {events[0].status}
              </div>
              <div style={{ fontSize: 11, color: "#52545b", marginTop: 2 }}>
                {events[0].node_id} · {events[0].event_type}
              </div>
            </>
          ) : (
            <div className="gf-stat-value gf-stat-value-sm" style={{ color: "#52545b" }}>Sin datos</div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="gf-toolbar">
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: "1 1 320px" }}>
          <input
            className="gf-input"
            placeholder="Buscar por node_id o device_id…"
            style={{ flex: "1 1 180px", minWidth: 140 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="gf-input"
            style={{ flex: "0 1 140px", minWidth: 120 }}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option>NBIRTH</option>
            <option>NDEATH</option>
            <option>DBIRTH</option>
            <option>DDEATH</option>
          </select>
          <button type="submit" className="gf-btn gf-btn-secondary" style={{ flexShrink: 0 }}>Filtrar</button>
          {(query || eventType) && (
            <button type="button" className="gf-btn gf-btn-ghost" style={{ flexShrink: 0 }} onClick={() => { setSearch(""); setQuery(""); setEventType("") }}>
              Limpiar
            </button>
          )}
        </form>
        <button className="gf-btn gf-btn-ghost" style={{ flexShrink: 0 }} onClick={refetch}>Actualizar</button>
      </div>

      {/* Table */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Eventos de Telemetría ({events?.length ?? 0})</span>
        </div>
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th style={{ width: 180 }}>Fecha y Hora</th>
                <th style={{ width: 110 }}>Tipo de Evento</th>
                <th>Nodo</th>
                <th>Dispositivo</th>
                <th style={{ width: 100, textAlign: "right" }}>Estado</th>
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
