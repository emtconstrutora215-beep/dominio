"use client";

import { cn } from "@/lib/utils";
import { 
  Calculator, 
  FileText, 
  FileSignature, 
  LayoutList, 
  FolderOpen, 
  BarChart3 
} from "lucide-react";

interface BudgetNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "orcamento", label: "Orçamento", icon: Calculator },
  { id: "proposta", label: "Proposta", icon: FileText },
  { id: "contrato", label: "Contrato", icon: FileSignature },
  { id: "cronograma", label: "Cronograma", icon: LayoutList },
  { id: "arquivos", label: "Arquivos", icon: FolderOpen },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
];

export function BudgetNavigation({ activeTab, onTabChange }: BudgetNavigationProps) {
  return (
    <nav className="bg-white border-b border-slate-200 px-8 w-full overflow-x-auto no-scrollbar">
      <div className="max-w-[1700px] mx-auto flex gap-10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 py-5 border-b-2 transition-all group relative shrink-0",
                isActive 
                  ? "border-[#1A3C5E] text-[#1A3C5E]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-[#1A3C5E]" : "text-slate-300 group-hover:text-slate-400"
              )} />
              <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{tab.label}</span>
              
              {isActive && (
                <div className="absolute inset-x-0 -bottom-[1px] h-[3px] bg-[#1A3C5E] animate-in slide-in-from-bottom-1 duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
