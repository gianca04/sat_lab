import { useLocation } from "react-router-dom"
import { Search, ChevronRight, RefreshCw, Clock, User } from "lucide-react"

const routeNames: Record<string, string> = {
  "/": "Visión General",
  "/nodes": "Nodos & Dispositivos",
  "/equipments": "Activos ISA-95",
  "/maintenance": "Mantenimiento",
  "/events": "Eventos Sparkplug",
  "/settings": "Configuración",
}

export function Header() {
  const location = useLocation()
  const currentTitle = routeNames[location.pathname] ?? "Panel"

  return (
    <header className="gf-topbar">
      {/* Grafana-style breadcrumb */}
      <div className="gf-breadcrumb">
        <span>Laboratorio</span>
        <span className="gf-breadcrumb-sep">
          <ChevronRight size={11} />
        </span>
        <span className="gf-breadcrumb-current">{currentTitle}</span>
      </div>

      {/* Grafana-style controls */}
      <div className="gf-topbar-actions">
        {/* Search */}
        <div className="gf-search">
          <Search className="gf-search-icon" />
          <input
            className="gf-search-input"
            type="text"
            placeholder="Buscar..."
            readOnly
          />
          <span className="gf-search-shortcut">ctrl+k</span>
        </div>

        {/* Time range */}
        <button className="gf-btn gf-btn-secondary" style={{ gap: 4 }}>
          <Clock size={12} />
          Últimas 6 horas
        </button>

        {/* Refresh */}
        <button className="gf-btn gf-btn-secondary" style={{ gap: 4 }}>
          <RefreshCw size={12} />
          Actualizar
        </button>

        {/* User avatar */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#22252b",
            border: "1px solid #2c3235",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#8e8e93",
          }}
        >
          <User size={14} />
        </div>
      </div>
    </header>
  )
}
