"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Save, 
  X,
  Printer,
  FileCheck,
  FileText,
  Clock,
  History
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

interface ContractEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

export function ContractEditorModal({ isOpen, onClose, documentId }: ContractEditorModalProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const utils = trpc.useUtils();
  
  const { data: document, isLoading } = trpc.projectContracts.getProjectContractById.useQuery(
    { id: documentId },
    { enabled: !!documentId && isOpen }
  );

  useEffect(() => {
    if (document) {
      setName(document.name);
      setContent(document.content);
      setStatus(document.status);
    }
  }, [document]);

  const updateMutation = trpc.projectContracts.updateDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento salvo com sucesso!");
      utils.projectContracts.getProjectContracts.invalidate();
      onClose();
    }
  });

  const handleSave = () => {
    if (!name || !content) {
      toast.error("Preencha o título e o conteúdo");
      return;
    }
    updateMutation.mutate({
      id: documentId,
      name,
      content,
      status
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${name}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #334155; }
              @media print { body { padding: 0; } }
              h1, h2, h3 { color: #1e293b; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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

  if (isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl h-[95vh] flex flex-col p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="bg-slate-50/50 p-8 border-b-2 border-slate-100">
           <div className="flex justify-between items-center w-full pr-8">
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                    <FileText className="w-6 h-6" />
                 </div>
                 <div>
                    <DialogTitle className="text-lg font-black uppercase text-slate-800 tracking-tight">Editar Documento</DialogTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest flex items-center gap-2">
                       <Clock className="w-3 h-3" /> Editando versão final para o projeto
                    </p>
                 </div>
              </div>

              <div className="flex gap-2">
                 <Button 
                   variant="outline" 
                   onClick={handlePrint}
                   className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 text-slate-500 hover:bg-white shadow-sm"
                 >
                    <Printer className="w-4 h-4 mr-2" /> Imprimir
                 </Button>
                 <Button 
                   onClick={handleSave}
                   className="h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                   disabled={updateMutation.isPending}
                 >
                    {updateMutation.isPending ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
                 </Button>
              </div>
           </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-white p-10 flex flex-col gap-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Contrato</Label>
                 <Input 
                   className="h-14 font-bold border-2 border-slate-100 rounded-2xl focus:ring-blue-500"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                 />
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-right block">Status do Documento</Label>
                 <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => setStatus("DRAFT")}
                      className={`h-14 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${status === 'DRAFT' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                    >
                       Rascunho
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setStatus("SIGNED")}
                      className={`h-14 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${status === 'SIGNED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                    >
                       <FileCheck className="w-4 h-4 mr-2" /> Assinado
                    </Button>
                 </div>
              </div>
           </div>

           <div className="flex-1 rounded-3xl border-2 border-slate-100 overflow-hidden flex flex-col min-h-0 bg-slate-50/30">
              <style jsx global>{`
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
                  padding: 30px !important;
                }
                .quill-container .ql-toolbar {
                  border: none !important;
                  border-bottom: 2px solid #f1f5f9 !important;
                  background: #f8fafc;
                  padding: 12px 20px !important;
                }
                .quill-container {
                   display: flex;
                   flex-direction: column;
                   height: 100%;
                   flex: 1;
                   min-height: 0;
                }
              `}</style>
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
      </DialogContent>
    </Dialog>
  );
}
