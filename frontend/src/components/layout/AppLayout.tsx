import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function AppLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "#111217", color: "#d8d9da" }}>
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
