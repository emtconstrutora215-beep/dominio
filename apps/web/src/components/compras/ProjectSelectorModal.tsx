"use client";

import * as React from "react";
import { 
  X, 
  ArrowLeft, 
  Search, 
  ChevronDown,
  Check
} from "lucide-react";
import { trpc } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (data: { projectId: string; stageId?: string; importFromBudget: boolean }) => void;
}

export function ProjectSelectorModal({ isOpen, onClose, onSelect }: ProjectSelectorModalProps) {
  const { data: projects } = trpc.projects.getAll.useQuery();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [selectedStageId, setSelectedStageId] = React.useState<string>("");
  const [importFromBudget, setImportFromBudget] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  
  // Filter stages based on search
  const filteredStages = selectedProject?.stages.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleOk = () => {
    if (!selectedProjectId) return;
    onSelect({
      projectId: selectedProjectId,
      stageId: selectedStageId || undefined,
      importFromBudget
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[550px] p-0 border-none shadow-2xl bg-white flex flex-col rounded-lg overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Selecionar Obra e Apropriação</DialogTitle>
          <DialogDescription>Selecione a obra e a etapa para iniciar a cotação.</DialogDescription>
        </DialogHeader>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#5CB85C] p-1 rounded-sm">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#5CB85C] rounded-full" />
                </div>
            </div>
            <span className="font-black text-[#1E3A5F] text-lg italic tracking-tighter">mais controle</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-10 bg-[#F3A04C] hover:bg-[#e6923d] text-white rounded-sm"
            onClick={onClose}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
          {/* Obra Selection */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-500 uppercase tracking-tight">Obra:</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="h-11 bg-white border-slate-200 rounded-sm text-sm font-medium focus:ring-0">
                <SelectValue placeholder="Selecione uma obra..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apropriação Section */}
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            <label className="text-sm font-black text-slate-400 uppercase tracking-tight">Apropriação (Opcional)</label>
            
            <div className="flex-1 bg-slate-50 rounded-sm p-4 border border-slate-100 flex flex-col overflow-hidden">
              <div className="mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Busca rápida</label>
                <div className="relative">
                  <Input 
                    placeholder="Digite aqui sua busca" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 bg-white border-slate-200 rounded-sm text-xs font-medium"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 -mx-4 px-4">
                <RadioGroup value={selectedStageId} onValueChange={setSelectedStageId}>
                  <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-sm">
                    {filteredStages.map((stage, idx) => (
                      <div key={stage.id} className="flex flex-col">
                        <label 
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                            "bg-slate-100/50"
                          )}
                        >
                          <RadioGroupItem value={stage.id} id={stage.id} className="border-slate-300" />
                          <span className="text-[11px] font-black text-[#2079D2] uppercase tracking-tight">
                            Etapa {idx + 1} - {stage.name}
                          </span>
                        </label>
                        {/* Mocking sub-items if they existed, but based on schema, stages are the main apropriação level */}
                      </div>
                    ))}
                    {filteredStages.length === 0 && selectedProjectId && (
                        <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest italic">
                            Nenhuma etapa encontrada
                        </div>
                    )}
                    {!selectedProjectId && (
                        <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest italic">
                            Selecione uma obra primeiro
                        </div>
                    )}
                  </div>
                </RadioGroup>
              </ScrollArea>
            </div>
          </div>

          {/* Import Checkbox */}
          <div className="flex items-center gap-3">
            <Checkbox 
                id="importBudget" 
                checked={importFromBudget} 
                onCheckedChange={(checked) => setImportFromBudget(!!checked)}
                className="border-slate-300 rounded-sm w-4 h-4"
            />
            <label htmlFor="importBudget" className="text-xs font-bold text-slate-500 cursor-pointer">
                Marque para importar insumos/composições do orçamento (opcional)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-50 flex justify-center bg-slate-50/30">
          <Button 
            className="bg-[#5BC0DE] hover:bg-[#46b8da] text-white font-black uppercase tracking-widest text-xs h-10 px-12 rounded-sm shadow-sm"
            onClick={handleOk}
            disabled={!selectedProjectId}
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
