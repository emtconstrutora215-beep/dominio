"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Novos Componentes
import { BudgetHeader } from "@/components/orcamentos/BudgetHeader";
import { BudgetNavigation } from "@/components/orcamentos/BudgetNavigation";
import { BudgetSpreadsheet } from "@/components/orcamentos/BudgetSpreadsheet";

// Abas Auxiliares (Poderiam ser componentes separados no futuro)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

export default function BudgetDetailsPage() {
  const { id } = useParams() as { id: string };
  const [activeTab, setActiveTab] = useState("orcamento");
  const utils = trpc.useContext();

  // -- Queries --
  const { data: project, isLoading: loadingProject } = trpc.projects.getById.useQuery({ id });
  const { data: budgetData, isLoading: loadingBudget } = trpc.budget.getProjectBudget.useQuery({ projectId: id });

  // -- Mutations com Optimistic Updates --
  const addStage = trpc.budget.addStage.useMutation({
    onSuccess: () => {
      toast.success("Etapa adicionada!");
      utils.budget.getProjectBudget.invalidate({ projectId: id });
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar etapa: ${err.message}`);
    }
  });

  const updateStage = trpc.budget.updateStage.useMutation({
    onSuccess: () => {
      utils.budget.getProjectBudget.invalidate({ projectId: id });
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar etapa: ${err.message}`);
    }
  });

  const addItem = trpc.budget.addBudgetItem.useMutation({
    onSuccess: () => {
      utils.budget.getProjectBudget.invalidate({ projectId: id });
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar item: ${err.message}`);
    }
  });

  const updateItem = trpc.budget.updateBudgetItem.useMutation({
    onSettled: () => {
      utils.budget.getProjectBudget.invalidate({ projectId: id });
    }
  });

  const deleteItem = trpc.budget.deleteBudgetItem.useMutation({
    onSuccess: () => {
      toast.success("Item removido");
      utils.budget.getProjectBudget.invalidate({ projectId: id });
    }
  });

  // -- Cálculos de Topo --
  const totals = useMemo(() => {
    if (!budgetData?.stages) return { total: 0, subtotal: 0 };
    
    let subtotal = 0;
    let total = 0;
    
    // Função recursiva para somar apenas os itens folha ou as raízes? 
    // Na nossa lógica de Rollup do servidor, os nós pai já têm o total somado.
    // Então somamos apenas os itens de nível 0 (raiz) de cada stage.
    budgetData.stages.forEach((stage: any) => {
      stage.budgetItems.forEach((item: any) => {
        subtotal += item.total;
        total += item.total * (1 + (item.bdi || 0) / 100);
      });
    });
    
    return { subtotal, total };
  }, [budgetData]);

  if (loadingProject || loadingBudget) {
    return (
      <div className="p-12 space-y-8 animate-pulse bg-white min-h-screen">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-1/2 rounded-xl" />
        <Skeleton className="h-[60vh] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <BudgetHeader 
        project={project} 
        budget={budgetData?.budget} 
        totals={totals} 
      />
      
      <BudgetNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <main className="flex-1 max-w-[1700px] mx-auto w-full p-8">
        {activeTab === "orcamento" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <BudgetSpreadsheet 
              data={budgetData}
              onUpdate={(itemId, data) => updateItem.mutate({ id: itemId, ...data })}
              onDelete={(itemId) => deleteItem.mutate({ id: itemId })}
              onAddBudgetItem={async (payload) => {
                const item = await addItem.mutateAsync(payload);
                return item;
              }}
              onAddStage={(name, bdi) => {
                addStage.mutate({ projectId: id, name, bdi });
              }}
              onUpdateStage={(stageId, data) => {
                updateStage.mutate({ id: stageId, ...data });
              }}
            />
          </div>
        )}

        {activeTab === "geral" && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24 animate-in fade-in zoom-in-95 duration-500">
              <div className="lg:col-span-2 space-y-8">
                 <Card className="rounded-3xl shadow-xl shadow-slate-200/50 border-none overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
                       <div>
                          <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-widest">Identificação Técnica</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Parâmetros de engenharia da obra</CardDescription>
                       </div>
                       <Button variant="ghost" size="sm" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">
                          <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                       </Button>
                    </CardHeader>
                    <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Área Estimada do Projeto</Label>
                          <div className="flex gap-2">
                             <Input defaultValue={project?.totalArea || 0} type="number" className="font-black h-12 border-2 border-slate-100 rounded-xl focus-visible:ring-emerald-500" />
                             <Select defaultValue={project?.areaUnit || "m2"}>
                                <SelectTrigger className="w-28 h-12 font-black border-2 border-slate-100 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-2">
                                   <SelectItem value="m2" className="font-bold">m²</SelectItem>
                                   <SelectItem value="hectare" className="font-bold">Hect.</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                       </div>
                       <div className="space-y-3"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Obra / Categoria</Label><Input defaultValue={project?.type || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                       <div className="space-y-3"><Label className="text-[10px) font-black text-slate-400 uppercase tracking-widest pl-1">Número A.R.T / Registro</Label><Input defaultValue={project?.art || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                       <div className="space-y-3"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Inscrição CEI / CNO</Label><Input defaultValue={project?.ceiCno || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                    </CardContent>
                 </Card>

                 <Card className="rounded-3xl shadow-xl shadow-slate-200/50 border-none overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
                       <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-widest">Localização Geográfica</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 grid grid-cols-1 md:grid-cols-6 gap-8">
                       <div className="md:col-span-2 space-y-3"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">CEP</Label><Input defaultValue={project?.cep || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                       <div className="md:col-span-4 space-y-3"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Rua / Logradouro</Label><Input defaultValue={project?.street || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                       <div className="md:col-span-2 space-y-3"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Número</Label><Input defaultValue={project?.number || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                       <div className="md:col-span-4 space-y-3"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ponto de Referência / Compl.</Label><Input defaultValue={project?.complement || ""} className="font-black h-12 border-2 border-slate-100 rounded-xl" /></div>
                    </CardContent>
                 </Card>
              </div>

              <div className="space-y-8">
                 <Card className="rounded-3xl shadow-2xl shadow-blue-100 border-none overflow-hidden bg-slate-900 text-white">
                    <CardHeader className="p-10"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-50">Condições Comerciais</CardTitle></CardHeader>
                    <CardContent className="p-10 pt-0 space-y-8">
                       <div className="space-y-3">
                          <Label className="text-[9px] font-black opacity-40 uppercase tracking-widest pl-1">Responsabilidade de Pagamento</Label>
                          <Select defaultValue={project?.paymentResponsibility || "COMPANY"}>
                             <SelectTrigger className="bg-white/5 border-white/5 h-12 text-white font-black rounded-xl focus:ring-emerald-500 hover:bg-white/10 transition-colors"><SelectValue /></SelectTrigger>
                             <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="COMPANY" className="font-bold">Construtora (Turnkey)</SelectItem>
                                <SelectItem value="CLIENT" className="font-bold">Cliente (Adm. Direta)</SelectItem>
                                <SelectItem value="CLIENT_REIMBURSEMENT" className="font-bold">Reembolso de Despesas</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="rounded-lg shadow-lg border-none bg-[#1A3C5E] text-white p-1">
                    <div className="bg-white/5 rounded-md p-8 space-y-8">
                       <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Viabilidade Estimada</span>
                       <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold opacity-60 mb-2">Preço Estimado p/ Unidade</span>
                          <span className="text-4xl font-bold tracking-tight">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total / (project?.totalArea || 1))}
                          </span>
                       </div>
                       <div className="pt-8 border-t border-white/10">
                         <p className="text-[11px] font-semibold opacity-70 italic leading-relaxed tracking-tight">Cálculo baseado na área total informada ({project?.totalArea} {project?.areaUnit}).</p>
                       </div>
                    </div>
                 </Card>
              </div>
           </div>
        )}

        {/* placeholder para outras abas */}
        {["proposta", "contrato", "cronograma", "arquivos", "relatorios"].includes(activeTab) && (
          <Card className="border-2 border-dashed border-slate-200 rounded-xl p-32 text-center bg-white">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
                <Save className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">Módulo em Desenvolvimento</h3>
             <p className="text-slate-400 text-sm mt-4 font-semibold uppercase tracking-wider">Funcionalidade em fase de integração.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
