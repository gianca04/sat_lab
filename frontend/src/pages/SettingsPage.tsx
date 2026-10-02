export function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
      {/* Backend & Auth */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Autenticación JWT & Backend FastAPI</span>
        </div>
        <div className="gf-panel-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="gf-label">Endpoint de Autenticación</label>
            <input className="gf-input" value="http://localhost:8000/auth/login" readOnly />
          </div>
          <div>
            <label className="gf-label">Documentación OpenAPI</label>
            <input className="gf-input" value="http://localhost:8000/docs" readOnly />
          </div>
        </div>
      </div>

      {/* Broker MQTT */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Broker MQTT Industrial (Sparkplug B)</span>
        </div>
        <div className="gf-panel-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label className="gf-label">Host Broker</label>
            <input className="gf-input" value="192.168.10.208" readOnly />
          </div>
          <div>
            <label className="gf-label">Puerto</label>
            <input className="gf-input" value="1883" readOnly />
          </div>
          <div>
            <label className="gf-label">Tópico de Suscripción</label>
            <input className="gf-input" value="sat_lab/telemetry/#" readOnly />
          </div>
        </div>
      </div>

      {/* DB */}
      <div className="gf-panel">
        <div className="gf-panel-header">
          <span className="gf-panel-title">Fuente de Datos — grafana-postgresql-sat_lab</span>
        </div>
        <div className="gf-panel-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="gf-label">Dataset</label>
            <input className="gf-input" value="sat_lab" readOnly />
          </div>
          <div>
            <label className="gf-label">Host</label>
            <input className="gf-input" value="192.168.10.73:5432" readOnly />
          </div>
        </div>
      </div>
    </div>
  )
}
