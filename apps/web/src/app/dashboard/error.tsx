"use client"

import { useEffect } from "react"
import { AlertTriangle, Home, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-10 w-10 text-red-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Ocorreu um erro inesperado</h2>
        <p className="text-muted-foreground/80 max-w-[500px]">
          Tivemos um problema ao carregar esta página. Tente novamente ou retorne ao painel principal.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Tentar novamente
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Voltar ao Início
          </Link>
        </Button>
      </div>
    </div>
  )
}
