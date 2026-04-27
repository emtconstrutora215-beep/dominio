"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { 
  ChevronLeft, 
  Info, 
  Edit3, 
  ArrowLeft,
  Settings,
  MoreVertical,
  Calendar,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Download,
  TriangleAlert,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LabelList,
  ReferenceLine
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TABS = [
  { id: "overview", label: "Visão Geral" },
  { id: "gestao-custos", label: "Gestão de Custos" },
  { id: "curve", label: "Curva S" },
  { id: "schedule", label: "Cronograma" },
  { id: "files", label: "Arquivos" },
  { id: "reports", label: "Relatórios" },
  { id: "mgmt_report", label: "Relatório Gerencial" },
  { id: "notes", label: "Anotações" },
];

const REPORT_ITEMS = [
  { id: "inputs", label: "Insumos Orçados x Realizados", type: "accordion" },
  { id: "abc", label: "Curva ABC", type: "accordion" },
  { id: "area_costs", label: "Custos por Área de Obra", type: "accordion" },
  { id: "category_costs", label: "Custos Realizados por Categorias", type: "accordion" },
  { id: "financial_result", label: "Resultado Financeiro", type: "accordion" },
  { id: "payments", label: "Pagamentos", type: "accordion" },
  { id: "stage_payments", label: "Resumo de Pagamentos por Etapa", type: "accordion" },
  { id: "cost_performance", label: "Desempenho de Custos", type: "link" },
];

export default function ProjectDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [inputsSearch, setInputsSearch] = useState("");
  const [abcMode, setAbcMode] = useState<"budgeted" | "realized">("budgeted");
  const [areaCostsMode, setAreaCostsMode] = useState<"budgeted" | "realized">("budgeted");
  const [paymentsDateStart, setPaymentsDateStart] = useState("01/01/2024");
  const [paymentsDateEnd, setPaymentsDateEnd] = useState("30/04/2026");
  const [paymentsStatus, setPaymentsStatus] = useState<"todos" | "pagos" | "aberto">("todos");

  const toggleReport = (reportId: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const { data: overview, isLoading: isOverviewLoading } = trpc.bi.getProjectOverview.useQuery({ 
    projectId: id as string 
  });

  const { data: costData, isLoading: isCostLoading } = trpc.bi.getProjectCostManagement.useQuery({ 
    projectId: id as string 
  }, {
    enabled: activeTab === "gestao-custos"
  });

  const { data: sCurveData, isLoading: isCurveLoading } = trpc.bi.getProjectSCurve.useQuery({ 
    projectId: id as string 
  }, {
    enabled: activeTab === "curve"
  });

  const { data: inputsReport, isLoading: isInputsLoading } = trpc.bi.getProjectInputsReport.useQuery({ 
    projectId: id as string,
    search: inputsSearch
  }, {
    enabled: activeTab === "reports" && expandedReports.has("inputs")
  });

  const { data: abcReport, isLoading: isAbcLoading } = trpc.bi.getProjectABCReport.useQuery({ 
    projectId: id as string,
    mode: abcMode
  }, {
    enabled: activeTab === "reports" && expandedReports.has("abc")
  });

  const { data: areaCostsReport, isLoading: isAreaCostsLoading } = trpc.bi.getProjectAreaCostsReport.useQuery({ 
    projectId: id as string,
    mode: areaCostsMode
  }, {
    enabled: activeTab === "reports" && expandedReports.has("area_costs")
  });

  const { data: categoryCostsReport, isLoading: isCategoryCostsLoading } = trpc.bi.getProjectCategoryCostsReport.useQuery({ 
    projectId: id as string,
  }, {
    enabled: activeTab === "reports" && expandedReports.has("category_costs")
  });

  const { data: financialResultReport, isLoading: isFinancialResultLoading } = trpc.bi.getProjectFinancialResultReport.useQuery({ 
    projectId: id as string,
  }, {
    enabled: activeTab === "reports" && expandedReports.has("financial_result")
  });

  const isLoading = isOverviewLoading;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatPercent = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val) + "%";
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMM yyyy", { locale: ptBR }).toLowerCase();
  };

  const formatMonthTable = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMM/yyyy", { locale: ptBR }).toUpperCase();
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899'];

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#f8fafc]">
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-8 flex flex-col gap-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!overview) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">Obra não encontrada</div>;

  const { project, costs, kpis, charts } = overview;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 overflow-hidden">
      {/* Top Navigation / Status Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Obras</span>
            <h1 className="text-2xl font-bold text-[#1862a3] tracking-tighter -mt-1 flex items-center gap-2">
              Gestão
            </h1>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              Evolução <Info className="w-3 h-3 text-slate-300" />
            </span>
            <span className="text-2xl font-bold text-slate-700 tracking-tighter -mt-1">
              {formatPercent(project.evolutionPercent)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
            <div className="flex items-center gap-2 -mt-0.5">
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-semibold px-3 py-1 text-xs">
                {project.status === 'IN_PROGRESS' ? 'Em Andamento' : project.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-blue-500">
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 bg-white text-xs font-bold text-slate-600 gap-2 border-slate-300 shadow-sm">
            <FileText className="w-4 h-4" /> Orçamento
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 border-slate-300">
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 bg-orange-400 border-orange-400 hover:bg-orange-500 text-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Project Info Summary Bar */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 shadow-sm flex flex-col gap-3">
        <h2 className="text-xl font-bold text-slate-700 tracking-tight">
          {project.code ? `${project.code} - ` : ""}{project.name}
        </h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cliente:</span>
            <span className="text-xs font-bold text-slate-600 uppercase">{project.clientName || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Área Total:</span>
            <span className="text-xs font-bold text-slate-600 uppercase">{project.totalArea || "-"} {project.areaUnit || "m²"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cronograma Planejado:</span>
            <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
              {project.startDate ? format(new Date(project.startDate), "dd/MM/yyyy") : "-"} - {project.endDate ? format(new Date(project.endDate), "dd/MM/yyyy") : "-"}
              <Edit3 className="w-3 h-3 text-slate-300 cursor-pointer hover:text-blue-500" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cronograma Realizado:</span>
            <span className="text-xs font-medium text-slate-400 italic flex items-center gap-1.5">
              Nenhum período informado
              <Edit3 className="w-3 h-3 text-slate-300 cursor-pointer hover:text-blue-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto hide-scrollbar flex items-center">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-5 py-4 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap
              ${activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full shadow-[0_-2px_8px_rgba(37,99,235,0.4)]" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide">
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-2 duration-500">
            
            {/* Cost Table Section */}
            <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="w-10"></th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-400 border-r border-slate-100"></th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500 border-r border-slate-100">Custo Orçado</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500 border-r border-slate-100">Custo Realizado <Info className="w-3 h-3 inline ml-1 text-slate-300" /></th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase text-slate-500 border-r border-slate-100">Saldo</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">Evolução de Custos</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium text-slate-600">
                  {[
                    { label: "Mão de Obra", budgeted: costs.budgeted.labor, actual: costs.actual.labor, balance: costs.balance.labor },
                    { label: "Material", budgeted: costs.budgeted.material, actual: costs.actual.material, balance: costs.balance.material },
                    { label: "Equipamento", budgeted: costs.budgeted.equipment, actual: costs.actual.equipment, balance: costs.balance.equipment },
                    { label: "Outros", budgeted: costs.budgeted.others, actual: costs.actual.others, balance: costs.balance.others },
                  ].map((row, idx) => {
                    const progress = row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : 0;
                    const isOver = progress > 100;
                    
                    return (
                      <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-2 py-3 text-center border-r border-slate-100">
                           <ChevronLeft className="w-3 h-3 text-slate-300 rotate-[-90deg]" />
                        </td>
                        <td className="px-6 py-3 border-r border-slate-100 text-slate-800 uppercase tracking-tighter">{row.label}</td>
                        <td className="px-6 py-3 border-r border-slate-100 text-center font-bold">{formatCurrency(row.budgeted)}</td>
                        <td className="px-6 py-3 border-r border-slate-100 text-center font-bold text-slate-700">{formatCurrency(row.actual)}</td>
                        <td className="px-6 py-3 border-r border-slate-100 text-center font-bold">{formatCurrency(row.balance)}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-3 w-full">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white min-w-[32px] text-center ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                              {formatPercent(progress)}
                            </span>
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  <tr className="bg-slate-50/30 border-b border-slate-100 italic text-slate-500 text-xs">
                    <td colSpan={2} className="px-6 py-2 text-slate-400">Custo Subtotal</td>
                    <td className="px-6 py-2 text-center">{formatCurrency(costs.budgeted.total)}</td>
                    <td className="px-6 py-2 text-center">{formatCurrency(costs.actual.total)}</td>
                    <td className="px-6 py-2 text-center">{formatCurrency(costs.balance.total)}</td>
                    <td className="px-6 py-2">
                       <div className="flex items-center justify-end gap-3">
                          <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {formatPercent(costs.budgeted.total > 0 ? (costs.actual.total / costs.budgeted.total) * 100 : 0)}
                          </span>
                          <div className="w-32 h-1.5 bg-slate-200/50 rounded-full" />
                       </div>
                    </td>
                  </tr>

                  <tr className="border-b border-slate-100">
                    <td colSpan={2} className="px-6 py-3 text-slate-800 uppercase tracking-tighter">Estoque Disponível</td>
                    <td className="px-6 py-3 border-r border-slate-100">-</td>
                    <td className="px-6 py-3 border-r border-slate-100 text-center">R$ 0,00</td>
                    <td className="px-6 py-3 border-r border-slate-100">-</td>
                    <td className="px-6 py-3"></td>
                  </tr>

                  <tr className="bg-white font-bold text-slate-800">
                    <td colSpan={2} className="px-6 py-4 uppercase tracking-tighter text-sm text-[#1862a3]">Custo Total</td>
                    <td className="px-6 py-4 text-center text-sm">{formatCurrency(costs.budgeted.total)}</td>
                    <td className="px-6 py-4 text-center text-sm">{formatCurrency(costs.actual.total)}</td>
                    <td className="px-6 py-4 text-center text-sm">{formatCurrency(costs.balance.total)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                          <span className="bg-emerald-500 text-white text-[11px] px-2 py-0.5 rounded font-bold">
                             {formatPercent(costs.budgeted.total > 0 ? (costs.actual.total / costs.budgeted.total) * 100 : 0)}
                          </span>
                          <div className="w-32 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                             <div 
                               className="h-full bg-emerald-500 transition-all duration-1000" 
                               style={{ width: `${Math.min((costs.actual.total / costs.budgeted.total) * 100, 100)}%` }}
                             />
                          </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Pie Chart: Distribution */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-50 pb-2">
                  Distribuição dos Custos Realizados
                </h3>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {charts.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend Overlay (simplified as absolute list for design match) */}
                  <div className="absolute top-0 right-0 flex flex-col gap-3">
                    {charts.distribution.map((item, idx) => (
                      <div key={item.name} className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                           <span className="text-[11px] font-bold text-slate-600">{item.name}</span>
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {formatCurrency(item.value)} ({formatPercent((item.value / costs.actual.total) * 100)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar Chart: Summary */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2">
                  Resumo de Custos <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={charts.summaryBars}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        fontWeight="600" 
                        width={100}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]} 
                        barSize={30}
                      >
                        {charts.summaryBars.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "gestao-custos" && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Cost Management Table */}
            <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-[#1862a3] hover:bg-[#1862a3]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-bold h-10 py-0 w-[450px]">Item</TableHead>
                    <TableHead className="text-white font-bold h-10 py-0 text-center">Custo Orçado</TableHead>
                    <TableHead className="text-white font-bold h-10 py-0 text-center flex items-center justify-center gap-1">
                      Custo Realizado <Info className="w-3 h-3" />
                    </TableHead>
                    <TableHead className="text-white font-bold h-10 py-0 text-center">Saldo</TableHead>
                    <TableHead className="text-white font-bold h-10 py-0 text-center flex items-center justify-center gap-1">
                      % Custo Realizado <Info className="w-3 h-3" />
                    </TableHead>
                    <TableHead className="text-white font-bold h-10 py-0 text-right flex items-center justify-end gap-1">
                      Evolução Física <Info className="w-3 h-3" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCostLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {costData?.stages.map((stage, idx) => (
                        <TableRow key={stage.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                          <TableCell className="py-4 font-semibold text-slate-700 flex items-center gap-3 uppercase text-xs">
                             <span className="text-slate-300 w-4">{idx + 1}</span>
                             {stage.name}
                             <ChevronDown className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600">{formatCurrency(stage.budgeted)}</TableCell>
                          <TableCell className="text-center font-bold text-slate-700">{formatCurrency(stage.actual)}</TableCell>
                          <TableCell className="text-center font-bold text-slate-600">{formatCurrency(stage.balance)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-bold text-slate-700">{formatPercent(stage.budgeted > 0 ? (stage.actual / stage.budgeted) * 100 : 0)}</span>
                              <Info className="w-3 h-3 text-slate-300" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-bold text-slate-700">{formatPercent(stage.percentageComplete)}</span>
                              <Edit3 className="w-3 h-3 text-slate-300 cursor-pointer hover:text-blue-500" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Unallocated */}
                      <TableRow className="bg-slate-50/50 italic border-t-2 border-slate-100">
                        <TableCell className="py-3 text-slate-500 font-medium flex items-center gap-2">
                           Custos sem apropriação <Info className="w-3 h-3 text-slate-300" />
                        </TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center font-bold text-slate-500">{formatCurrency(costData?.unallocated.amount || 0)}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-center font-bold text-slate-500">
                          <div className="flex items-center justify-center gap-1.5">
                            {formatPercent(costData?.unallocated.percentOfTotal || 0)}
                            <Info className="w-3 h-3 text-slate-300" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>

                      {/* Total */}
                      <TableRow className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                        <TableCell className="py-4 text-slate-800 uppercase tracking-tight">Total</TableCell>
                        <TableCell className="text-center">{formatCurrency(costData?.totals.budgeted || 0)}</TableCell>
                        <TableCell className="text-center">{formatCurrency(costData?.totals.actual || 0)}</TableCell>
                        <TableCell className="text-center">{formatCurrency(costData?.totals.balance || 0)}</TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-1.5">
                            {formatPercent(costData?.totals.costPercent || 0)}
                            <Info className="w-3 h-3 text-slate-300" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-1.5">
                            {formatPercent(costData?.totals.physicalProgress || 0)}
                            <Info className="w-3 h-3 text-slate-300" />
                          </div>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6">
              {/* Orçado x Realizado per Stage */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Custo por Etapa: Orçado x Realizado
                  </h3>
                  <ChevronUp className="w-4 h-4 text-slate-300" />
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={costData?.stages}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        angle={-15} 
                        textAnchor="end" 
                        interval={0}
                        fontSize={10}
                        fontWeight="600"
                        stroke="#64748b"
                      />
                      <YAxis 
                        fontSize={10}
                        fontWeight="600"
                        stroke="#64748b"
                        tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                        label={{ value: 'Valor em R$', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                      />
                      <Tooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="rect" />
                      <Bar dataKey="budgeted" name="Orçado" fill="#7b98d1" radius={[2, 2, 0, 0]} barSize={24} />
                      <Bar dataKey="actual" name="Realizado" fill="#424242" radius={[2, 2, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Physical Progress per Stage */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Evolução Física por Etapa
                  </h3>
                  <ChevronUp className="w-4 h-4 text-slate-300" />
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={costData?.stages}
                      margin={{ top: 20, right: 80, left: 150, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={140}
                        fontSize={10}
                        fontWeight="600"
                        stroke="#64748b"
                        tickFormatter={(val, idx) => `${idx + 1}. ${val}`}
                      />
                      <Tooltip 
                        formatter={(val: number) => `${val.toFixed(1)}%`}
                        contentStyle={{ fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}
                      />
                      <Bar 
                        dataKey="percentageComplete" 
                        name="Evolução" 
                        radius={[0, 2, 2, 0]} 
                        barSize={16}
                      >
                        {costData?.stages.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index % 5 === 0 ? '#90b1c2' : index % 5 === 4 ? '#f6b060' : '#90b1c2'} />
                        ))}
                        <LabelList 
                          dataKey="percentageComplete" 
                          position="right" 
                          formatter={(val: number) => `${val}%`}
                          fontSize={10}
                          fontWeight="bold"
                          fill="#64748b"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "curve" && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isCurveLoading ? (
              <div className="flex flex-col gap-6">
                <Skeleton className="h-[450px] w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* S-Curve Chart */}
                <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200 flex flex-col gap-6">
                  <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={sCurveData}
                        margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={formatMonth}
                          fontSize={10}
                          fontWeight="600"
                          stroke="#94a3b8"
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          fontSize={10}
                          fontWeight="600"
                          stroke="#94a3b8"
                          tickFormatter={(val) => val.toLocaleString('pt-BR')}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          formatter={(val: number) => formatCurrency(val)}
                          labelFormatter={formatMonth}
                          contentStyle={{ fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        
                        {/* Monthly Bars */}
                        <Bar dataKey="orcado" name="Orçado" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={12} />
                        <Bar dataKey="medido" name="Medido" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} />
                        <Bar dataKey="realizado" name="Realizado" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                        
                        {/* Accumulated Lines */}
                        <Line type="monotone" dataKey="orcadoAcumulado" name="Orçado acumulado" stroke="#475569" strokeWidth={2} dot={{ r: 3, fill: '#475569' }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="medidoAcumulado" name="Medido acumulado" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="realizadoAcumulado" name="Realizado acumulado" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                        
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="plainline" 
                          wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10">Mês</TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10 text-center">
                           <div className="flex items-center justify-center gap-1">Orçado <HelpCircle className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10 text-center">
                           <div className="flex items-center justify-center gap-1">Medido <HelpCircle className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10 text-center">
                           <div className="flex items-center justify-center gap-1">Realizado <HelpCircle className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10 text-center">
                           <div className="flex items-center justify-center gap-1">Orçado Acumulado <HelpCircle className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10 text-center">
                           <div className="flex items-center justify-center gap-1">Medido Acumulado <HelpCircle className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead className="text-[11px] font-bold text-slate-500 h-10 text-center">
                           <div className="flex items-center justify-center gap-1">Realizado Acumulado <HelpCircle className="w-3 h-3" /></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sCurveData?.map((row: any) => (
                        <TableRow key={row.month} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-3 text-xs font-bold text-slate-600">{formatMonthTable(row.month)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-medium">{formatCurrency(row.orcado)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-medium">{formatCurrency(row.medido)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-medium">{formatCurrency(row.realizado)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-600 font-bold">{formatCurrency(row.orcadoAcumulado)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-600 font-bold">{formatCurrency(row.medidoAcumulado)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-600 font-bold">{formatCurrency(row.realizadoAcumulado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="p-4 border-t border-slate-50 flex justify-center">
                    <Button variant="ghost" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-slate-50">
                       <Settings className="w-3 h-3" /> Expandir
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {REPORT_ITEMS.map((item, idx) => {
              const isExpanded = expandedReports.has(item.id);
              const isLink = item.type === "link";

              return (
                <div 
                  key={item.id}
                  className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <button
                    onClick={() => !isLink && toggleReport(item.id)}
                    className={`
                      w-full px-6 py-4 flex items-center justify-between transition-colors
                      ${isLink ? "hover:bg-slate-50" : "hover:bg-slate-50/50"}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-600 tracking-tight">{item.label}</span>
                      <Info className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    {isLink ? (
                      <ExternalLink className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ChevronDown 
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} 
                      />
                    )}
                  </button>
                  
                  {!isLink && (
                    <div 
                      className={`
                        px-6 overflow-hidden transition-all duration-300 ease-in-out
                        ${isExpanded ? "max-h-[2000px] pb-6 opacity-100" : "max-h-0 opacity-0"}
                      `}
                    >
                      {item.id === "inputs" ? (
                         <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                            {/* Filter Header */}
                            <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-3 flex-1">
                                  <div className="relative flex-1 max-w-sm">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                     <input 
                                        type="text" 
                                        placeholder="Digite aqui sua busca..."
                                        value={inputsSearch}
                                        onChange={(e) => setInputsSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                     />
                                  </div>
                                  <select className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-500 focus:outline-none">
                                     <option>Selecione o grupo</option>
                                  </select>
                                  <select className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-500 focus:outline-none">
                                     <option>Selecione o tipo</option>
                                  </select>
                               </div>

                               <div className="flex items-center gap-4">
                                  <Button variant="outline" size="icon" className="h-9 w-9 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white rounded-sm">
                                     <Download className="w-4 h-4" />
                                  </Button>
                                  <div className="flex items-center gap-3">
                                     <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-400 flex items-center justify-center">
                                           <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        </div>
                                        Obra
                                     </label>
                                     <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                                        Etapa
                                     </label>
                                  </div>
                               </div>
                            </div>

                            {/* Comparison Table */}
                            <div className="border border-slate-200 rounded-sm overflow-hidden">
                               <Table>
                                  <TableHeader className="bg-slate-50/50">
                                     <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead rowSpan={2} className="text-[10px] font-bold text-slate-500 uppercase h-12 w-[350px]">Insumos</TableHead>
                                        <TableHead colSpan={3} className="text-[10px] font-bold text-slate-500 uppercase h-8 text-center border-l border-slate-100">Quantidade</TableHead>
                                        <TableHead colSpan={3} className="text-[10px] font-bold text-slate-500 uppercase h-8 text-center border-l border-slate-100">Custo Unitário</TableHead>
                                        <TableHead colSpan={3} className="text-[10px] font-bold text-slate-500 uppercase h-8 text-center border-l border-slate-100">Custo Total</TableHead>
                                     </TableRow>
                                     <TableRow className="hover:bg-transparent border-slate-100">
                                        {/* Qty */}
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center border-l border-slate-100 py-1">Orçado</TableHead>
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Realizado</TableHead>
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Saldo <Info className="w-3 h-3 inline ml-0.5" /></TableHead>
                                        {/* Unit Price */}
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center border-l border-slate-100 py-1">Orçado</TableHead>
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Realizado</TableHead>
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Diferença <Info className="w-3 h-3 inline ml-0.5" /></TableHead>
                                        {/* Total Price */}
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center border-l border-slate-100 py-1">Orçado</TableHead>
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Realizado</TableHead>
                                        <TableHead className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Diferença <Info className="w-3 h-3 inline ml-0.5" /></TableHead>
                                     </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                     {isInputsLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                          <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                        ))
                                     ) : (
                                        inputsReport?.map((row: any) => (
                                          <TableRow key={row.description} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                                             <TableCell className="py-2.5 text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                {row.description}
                                             </TableCell>
                                             {/* Qty */}
                                             <TableCell className="text-center text-[11px] text-slate-500 border-l border-slate-50">{row.orcadoQty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500">{row.realizadoQty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                             <TableCell className="text-center text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                                                {row.saldoQty < 0 && <TriangleAlert className="w-3 h-3 text-rose-500" />}
                                                <span className={row.saldoQty < 0 ? "text-rose-500" : ""}>
                                                   {row.saldoQty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                             </TableCell>
                                             {/* Unit Price */}
                                             <TableCell className="text-center text-[11px] text-slate-400 italic border-l border-slate-50">{row.orcadoUnitPrice > 0 ? formatCurrency(row.orcadoUnitPrice) : "-"}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500 font-medium">{formatCurrency(row.realizadoUnitPrice)}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-400 italic">{"-"}</TableCell>
                                             {/* Total Price */}
                                             <TableCell className="text-center text-[11px] text-slate-400 italic border-l border-slate-50">{row.orcadoTotal > 0 ? formatCurrency(row.orcadoTotal) : "-"}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500 font-bold">{formatCurrency(row.realizadoTotal)}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-400 italic">{"-"}</TableCell>
                                          </TableRow>
                                        ))
                                     )}
                                  </TableBody>
                               </Table>
                            </div>

                            <div className="flex justify-center mt-2">
                               <Button variant="outline" className="h-8 bg-white border-slate-200 text-[10px] font-bold text-slate-500 gap-2 px-6">
                                  Carregar mais <ChevronDown className="w-3.5 h-3.5" />
                               </Button>
                            </div>
                         </div>
                      ) : item.id === "abc" ? (
                         <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                            {/* Filter Header */}
                            <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-3 flex-1">
                                  <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-slate-200 text-slate-400 rounded-sm">
                                     <Settings className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-9 w-9 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white rounded-sm">
                                     <Download className="w-4 h-4" />
                                  </Button>
                                  <select 
                                     value={abcMode}
                                     onChange={(e) => setAbcMode(e.target.value as any)}
                                     className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-600 font-bold focus:outline-none"
                                  >
                                     <option value="budgeted">Orçado</option>
                                     <option value="realized">Realizado</option>
                                  </select>
                                  <select className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-500 focus:outline-none">
                                     <option>Selecione o grupo</option>
                                  </select>
                                  <select className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-500 focus:outline-none">
                                     <option>Selecione o tipo</option>
                                  </select>
                                  <select className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-500 focus:outline-none">
                                     <option>Custo</option>
                                  </select>
                               </div>

                               <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-3">
                                     <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-400 flex items-center justify-center">
                                           <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        </div>
                                        Obra
                                     </label>
                                     <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                                        Etapa
                                     </label>
                                  </div>
                               </div>
                            </div>

                            {/* ABC Table */}
                            <div className="border border-slate-200 rounded-sm overflow-hidden">
                               <Table>
                                  <TableHeader className="bg-slate-50/50">
                                     <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 w-[350px]">Item</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Tipo</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Grupo</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Qtde.</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Custo Unitário</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Custo Total</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">%</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Custo Acumulado</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">
                                           <div className="flex items-center justify-center gap-1">% Acumulado <Info className="w-3 h-3" /></div>
                                        </TableHead>
                                     </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                     {isAbcLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                          <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                        ))
                                     ) : (
                                        abcReport?.map((row: any) => (
                                          <TableRow key={row.description} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                                             <TableCell className={`py-2.5 text-[11px] uppercase tracking-tighter ${row.classification === 'A' ? 'font-black text-slate-800' : 'font-medium text-slate-600'}`}>
                                                {row.description}
                                             </TableCell>
                                             <TableCell className="text-center text-[10px] text-slate-500 uppercase">{row.type}</TableCell>
                                             <TableCell className="text-center text-[10px] text-slate-500 uppercase">{row.group}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500">{row.qty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500">{formatCurrency(row.unitPrice)}</TableCell>
                                             <TableCell className="text-center text-[11px] font-bold text-slate-700">{formatCurrency(row.total)}</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500">{row.percent.toFixed(2)}%</TableCell>
                                             <TableCell className="text-center text-[11px] text-slate-500">{formatCurrency(row.cumulativeCost)}</TableCell>
                                             <TableCell 
                                                className={`text-center text-[11px] font-bold border-l border-white/20 transition-colors
                                                   ${row.classification === 'A' ? 'bg-red-50 text-red-700' : 
                                                     row.classification === 'B' ? 'bg-blue-50 text-blue-700' : 
                                                     'bg-emerald-50 text-emerald-700'}
                                                `}
                                             >
                                                {row.cumulativePercent.toFixed(2)}%
                                             </TableCell>
                                          </TableRow>
                                        ))
                                     )}
                                  </TableBody>
                               </Table>
                            </div>
                         </div>
                      ) : item.id === "area_costs" ? (
                         <div className="flex flex-col gap-6 pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                            {/* Filter Header */}
                            <div className="flex items-center justify-end gap-6 mb-2">
                               <div className="flex items-center gap-6">
                                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                     <input 
                                        type="radio" 
                                        name="areaCostsMode" 
                                        checked={areaCostsMode === 'budgeted'}
                                        onChange={() => setAreaCostsMode('budgeted')}
                                        className="sr-only"
                                     />
                                     <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${areaCostsMode === 'budgeted' ? 'border-orange-400' : 'border-slate-200'}`}>
                                        {areaCostsMode === 'budgeted' && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                     </div>
                                     Orçado
                                  </label>
                                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                     <input 
                                        type="radio" 
                                        name="areaCostsMode" 
                                        checked={areaCostsMode === 'realized'}
                                        onChange={() => setAreaCostsMode('realized')}
                                        className="sr-only"
                                     />
                                     <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${areaCostsMode === 'realized' ? 'border-orange-400' : 'border-slate-200'}`}>
                                        {areaCostsMode === 'realized' && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                     </div>
                                     Realizado
                                  </label>
                               </div>
                               <ChevronUp className="w-4 h-4 text-slate-400" />
                            </div>

                            {/* Area Costs Table */}
                            <div className="border border-slate-200 rounded-sm overflow-hidden">
                               <Table>
                                  <TableHeader className="bg-slate-50/50">
                                     <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 w-[400px]">Etapa</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-right">Mão de Obra</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-right">Material</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-right">Equipamento</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-right">Outros</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-right">Custo Total</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">% Obra</TableHead>
                                     </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                     {isAreaCostsLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                          <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                        ))
                                     ) : (
                                        <>
                                           {areaCostsReport?.items.map((row: any) => (
                                              <TableRow key={row.id} className="hover:bg-slate-50/50 border-slate-100">
                                                 <TableCell className="py-3 text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                                    {row.name}
                                                 </TableCell>
                                                 {[row.labor, row.material, row.equipment, row.others, row.total].map((val, idx) => (
                                                    <TableCell key={idx} className="text-right py-2">
                                                       <div className="text-[11px] font-medium text-slate-600">{formatCurrency(val)}</div>
                                                       <div className="text-[9px] font-bold text-slate-400">
                                                          {formatCurrency(val / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}
                                                       </div>
                                                    </TableCell>
                                                 ))}
                                                 <TableCell className="text-center text-[11px] font-medium text-slate-500">
                                                    {row.percent.toFixed(2)}%
                                                 </TableCell>
                                              </TableRow>
                                           ))}
                                           {/* Outros Row */}
                                           <TableRow className="bg-slate-50/30 border-slate-200">
                                              <TableCell className="py-3 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                 Outros <Info className="w-3 h-3" />
                                              </TableCell>
                                              {[areaCostsReport?.unallocated.labor, areaCostsReport?.unallocated.material, areaCostsReport?.unallocated.equipment, areaCostsReport?.unallocated.others, areaCostsReport?.unallocated.total].map((val, idx) => (
                                                 <TableCell key={idx} className="text-right py-2">
                                                    <div className="text-[11px] font-medium text-slate-500">{formatCurrency(val || 0)}</div>
                                                    <div className="text-[9px] font-bold text-slate-400">
                                                       {formatCurrency((val || 0) / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}
                                                    </div>
                                                 </TableCell>
                                              ))}
                                              <TableCell className="text-center text-[11px] font-medium text-slate-500">
                                                 {areaCostsReport?.unallocated.percent.toFixed(2)}%
                                              </TableCell>
                                           </TableRow>
                                           {/* Total Footer */}
                                           <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-2 border-slate-200">
                                              <TableCell className="py-3 text-[11px] font-black text-slate-700 uppercase">Total</TableCell>
                                              <TableCell className="text-right py-2">
                                                 <div className="text-[11px] font-bold text-slate-700">{formatCurrency(areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.labor, 0) + (areaCostsReport?.unallocated.labor || 0))}</div>
                                                 <div className="text-[10px] font-black text-slate-800">{formatCurrency((areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.labor, 0) + (areaCostsReport?.unallocated.labor || 0)) / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}</div>
                                              </TableCell>
                                              <TableCell className="text-right py-2">
                                                 <div className="text-[11px] font-bold text-slate-700">{formatCurrency(areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.material, 0) + (areaCostsReport?.unallocated.material || 0))}</div>
                                                 <div className="text-[10px] font-black text-slate-800">{formatCurrency((areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.material, 0) + (areaCostsReport?.unallocated.material || 0)) / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}</div>
                                              </TableCell>
                                              <TableCell className="text-right py-2">
                                                 <div className="text-[11px] font-bold text-slate-700">{formatCurrency(areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.equipment, 0) + (areaCostsReport?.unallocated.equipment || 0))}</div>
                                                 <div className="text-[10px] font-black text-slate-800">{formatCurrency((areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.equipment, 0) + (areaCostsReport?.unallocated.equipment || 0)) / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}</div>
                                              </TableCell>
                                              <TableCell className="text-right py-2">
                                                 <div className="text-[11px] font-bold text-slate-700">{formatCurrency(areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.others, 0) + (areaCostsReport?.unallocated.others || 0))}</div>
                                                 <div className="text-[10px] font-black text-slate-800">{formatCurrency((areaCostsReport?.items.reduce((sum: any, i: any) => sum + i.others, 0) + (areaCostsReport?.unallocated.others || 0)) / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}</div>
                                              </TableCell>
                                              <TableCell className="text-right py-2">
                                                 <div className="text-[11px] font-bold text-slate-700">{formatCurrency(areaCostsReport?.grandTotal || 0)}</div>
                                                 <div className="text-[10px] font-black text-slate-800">{formatCurrency((areaCostsReport?.grandTotal || 0) / (areaCostsReport?.totalArea || 1))} / {areaCostsReport?.areaUnit}</div>
                                              </TableCell>
                                              <TableCell className="text-center text-[11px] font-black text-slate-700">100%</TableCell>
                                           </TableRow>
                                        </>
                                     )}
                                  </TableBody>
                               </Table>
                            </div>

                            {/* Area Costs Chart */}
                            <div className="flex justify-center py-8">
                               <div className="h-[400px] w-full max-w-[800px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                        <Pie
                                           data={[...(areaCostsReport?.items || []), areaCostsReport?.unallocated].filter(i => (i?.total || 0) > 0)}
                                           cx="50%"
                                           cy="50%"
                                           innerRadius={80}
                                           outerRadius={120}
                                           paddingAngle={2}
                                           dataKey="total"
                                           nameKey="name"
                                           label={({
                                              cx, cy, midAngle, innerRadius, outerRadius, value, index, payload
                                           }) => {
                                              const RADIAN = Math.PI / 180;
                                              const radius = outerRadius + 30;
                                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                              const textAnchor = x > cx ? 'start' : 'end';

                                              return (
                                                 <g>
                                                    <path d={`M${cx + (outerRadius) * Math.cos(-midAngle * RADIAN)},${cy + (outerRadius) * Math.sin(-midAngle * RADIAN)}L${cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN)},${cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN)}L${x},${y}`} stroke="#cbd5e1" fill="none" />
                                                    <text x={x} y={y - 12} textAnchor={textAnchor} fill="#475569" className="text-[10px] font-bold uppercase">{payload.name}</text>
                                                    <text x={x} y={y} textAnchor={textAnchor} fill="#64748b" className="text-[10px]">{formatCurrency(payload.total)} ({payload.percent?.toFixed(2)}%)</text>
                                                    <text x={x} y={y + 12} textAnchor={textAnchor} fill="#94a3b8" className="text-[9px] font-bold">{formatCurrency(payload.areaCost)} / {areaCostsReport?.areaUnit}</text>
                                                 </g>
                                              );
                                           }}
                                        >
                                           {[...(areaCostsReport?.items || []), areaCostsReport?.unallocated].map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={[
                                                 "#818cf8", "#f472b6", "#fb7185", "#38bdf8", "#4ade80", "#fbbf24", "#94a3b8"
                                              ][index % 7]} />
                                           ))}
                                        </Pie>
                                     </PieChart>
                                  </ResponsiveContainer>
                               </div>
                            </div>
                         </div>
                      ) : item.id === "category_costs" ? (
                         <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                            <div className="border border-slate-200 rounded-sm overflow-hidden">
                               <Table>
                                  <TableHeader className="bg-slate-50/50">
                                     <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 px-6">Categoria</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Grupo</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Custo / {categoryCostsReport?.areaUnit}</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">Custo Total</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center">% Obra</TableHead>
                                     </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                     {isCategoryCostsLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                          <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                        ))
                                     ) : (
                                        <>
                                           {categoryCostsReport?.items.map((row: any) => (
                                              <TableRow key={row.category} className="hover:bg-slate-50/50 border-slate-100">
                                                 <TableCell className="py-3 text-[11px] font-medium text-slate-600 px-6">
                                                    {row.category}
                                                 </TableCell>
                                                 <TableCell className="text-center text-[10px] text-slate-500 uppercase font-bold">{row.group}</TableCell>
                                                 <TableCell className="text-center text-[11px] text-slate-500">{formatCurrency(row.areaCost)} / {categoryCostsReport?.areaUnit}</TableCell>
                                                 <TableCell className="text-center text-[11px] font-bold text-slate-700">{formatCurrency(row.total)}</TableCell>
                                                 <TableCell className="text-center text-[11px] text-slate-500 font-medium">{row.percent.toFixed(2)}%</TableCell>
                                              </TableRow>
                                           ))}
                                           {/* Total Footer */}
                                           <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-2 border-slate-200">
                                              <TableCell colSpan={2} className="py-3 text-[11px] font-black text-slate-700 uppercase px-6">Total</TableCell>
                                              <TableCell className="text-center text-[11px] font-black text-slate-700">
                                                 {formatCurrency((categoryCostsReport?.grandTotal || 0) / (categoryCostsReport?.totalArea || 1))} / {categoryCostsReport?.areaUnit}
                                              </TableCell>
                                              <TableCell className="text-center text-[11px] font-black text-slate-700">
                                                 {formatCurrency(categoryCostsReport?.grandTotal || 0)}
                                              </TableCell>
                                              <TableCell className="text-center text-[11px] font-black text-slate-700">100%</TableCell>
                                           </TableRow>
                                        </>
                                     )}
                                  </TableBody>
                               </Table>
                            </div>
                         </div>
                      ) : item.id === "financial_result" ? (
                         <div className="flex flex-col gap-6 pt-4 border-t border-slate-100 animate-in fade-in duration-500">
                            {/* Financial Result Header */}
                            <div className="flex items-center justify-end gap-8 mb-2">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Receitas:</span>
                                  <div className="h-7 px-3 bg-white border border-slate-200 rounded-sm flex items-center gap-2 cursor-pointer min-w-[120px]">
                                     <span className="text-[10px] font-medium text-slate-600">Selecione</span>
                                     <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
                                  </div>
                               </div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Quem paga:</span>
                                  <div className="h-7 px-3 bg-white border border-slate-200 rounded-sm flex items-center gap-2 cursor-pointer min-w-[120px]">
                                     <span className="text-[10px] font-medium text-slate-600">Selecione</span>
                                     <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
                                  </div>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagos / Recebidos</span>
                                  <DollarSign className="w-4 h-4 text-slate-400" />
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                               </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                               {/* Table Side */}
                               <div className="border border-slate-200 rounded-sm overflow-hidden">
                                  <Table>
                                     <TableHeader className="bg-slate-50/50">
                                        <TableRow className="hover:bg-transparent border-slate-200">
                                           <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 w-[200px]"></TableHead>
                                           <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center flex items-center justify-center gap-1">
                                              Orçado <Info className="w-3 h-3" />
                                           </TableHead>
                                           <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center flex items-center justify-center gap-1">
                                              Realizado <Info className="w-3 h-3" />
                                           </TableHead>
                                           <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-10 text-center flex items-center justify-center gap-1">
                                              % <Info className="w-3 h-3" />
                                           </TableHead>
                                        </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                        {isFinancialResultLoading ? (
                                           Array.from({ length: 8 }).map((_, i) => (
                                              <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                           ))
                                        ) : (
                                           financialResultReport?.table.map((row: any, idx: number) => (
                                              <TableRow 
                                                 key={idx} 
                                                 className={`
                                                    hover:bg-slate-50/50 border-slate-100
                                                    ${row.isTotal ? 'bg-slate-500 hover:bg-slate-600' : ''}
                                                    ${row.name === "Receitas" || row.name === "Despesas" || row.name === "Resultado" ? 'font-bold' : ''}
                                                 `}
                                              >
                                                 <TableCell className={`py-2 text-[11px] ${row.isSub ? 'pl-8 text-slate-500' : row.isTotal ? 'text-white' : 'text-slate-700'}`}>
                                                    {row.name}
                                                 </TableCell>
                                                 <TableCell className={`text-center text-[11px] py-2 ${row.isTotal ? 'text-white' : 'text-slate-600'}`}>
                                                    {row.orcado === 0 && row.name !== "Receitas" && row.name !== "Despesas" && row.name !== "Resultado" ? (
                                                       <span className="text-[9px] text-slate-300 italic">Não se aplica</span>
                                                    ) : formatCurrency(row.orcado)}
                                                 </TableCell>
                                                 <TableCell className={`text-center text-[11px] py-2 ${row.isTotal ? 'text-white font-black' : 'text-slate-600 font-bold'}`}>
                                                    {row.realized === 0 && row.name === "Crédito" ? "-" : formatCurrency(row.realized)}
                                                 </TableCell>
                                                 <TableCell className={`text-center text-[11px] py-2 ${row.isTotal ? 'text-white font-black' : 'text-slate-600 font-medium'}`}>
                                                    {row.orcado === 0 ? (
                                                       <span className="text-[9px] text-slate-300 italic">Não se aplica</span>
                                                    ) : (
                                                       `${((row.realized / row.orcado) * 100).toFixed(2)}%`
                                                    )}
                                                 </TableCell>
                                              </TableRow>
                                           ))
                                        )}
                                     </TableBody>
                                  </Table>
                               </div>

                               {/* Chart Side */}
                               <div className="h-[400px] w-full flex flex-col items-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <BarChart
                                        data={financialResultReport?.chart}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                     >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                           dataKey="name" 
                                           axisLine={false} 
                                           tickLine={false} 
                                           tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                                        />
                                        <YAxis 
                                           axisLine={false} 
                                           tickLine={false} 
                                           tick={{ fontSize: 10, fill: '#94a3b8' }}
                                           label={{ value: 'Valor em R$', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b', fontWeight: 600 } }}
                                        />
                                        <Tooltip 
                                           cursor={{ fill: '#f8fafc' }}
                                           content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                 return (
                                                    <div className="bg-white border border-slate-200 p-2 shadow-sm rounded-sm">
                                                       <p className="text-[10px] font-bold text-slate-700 uppercase mb-1">{payload[0].payload.name}</p>
                                                       {payload.map((p: any) => (
                                                          <div key={p.name} className="flex items-center gap-2">
                                                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                             <span className="text-[10px] text-slate-500">{p.name}:</span>
                                                             <span className="text-[10px] font-bold text-slate-700">{formatCurrency(p.value)}</span>
                                                          </div>
                                                       ))}
                                                    </div>
                                                 );
                                              }
                                              return null;
                                           }}
                                        />
                                        <Legend 
                                           verticalAlign="bottom" 
                                           align="center"
                                           iconType="rect"
                                           iconSize={12}
                                           formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase">{value}</span>}
                                        />
                                        <Bar dataKey="orcado" name="Orçado" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={24} />
                                        <Bar dataKey="realized" name="Realizado" fill="#2dd4bf" radius={[2, 2, 0, 0]} barSize={24} />
                                        <ReferenceLine y={0} stroke="#cbd5e1" />
                                     </BarChart>
                                  </ResponsiveContainer>
                               </div>
                            </div>
                         </div>
                      ) : item.id === "payments" ? (
                         <div className="flex flex-col gap-8 pt-6 border-t border-slate-100 animate-in fade-in duration-500">
                            {/* Payments Filter Header */}
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden h-9">
                                     <input 
                                        type="text" 
                                        value={paymentsDateStart}
                                        onChange={(e) => setPaymentsDateStart(e.target.value)}
                                        className="w-24 px-3 text-xs text-slate-600 focus:outline-none"
                                     />
                                     <div className="px-2 border-l border-slate-100 bg-slate-50 flex items-center justify-center h-full cursor-pointer">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                     </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase italic">até</span>
                                  <div className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden h-9">
                                     <input 
                                        type="text" 
                                        value={paymentsDateEnd}
                                        onChange={(e) => setPaymentsDateEnd(e.target.value)}
                                        className="w-24 px-3 text-xs text-slate-600 focus:outline-none"
                                     />
                                     <div className="px-2 border-l border-slate-100 bg-slate-50 flex items-center justify-center h-full cursor-pointer">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                     </div>
                                  </div>
                               </div>

                               <div className="flex items-center gap-2">
                                  <button 
                                     onClick={() => setPaymentsStatus("todos")}
                                     className={`
                                        h-8 px-6 rounded-full text-[10px] font-bold uppercase transition-all
                                        ${paymentsStatus === "todos" ? "bg-blue-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-400 hover:border-blue-200"}
                                     `}
                                  >
                                     Todos
                                  </button>
                                  <button 
                                     onClick={() => setPaymentsStatus("pagos")}
                                     className={`
                                        h-8 px-6 rounded-full text-[10px] font-bold uppercase transition-all
                                        ${paymentsStatus === "pagos" ? "bg-blue-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-400 hover:border-blue-200"}
                                     `}
                                  >
                                     Pagos
                                  </button>
                                  <button 
                                     onClick={() => setPaymentsStatus("aberto")}
                                     className={`
                                        h-8 px-6 rounded-full text-[10px] font-bold uppercase transition-all
                                        ${paymentsStatus === "aberto" ? "bg-blue-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-400 hover:border-blue-200"}
                                     `}
                                  >
                                     Em Aberto
                                  </button>
                               </div>
                            </div>

                            {/* Excel CTA */}
                            <div className="flex flex-col items-center justify-center gap-4 py-8 bg-slate-50/30 rounded-sm border border-dashed border-slate-200">
                               <p className="text-[11px] font-medium text-slate-500">
                                  Geramos um relatório de pagamentos para você em Excel.
                               </p>
                               <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase h-9 px-8 gap-2 rounded-sm shadow-sm">
                                  <FileText className="w-4 h-4" /> Baixar em Excel
                               </Button>
                            </div>
                         </div>
                      ) : item.id === "stage_payments" ? (
                         <div className="flex flex-col items-center justify-center gap-4 py-12 pt-6 border-t border-slate-100 animate-in fade-in duration-500 bg-slate-50/30 rounded-sm border border-dashed border-slate-200 mt-4">
                               <p className="text-[11px] font-medium text-slate-500">
                                  Geramos um relatório de Resumo de Pagamentos por Etapa para você em Excel.
                               </p>
                               <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase h-9 px-8 gap-2 rounded-sm shadow-sm">
                                  <FileText className="w-4 h-4" /> Baixar em Excel
                               </Button>
                         </div>
                      ) : (
                        <div className="pt-4 border-t border-slate-100 flex flex-col items-center justify-center py-12 bg-slate-50/30 rounded-b-md">
                           <FileText className="w-8 h-8 text-slate-200 mb-2" />
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Conteúdo do relatório em desenvolvimento
                           </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab !== "overview" && activeTab !== "gestao-custos" && activeTab !== "curve" && activeTab !== "reports" && (
          <div className="flex flex-col items-center justify-center py-24 opacity-20 grayscale grayscale-0.5">
             <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Em desenvolvimento: {TABS.find(t => t.id === activeTab)?.label}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
