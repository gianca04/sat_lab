import { useState } from "react"
import { useLocation } from "react-router-dom"
import { ChevronRight, Menu, RefreshCw } from "lucide-react"

const routeNames: Record<string, string> = {
  "/": "Visión General",
  "/nodes": "Nodos & Dispositivos",
  "/equipments": "Activos ISA-95",
  "/alerts": "Alertas de Mantenimiento",
  "/maintenance": "Mantenimiento",
  "/events": "Eventos Sparkplug",
}

interface HeaderProps {
  onToggleMobileMenu?: () => void
}

export function Header({ onToggleMobileMenu }: HeaderProps) {
  const location = useLocation()
  const currentTitle = routeNames[location.pathname] ?? "Panel"
  const [isSpinning, setIsSpinning] = useState(false)

  const handleRefresh = () => {
    setIsSpinning(true)
    window.dispatchEvent(new CustomEvent("app:refresh"))
    setTimeout(() => setIsSpinning(false), 600)
  }

  return (
    <header className="gf-topbar">
      {/* Left section: Mobile toggle & Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {onToggleMobileMenu && (
          <button
            type="button"
            className="gf-btn gf-btn-ghost gf-mobile-menu-btn"
            style={{
              height: 26,
              width: 26,
              padding: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onToggleMobileMenu}
            title="Abrir menú de navegación"
          >
            <Menu size={16} />
          </button>
        )}

        {/* Breadcrumb */}
        <div className="gf-breadcrumb" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span className="gf-breadcrumb-parent">Laboratorio</span>
          <span className="gf-breadcrumb-sep gf-breadcrumb-parent">
            <ChevronRight size={11} />
          </span>
          <span className="gf-breadcrumb-current">{currentTitle}</span>
        </div>
      </div>

      {/* Topbar controls */}
      <div className="gf-topbar-actions" style={{ flexShrink: 0 }}>
        {/* Refresh */}
        <button
          className="gf-btn gf-btn-secondary"
          style={{ gap: 4 }}
          onClick={handleRefresh}
          title="Actualizar datos de la vista activa"
        >
          <RefreshCw
            size={12}
            style={{
              transition: "transform 0.6s ease",
              transform: isSpinning ? "rotate(360deg)" : "rotate(0deg)",
            }}
          />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>
    </header>
  )
}
