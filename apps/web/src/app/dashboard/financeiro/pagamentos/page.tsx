"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Search, Filter, Plus, Printer, 
  RotateCcw, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, Info, LayoutDashboard, CloudDownload, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

export default function PagamentosPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");
  
  const handlePrint = () => {
    window.print();
  };

  // Queries
  const { data: entries, isLoading } = trpc.financial.getEntries.useQuery({
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: summary } = trpc.financial.getPaymentSummary.useQuery();

  // Mutation
  const toggleStatus = trpc.financial.statusToggle.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      utils.financial.getEntries.invalidate();
      utils.financial.getPaymentSummary.invalidate();
    },
    onError: (err) => toast.error(err.message)
  });

  // Derived Data
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => {
      if (e.type !== 'EXPENSE') return false;
      if (statusFilter === 'PAID') return e.status === 'PAID';
      if (statusFilter === 'PENDING') return e.status === 'PENDING' || e.status === 'PARTIALLY_PAID';
      return true;
    });
  }, [entries, statusFilter]);

  // Handlers for cards
  const filterToday = () => {
    const d = format(new Date(), "yyyy-MM-dd");
    setStartDate(d);
    setEndDate(d);
  };

  const filterNext7Days = () => {
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  };

  const filterNext30Days = () => {
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 print:bg-white print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight">Pagamentos</h1>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full cursor-help">
            <Info className="w-3.5 h-3.5" />
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] uppercase font-bold px-2 py-0">
            Em breve: nova tela
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-xs font-bold gap-1.5 rounded-sm shadow-sm">
            <Link href="/dashboard/financeiro/lancamentos">
              <LayoutDashboard className="w-3.5 h-3.5" /> Lançamentos
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-white bg-blue-600 border-blue-600 hover:bg-blue-700 rounded-sm shadow-sm">
            <CloudDownload className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-white bg-cyan-500 border-cyan-500 hover:bg-cyan-600 rounded-sm shadow-sm"
            onClick={() => handlePrint()}
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border-b border-slate-100 print:hidden">
        <div 
          onClick={filterToday}
          className="group cursor-pointer border-l-4 border-orange-500 bg-slate-50 p-4 rounded-sm hover:bg-orange-50 transition-all active:scale-[0.98] shadow-sm"
        >
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">A pagar hoje</p>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.today || 0)}
          </p>
        </div>
        <div 
          onClick={filterNext7Days}
          className="group cursor-pointer border-l-4 border-blue-500 bg-slate-50 p-4 rounded-sm hover:bg-blue-50 transition-all active:scale-[0.98] shadow-sm"
        >
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">A pagar em 7 dias</p>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.sevenDays || 0)}
          </p>
        </div>
        <div 
          onClick={filterNext30Days}
          className="group cursor-pointer border-l-4 border-cyan-500 bg-slate-50 p-4 rounded-sm hover:bg-cyan-50 transition-all active:scale-[0.98] shadow-sm"
        >
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">A pagar em 30 dias</p>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.thirtyDays || 0)}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 bg-[#f1f5f9] border-b border-slate-200 flex flex-wrap items-center gap-4 shadow-inner print:hidden">
        <div className="w-32">
          <Button variant="outline" className="w-full h-8 text-xs justify-between bg-white border-slate-300 rounded-sm font-bold text-slate-600 shadow-sm">
            Ações <ChevronDown className="w-4 h-4 ml-2 text-slate-400" />
          </Button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Digite aqui sua busca..." 
            className="pl-9 h-8 bg-white text-xs border-slate-300 rounded-sm shadow-sm" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            className="h-8 text-xs bg-white border-slate-300 rounded-sm w-36 shadow-sm font-medium" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span className="text-[11px] text-slate-400 italic font-medium">até</span>
          <Input 
            type="date" 
            className="h-8 text-xs bg-white border-slate-300 rounded-sm w-36 shadow-sm font-medium" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex gap-1 items-center">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-300 rounded-sm text-slate-500 hover:text-slate-700 shadow-sm">
            <Filter className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 bg-white border-slate-300 rounded-sm text-slate-500 hover:text-red-500 shadow-sm"
            onClick={() => {
              setSearch("");
              setStartDate(format(new Date(), "yyyy-MM-01"));
              setEndDate(format(new Date(), "yyyy-MM-dd"));
              setStatusFilter("ALL");
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="ml-auto flex bg-white border border-slate-300 p-0.5 rounded-sm shadow-sm gap-0.5">
          <button 
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 py-1 text-[11px] font-bold rounded-[2px] transition-all ${statusFilter === 'ALL' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setStatusFilter("PAID")}
            className={`px-4 py-1 text-[11px] font-bold rounded-[2px] transition-all ${statusFilter === 'PAID' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Pagos
          </button>
          <button 
            onClick={() => setStatusFilter("PENDING")}
            className={`px-4 py-1 text-[11px] font-bold rounded-[2px] transition-all ${statusFilter === 'PENDING' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Em Aberto
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden p-0 bg-white">
        <div className="h-full overflow-auto scrollbar-hide print:overflow-visible">
          <Table className="border-collapse border-y">
            <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm border-b">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="w-[10px] py-2 h-auto text-[10px] font-black uppercase text-slate-400 text-center border-r border-slate-200">
                   <Plus className="w-3 h-3 mx-auto" />
                </TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Vencimento</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200 text-right">A pagar</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Valor Pago</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Condição e Nº Doc.</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Pago a</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Descrição e Categoria</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Centro de Custo</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200 text-center">Pago</TableHead>
                <TableHead className="w-[45px] py-1 px-1 h-auto"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                      <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Processando dados...</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                  <TableCell className="py-1.5 px-1 text-center border-r border-slate-50">
                    <CheckCircle2 className={`w-4 h-4 mx-auto transition-all ${entry.status === 'PAID' ? 'text-blue-500 scale-110' : 'text-slate-200'}`} />
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700">
                    {format(new Date(entry.dueDate), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-600 text-right">
                    {entry.status === 'PAID' ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black ${entry.status === 'PAID' ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                        {entry.status === 'PAID' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount) : 'R$ 0,00'}
                      </span>
                      {entry.bankAccount && <span className="text-[9px] uppercase text-slate-400 font-bold tracking-tighter leading-none mt-0.5">{entry.bankAccount.name}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{entry.paymentCondition || 'À Vista'}</span>
                      {entry.documentNumber && <span className="text-[10px] text-slate-400 font-bold">DOC: {entry.documentNumber}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700 uppercase leading-tight">
                    {entry.contact?.name || "-"}
                    {entry.purchaseOrder && (
                      <div className="mt-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[8px] font-black px-1.5 py-0 h-3.5 flex items-center w-fit uppercase">Com OC</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50 min-w-[250px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold text-slate-600 uppercase italic leading-none">{entry.description}</span>
                      <span className="text-[9px] font-black text-slate-400 decoration-slate-200 underline underline-offset-2 uppercase tracking-tighter">Categoria: {entry.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter truncate max-w-[150px]">
                        {entry.splits?.map((s) => s.project?.name).join(" | ") || "Empresa"}
                      </span>
                      {entry.splits?.[0]?.projectStage?.name && (
                        <span className="text-[9px] text-slate-400 font-black uppercase truncate max-w-[150px]">{entry.splits[0].projectStage.name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 border-r border-slate-50 text-center">
                    {entry.status === 'PAID' && entry.paidDate ? (
                      <span className="text-[11px] font-black text-slate-800">{format(new Date(entry.paidDate), "dd/MM/yyyy")}</span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-200 italic">---</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 px-1 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-7 w-7 transition-all rounded-sm shadow-sm ${entry.status === 'PAID' ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}
                      disabled={toggleStatus.isPending}
                      onClick={() => toggleStatus.mutate({ entryId: entry.id })}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-20 grayscale">
                      <LayoutDashboard className="w-16 h-16 text-slate-400" />
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Busca sem resultados</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-2 bg-white border-t border-slate-200 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter print:hidden">
        <div className="flex items-center gap-4">
          <span className="bg-slate-50 px-2 py-1 border rounded-sm">Registros: {filteredEntries.length}</span>
          <span className="text-slate-300">|</span>
          <span className="bg-blue-50 text-blue-600 px-2 py-1 border border-blue-100 rounded-sm shadow-sm">Total Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredEntries.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0))}</span>
          <span className="text-slate-300">|</span>
          <span className="bg-orange-50 text-orange-600 px-2 py-1 border border-orange-100 rounded-sm shadow-sm">A Pagar: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredEntries.filter(e => e.status !== 'PAID').reduce((acc, curr) => acc + curr.amount, 0))}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="font-bold">Página 1 de 1</span>
          <div className="flex gap-1.5">
             <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm bg-white border-slate-200 hover:border-slate-400 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></Button>
             <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm bg-white border-slate-200 hover:border-slate-400 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
