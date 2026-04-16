"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Plus, Search, Filter, 
  Download, Printer, MoreHorizontal, Eye, 
  ChevronLeft, ChevronRight, Loader2
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

export default function LancamentosPage() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bankAccountId, setBankAccountId] = useState("all");

  // Queries
  const { data: entries, isLoading } = trpc.financial.getEntries.useQuery({
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    bankAccountId: bankAccountId === "all" ? undefined : bankAccountId,
  });

  const { data: accounts } = trpc.bank.getAccounts.useQuery();

  // Calculate totals
  const totalPeriod = useMemo(() => {
    return entries?.reduce((acc, curr) => acc + (curr.type === 'INCOME' ? curr.amount : -curr.amount), 0) || 0;
  }, [entries]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">Lançamentos</h1>
        <div className="flex items-center gap-2">
          <Button asChild className="bg-[#56ab2f] hover:bg-[#4a9328] text-white h-8 text-xs font-bold gap-1">
            <Link href="/dashboard/financeiro/lancamentos/novo">
              <Plus className="w-3 h-3" /> Novo
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500"><Download className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500"><Printer className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500"><MoreHorizontal className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="px-6 py-2 bg-[#f8fafc] border-b border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Digite aqui sua busca..." 
            className="pl-9 h-8 bg-white text-xs" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            className="h-8 text-xs bg-white w-32" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 uppercase font-medium">até</span>
          <Input 
            type="date" 
            className="h-8 text-xs bg-white w-32" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger className="h-8 text-xs bg-white">
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

        <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-200 text-slate-500">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto bg-white p-0">
        <Table className="border-collapse">
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100 last:border-0">Lançamento</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100 text-right">Valor</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100">Pago a</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100">Descrição</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100">N. Doc</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100">Categoria</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100">Condição</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto border-r border-slate-100">Vencimento</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-600 uppercase py-2 px-4 h-auto">Centro de Custo</TableHead>
              <TableHead className="w-10 py-2 px-4 h-auto"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando lançamentos...
                  </div>
                </TableCell>
              </TableRow>
            ) : entries?.map((entry: any) => (
              <TableRow key={entry.id} className="text-xs hover:bg-slate-50 border-slate-100 group">
                <TableCell className="py-2 px-4 border-r border-slate-50">
                  {format(new Date(entry.competencyDate), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className={`py-2 px-4 border-r border-slate-50 text-right font-medium ${entry.type === 'INCOME' ? 'text-blue-600' : 'text-slate-800'}`}>
                  {entry.type === 'INCOME' ? '' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}
                </TableCell>
                <TableCell className="py-2 px-4 border-r border-slate-50 text-slate-600 font-medium">
                  {entry.contact?.name || "-"}
                </TableCell>
                <TableCell className="py-2 px-4 border-r border-slate-50 max-w-sm truncate text-slate-500 italic">
                  {entry.description}
                </TableCell>
                <TableCell className="py-2 px-4 border-r border-slate-50 text-slate-600">{entry.documentNumber || "-"}</TableCell>
                <TableCell className="py-2 px-4 border-r border-slate-50 text-slate-500">{entry.category}</TableCell>
                <TableCell className="py-2 px-4 border-r border-slate-50 text-slate-500">{entry.paymentCondition || "À Vista"}</TableCell>
                <TableCell className="py-2 px-4 border-r border-slate-50 text-slate-600">
                  {format(new Date(entry.dueDate), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="py-2 px-4 text-slate-500 font-medium">
                  {entry.splits?.map((s: any) => s.project?.name).join(" | ") || "Empresa"}
                </TableCell>
                <TableCell className="py-2 px-4 text-right">
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {entries?.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-slate-400">Nenhum lançamento encontrado para o período.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Section */}
      <div className="px-6 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
            <Eye className="w-3.5 h-3.5" />
            <span>Exibir</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-wider">Total do Período:</span>
            <span className={`px-2 py-0.5 rounded ${totalPeriod >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPeriod)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Exibir</span>
            <Select defaultValue="10">
              <SelectTrigger className="h-6 text-[11px] px-2 w-[50px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-6 w-6 bg-white border-slate-200"><ChevronLeft className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="icon" className="h-6 w-6 bg-white border-slate-200"><ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
