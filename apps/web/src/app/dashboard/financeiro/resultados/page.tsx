"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Printer, 
  RotateCcw, 
  Filter, 
  Info,
  Lock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResultadosPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [regime, setRegime] = useState<'CASH' | 'ACCRUAL'>('CASH');
  const [centroCusto, setCentroCusto] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");

  // Queries
  const { data: options } = trpc.financial.getCreateOptions.useQuery();
  const { data: dre, isLoading } = trpc.financial.getDRE_Report.useQuery({
    year,
    regime,
    filterType: centroCusto as any,
    projectId: centroCusto === 'obra' && projectId !== 'all' ? projectId : undefined,
  });

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const handlePrint = () => window.print();

  const formatCurrency = (value: number) => {
    if (value === 0) return <span className="text-slate-200">-</span>;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1 }).format(value) + '%';
  };

  const getRowStyles = (row: any) => {
    let styles = "border-b border-slate-100 transition-colors hover:bg-slate-50/50 ";
    if (row.isHeader) styles += "bg-[#f8fafc] font-bold text-slate-700 ";
    if (row.isSubtotal) styles += "bg-slate-100/50 font-bold text-slate-800 ";
    if (row.isMargin) styles += "bg-white italic text-slate-500 ";
    return styles;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 print:bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-30 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight flex items-center gap-2">
            Resultados 
            <Info className="w-4 h-4 text-slate-300 cursor-help" />
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 bg-white border-slate-300 text-slate-600 font-semibold text-[10px] shadow-sm hover:bg-slate-50"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 bg-cyan-600 border-cyan-600 text-white font-semibold shadow-sm hover:bg-cyan-700"
          >
            <Lock className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 lg:text-slate-400">Ano / Período</label>
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-xs font-bold rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 lg:text-slate-400">Visualização</label>
          <Select value={regime} onValueChange={(v: any) => setRegime(v)}>
            <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-xs font-bold rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Regime de Caixa</SelectItem>
              <SelectItem value="ACCRUAL">Regime de Competência</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 lg:text-slate-400">Centro de Custo</label>
          <Select value={centroCusto} onValueChange={setCentroCusto}>
            <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-xs font-bold rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="obra">Obra Específica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 lg:text-slate-400">Obra</label>
          <Select 
            value={projectId} 
            onValueChange={setProjectId}
            disabled={centroCusto !== 'obra'}
          >
            <SelectTrigger className="h-9 bg-white border-slate-200 text-xs font-bold rounded-md">
              <SelectValue placeholder="Selecione a Obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Obras</SelectItem>
              {options?.projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 justify-end lg:col-span-2">
          <Button className="h-9 bg-green-600 hover:bg-green-700 text-white font-bold text-xs gap-2 w-fit px-6">
            <Filter className="w-3.5 h-3.5" /> Aplicar filtros
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/30">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Demonstrativo de resultados</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-slate-400 gap-1 hover:text-slate-600">
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-slate-400 gap-1 hover:text-slate-600">
                Próximo <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-blue-600 text-white">
                  <th className="px-6 py-2.5 text-left text-[11px] font-bold border-r border-blue-500 w-[240px] min-w-[240px] sticky left-0 bg-blue-600">
                    Plano de Contas
                  </th>
                  {months.map((m, i) => (
                    <th key={m} className="px-4 py-2.5 text-center text-[11px] font-bold border-r border-blue-500 min-w-[100px]">
                      {m} / {year}
                    </th>
                  ))}
                  <th className="px-6 py-2.5 text-right text-[11px] font-bold sticky right-0 bg-blue-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-6 py-3 sticky left-0 bg-white border-r">
                        <Skeleton className="h-3 w-32" />
                      </td>
                      {months.map((m) => (
                        <td key={m} className="px-4 py-3">
                          <Skeleton className="h-3 w-16 mx-auto" />
                        </td>
                      ))}
                      <td className="px-6 py-3 sticky right-0 bg-white border-l">
                        <Skeleton className="h-3 w-20 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : dre?.rows.map((row) => {
                  const isIncome = ["outras_receitas", "prestacao_servicos", "medicao"].includes(row.id);
                  const isExpense = [
                    "mao_de_obra", "mao_de_obra_terceirizada", "materiais", 
                    "equipamentos", "outras_despesas", "gerais_administrativas", 
                    "aluguel_condominio_iptu", "pro_labore", "despesas_financeiras", "juros"
                  ].includes(row.id);

                  return (
                    <tr key={row.id} className={getRowStyles(row)}>
                      <td className={`px-6 py-2.5 text-left text-[11px] border-r border-slate-100 sticky left-0 bg-inherit shadow-[1px_0_0_0_#f1f5f9] z-10 
                        ${row.parent ? 'pl-10 text-slate-500 italic font-semibold' : ''}
                        ${row.isHeader && !row.parent ? 'pl-6' : ''}
                        ${row.isSubtotal ? 'pl-6' : ''}
                        relative
                      `}>
                        {/* Indicator Bar */}
                        {(isIncome || isExpense) && (
                          <div className={`absolute left-0 top-1 bottom-1 w-[4px] rounded-r-full
                            ${isIncome ? 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]'}
                          `} />
                        )}
                        {row.label}
                      </td>
                      {row.values.map((v, i) => (
                        <td key={i} className={`px-4 py-2.5 text-right text-[10px] font-semibold border-r border-slate-100/50
                          ${row.isMargin ? (v < 0 ? 'text-red-500' : 'text-slate-400') : (v < 0 ? 'text-red-600' : 'text-slate-600')}
                        `}>
                          {row.isMargin ? formatPercent(v) : formatCurrency(v)}
                        </td>
                      ))}
                      <td className={`px-6 py-2.5 text-right text-[11px] font-bold sticky right-0 bg-inherit shadow-[-1px_0_0_0_#f1f5f9] z-10
                        ${row.total < 0 ? 'text-red-600' : 'text-slate-800'}
                      `}>
                        {row.isMargin ? formatPercent(row.total) : formatCurrency(row.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print\:hidden { display: none !important; }
          body { background: white !important; }
          .overflow-hidden { overflow: visible !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
          th { background-color: #f8fafc !important; color: black !important; }
          .bg-blue-600 { background-color: #f8fafc !important; color: black !important; border-bottom: 2px solid #000 !important; }
          .sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
}
