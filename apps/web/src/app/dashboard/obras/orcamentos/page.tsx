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
  Search, 
  Plus, 
  Printer, 
  ArrowRightLeft, 
  Filter, 
  Info,
  Calendar as CalendarIcon,
  ChevronDown,
  Lock,
  Files
} from "lucide-react";
import { NewBudgetDialog } from "@/components/orcamentos/NewBudgetDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OrcamentosPage() {
  const [search, setSearch] = useState("");
  const limit = 15;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = trpc.projects.listInfinite.useInfiniteQuery({
    limit,
    search: search || undefined,
    status: 'BUDGETING'
  }, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialCursor: null,
  });

  const allItems = data?.pages.flatMap(page => page.items) || [];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusObraLabel = (status: string) => {
    const maps: Record<string, string> = {
      'PLANNING': 'A Iniciar',
      'BUDGETING': 'A Iniciar',
      'IN_PROGRESS': 'Em Andamento',
      'COMPLETED': 'Finalizada',
      'PAUSED': 'Pausada',
      'CANCELLED': 'Cancelada'
    };
    return maps[status] || status;
  };

  const getProposalStatusConfig = (status: string) => {
    const configs: Record<string, { label: string, color: string }> = {
      'UNDER_ELABORATION': { label: 'Em Elaboração', color: '#3b82f6' },
      'SOLD': { label: 'Venda', color: '#22c55e' },
      'DISCONTINUED': { label: 'Descontinuado', color: '#94a3b8' }
    };
    return configs[status] || { label: status, color: '#94a3b8' };
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      {/* Header Container */}
      <div className="px-8 pt-8 pb-4 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-700">Orçamentos</h1>
            <Info className="w-5 h-5 text-slate-400 cursor-help" />
          </div>
          
          <div className="flex items-center gap-2">
            <NewBudgetDialog />
            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
              <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
              <Printer className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>

        {/* Tabs - Segmented Control Style */}
        <div className="flex items-center">
          <Tabs defaultValue="lista" className="w-auto">
            <TabsList className="bg-slate-100/80 p-1 h-11 gap-1 rounded-xl border border-slate-200/50 shadow-inner">
              <TabsTrigger 
                value="lista" 
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md border-none group"
              >
                Lista de Orçamentos
              </TabsTrigger>
              <TabsTrigger 
                value="funil" 
                className="px-6 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm border-none disabled:opacity-50"
                disabled
              >
                Funil de Vendas
                <Badge className="ml-2 bg-orange-100 text-orange-600 hover:bg-orange-200 border-none text-[10px] h-4 px-1.5 uppercase font-bold transition-colors">NOVO</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-8 py-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Digite aqui sua busca"
            className="pl-9 h-10 border-slate-200 rounded-md bg-white shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1 shadow-sm">
          <div className="flex items-center px-3 gap-2">
            <Input 
              type="text" 
              defaultValue="14/04/2023"
              className="border-none shadow-none h-8 w-24 p-0 text-sm text-slate-600"
            />
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-slate-400 text-xs italic">até</span>
          <div className="flex items-center px-3 gap-2 border-l border-slate-100">
            <Input 
              type="text" 
              defaultValue="30/04/2026"
              className="border-none shadow-none h-8 w-24 p-0 text-sm text-slate-600"
            />
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <Button variant="outline" className="h-10 px-4 border-slate-200 text-slate-600 bg-white shadow-sm font-medium">
          Filtro
          <ChevronDown className="w-4 h-4 ml-2 text-slate-400" />
        </Button>
      </div>

      {/* Table Section */}
      <div className="px-8 pb-10">
        <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-white border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24 text-slate-500 font-bold py-4">Código <ChevronDown className="w-3 h-3 inline ml-1 text-slate-400" /></TableHead>
                <TableHead className="text-slate-500 font-bold py-4">Obra</TableHead>
                <TableHead className="text-slate-500 font-bold py-4">Cliente</TableHead>
                <TableHead className="text-slate-500 font-bold py-4">Status Obra</TableHead>
                <TableHead className="text-slate-500 font-bold py-4">Status Proposta</TableHead>
                <TableHead className="text-slate-500 font-bold py-4">Custo</TableHead>
                <TableHead className="text-slate-500 font-bold py-4">Preço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={7} className="h-12 bg-slate-50/50 m-2 rounded-lg" />
                  </TableRow>
                ))
              ) : (
                allItems.map((item: any) => {
                  const propStatus = getProposalStatusConfig(item.proposalStatus || 'UNDER_ELABORATION');
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-50 h-14 transition-colors">
                      <TableCell className="font-medium text-slate-600 flex items-center gap-2">
                        {item.budget?.isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                        {item.code || String(item.id).substring(0, 4)}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {item.code ? `${item.code} - ` : ''}{item.name}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {item.client?.name || '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {getStatusObraLabel(item.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: propStatus.color }} />
                          <span className="text-slate-600">{propStatus.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium shrink-0">
                        {formatCurrency(item.totalCost || 0)}
                      </TableCell>
                      <TableCell className="text-slate-600 font-bold shrink-0">
                        {formatCurrency(item.budget)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {allItems.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Files className="w-12 h-12 text-slate-200 mb-4" />
                      <h3 className="text-slate-600 font-bold">Nenhum orçamento encontrado</h3>
                      <p className="text-slate-400 text-sm max-w-xs mt-1">Combine sua busca ou adicione um novo orçamento para começar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Footer / Carregar Mais */}
          <div className="py-4 border-t border-slate-100 bg-white flex justify-center">
            {hasNextPage && (
              <Button 
                variant="outline" 
                className="text-slate-600 font-medium border-slate-200 hover:bg-slate-50 transition-all rounded-md"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                <ChevronDown className="w-4 h-4 ml-2 text-slate-400" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
