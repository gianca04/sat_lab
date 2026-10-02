import { useApi } from "@/hooks/useApi"
import type { Device, Equipment, Node, SparkplugLifecycleEvent } from "@/types/models"

export function DashboardPage() {
  const { data: nodes } = useApi<Node[]>("/api/nodes")
  const { data: devices } = useApi<Device[]>("/api/devices")
  const { data: equipments } = useApi<Equipment[]>("/api/equipments")
  const { data: events } = useApi<SparkplugLifecycleEvent[]>("/api/events", { limit: 10 })

  // Latest status from most recent events
  const latestNodeStatus = events?.find((e) => e.event_type === "NBIRTH" || e.event_type === "NDEATH")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Stat Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <div className="gf-stat">
          <div className="gf-stat-label">Edge Nodes</div>
          <div className="gf-stat-value">{nodes?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Dispositivos PLC</div>
          <div className="gf-stat-value">{devices?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Activos ISA-95</div>
          <div className="gf-stat-value">{equipments?.length ?? "—"}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Último evento</div>
          {latestNodeStatus ? (
            <>
              <div
                className="gf-stat-value gf-stat-value-sm"
                style={{ color: latestNodeStatus.status === "ONLINE" ? "#73bf69" : "#f2495c" }}
              >
                {latestNodeStatus.status}
              </div>
              <div style={{ fontSize: 11, color: "#52545b", marginTop: 2 }}>
                {latestNodeStatus.node_id} · {latestNodeStatus.event_type}
              </div>
            </>
          ) : (
            <div className="gf-stat-value gf-stat-value-sm" style={{ color: "#52545b" }}>Sin datos</div>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">sparkplug_lifecycle_events — últimos 10</span>
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
              {!events || events.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#52545b", height: 48 }}>
                    Sin eventos. Esperando tráfico MQTT…
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="muted">{ev.id}</td>
                    <td className="muted">{new Date(ev.event_time).toLocaleString("es-CO")}</td>
                    <td style={{ color: ["NBIRTH", "DBIRTH"].includes(ev.event_type) ? "#5794f2" : "#f2495c" }}>
                      {ev.event_type}
                    </td>
                    <td>{ev.node_id}</td>
                    <td className="muted">{ev.device_id ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`gf-badge ${ev.status === "ONLINE" ? "gf-badge-online" : "gf-badge-offline"}`}>
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nodes quick view */}
      {nodes && nodes.length > 0 && (
        <div className="gf-panel">
          <div className="gf-panel-header">
            <span className="gf-panel-title">nodes — topología activa</span>
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
                {nodes.map((n) => (
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
      )}
    </div>
  )
}
