"use client";

import { 
  ChevronLeft, 
  User, 
  MapPin, 
  ChevronRight, 
  Calculator, 
  FileCheck,
  Building2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetHeaderProps {
  project: any;
  budget: any;
  totals: { total: number };
}

export function BudgetHeader({ project, budget, totals }: BudgetHeaderProps) {
  const router = useRouter();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-8 py-5 shadow-sm">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            <span 
              className="cursor-pointer hover:text-primary transition-colors" 
              onClick={() => router.push("/dashboard/obras/orcamentos")}
            >
              Obras
            </span>
            <ChevronRight className="w-3 h-3" />
            <span>Orçamentos</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 font-bold">#{project?.code || "ORC-PEND"}</span>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-lg border-slate-200 hover:bg-slate-50 transition-all shadow-sm" 
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-[#1A3C5E] leading-none">
                  {project?.name || "Projeto Sem Nome"}
                </h1>
                <div className="flex gap-2">
                  <Badge className="bg-slate-100 text-[#1A3C5E] border-slate-200 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    <Building2 className="w-3 h-3 mr-1" /> {project?.status || "PLANEJAMENTO"}
                  </Badge>
                  <Badge className="bg-orange-50 text-orange-700 border-orange-100 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    <FileCheck className="w-3 h-3 mr-1" /> PROPOSTA
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Cliente: <span className="text-slate-900 font-bold">{project?.client?.name || "Não Definido"}</span>
                </div>
                {project?.city && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border-l border-slate-200 pl-4">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {project.city}/{project.state}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border-l border-slate-200 pl-4">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Atualizado em: <span className="text-slate-900">Hoje</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end px-6 border-r border-slate-100">
             <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Cálculo de BDI</span>
             <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 border-slate-200 text-slate-600 rounded-md">
               {budget?.bdi || 0}% Global
             </Badge>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Total Proposta</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1A3C5E] tracking-tight leading-none">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
          
          <Button className="bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white font-bold uppercase text-[11px] tracking-widest px-8 h-12 shadow-lg shadow-slate-200 transition-all active:scale-95 rounded-lg">
             Finalizar e Enviar
          </Button>
        </div>
      </div>
    </header>
  );
}
