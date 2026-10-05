import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { NodesPage } from "@/pages/NodesPage"
import { EquipmentsPage } from "@/pages/EquipmentsPage"
import { AlertsPage } from "@/pages/AlertsPage"
import { MaintenancePage } from "@/pages/MaintenancePage"
import { EventsPage } from "@/pages/EventsPage"
import { NotFoundPage } from "@/pages/NotFoundPage"

import { DrumViewerPage } from "@/pages/DrumViewerPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Vista 3D independiente (sin sidebar ni botones, objeto en un plano) */}
        <Route path="/drum-3d" element={<DrumViewerPage />} />
        <Route path="/drum" element={<DrumViewerPage />} />
        <Route path="/barril" element={<DrumViewerPage />} />

        {/* Vista independiente responsiva para embeber en Grafana (iframe / jframe) */}
        <Route path="/embed/alerts" element={<AlertsPage standalone={true} />} />

        {/* Layout completo del sistema con barra lateral y cabecera */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="nodes" element={<NodesPage />} />
          <Route path="equipments" element={<EquipmentsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
