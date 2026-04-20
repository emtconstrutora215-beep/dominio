"use client";

import { useState } from "react";
import { 
  FileText, 
  Plus, 
  Settings, 
  FileSignature, 
  Trash2, 
  FileEdit,
  Printer,
  ChevronRight,
  Clock,
  ExternalLink,
  History
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import { ContractTemplateModal } from "./ContractTemplateModal";
import { ContractEditorModal } from "./ContractEditorModal";
import { GenerateDocumentModal } from "./GenerateDocumentModal";

interface ContractTabProps {
  projectId: string;
}

export function ContractTab({ projectId }: ContractTabProps) {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const utils = trpc.useUtils();
  
  const { data: contracts, isLoading } = trpc.projectContracts.getProjectContracts.useQuery({ projectId });
  
  const deleteMutation = trpc.projectContracts.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento excluído com sucesso");
      utils.projectContracts.getProjectContracts.invalidate({ projectId });
    }
  });

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este contrato?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEdit = (id: string) => {
    setSelectedDocId(id);
    setIsEditorOpen(true);
  };

  const handlePrint = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Impressão de Contrato</title>
            <style>
              body { font-family: sans-serif; padding: 40px; line-height: 1.6; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="p-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gestão de Contratos</h2>
          <p className="text-xs font-bold text-slate-400 uppercase mt-0.5 tracking-widest">Documentos e minutas do projeto</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 text-slate-500 hover:bg-slate-100 shadow-sm transition-all active:scale-95"
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" /> Gerenciar Modelos
          </Button>
          <Button 
            className="h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#1A3C5E] text-white hover:bg-blue-900 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Contrato
          </Button>
        </div>
      </div>

      {!contracts || contracts.length === 0 ? (
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-32 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200 animate-pulse">
               <FileSignature className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Crie seu primeiro documento para o Contrato</h3>
            <p className="text-slate-400 text-[11px] mt-4 font-black uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Utilize nossos modelos pré-definidos para gerar minutas profissionais em segundos.
            </p>
            <Button 
              className="mt-10 h-14 px-12 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 transition-all active:scale-95"
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" /> Gerar Agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts.map((doc) => (
            <Card key={doc.id} className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl bg-white overflow-hidden border-2 border-transparent hover:border-blue-100">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(doc.id)}>
                      <FileEdit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => handlePrint(doc.content)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <h4 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tight">{doc.name}</h4>
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                    doc.status === 'SIGNED' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {doc.status === 'SIGNED' ? 'Assinado' : 'Rascunho'}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                      {format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <Button variant="ghost" className="h-8 px-0 text-blue-600 font-black text-[9px] uppercase tracking-widest hover:bg-transparent" onClick={() => handleEdit(doc.id)}>
                    Abrir <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <button 
            className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xl transition-all duration-300 group"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:scale-110 shadow-sm transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 tracking-widest">Novo Documento</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <ContractTemplateModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <GenerateDocumentModal 
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        projectId={projectId}
      />

      {isEditorOpen && selectedDocId && (
        <ContractEditorModal 
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          documentId={selectedDocId}
        />
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
