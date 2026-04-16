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
  ChevronDown
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
  DRAFT: { label: "Rascunho", color: "text-slate-500", bgColor: "bg-slate-50", icon: FileText },
  PENDING_APPROVAL: { label: "Aguardando", color: "text-amber-600", bgColor: "bg-amber-50", icon: Clock },
  APPROVED: { label: "Aprovado", color: "text-emerald-600", bgColor: "bg-emerald-50", icon: CheckCircle2 },
  REJECTED: { label: "Recusado", color: "text-rose-600", bgColor: "bg-rose-50", icon: XCircle },
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
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1A3C5E] tracking-tight">Solicitação</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-[#58B391] hover:bg-[#4a9a7c] text-white font-bold px-6 rounded-xl h-11 shadow-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" /> Novo
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200">
            <Printer className="w-5 h-5 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex flex-wrap gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-none bg-white min-w-[160px]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${stat.dot} flex items-center justify-center text-white text-xs font-bold leading-none`}>
                {stat.count}
              </div>
              <span className="text-sm font-semibold text-slate-600">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Bar */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Digite aqui sua busca" 
              className="pl-10 h-11 bg-slate-50 border-none rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#1A3C5E]/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 h-11 border border-transparent">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Input type="date" className="bg-transparent border-none p-0 h-auto text-xs w-28 focus-visible:ring-0" />
            <span className="text-slate-400 text-xs font-bold px-1">até</span>
            <Input type="date" className="bg-transparent border-none p-0 h-auto text-xs w-28 focus-visible:ring-0" />
          </div>

          <select 
            className="h-11 bg-slate-50 border-none rounded-xl px-4 text-xs font-medium text-slate-600 outline-none min-w-[180px]"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Todos os centros de custo</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select 
            className="h-11 bg-slate-50 border-none rounded-xl px-4 text-xs font-medium text-slate-600 outline-none min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os status</option>
            <option value="PENDING_APPROVAL">Aguardando</option>
            <option value="APPROVED">Aprovado</option>
            <option value="REJECTED">Recusado</option>
          </select>

          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-100 bg-slate-50 shadow-none">
            <Filter className="w-4 h-4 text-slate-500" />
          </Button>
        </CardContent>
      </Card>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="w-10 px-6"></TableHead>
              <TableHead className="w-20 text-[10px] font-bold uppercase tracking-wider text-slate-500 py-4 h-auto px-4">Número <ChevronDown className="inline w-3 h-3 ml-1 text-[#58B391]" /></TableHead>
              <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Status <ChevronDown className="inline w-3 h-3 ml-1 text-[#58B391]" /></TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Aprovação</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Necessidade</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Próxima entrega</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Centro de custo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Título</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Solicitado por</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Recebido/Solicitado</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Ordem de Compra</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 h-auto px-4">Cotação</TableHead>
              <TableHead className="w-12 h-auto"></TableHead>
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
                  <TableRow key={req.id} className="hover:bg-slate-50/50 border-slate-100 group transition-colors">
                    <TableCell className="px-6 py-4">
                      {req.isUrgent && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-lg shadow-rose-200" title="Urgente" />
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-slate-700">{req.number || "-"}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-4">
                      <Badge className={`rounded-full px-3 py-1 text-[10px] font-bold border-none shadow-none ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4">
                      {req.approver?.name ? (
                        <span className="text-[11px] font-medium text-slate-600">{req.approver.name}</span>
                      ) : (
                        <span className="text-[11px] text-slate-300">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 text-[11px] font-medium text-slate-600">
                      {format(new Date(req.createdAt), 'dd/MM/yyyy')}
                    </TableCell>

                    <TableCell className="px-4 text-[11px] text-slate-300">-</TableCell>

                    <TableCell className="px-4">
                      <div className="max-w-[180px] break-words">
                        <span className="text-[11px] font-bold text-[#1A3C5E] uppercase leading-tight">
                          {req.project?.code ? `${req.project.code} - ` : ""}{req.project?.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4">
                      <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px] inline-block">
                        {req.notes || "Sem título"}
                      </span>
                    </TableCell>

                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-700 leading-none">{req.requester?.name || "N/A"}</span>
                        <span className="text-[9px] text-slate-400 mt-1">Em: {format(new Date(req.createdAt), 'dd/MM/yyyy')}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4">
                      <div className="flex flex-col gap-1.5 w-24">
                        <span className="text-[10px] font-bold text-slate-500">{hasOrder ? "1/1" : "0/1"}</span>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-700 ${hasOrder ? "bg-[#58B391] w-full" : "bg-slate-200 w-0"}`} />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4">
                      {orderNumber && (
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] font-bold text-emerald-600 tracking-wide">#{orderNumber}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-4">
                      {req.quotes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-md border-slate-200 text-slate-500 text-[10px] font-medium">
                            {req.quotes.length} sugerida(s)
                          </Badge>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-xl">
                          <DropdownMenuItem className="text-xs font-semibold text-slate-600 py-2.5">
                            Ver Detalhes
                          </DropdownMenuItem>
                          {req.status === 'PENDING_APPROVAL' && (
                            <>
                              <DropdownMenuItem 
                                className="text-xs font-semibold text-emerald-600 py-2.5 focus:text-emerald-700"
                                onClick={() => approveMutation.mutate({ requestId: req.id, status: 'APPROVED' })}
                              >
                                Aprovar Solicitação
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs font-semibold text-rose-600 py-2.5 focus:text-rose-700">
                                Recusar Solicitação
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem className="text-xs font-semibold text-slate-600 py-2.5">
                            Gerar PDF
                          </DropdownMenuItem>
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
