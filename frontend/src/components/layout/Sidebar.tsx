import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Network,
  Cpu,
  Wrench,
  Activity,
  Settings,
} from "lucide-react"

const navigation = [
  { name: "Visión General", href: "/", icon: LayoutDashboard },
  { name: "Nodos & Dispositivos", href: "/nodes", icon: Network },
  { name: "Activos ISA-95", href: "/equipments", icon: Cpu },
  { name: "Mantenimiento", href: "/maintenance", icon: Wrench },
  { name: "Eventos Sparkplug", href: "/events", icon: Activity },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="gf-sidebar">
      <div className="gf-sidebar-logo">
        <div className="gf-sidebar-logo-icon">S</div>
        <span className="gf-sidebar-logo-text">SAT Laboratorio</span>
      </div>

      <nav className="gf-nav">
        <div className="gf-nav-section-label">Módulos de Planta</div>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              `gf-nav-item${isActive ? " active" : ""}`
            }
          >
            <item.icon size={14} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
