"use client";

import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  User,
  ShoppingBag,
  Printer,
  ChevronDown,
  Info,
  ArrowUp,
  MoreVertical
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { NewRequestModal } from "@/components/compras/NewRequestModal";

const statusConfig = {
  DRAFT: { label: "Em aberto", color: "text-slate-500", bgColor: "bg-slate-100", dot: "bg-slate-400" },
  PENDING_APPROVAL: { label: "Em andamento", color: "text-blue-600", bgColor: "bg-blue-50", dot: "bg-blue-500" },
  APPROVED: { label: "Concluído", color: "text-emerald-600", bgColor: "bg-emerald-50", dot: "bg-emerald-500" },
  REJECTED: { label: "Recusado", color: "text-rose-600", bgColor: "bg-rose-50", dot: "bg-rose-500" },
};

export default function PurchaseRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [projectId, setProjectId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: requests, isLoading, isError, error } = trpc.purchasing.getRequests.useQuery({
    search: search || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    projectId: projectId || undefined,
  });

  const { data: projects } = trpc.projects.getAll.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.purchasing.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso");
      utils.purchasing.getRequests.invalidate();
    },
    onError: (err) => toast.error(err.message)
  });

  const stats = [
    { label: "Em aberto", count: requests?.filter(r => r.status === 'PENDING_APPROVAL').length || 0, color: "bg-[#1A3C5E]", dot: "bg-[#1A3C5E]" },
    { label: "Em andamento", count: requests?.filter(r => r.quotes.length > 0).length || 0, color: "bg-blue-500", dot: "bg-blue-500" },
    { label: "Concluído", count: requests?.filter(r => r.status === 'APPROVED').length || 0, color: "bg-emerald-500", dot: "bg-emerald-500" },
    { label: "Recusado", count: requests?.filter(r => r.status === 'REJECTED').length || 0, color: "bg-rose-500", dot: "bg-rose-500" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-full mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight">Solicitação</h1>
          <Info className="w-4 h-4 text-slate-400 cursor-pointer" />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            className="bg-[#58B391] hover:bg-[#4da182] text-white font-semibold px-4 rounded-md h-9 shadow-sm gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Novo
          </Button>
          <Button className="bg-[#46A5CD] hover:bg-[#3d91b4] text-white h-9 w-9 p-0 rounded-md shadow-sm">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Stats / Status Filters */}
      <div className="flex items-center gap-6 px-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-2.5 h-2.5 rounded-full ${stat.dot}`} />
            <span className="text-sm font-bold text-slate-700">{stat.count}</span>
            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Digite aqui sua busca" 
            className="pl-10 h-9 bg-slate-50 border border-slate-200 rounded-md text-sm focus-visible:ring-1 focus-visible:ring-[#1A3C5E]/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center bg-white rounded-md border border-slate-200 h-9 px-2">
          <Input 
            type="date" 
            className="bg-transparent border-none p-0 h-full text-sm w-32 focus-visible:ring-0" 
            defaultValue="2026-02-01"
          />
          <span className="text-slate-400 text-xs font-medium px-2 italic">até</span>
          <Input 
            type="date" 
            className="bg-transparent border-none p-0 h-full text-sm w-32 focus-visible:ring-0" 
            defaultValue="2026-04-30"
          />
        </div>

        <select 
          className="h-9 bg-white border border-slate-200 rounded-md px-3 text-sm font-medium text-slate-600 outline-none min-w-[200px]"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Todos os centros de custo</option>
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select 
          className="h-9 bg-white border border-slate-200 rounded-md px-3 text-sm font-medium text-slate-600 outline-none min-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Todos os status</option>
          <option value="PENDING_APPROVAL">Aguardando</option>
          <option value="APPROVED">Aprovado</option>
          <option value="REJECTED">Recusado</option>
        </select>

        <select 
          className="h-9 bg-white border border-slate-200 rounded-md px-3 text-sm font-medium text-slate-600 outline-none min-w-[160px]"
        >
          <option value="">Todas as aprovações</option>
        </select>

        <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-slate-200 bg-white hover:bg-slate-50 shadow-none">
          <Filter className="w-4 h-4 text-slate-500" />
        </Button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent border-slate-200">
              <TableHead className="w-10 px-4"></TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 py-3 h-auto px-4">
                Número <ArrowUp className="inline w-3 h-3 ml-1 text-[#58B391]" />
              </TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4">
                Status <MoreVertical className="inline w-3 h-3 ml-1 text-slate-300" />
              </TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Aprovação</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Necessidade</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Próxima entrega</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Centro de custo</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Descrição</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Solicitado por</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Recebido/Solicitado</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Ordem de Compra</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 h-auto px-4 whitespace-nowrap">Cotação</TableHead>
              <TableHead className="w-10 h-auto px-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={11} className="p-6"><Skeleton className="h-10 w-full rounded-xl" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-20">
                  <div className="flex flex-col items-center gap-2">
                    <XCircle className="w-10 h-10 text-rose-500" />
                    <p className="text-slate-600 font-bold">Erro ao carregar solicitações</p>
                    <p className="text-xs text-slate-400 max-w-sm">{error?.message || "Ocorreu um erro interno no servidor."}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 rounded-xl"
                      onClick={() => utils.purchasing.getRequests.invalidate()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : requests?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-20 text-slate-400 font-medium">
                  Nenhuma solicitação encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              requests?.map((req: any, idx: number) => {
                const config = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                const hasOrder = req.quotes.some((q: any) => q.order);
                const orderNumber = req.quotes.find((q: any) => q.order)?.order?.number;

                return (
                  <TableRow key={req.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="px-4 py-3">
                      <FileText className="w-4 h-4 text-rose-500" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-700">{req.number || "-"}</span>
                    </TableCell>
                    
                    <TableCell className="px-4 py-3">
                      <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-medium border-none shadow-none bg-slate-100 text-slate-500`}>
                        {config.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <span className="text-xs text-slate-600">-</span>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <span className="text-xs text-slate-600">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy')}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <span className="text-xs text-slate-300">-</span>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="max-w-[250px]">
                        <span className="text-[11px] font-medium text-slate-600 line-clamp-1">
                          {req.project?.code ? `${req.project.code} - ` : ""}{req.project?.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <span className="text-xs text-slate-600 truncate max-w-[150px] inline-block">
                        {req.notes || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-700 leading-none">{req.requester?.name || "N/A"}</span>
                        <span className="text-[9px] text-slate-400 mt-1 italic">Em: {format(new Date(req.createdAt), 'dd/MM/yyyy')}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1 w-24">
                        <span className="text-[10px] font-medium text-slate-500">{hasOrder ? "1/1" : "0/1"}</span>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-700 ${hasOrder ? "bg-[#58B391] w-full" : "bg-slate-200 w-0"}`} />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      {orderNumber ? (
                        <span className="text-xs font-medium text-emerald-600">#{orderNumber}</span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      {req.quotes.length > 0 ? (
                        <span className="text-xs text-slate-600">{req.quotes.length} cotação</span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="text-xs">Ver Detalhes</DropdownMenuItem>
                          {req.status === 'PENDING_APPROVAL' && (
                            <>
                              <DropdownMenuItem 
                                className="text-xs text-emerald-600"
                                onClick={() => approveMutation.mutate({ requestId: req.id, status: 'APPROVED' })}
                              >
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-rose-600">Recusar</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-slate-400 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest">ERP Dominio v2.0 - Gestão de Suprimentos</p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sistema Operacional</span>
          </div>
        </div>
      </div>

      <NewRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projects={projects || []} 
      />
    </div>
  );
}
