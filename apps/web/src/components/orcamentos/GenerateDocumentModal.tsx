"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileSignature, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function GenerateDocumentModal({ isOpen, onClose, projectId }: GenerateDocumentModalProps) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: templates } = trpc.contractTemplates.getTemplates.useQuery(undefined, { enabled: isOpen });

  const generateMutation = trpc.projectContracts.generateFromTemplate.useMutation({
    onSuccess: () => {
      toast.success("Contrato gerado com sucesso!");
      utils.projectContracts.getProjectContracts.invalidate({ projectId });
      onClose();
      setName("");
      setTemplateId(null);
    }
  });

  const handleGenerate = () => {
    if (!name || !templateId) {
      toast.error("Preencha o título e selecione um modelo");
      return;
    }

    generateMutation.mutate({
      projectId,
      templateId,
      name
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl border-none p-0 rounded-[2.5rem] shadow-2xl overflow-hidden bg-slate-50">
        <DialogHeader className="bg-white p-10 pb-8 border-b-2 border-slate-50">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                 <FileSignature className="w-7 h-7" />
              </div>
              <div>
                 <DialogTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">Gerar Novo Contrato</DialogTitle>
                 <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">Crie um documento a partir de um modelo</p>
              </div>
           </div>
        </DialogHeader>

        <div className="p-10 space-y-10">
           {/* Nome do Documento */}
           <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Documento</Label>
              <Input 
                placeholder="Ex: Contrato de Mão de Obra - Fase 01" 
                className="h-14 rounded-2xl border-none shadow-sm font-bold focus:ring-blue-500 bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
           </div>

           {/* Seleção de Modelo */}
           <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Modelo Base</Label>
              <div className="grid grid-cols-1 gap-3">
                 {!templates || templates.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum modelo disponível. Crie um em "Gerenciar Modelos".</p>
                    </div>
                 ) : (
                    templates.map((template) => (
                       <div 
                         key={template.id}
                         onClick={() => setTemplateId(template.id)}
                         className={`
                           p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group
                           ${templateId === template.id 
                             ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                             : "bg-white border-transparent hover:border-blue-100 hover:shadow-md text-slate-600"
                           }
                         `}
                       >
                          <div className="flex items-center gap-4">
                             <div className={`
                               w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                               ${templateId === template.id ? "bg-white/20" : "bg-blue-50 text-blue-600"}
                             `}>
                                <FileText className="w-5 h-5" />
                             </div>
                             <div>
                                <h5 className="font-black text-[11px] uppercase tracking-tight">{template.name}</h5>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${templateId === template.id ? "text-blue-100" : "text-slate-400"}`}>
                                   Original da Empresa
                                </p>
                             </div>
                          </div>
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center transition-all
                            ${templateId === template.id ? "bg-white text-blue-600 scale-110" : "bg-slate-50 text-slate-300 group-hover:text-blue-500"}
                          `}>
                             <ChevronRight className="w-4 h-4" />
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>

           <div className="pt-4">
              <Button 
                onClick={handleGenerate}
                disabled={!name || !templateId || generateMutation.isPending}
                className="w-full h-16 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                {generateMutation.isPending ? "Processando..." : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3 animate-pulse" /> Gerar Documento Inteligente <ArrowRight className="w-4 h-4 ml-3" />
                  </>
                )}
              </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
