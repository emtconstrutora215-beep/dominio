"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Search, Filter, Plus, Printer, 
  RotateCcw, ChevronLeft, ChevronRight, Loader2,
  Info, LayoutDashboard, CloudDownload, ChevronDown,
  Trash2, ArrowLeft, Calculator, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FaturamentosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bankAccountId, setBankAccountId] = useState("all");
  
  const handlePrint = () => {
    window.print();
  };

  // Queries
  const { data: entries, isLoading } = trpc.financial.getEntries.useQuery({
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    bankAccountId: bankAccountId === "all" ? undefined : bankAccountId,
  });

  const { data: accounts } = trpc.bank.getAccounts.useQuery();

  // Derived Data - Filter only INCOME (Invoicing)
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => e.type === 'INCOME');
  }, [entries]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 print:bg-white print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight">Faturamentos</h1>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full cursor-help">
            <Info className="w-3.5 h-3.5" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild className="bg-[#56ab2f] hover:bg-[#4a9328] text-white h-8 text-xs font-bold gap-1.5 rounded-sm shadow-sm border-0">
            <Link href="/dashboard/financeiro/faturamentos/novo">
              <Plus className="w-3.5 h-3.5" /> Novo
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-white bg-blue-600 border-blue-600 hover:bg-blue-700 rounded-sm shadow-sm">
            <CloudDownload className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-white bg-slate-400 border-slate-400 hover:bg-slate-500 rounded-sm shadow-sm">
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-white bg-orange-400 border-orange-400 hover:bg-orange-500 rounded-sm shadow-sm">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-white bg-orange-500 border-orange-500 hover:bg-orange-600 rounded-sm shadow-sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 bg-[#f1f5f9] border-b border-slate-200 flex flex-wrap items-center gap-4 shadow-inner print:hidden">
        <div className="relative flex-1 max-w-md">
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

        <div className="w-48">
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger className="h-8 text-xs bg-white border-slate-300 rounded-sm shadow-sm">
              <SelectValue placeholder="Todas as Contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Contas</SelectItem>
              {accounts?.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              setBankAccountId("all");
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden p-0 bg-white">
        <div className="h-full overflow-auto scrollbar-hide print:overflow-visible">
          <Table className="border-collapse border-y">
            <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm border-b">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200 flex items-center gap-1 cursor-pointer">
                   Lançamento <ChevronDown className="w-3 h-3" />
                </TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Valor Bruto</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Impostos Retidos</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Valor Líquido</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Condição e Nº Doc.</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Vencimento</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Cliente</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Descrição e Natureza</TableHead>
                <TableHead className="py-2.5 px-4 h-auto text-[10px] font-black uppercase text-slate-600 border-r border-slate-200">Centro de Custo</TableHead>
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
              {filteredEntries.map((entry) => {
                const retentions = entry.retentions || 0;
                const bruto = entry.amount; // Assumindo que amount é o bruto no modelo de faturamento
                const liquido = bruto - retentions;

                return (
                  <TableRow key={entry.id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700">
                      {format(new Date(entry.competencyDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700">
                      {formatCurrency(bruto)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50">
                       <div className="flex items-center gap-2">
                         <span className="text-[11px] font-black text-slate-700">{formatCurrency(retentions)}</span>
                         {retentions > 0 && <Button variant="ghost" size="icon" className="h-5 w-5 bg-slate-100"><Calculator className="w-3 h-3 text-slate-400" /></Button>}
                       </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700">
                      {formatCurrency(liquido)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{entry.paymentCondition || 'À Vista'}</span>
                        {entry.documentNumber && <span className="text-[9px] text-slate-400 font-bold">Doc: {entry.documentNumber}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700">
                      {format(new Date(entry.dueDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50 text-[11px] font-black text-slate-700 uppercase leading-tight">
                      {entry.contact?.name || "-"}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 border-r border-slate-50 min-w-[250px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-600 uppercase italic leading-none">{entry.description}</span>
                        <span className="text-[9px] font-black text-slate-400 decoration-slate-200 underline underline-offset-2 uppercase tracking-tighter">Natureza: {entry.category}</span>
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
                    <TableCell className="py-1.5 px-1 text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
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
          <span className="bg-blue-50 text-blue-600 px-2 py-1 border border-blue-100 rounded-sm shadow-sm">
            Total Bruto: {formatCurrency(filteredEntries.reduce((acc, curr) => acc + curr.amount, 0))}
          </span>
          <span className="text-slate-300">|</span>
          <span className="bg-orange-50 text-orange-600 px-2 py-1 border border-orange-100 rounded-sm shadow-sm">
            Total Líquido: {formatCurrency(filteredEntries.reduce((acc, curr) => acc + (curr.amount - (curr.retentions || 0)), 0))}
          </span>
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
