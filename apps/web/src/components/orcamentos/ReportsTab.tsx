"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Printer, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  Layers, 
  Filter,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BudgetByStageTable } from "./BudgetByStageTable";
import { AbcCurveTable } from "./AbcCurveTable";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportsTabProps {
  projectId: string;
  project: any;
}

export function ReportsTab({ projectId, project }: ReportsTabProps) {
  const { data, isLoading } = trpc.budget.getBudgetReports.useQuery({ projectId });
  
  const [activeReport, setActiveReport] = useState<"stage" | "abc" | "all">("all");
  const [viewType, setViewType] = useState<"COST" | "PRICE">("COST");

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    // Cabeçalho simplificado para o CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Seção Etapa
    csvContent += "RELATORIO POR ETAPA\n";
    csvContent += "Etapa,Mao de Obra,Material,Equipamento,Outros,Total\n";
    data.stageReport.forEach((r: any) => {
      csvContent += `${r.name},${r.labor},${r.material},${r.equipment},${r.others},${r.totalCost}\n`;
    });
    
    csvContent += "\n\nCURVA ABC\n";
    csvContent += "Item,Tipo,Grupo,Qtde,Un,Unitario,Total,%,Acumulado,%% Acumulado\n";
    data.abcCurve.forEach((i: any) => {
      csvContent += `${i.description},${i.type},${i.group},${i.quantity},${i.unit},${i.unitPrice},${i.total},${i.percentage},${i.accumulatedAmount},${i.accumulatedPercentage}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_orcamento_${projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Relatório exportado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info (Optional - consistent with ERP feel) */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-[#1A3C5E]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider">Centro de Relatórios</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Análise sintética e analítica do orçamento</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="h-10 px-4 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimir Relatórios
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="h-10 px-4 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#1A3C5E] hover:bg-slate-50"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar Dados
          </Button>
        </div>
      </div>

      {/* Relatório 1: Por Etapa */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1A3C5E] flex items-center justify-center text-white font-black text-xs">01</div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Orçamento por Etapa e Área de Obra</h3>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
              <SelectTrigger className="w-32 h-9 text-[10px] font-bold border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COST" className="text-xs">Custo Direto</SelectItem>
                <SelectItem value="PRICE" className="text-xs">Preço (Com BDI)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400"><ChevronUp className="w-4 h-4" /></Button>
          </div>
        </div>
        
        <BudgetByStageTable 
          data={data?.stageReport || []} 
          totalArea={project?.totalArea || 1}
          viewType={viewType}
        />
      </section>

      {/* Relatório 2: Curva ABC */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1A3C5E] flex items-center justify-center text-white font-black text-xs">02</div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Curva ABC de Insumos</h3>
          </div>
          <div className="flex items-center gap-4 print:hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Filtros Ativos:</span>
               <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded border border-slate-200 text-[#1A3C5E]">TUDO</span>
               </div>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400"><ChevronUp className="w-4 h-4" /></Button>
          </div>
        </div>
        
        <AbcCurveTable data={data?.abcCurve || []} />
      </section>
    </div>
  );
}
