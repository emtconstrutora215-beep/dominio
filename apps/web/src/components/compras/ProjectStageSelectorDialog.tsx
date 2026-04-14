"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  FileText, 
  ChevronRight, 
  Search,
  ArrowLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ProjectStageSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectId: string, stageId: string) => void;
  projects: any[];
}

export function ProjectStageSelectorDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projects 
}: ProjectStageSelectorDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    setSearch("");
  };

  const handleStageSelect = (stageId: string) => {
    onConfirm(selectedProject.id, stageId);
    setSelectedProject(null);
    setSearch("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-8 bg-[#1A3C5E] text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="text-orange-400 w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                {selectedProject ? "Selecione a Etapa" : "Selecione a Obra"}
              </DialogTitle>
              <DialogDescription className="text-blue-100/60 text-xs font-bold uppercase tracking-wider mt-1">
                {selectedProject ? selectedProject.name : "Defina o centro de custo para os itens"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 h-[450px] flex flex-col bg-white">
          {!selectedProject ? (
            <>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Pesquisar obra..." 
                  className="pl-11 h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-[#F07B2B] group-hover:bg-[#F07B2B] group-hover:text-white transition-colors">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{project.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{project.stages.length} Etapas cadastradas</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedProject(null)}
                className="w-fit mb-4 gap-2 text-slate-400 font-bold hover:text-slate-600 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para obras
              </Button>
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <div className="grid grid-cols-1 gap-2">
                  {selectedProject.stages.map((stage: any) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageSelect(stage.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{stage.name}</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t">
          <Button variant="outline" onClick={onClose} className="border-slate-200 font-bold text-slate-500 uppercase text-[10px] tracking-widest px-8">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
