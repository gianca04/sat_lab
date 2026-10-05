import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Network,
  Cpu,
  AlertTriangle,
  Wrench,
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { useApi } from "@/hooks/useApi"
import type { MaintenanceAlert } from "@/types/models"

const navigation = [
  { name: "Visión General", href: "/", icon: LayoutDashboard },
  { name: "Nodos & Dispositivos", href: "/nodes", icon: Network },
  { name: "Activos ISA-95", href: "/equipments", icon: Cpu },
  { name: "Alertas de Mantenimiento", href: "/alerts", icon: AlertTriangle, hasAlertBadge: true },
  { name: "Mantenimiento & Logs", href: "/maintenance", icon: Wrench },
  { name: "Eventos Sparkplug", href: "/events", icon: Activity },
]

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { data: alerts } = useApi<MaintenanceAlert[]>("/api/maintenance/alerts")
  const pendingCount = (alerts ?? []).filter((a) => a.status === "PENDING").length

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sat_sidebar_collapsed") === "true"
  })

  useEffect(() => {
    localStorage.setItem("sat_sidebar_collapsed", String(isCollapsed))
  }, [isCollapsed])

  return (
    <aside className={`gf-sidebar${isCollapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      {/* Logo & Header */}
      <div
        className="gf-sidebar-logo"
        style={{
          padding: isCollapsed ? "0 8px" : "0 8px 0 12px",
          justifyContent: isCollapsed ? "center" : "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <div className="gf-sidebar-logo-icon" title="SAT Laboratorio">
            S
          </div>
          {(!isCollapsed || mobileOpen) && (
            <span className="gf-sidebar-logo-text" style={{ whiteSpace: "nowrap" }}>
              SAT Laboratorio
            </span>
          )}
        </div>

        {mobileOpen ? (
          <button
            type="button"
            className="gf-btn gf-btn-ghost"
            style={{
              height: 24,
              width: 24,
              padding: 0,
              color: "#8e8e93",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onCloseMobile}
            title="Cerrar menú"
          >
            <X size={15} />
          </button>
        ) : !isCollapsed && (
          <button
            type="button"
            className="gf-btn gf-btn-ghost"
            style={{
              height: 24,
              width: 24,
              padding: 0,
              color: "#8e8e93",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setIsCollapsed(true)}
            title="Colapsar menú lateral"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <nav className="gf-nav">
        {!isCollapsed || mobileOpen ? (
          <div className="gf-nav-section-label">Módulos de Planta</div>
        ) : (
          <div style={{ height: 1, background: "#22252b", margin: "6px 8px 10px" }} />
        )}

        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            onClick={() => {
              if (onCloseMobile) onCloseMobile()
            }}
            className={({ isActive }) =>
              `gf-nav-item${isActive ? " active" : ""}`
            }
            title={item.name}
            style={
              isCollapsed && !mobileOpen
                ? {
                    justifyContent: "center",
                    padding: "8px 0",
                    position: "relative",
                  }
                : undefined
            }
          >
            <div
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <item.icon size={15} style={{ flexShrink: 0 }} />
              {isCollapsed && item.hasAlertBadge && pendingCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -4,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#f28b82",
                    border: "1px solid #181b1f",
                  }}
                />
              )}
            </div>

            {!isCollapsed && (
              <>
                <span
                  style={{
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </span>

                {item.hasAlertBadge && pendingCount > 0 && (
                  <span
                    style={{
                      background: "#382326",
                      color: "#f28b82",
                      border: "1px solid #542b30",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "0 5px",
                      borderRadius: 2,
                      lineHeight: "15px",
                      height: 15,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Toggle Button */}
      <div
        style={{
          borderTop: "1px solid #22252b",
          padding: isCollapsed ? "8px 0" : "8px 10px",
          display: "flex",
          justifyContent: isCollapsed ? "center" : "flex-start",
        }}
      >
        <button
          type="button"
          className="gf-btn gf-btn-ghost"
          style={{
            height: 28,
            width: isCollapsed ? 28 : "100%",
            padding: isCollapsed ? 0 : "0 8px",
            gap: 6,
            color: "#8e8e93",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            fontSize: 12,
          }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
        >
          {isCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <>
              <ChevronLeft size={14} />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
