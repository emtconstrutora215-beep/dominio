"use client"

import { trpc } from "@/trpc/client"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Info, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectMedicaoHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId })

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col gap-4">
        <Button 
          variant="ghost" 
          className="w-fit gap-2 -ml-2 text-slate-500 hover:text-slate-700"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Medições
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-bold text-[#334155]">
                {project?.code ? `${project.code} - ` : ""}{project?.name}
              </h1>
              <div className="bg-slate-200 p-1 rounded-sm cursor-help">
                <Info className="h-3 w-3 text-slate-500" />
              </div>
            </div>
            <p className="text-slate-500 font-medium">Histórico de Medições</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-20 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
          <History className="h-8 w-8 text-slate-300" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-700">Tela em Desenvolvimento</h2>
          <p className="text-slate-500 max-w-sm">
            Esta tela mostrará o histórico detalhado de todas as medições realizadas para esta obra.
          </p>
        </div>
      </div>
    </div>
  )
}
