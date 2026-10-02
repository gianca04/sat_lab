import { Link } from "react-router-dom"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center space-y-3">
      <AlertCircle className="h-10 w-10 text-muted-foreground/60" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">404 - Módulo no encontrado</h2>
        <p className="text-xs text-muted-foreground">La ruta solicitada no existe en el sistema de telemetría.</p>
      </div>
      <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
        <Link to="/">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Visión General
        </Link>
      </Button>
    </div>
  )
}
