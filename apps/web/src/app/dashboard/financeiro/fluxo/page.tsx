"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Printer, 
  RotateCcw, 
  ChevronDown, 
  Filter, 
  Search, 
  Calendar,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronUp,
  LineChart as LineChartIcon,
  Table as TableIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Badge } from "@/components/ui/badge";

export default function FluxoPage() {
  const [viewType, setViewType] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [ownerType, setOwnerType] = useState<string>("EMPRESA");
  const [bankAccountId, setBankAccountId] = useState<string>("all");
  const [centroCusto, setCentroCusto] = useState<string>("empresa");
  const [projectId, setProjectId] = useState<string>("all");
  const [includeInitialBalance, setIncludeInitialBalance] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left' | null>(null);
  const PAGE_SIZE = 10;

  // Queries
  const { data: options } = trpc.financial.getCreateOptions.useQuery();
  const { data: cashFlow, isLoading } = trpc.financial.getDetailedCashFlow.useQuery({
    startDate,
    endDate,
    viewType,
    projectId: centroCusto === 'obra' && projectId !== 'all' ? projectId : undefined,
    ownerType: ownerType !== 'all' ? ownerType : undefined,
    bankAccountId: bankAccountId !== 'all' ? bankAccountId : undefined,
    includeInitialBalance
  });

  const handlePrint = () => window.print();

  // Reset pagination when filters change
  useMemo(() => {
    setPageOffset(0);
  }, [startDate, endDate, viewType, projectId, ownerType, bankAccountId, centroCusto]);

  // Categories helper
  const OPERACIONAL_CATEGORIES = ["Prestação de Serviços", "Execução de Obras", "Taxa de Administração", "Venda de Imóveis", "Projetos", "Venda", "Contrato", "Medição", "Licitação", "Aditivo de Contrato", "Venda de Materiais", "Venda de Equipamentos e Instalações"];
  const FINANCEIRA_CATEGORIES = ["Reembolso", "Juros de Aplicações Financeiras", "Empréstimo", "Aporte de Capital", "Distrato", "Juros", "Multa", "Financiamento Bancário", "Aporte de Investidor", "Juros de Contrato", "Estorno"];

  const visiblePeriods = useMemo(() => {
    if (!cashFlow) return [];
    return cashFlow.periods.slice(pageOffset * PAGE_SIZE, (pageOffset + 1) * PAGE_SIZE);
  }, [cashFlow, pageOffset]);

  const totalPages = useMemo(() => {
    if (!cashFlow) return 0;
    return Math.ceil(cashFlow.periods.length / PAGE_SIZE);
  }, [cashFlow]);

  const renderRow = (label: string, data: Record<string, number>, isBold = false, isGroup = false, indent = 0, customTotal?: number) => {
    if (!cashFlow) return null;
    
    // Check if row has any values
    const hasValue = cashFlow.periods.some(p => data[p] && data[p] !== 0);
    if (!hasValue && !isGroup) return null;

    const total = customTotal !== undefined ? customTotal : cashFlow.periods.reduce((acc, p) => acc + (data[p] || 0), 0);

    return (
      <tr key={label} className={`group border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${isBold ? 'bg-slate-50/30' : ''}`}>
        <td className={`sticky left-0 bg-white z-10 px-4 py-1.5 border-r border-slate-200 min-w-[250px] max-w-[250px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]`}>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indent * 12}px` }}>
            <span className={`text-[11px] tracking-tight truncate ${isBold ? 'font-bold text-slate-700' : 'font-semibold text-slate-500 italic'}`}>
              {label}
            </span>
            {isGroup && label.includes('Receita') && <ArrowUpRight className="w-3 h-3 text-green-500" />}
            {isGroup && label.includes('Despesa') && <ArrowDownRight className="w-3 h-3 text-red-500" />}
          </div>
        </td>
        {visiblePeriods.map(p => (
          <td key={p} className={`px-4 py-1.5 text-right border-r border-slate-100 text-[10px] font-bold ${isBold ? 'text-slate-700' : 'text-slate-500'}`}>
            {data[p] && data[p] !== 0 ? (
              new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(data[p])
            ) : (
              <span className="text-slate-200">-</span>
            )}
          </td>
        ))}
        <td className={`sticky right-0 bg-slate-50/80 backdrop-blur-sm z-10 px-4 py-1.5 text-right border-l border-slate-200 text-[11px] font-bold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] ${total < 0 ? 'text-red-600' : total > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 print:bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-30 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight">Fluxo de Caixa</h1>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full cursor-help">
             <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 bg-white border-slate-300 text-slate-600 font-semibold text-[10px] shadow-sm hover:bg-slate-50"
            onClick={() => setShowChart(!showChart)}
          >
            {showChart ? <TableIcon className="w-3.5 h-3.5" /> : <LineChartIcon className="w-3.5 h-3.5" />}
            {showChart ? "Ocultar Gráfico" : "Mostrar Gráfico"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 bg-cyan-600 border-cyan-600 text-white font-semibold text-[10px] shadow-sm hover:bg-cyan-700"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 bg-[#f1f5f9] border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 shadow-inner print:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider px-1">Visualização</label>
          <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
            <SelectTrigger className="h-8 bg-white border-slate-300 text-[11px] font-semibold rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Diário</SelectItem>
              <SelectItem value="MONTHLY">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider px-1">Período</label>
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              className="h-8 bg-white border-slate-300 text-[11px] font-semibold rounded-sm" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-[11px] font-semibold text-slate-400 italic">até</span>
            <Input 
              type="date" 
              className="h-8 bg-white border-slate-300 text-[11px] font-semibold rounded-sm" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider px-1">Proprietário</label>
          <Select value={ownerType} onValueChange={setOwnerType}>
            <SelectTrigger className="h-8 bg-white border-slate-300 text-[11px] font-bold rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="EMPRESA">Empresa</SelectItem>
              <SelectItem value="CLIENTE">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider px-1">Contas Ativas</label>
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger className="h-8 bg-white border-slate-300 text-[11px] font-bold rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Contas</SelectItem>
              {options?.bankAccounts.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider px-1">Centro de Custo</label>
          <Select value={centroCusto} onValueChange={setCentroCusto}>
            <SelectTrigger className="h-8 bg-white border-slate-300 text-[11px] font-bold rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="obra">Obra Específica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 tracking-wider px-1">Obra</label>
          <Select 
            value={projectId} 
            onValueChange={setProjectId}
            disabled={centroCusto !== 'obra'}
          >
            <SelectTrigger className="h-8 bg-white border-slate-300 text-[11px] font-bold rounded-sm">
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
      </div>

      <div className="px-6 py-2 bg-[#f1f5f9]/50 border-b border-slate-200 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIncludeInitialBalance(!includeInitialBalance)}>
             <Checkbox checked={includeInitialBalance} onCheckedChange={(v: any) => setIncludeInitialBalance(v)} />
             <span className="text-[11px] font-bold text-slate-600 tracking-tight align-middle mt-0.5 group-hover:text-cyan-600 transition-colors">Considerar saldo Inicial de contas e transferências</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-sm px-1 py-0.5 shadow-sm mr-2">
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-16 text-[9px] font-bold tracking-tighter hover:bg-slate-100 disabled:opacity-20 transition-all active:scale-95 text-slate-600"
                onClick={() => {
                  setDirection('left');
                  setPageOffset(prev => Math.max(0, prev - 1));
                }}
                disabled={pageOffset === 0}
             >
               {"<<"} Anterior
             </Button>
             <div className="w-[1px] h-3 bg-slate-200" />
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-16 text-[9px] font-bold tracking-tighter hover:bg-slate-100 disabled:opacity-20 transition-all active:scale-95 text-slate-600"
                onClick={() => {
                  setDirection('right');
                  setPageOffset(prev => Math.min(totalPages - 1, prev + 1));
                }}
                disabled={pageOffset >= totalPages - 1}
             >
               Próximo {">>"}
             </Button>
           </div>
           <Button variant="outline" size="icon" className="h-7 w-7 bg-white border-slate-300 rounded-sm text-slate-400 hover:text-blue-500 shadow-sm">
             <RotateCcw className="w-3.5 h-3.5" />
           </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Table Container */}
        <div className="flex-1 overflow-auto bg-white relative print:overflow-visible">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20 grayscale opacity-40">
              <RotateCcw className="w-12 h-12 animate-spin text-slate-200" />
              <p className="text-[13px] font-semibold text-slate-400 tracking-widest animate-pulse">Consolidando Fluxo de Caixa...</p>
            </div>
          ) : !cashFlow ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-20 opacity-30">
              <Building2 className="w-16 h-16 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400 tracking-widest">Nenhum dado disponível para o período</p>
            </div>
          ) : (
            <table className="w-full border-collapse border-slate-200">
              <thead className="sticky top-0 z-20 bg-white shadow-sm border-b-2 border-slate-200">
                <tr className="bg-slate-700 text-white">
                  <th className="sticky left-0 bg-slate-700 z-30 px-4 py-2 text-left text-[11px] font-bold border-r border-slate-600 w-[250px] min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    Plano de Contas
                  </th>
                  {visiblePeriods.map(period => (
                    <th key={period} className="px-4 py-2 text-center text-[10px] font-bold border-r border-slate-600 min-w-[120px] max-w-[120px]">
                      {viewType === 'DAILY' ? (
                        <div className="flex flex-col leading-tight">
                          <span>{period.split('-')[2]}</span>
                          <span className="text-[8px] opacity-60 font-bold">{format(new Date(period), "MMM/yy", { locale: ptBR })}</span>
                        </div>
                      ) : (
                        format(new Date(period), "MMMM/yyyy", { locale: ptBR })
                      )}
                    </th>
                  ))}
                  <th className="sticky right-0 bg-slate-700 z-30 px-6 py-2 text-right text-[11px] font-bold border-l border-slate-600 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody 
                key={`${pageOffset}-${direction}`}
                className={`text-[11px] animate-in fade-in duration-500 fill-mode-both ${
                  direction === 'right' ? 'slide-in-from-right-4' : 
                  direction === 'left' ? 'slide-in-from-left-4' : ''
                }`}
              >
                {/* 1. Saldo Inicial Row - Total is the balance at the start of the FIRST period */}
                {renderRow("Saldo Inicial", cashFlow.categoryRows["Saldo Inicial"], true, false, 0, cashFlow.categoryRows["Saldo Inicial"][cashFlow.periods[0]])}
                {renderRow("Saldo Transferência", cashFlow.categoryRows["Saldo Transferência"], false, false)}
                
                {/* 2. Receitas Group - Total is Sum of all visible daily incomes */}
                <tr className="bg-blue-50/50">
                   <td className="sticky left-0 bg-blue-100 z-10 px-4 py-2 border-r border-blue-200 font-bold text-blue-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Receitas</td>
                   <td colSpan={visiblePeriods.length + 1} className="px-4 py-2 bg-blue-50/20"></td>
                </tr>
                {renderRow("Receita Operacional Bruta", cashFlow.categoryRows["Receita Operacional Bruta"], true, true, 1)}
                {OPERACIONAL_CATEGORIES.map(cat => renderRow(cat, cashFlow.categoryRows[cat] || {}, false, false, 2))}
                
                {renderRow("Receitas Financeiras", cashFlow.categoryRows["Receitas Financeiras"], true, true, 1)}
                {FINANCEIRA_CATEGORIES.map(cat => renderRow(cat, cashFlow.categoryRows[cat] || {}, false, false, 2))}

                {/* 3. Despesas Group - Total is Sum of all daily expenses */}
                <tr className="bg-orange-50/50">
                   <td className="sticky left-0 bg-orange-100 z-10 px-4 py-2 border-r border-orange-200 font-bold text-orange-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Despesas</td>
                   <td colSpan={visiblePeriods.length + 1} className="px-4 py-2 bg-orange-50/20"></td>
                </tr>
                {Object.keys(cashFlow.categoryRows)
                  .filter(cat => 
                    !OPERACIONAL_CATEGORIES.includes(cat) && 
                    !FINANCEIRA_CATEGORIES.includes(cat) && 
                    !["Saldo Inicial", "Saldo Inicial de Conta", "Saldo Transferência", "Receitas", "Receita Operacional Bruta", "Receitas Financeiras", "Despesas", "Saldo"].includes(cat) &&
                    cashFlow.periods.some(p => cashFlow.categoryRows[cat][p] && cashFlow.categoryRows[cat][p] !== 0)
                  )
                  .map(cat => renderRow(cat, cashFlow.categoryRows[cat], false, false, 1))
                }

                {/* 4. Saldo do Período - Sum(Incomes) - Sum(Expenses) */}
                {(() => {
                   const saldoPeriodoData: Record<string, number> = {};
                   cashFlow.periods.forEach(p => {
                     saldoPeriodoData[p] = (cashFlow.categoryRows["Receitas"][p] || 0) - (cashFlow.categoryRows["Despesas"][p] || 0);
                   });
                   const totalReceitas = cashFlow.periods.reduce((acc, p) => acc + (cashFlow.categoryRows["Receitas"][p] || 0), 0);
                   const totalDespesas = cashFlow.periods.reduce((acc, p) => acc + (cashFlow.categoryRows["Despesas"][p] || 0), 0);
                   return renderRow("Saldo do Período", saldoPeriodoData, true, false, 0, totalReceitas - totalDespesas);
                })()}

                {/* 5. Saldo Final - Total is the balance at the end of the LAST period */}
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-20 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
                  <td className="sticky left-0 bg-slate-50 z-10 px-4 py-3 border-r border-slate-300 text-slate-700 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Saldo Final</td>
                  {visiblePeriods.map(p => (
                    <td key={p} className={`px-4 py-3 text-right border-r border-slate-200 text-xs ${cashFlow.categoryRows["Saldo"][p] < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(cashFlow.categoryRows["Saldo"][p])}
                    </td>
                  ))}
                  <td className="sticky right-0 bg-slate-200 z-10 px-4 py-3 text-right text-xs shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow.categoryRows["Saldo"][cashFlow.periods[cashFlow.periods.length - 1]])}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Chart Section */}
        {showChart && cashFlow && !isLoading && (
          <div className="h-64 bg-white border-t border-slate-200 p-6 animate-in slide-in-from-bottom duration-500 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] print:hidden relative">
            <div className="absolute top-4 left-6 flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-500 tracking-widest decoration-cyan-500 underline underline-offset-4 decoration-2">Gráfico de Fluxo de Caixa</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow.chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(v) => viewType === 'DAILY' ? v.split('-')[2] + '/' + v.split('-')[1] : format(new Date(v), "MMM/yy", { locale: ptBR })}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                  formatter={(v: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), "Saldo"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer / Summary Strip */}
      <div className="bg-slate-700 text-white px-6 py-2 flex items-center justify-between text-[11px] font-bold tracking-tight shadow-lg z-40 print:hidden">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <span className="text-slate-300">Início:</span>
             <span className="text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow?.summary.startingBalance || 0)}</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-slate-300 font-bold decoration-green-400 decoration-2 underline underline-offset-4">Receitas:</span>
             <span className="text-green-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow?.summary.totalIncome || 0)}</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-slate-300 font-bold decoration-red-400 decoration-2 underline underline-offset-4">Despesas:</span>
             <span className="text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow?.summary.totalExpense || 0)}</span>
           </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-4 py-1 rounded-sm border border-white/10 backdrop-blur-sm">
           <span className="text-slate-300">Saldo Consolidado:</span>
           <span className={`text-lg font-bold ${(cashFlow?.summary.finalBalance || 0) < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow?.summary.finalBalance || 0)}
           </span>
        </div>
      </div>
    </div>
  );
}
