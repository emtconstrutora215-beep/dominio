"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Building2,
  User,
  Calculator,
  LayoutGrid,
  TrendingUp,
  Files
} from "lucide-react";
import Link from "next/link";
import { NewBudgetDialog } from "@/components/orcamentos/NewBudgetDialog";

export default function OrcamentosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 10;

  const { data, isLoading } = trpc.projects.list.useQuery({
    page,
    perPage,
    search: search || undefined,
    status: 'BUDGETING'
  }, {
    placeholderData: (prev) => prev
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-200 rotate-3 transition-transform hover:rotate-0">
            <Calculator className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Orçamentos</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-none">
                Gestão de Propostas e Viabilidade
              </span>
              <div className="h-3 w-px bg-slate-200" />
              <Badge variant="outline" className="text-[9px] font-black border-emerald-100 bg-emerald-50 text-emerald-700 uppercase px-2">
                {isLoading ? "..." : data?.totalCount} Ativos
              </Badge>
            </div>
          </div>
        </div>
        
        <NewBudgetDialog />
      </div>

      {/* Stats Cards Subtle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: "Total em Propostas", value: "R$ 2.4M", icon: TrendingUp, color: "emerald" },
           { label: "Aguardando Cliente", value: "12 Obras", icon: Building2, color: "blue" },
           { label: "Convertidos este Mês", value: "85%", icon: LayoutGrid, color: "purple" }
         ].map((card, i) => (
           <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                 <div className={`h-10 w-10 rounded-2xl bg-${card.color}-50 flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 text-${card.color}-600`} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                    <p className="text-lg font-black text-slate-900 leading-none mt-1">{card.value}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Filters/Actions */}
      <div className="flex items-center gap-6">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <Input 
            placeholder="Buscar por obra ou cliente..." 
            className="h-12 pl-12 rounded-2xl border-2 border-slate-100 focus:ring-emerald-500 bg-white shadow-sm transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="border-2 border-slate-100 rounded-3xl bg-white shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="h-[500px] flex flex-col items-center justify-center space-y-6">
            <div className="h-16 w-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escaneando Banco de Dados...</span>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b-2 border-slate-50 hover:bg-transparent h-16">
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px] w-32 pl-8">Cód. Obra</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Obra / Empreendimento</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Cliente Responsável</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Valor Previsto</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Progresso</TableHead>
                  <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[9px] pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items as any[])?.map((item) => (
                  <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-all border-b border-slate-50 group h-20">
                    <TableCell className="pl-8">
                      <Badge variant="outline" className="font-mono text-[9px] font-black text-slate-500 bg-slate-50 border-slate-200 px-3 py-1 rounded-lg">
                        #{item.code || String(item.id).substring(0, 5).toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{item.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mt-1">
                          <Building2 className="w-3 h-3" /> {item.city || 'São Paulo'}/{item.state || 'SP'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                           <User className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 truncate max-w-[150px] uppercase">
                              {item.client?.name || 'Cliente Particular'}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 uppercase italic">Responsável Direto</span>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm">{formatCurrency(item.budget)}</span>
                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">Global Estimado</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 w-32">
                         <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full w-[65%]" />
                         </div>
                         <span className="text-[9px] font-black text-slate-400 uppercase">65% Precificado</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <Link href={`/dashboard/obras/orcamentos/${item.id}/detalhes`}>
                           <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-slate-200 transition-all">
                              ABRIR PLANILHA
                           </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[400px]">
                      <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mb-8 shadow-inner shadow-slate-100">
                          <Files className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum orçamento em andamento</h3>
                        <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium">
                          Inicie um novo orçamento selecionando uma obra existente ou crie uma nova do zero.
                        </p>
                        <div className="mt-8">
                           <NewBudgetDialog />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Premium */}
            {data && data.totalCount > perPage && (
              <div className="flex items-center justify-between px-10 py-6 bg-slate-50/50 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Página <span className="text-slate-900">{data.page}</span> de {data.totalPages} <span className="mx-2">/</span> {data.totalCount} Orçamentos Registrados
                </span>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-10 w-10 p-0 border-2 border-slate-100 hover:border-emerald-600 hover:text-emerald-600 transition-all"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-10 w-10 p-0 border-2 border-slate-100 hover:border-emerald-600 hover:text-emerald-600 transition-all"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
