"use client";

import * as React from "react";
import { Search, ChevronRight, Hash, Package, HardHat } from "lucide-react";
import { trpc } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ApropriacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSelect: (item: { description: string; unit: string; stageId?: string; budgetItemId?: string }) => void;
}

export function ApropriacaoModal({ isOpen, onClose, projectId, onSelect }: ApropriacaoModalProps) {
  const [search, setSearch] = React.useState("");
  
  const { data: project, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: isOpen && !!projectId && projectId !== "EMPRESA" }
  );

  const stages = project?.stages || [];

  const filteredStages = stages.map(stage => ({
    ...stage,
    budgetItems: stage.budgetItems.filter(item => 
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      stage.name.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(stage => stage.budgetItems.length > 0 || stage.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-6 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-[#4A72B2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-[#1A3C5E]">Apropropriação</DialogTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {project?.name || "Carregando obra..."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
          <div className="relative">
            <Input
              placeholder="Digite aqui sua busca (Etapa ou Item)"
              className="h-11 bg-white border-slate-200 rounded-lg pl-10 focus-visible:ring-0 focus-visible:border-slate-300 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        <ScrollArea className="h-[450px] bg-white">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : filteredStages.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Package className="w-12 h-12 text-slate-100 mx-auto" />
                <p className="text-sm font-bold text-slate-400">Nenhuma etapa ou item encontrado.</p>
              </div>
            ) : (
              filteredStages.map((stage) => (
                <div key={stage.id} className="space-y-0.5">
                  <div className="px-4 py-2 bg-slate-100/80 flex items-center gap-3 group">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-slate-300" />
                    </div>
                    <span className="text-[11px] font-black text-[#4A72B2] uppercase tracking-wider truncate">
                      {stage.name}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {stage.budgetItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelect({
                            description: item.description,
                            unit: item.unit,
                            stageId: stage.id,
                            budgetItemId: item.id
                          });
                          onClose();
                        }}
                        className="w-full flex items-center gap-4 px-6 py-3 hover:bg-blue-50/50 transition-colors text-left group border-b border-slate-50 last:border-0"
                      >
                        <div className="flex-shrink-0 w-5 h-5 rounded-full border border-slate-200 group-hover:border-[#4A72B2] flex items-center justify-center transition-colors">
                           <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-[#4A72B2] transition-colors" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-slate-600 truncate group-hover:text-slate-900 transition-colors">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              Unidade: {item.unit}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300">•</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              Previsto: {item.quantity}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-[#4A72B2] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
           <Button variant="ghost" className="text-[#4A72B2] text-xs font-black uppercase tracking-widest h-10 px-10 shadow-none border border-[#4A72B2]/20 rounded-lg" onClick={onClose}>
             Cancelar
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
