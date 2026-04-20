"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Save, 
  X,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-slate-50 animate-pulse rounded-xl" />
});
import 'react-quill-new/dist/quill.snow.css';

interface ContractTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContractTemplateModal({ isOpen, onClose }: ContractTemplateModalProps) {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.contractTemplates.getTemplates.useQuery(undefined, { enabled: isOpen });

  const createMutation = trpc.contractTemplates.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Modelo criado com sucesso");
      resetForm();
      utils.contractTemplates.getTemplates.invalidate();
    }
  });

  const updateMutation = trpc.contractTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Modelo atualizado com sucesso");
      resetForm();
      utils.contractTemplates.getTemplates.invalidate();
    }
  });

  const deleteMutation = trpc.contractTemplates.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Modelo excluído com sucesso");
      utils.contractTemplates.getTemplates.invalidate();
    }
  });

  const resetForm = () => {
    setEditingTemplateId(null);
    setIsCreating(false);
    setName("");
    setContent("");
  };

  const handleEdit = (template: any) => {
    setEditingTemplateId(template.id);
    setName(template.name);
    setContent(template.content);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!name || !content) {
      toast.error("Preencha o nome e o conteúdo do modelo");
      return;
    }

    if (editingTemplateId) {
      updateMutation.mutate({ id: editingTemplateId, name, content });
    } else {
      createMutation.mutate({ name, content });
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean'],
      ['link']
    ],
  };

  const showList = !isCreating && !editingTemplateId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="bg-slate-50/50 p-8 border-b">
           <div className="flex justify-between items-center w-full pr-8">
              <div className="flex items-center gap-4">
                 {(isCreating || editingTemplateId) && (
                    <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-xl hover:bg-white text-slate-400">
                       <ChevronLeft className="w-5 h-5" />
                    </Button>
                 )}
                 <div>
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-800">
                       {showList ? "Modelos de Contrato" : isCreating ? "Novo Modelo" : "Editar Modelo"}
                    </DialogTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">
                       {showList ? "Gerencie as minutas padrão da empresa" : "Defina o conteúdo e variáveis do contrato"}
                    </p>
                 </div>
              </div>
              {showList && (
                <Button 
                   onClick={() => setIsCreating(true)}
                   className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
                >
                   <Plus className="w-4 h-4 mr-2" /> Criar Modelo
                </Button>
              )}
           </div>
        </DialogHeader>

        <div className="flex-1 bg-white p-8 flex flex-col overflow-hidden">
          {showList ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-3xl" />
                  ))
                ) : !templates || templates.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhum modelo cadastrado</p>
                  </div>
                ) : (
                  templates.map((template) => (
                    <div 
                       key={template.id} 
                       className="group p-6 rounded-3xl border-2 border-slate-50 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer bg-white relative"
                       onClick={() => handleEdit(template)}
                    >
                       <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                          <FileText className="w-5 h-5" />
                       </div>
                       <h4 className="font-black text-slate-800 text-xs uppercase mb-1">{template.name}</h4>
                       <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-full">
                          Última alteração: {new Date(template.updatedAt).toLocaleDateString()}
                       </p>

                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-4 right-4 h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: template.id }); }}
                       >
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  ))
                )}
             </div>
          ) : (
             <div className="space-y-6 w-full flex-1 flex flex-col overflow-hidden">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Modelo</Label>
                  <Input 
                    placeholder="Ex: Contrato de Empreitada Global" 
                    className="h-12 rounded-xl border-2 border-slate-100 font-bold focus:ring-[#1A3C5E]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                   <div className="flex justify-between items-center shrink-0">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo do Contrato</Label>
                      <div className="flex gap-2">
                         <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-widest cursor-help" title="Injeta o nome do cliente">[[cliente_nome]]</span>
                         <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest cursor-help" title="Injeta o valor total">[[projeto_valor]]</span>
                      </div>
                   </div>
                   <div className="rounded-2xl border-2 border-slate-100 overflow-hidden flex-1 flex flex-col min-h-0 bg-slate-50/30">
                       <style dangerouslySetInnerHTML={{ __html: `
                        .quill-container .ql-container {
                          height: 100% !important;
                          flex: 1;
                          display: flex;
                          flex-direction: column;
                          overflow: hidden;
                        }
                        .quill-container .ql-editor {
                          flex: 1;
                          overflow-y: auto;
                          background: white;
                          padding: 20px !important;
                        }
                        .quill-container .ql-toolbar {
                          border: none !important;
                          border-bottom: 2px solid #f1f5f9 !important;
                          background: #f8fafc;
                          padding: 8px 12px !important;
                        }
                        .quill-container {
                           display: flex;
                           flex-direction: column;
                           height: 100%;
                           flex: 1;
                           min-height: 0;
                        }
                      ` }} />
                      <div className="quill-container flex-1 flex flex-col min-h-0">
                         <ReactQuill 
                           value={content}
                           onChange={setContent}
                           modules={quillModules}
                           className="flex-1 flex flex-col"
                           theme="snow"
                         />
                      </div>
                   </div>
                </div>

                <div className="flex justify-end pt-8">
                   <Button 
                     onClick={handleSave}
                     className="h-12 px-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100 transition-all active:scale-95"
                     disabled={createMutation.isPending || updateMutation.isPending}
                   >
                     {createMutation.isPending || updateMutation.isPending ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Modelo</>}
                   </Button>
                </div>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
