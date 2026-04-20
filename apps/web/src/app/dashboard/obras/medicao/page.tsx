"use client"

import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { NewMeasurementModal } from "@/components/projetos/NewMeasurementModal"

export default function MedicoesPage() {
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
      case "COMPLETED":
        return "bg-green-500"
      case "PLANNING":
        return "bg-yellow-500"
      case "PAUSED":
        return "bg-slate-400"
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
      case "COMPLETED":
        return "Concluída"
      case "PLANNING":
        return "Planejamento"
      case "BUDGETING":
        return "Orçamento"
      case "PAUSED":
        return "Pausada"
      case "CANCELLED":
        return "Cancelada"
      default:
        return status
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-700">Medição de Obras</h1>
        <Info className="h-4 w-4 text-slate-400 cursor-help" />
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/50 p-4 rounded-lg border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Busque uma obra"
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 ml-1">Filtro por status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                <SelectItem value="PLANNING">Planejamento</SelectItem>
                <SelectItem value="BUDGETING">Orçamento</SelectItem>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#4CAF50] hover:bg-[#45a049] text-white font-bold gap-2 h-11"
        >
          <Plus className="h-4 w-4" />
          NOVA MEDIÇÃO
        </Button>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-600">Obra</TableHead>
              <TableHead className="font-bold text-slate-600 text-center">Status da obra</TableHead>
              <TableHead className="font-bold text-slate-600 text-center">Nº de medições</TableHead>
              <TableHead className="font-bold text-slate-600 text-center">Última medição aprovada</TableHead>
              <TableHead className="font-bold text-slate-600">Medições aprovadas</TableHead>
              <TableHead className="font-bold text-slate-600">Saldo a medir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="h-16 animate-pulse bg-slate-50/50" />
                </TableRow>
              ))
            ) : projects?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  Nenhuma obra encontrada.
                </TableCell>
              </TableRow>
            ) : (
              projects?.map((project) => (
                <TableRow key={project.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">
                        {project.code ? `${project.code} - ` : ""}{project.name}
                      </span>
                      <span className="text-xs text-slate-400 uppercase font-semibold">
                        {project.clientName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(project.status)}`} />
                      <span className="text-sm text-slate-600">{getStatusLabel(project.status)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {project.measurementsCount}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {project.lastApprovedDate 
                      ? format(project.lastApprovedDate, "dd/MM/yyyy")
                      : "---"}
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">{project.approvedPercentage}%</span>
                      <Progress value={project.approvedPercentage} className="h-2 bg-slate-100" indicatorClassName="bg-green-500" />
                    </div>
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">{project.balancePercentage}%</span>
                      <Progress value={project.balancePercentage} className="h-2 bg-slate-100" indicatorClassName="bg-blue-500" />
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
