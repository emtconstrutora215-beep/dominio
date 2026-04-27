"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Info } from "lucide-react"
import { trpc } from "@/trpc/client"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { NewMeasurementModal } from "@/components/projetos/NewMeasurementModal"

export default function MedicoesPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("IN_PROGRESS")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: projects, isLoading } = trpc.measurement.getProjectsSummary.useQuery({
    search,
    status: status === "all" ? undefined : status,
  })

  const { data: formOptions } = trpc.projects.formOptions.useQuery()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-500"
      case "PLANNING":
        return "bg-slate-400"
      case "BUDGETING":
        return "bg-yellow-500"
      case "PAUSED":
        return "bg-orange-500"
      case "COMPLETED":
        return "bg-green-500"
      case "CANCELLED":
        return "bg-red-500"
      default:
        return "bg-slate-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "Em andamento"
      case "PLANNING":
        return "A iniciar"
      case "BUDGETING":
        return "Em orçamento"
      case "PAUSED":
        return "Paralisada"
      case "COMPLETED":
        return "Finalizada"
      case "CANCELLED":
        return "Cancelada"
      default:
        return status
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex items-center gap-2">
        <h1 className="text-[28px] font-bold text-[#334155]">Medição de Obras</h1>
        <div className="bg-slate-200 p-1 rounded-sm cursor-help">
          <Info className="h-3 w-3 text-slate-500" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-6 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Busque uma obra"
              className="pl-9 h-11 bg-white border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-500 ml-1">Filtro por status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px] h-11 bg-white border-slate-200 text-slate-600 font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                <SelectItem value="PLANNING">A iniciar</SelectItem>
                <SelectItem value="BUDGETING">Em orçamento</SelectItem>
                <SelectItem value="PAUSED">Paralisada</SelectItem>
                <SelectItem value="COMPLETED">Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#4CAF50] hover:bg-[#43A047] text-white font-bold gap-2 h-11 px-6 rounded-md shadow-sm transition-all"
        >
          <Plus className="h-5 w-5" />
          NOVA MEDIÇÃO
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-[#475569] h-14 pl-6">Obra</TableHead>
              <TableHead className="font-bold text-[#475569] h-14 text-center">Status da obra</TableHead>
              <TableHead className="font-bold text-[#475569] h-14 text-center">Nº de medições</TableHead>
              <TableHead className="font-bold text-[#475569] h-14 text-center">Última medição aprovada</TableHead>
              <TableHead className="font-bold text-[#475569] h-14">Medições aprovadas</TableHead>
              <TableHead className="font-bold text-[#475569] h-14">Saldo a medir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="h-24 animate-pulse bg-slate-50/30" />
                </TableRow>
              ))
            ) : projects?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium">
                  Nenhuma obra encontrada para medição.
                </TableCell>
              </TableRow>
            ) : (
              projects?.map((project) => (
                <TableRow 
                  key={project.id} 
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors border-b border-slate-100 last:border-0 group"
                  onClick={() => router.push(`/dashboard/obras/medicao/${project.id}`)}
                >
                  <TableCell className="py-5 pl-6">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[#475569] text-[15px] group-hover:text-blue-600 transition-colors">
                        {project.code ? `${project.code} - ` : ""}{project.name}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                        {project.clientName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(project.status)} shadow-sm`} />
                      <span className="text-sm font-medium text-slate-600">{getStatusLabel(project.status)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-slate-600 font-medium">
                    {project.measurementsCount}
                  </TableCell>
                  <TableCell className="text-center text-slate-500 font-medium text-[13px]">
                    {project.lastApprovedDate 
                      ? format(project.lastApprovedDate, "dd/MM/yyyy")
                      : "--/--/----"}
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex flex-col gap-1.5 pr-4">
                      <span className="text-xs font-bold text-slate-500">{project.approvedPercentage}%</span>
                      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${project.approvedPercentage}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex flex-col gap-1.5 pr-6">
                      <span className="text-xs font-bold text-slate-500">{project.balancePercentage}%</span>
                      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500" 
                          style={{ width: `${project.balancePercentage}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewMeasurementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={formOptions?.projects || []}
      />
    </div>
  )
}
