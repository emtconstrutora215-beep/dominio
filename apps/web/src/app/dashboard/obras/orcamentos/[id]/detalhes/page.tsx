"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { 
  Calculator, 
  ChevronLeft, 
  Plus, 
  PlusCircle, 
  Save, 
  Settings, 
  Trash2, 
  Layers, 
  Box, 
  FileText,
  DollarSign,
  Info,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Package,
  Wrench,
  User,
  MapPin,
  Building
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export default function BudgetDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // -- Queries --
  const { data: projectRaw, isLoading: loadingProject } = trpc.projects.getById.useQuery({ id });
  const { data: budgetDataRaw, isLoading: loadingBudget, refetch } = trpc.budget.getProjectBudget.useQuery({ projectId: id });

  // Type assertion para contornar lag de types do Prisma
  const project = projectRaw as any;
  const budgetData = budgetDataRaw as any;

  // -- Mutations --
  const addStageMutation = trpc.budget.addStage.useMutation({
    onSuccess: () => {
      toast.success("Etapa adicionada");
      refetch();
    }
  });

  const addItemMutation = trpc.budget.addBudgetItem.useMutation({
    onSuccess: () => {
      toast.success("Item adicionado");
      refetch();
    }
  });

  const updateItemMutation = trpc.budget.updateBudgetItem.useMutation({
    onSuccess: () => refetch()
  });

  const deleteItemMutation = trpc.budget.deleteBudgetItem.useMutation({
    onSuccess: () => {
      toast.success("Item removido");
      refetch();
    }
  });

  const updateBDIMutation = trpc.budget.updateBDI.useMutation({
    onSuccess: () => refetch()
  });

  // -- State --
  const [newStageName, setNewStageName] = useState("");
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);

  // -- Cálculos --
  const totals = useMemo(() => {
    if (!budgetData?.stages) return { subtotal: 0, total: 0 };
    
    let subtotal = 0;
    let total = 0;
    
    budgetData.stages.forEach((stage: any) => {
      stage.budgetItems.forEach((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTotal = itemSubtotal * (1 + (item.bdi || 0) / 100);
        subtotal += itemSubtotal;
        total += itemTotal;
      });
    });
    
    return { subtotal, total };
  }, [budgetData]);

  if (loadingProject || loadingBudget) {
    return (
      <div className="p-12 space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
           <Skeleton className="h-10 w-64" />
           <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-x-hidden">
      {/* 1. HEADER (SUPERIOR) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 shadow-sm">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <span className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => router.push("/dashboard/obras/orcamentos")}>Obras / Orçamentos</span>
              <ChevronRight className="w-3 h-3" />
              <span>{project?.code || "S/COD"}</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-slate-200" onClick={() => router.back()}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">{project?.name}</h1>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                {project?.status === "BUDGETING" ? "Em Orçamento" : project?.status}
              </Badge>
            </div>
            <div className="text-[11px] font-medium text-slate-400 pl-12 flex items-center gap-3">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Cliente: <span className="text-slate-600 font-bold">{project?.client?.name || "Particular / S/C"}</span></span>
              {project?.city && <span className="flex items-center gap-1 h-3 border-l border-slate-200 pl-3"><MapPin className="w-3 h-3" /> {project.city}/{project.state}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end border-r pr-4 border-slate-200">
               <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">Base de Preços</span>
               <div className="flex items-center gap-2">
                 <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-500">SINAPI (Standby)</Badge>
                 <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-400" /></TooltipTrigger>
                      <TooltipContent><p className="text-[11px]">Utilizando base manual para este projeto.</p></TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
               </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-4 px-4 border-r border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Final Sugerido</span>
                <span className="text-xl font-black text-emerald-600 tracking-tighter">
                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}
                </span>
              </div>
            </div>

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-widest px-6 h-11 shadow-lg shadow-emerald-100 transition-all active:scale-95">
              <Save className="w-4 h-4 mr-2" /> Gerar Proposta
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 border-2 border-slate-200">
              <Settings className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. TABS E CONTEÚDO */}
      <main className="flex-1 max-w-[1700px] mx-auto w-full p-6">
        <Tabs defaultValue="orcamento" className="w-full">
          <TabsList className="bg-transparent border-b rounded-none h-auto p-0 mb-8 w-full justify-start gap-10">
            <TabsTrigger value="orcamento" className="data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none py-3 px-1 font-bold text-[11px] uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 transition-all">
               Plilha de Orçamento
            </TabsTrigger>
            <TabsTrigger value="proposta" className="hidden lg:flex data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none py-3 px-1 font-bold text-[11px] uppercase tracking-widest text-slate-400 transition-all">
               Minha Proposta
            </TabsTrigger>
            <TabsTrigger value="geral" className="data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none py-3 px-1 font-bold text-[11px] uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 transition-all">
               Dados da Obra
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orcamento" className="space-y-6 mt-0 animate-in fade-in duration-700">
             {/* TOOLBAR DA PLANILHA */}
             <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex gap-1">
                   <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                      <DialogTrigger asChild>
                         <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-emerald-600 group">
                            <Layers className="w-4 h-4 mr-2 text-emerald-500 group-hover:scale-110 transition-transform" /> + Inserir Etapa
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                         <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">Nova Etapa</DialogTitle>
                            <DialogDescription className="text-xs uppercase font-bold tracking-widest text-slate-400">Agrupamento técnico de serviços</DialogDescription>
                         </DialogHeader>
                         <div className="py-6 space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Descrição da Etapa</Label>
                            <Input 
                              value={newStageName} 
                              onChange={e => setNewStageName(e.target.value)} 
                              placeholder="Ex: 01. SERVIÇOS PRELIMINARES" 
                              className="font-bold border-2 focus-visible:ring-emerald-500"
                            />
                         </div>
                         <DialogFooter>
                            <Button variant="ghost" className="font-bold uppercase text-[10px]" onClick={() => setIsStageDialogOpen(false)}>Cancelar</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-[10px]" onClick={() => {
                               if(!newStageName) return;
                               addStageMutation.mutate({ projectId: id, name: newStageName.toUpperCase() });
                               setNewStageName("");
                               setIsStageDialogOpen(false);
                            }}>Criar Etapa</Button>
                         </DialogFooter>
                      </DialogContent>
                   </Dialog>
                   <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <Calculator className="w-4 h-4 mr-2" /> Composição (SINAPI)
                   </Button>
                </div>
                <div className="flex items-center gap-6 pr-4">
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">BDI Global Configurado:</span>
                      <div className="relative">
                        <Input 
                          type="number" 
                          key={budgetData?.budget?.bdi}
                          defaultValue={budgetData?.budget?.bdi || 0} 
                          onBlur={(e) => updateBDIMutation.mutate({ projectId: id, bdi: parseFloat(e.target.value) })}
                          className="w-20 h-8 text-xs font-black text-center bg-blue-50 border-blue-100 text-blue-700 rounded-lg pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400">%</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* LISTAGEM DE ETAPAS (PLANILHA) */}
             <div className="space-y-6 pb-24">
                {budgetData?.stages.length === 0 && (
                   <Card className="text-center py-32 border-2 border-dashed border-slate-200 rounded-3xl bg-white/40">
                      <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400 rotate-3">
                        <Layers className="w-10 h-10" />
                      </div>
                      <h3 className="text-slate-900 font-black uppercase text-sm tracking-widest">Planilha Técnica Vazia</h3>
                      <p className="text-slate-400 text-xs mt-3 uppercase font-bold tracking-tighter">Comece adicionando a primeira etapa da obra (Ex: Limpeza de Terreno)</p>
                   </Card>
                )}

                {budgetData?.stages.map((stage: any, sIdx: number) => {
                   const stageSubtotal = stage.budgetItems.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
                   const stageTotalWithBDI = stage.budgetItems.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice * (1 + (item.bdi || 0)/100)), 0);

                   return (
                     <div key={stage.id} className="animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden rounded-2xl">
                           <div className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center group/header">
                              <div className="flex items-center gap-5">
                                 <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-black text-emerald-400 border border-white/5">
                                   {(sIdx + 1).toString().padStart(2, '0')}
                                 </div>
                                 <h3 className="text-sm font-black uppercase tracking-widest">{stage.name}</h3>
                              </div>
                              <div className="flex items-center gap-12">
                                 <div className="flex flex-col items-end">
                                    <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest">Custo da Etapa</span>
                                    <span className="text-sm font-black text-emerald-400 tracking-tighter">
                                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stageSubtotal)}
                                     </span>
                                 </div>
                                 <div className="flex flex-col items-end border-l border-white/10 pl-12">
                                    <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest">Venda c/ BDI</span>
                                    <span className="text-sm font-black text-blue-300 tracking-tighter">
                                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stageTotalWithBDI)}
                                     </span>
                                 </div>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover/header:opacity-100 transition-all"
                                   onClick={() => {
                                     if(confirm(`Remover etapa "${stage.name}"?`)) deleteItemMutation.mutate({ id: stage.id }); // deleteStage context
                                   }}
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                              </div>
                           </div>
                           
                           <Table>
                              <TableHeader className="bg-slate-50/80">
                                 <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-16 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">#</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Descrição do Serviço</TableHead>
                                    <TableHead className="w-24 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Unid.</TableHead>
                                    <TableHead className="w-28 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Quant.</TableHead>
                                    <TableHead className="w-36 text-right text-[9px] font-black uppercase text-emerald-700 tracking-widest">Custo Unit.</TableHead>
                                    <TableHead className="w-36 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Custo Total</TableHead>
                                    <TableHead className="w-24 text-center text-[9px] font-black uppercase text-blue-600 tracking-widest">BDI%</TableHead>
                                    <TableHead className="w-36 text-right text-[9px] font-black uppercase text-slate-900 tracking-widest bg-slate-100/50">Venda Total</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody className="bg-white">
                                 {stage.budgetItems.map((item: any, iIdx: number) => (
                                    <TableRow key={item.id} className="group hover:bg-emerald-50/30 transition-colors border-slate-100 h-14">
                                       <TableCell className="text-center text-[10px] font-black text-slate-300">{(sIdx+1)}.{iIdx+1}</TableCell>
                                       <TableCell>
                                          <input 
                                            className="bg-transparent border-none w-full text-xs font-bold text-slate-900 focus:outline-none focus:ring-0"
                                            defaultValue={item.description}
                                            onBlur={(e) => updateItemMutation.mutate({ id: item.id, description: e.target.value })}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <input 
                                            className="bg-slate-50/50 border border-slate-100 hover:border-slate-300 focus:bg-white rounded px-2 py-1.5 w-full text-center text-[10px] font-black text-slate-500 uppercase"
                                            defaultValue={item.unit}
                                            onBlur={(e) => updateItemMutation.mutate({ id: item.id, unit: e.target.value })}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <input 
                                            type="number"
                                            className="bg-white border-none w-full text-right text-xs font-bold text-slate-600"
                                            defaultValue={item.quantity}
                                            onBlur={(e) => updateItemMutation.mutate({ id: item.id, quantity: parseFloat(e.target.value) })}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <input 
                                            type="number"
                                            className="bg-emerald-50/50 border-none w-full text-right text-xs font-black text-emerald-700"
                                            defaultValue={item.unitPrice}
                                            onBlur={(e) => updateItemMutation.mutate({ id: item.id, unitPrice: parseFloat(e.target.value) })}
                                          />
                                       </TableCell>
                                       <TableCell className="text-right text-[11px] font-bold text-slate-400">
                                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(item.quantity * item.unitPrice)}
                                       </TableCell>
                                       <TableCell>
                                          <input 
                                            type="number"
                                            className="bg-blue-50 border-none w-full text-center text-[11px] font-black text-blue-600 focus:outline-none text-center"
                                            defaultValue={item.bdi || 0}
                                            onBlur={(e) => updateItemMutation.mutate({ id: item.id, bdi: parseFloat(e.target.value) })}
                                          />
                                       </TableCell>
                                       <TableCell className="text-right text-[11px] font-black text-slate-900 bg-slate-50/40">
                                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(
                                             (item.quantity * item.unitPrice) * (1 + (item.bdi || 0) / 100)
                                          )}
                                       </TableCell>
                                       <TableCell className="text-center">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
                                            onClick={() => deleteItemMutation.mutate({ id: item.id })}
                                          >
                                             <Trash2 className="w-4 h-4" />
                                          </Button>
                                       </TableCell>
                                    </TableRow>
                                 ))}
                                 <TableRow>
                                    <TableCell colSpan={9} className="p-0">
                                       <Button 
                                         variant="ghost" 
                                         className="w-full h-12 rounded-none border-t border-dashed border-slate-100 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50/50 gap-3 tracking-widest"
                                         onClick={() => addItemMutation.mutate({ 
                                            stageId: stage.id, 
                                            description: "Novo Item de Serviço",
                                            bdi: budgetData?.budget?.bdi || 0
                                         })}
                                       >
                                          <Plus className="w-4 h-4" /> Adicionar serviço em {stage.name}
                                       </Button>
                                    </TableCell>
                                 </TableRow>
                              </TableBody>
                           </Table>
                        </Card>
                     </div>
                   );
                })}
             </div>
          </TabsContent>

          <TabsContent value="geral" className="animate-in slide-in-from-right-2 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24">
                <div className="lg:col-span-2 space-y-8">
                   {/* Identificação Técnica */}
                   <Card className="rounded-2xl shadow-xl shadow-slate-200/50 border-none overflow-hidden">
                      <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-widest">Identificação Técnica</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Parâmetros de engenharia</CardDescription>
                         </div>
                         <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase text-emerald-600"><Save className="w-3 h-3 mr-2" /> Salvar</Button>
                      </CardHeader>
                      <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Área Estimada do Projeto</Label>
                            <div className="flex gap-2">
                               <Input defaultValue={project?.totalArea || 0} type="number" className="font-bold h-11" />
                               <Select defaultValue={project?.areaUnit || "m2"}>
                                  <SelectTrigger className="w-24 h-11 font-bold"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                     <SelectItem value="m2">m²</SelectItem>
                                     <SelectItem value="hectare">Hect.</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                         </div>
                         <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Obra</Label><Input defaultValue={project?.type || ""} className="font-bold h-11" /></div>
                         <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A.R.T / Registro</Label><Input defaultValue={project?.art || ""} className="font-bold h-11" /></div>
                         <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CEI / CNO</Label><Input defaultValue={project?.ceiCno || ""} className="font-bold h-11" /></div>
                      </CardContent>
                   </Card>

                   {/* Localização */}
                   <Card className="rounded-2xl shadow-xl shadow-slate-200/50 border-none overflow-hidden">
                      <CardHeader className="bg-slate-50/50 border-b p-6"><CardTitle className="text-xs font-black uppercase text-slate-800 tracking-widest">Localização do Canteiro</CardTitle></CardHeader>
                      <CardContent className="p-8 grid grid-cols-1 md:grid-cols-6 gap-6">
                         <div className="md:col-span-2 space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CEP</Label><Input defaultValue={project?.cep || ""} className="font-bold h-11" /></div>
                         <div className="md:col-span-4 space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rua / Logradouro</Label><Input defaultValue={project?.street || ""} className="font-bold h-11" /></div>
                         <div className="md:col-span-2 space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número</Label><Input defaultValue={project?.number || ""} className="font-bold h-11" /></div>
                         <div className="md:col-span-4 space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complemento</Label><Input defaultValue={project?.complement || ""} className="font-bold h-11" /></div>
                         <div className="md:col-span-3 space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidade</Label><Input defaultValue={project?.city || ""} className="font-bold h-11" /></div>
                         <div className="md:col-span-3 space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bairro</Label><Input defaultValue={project?.neighborhood || ""} className="font-bold h-11" /></div>
                      </CardContent>
                   </Card>
                </div>

                <div className="space-y-8">
                   {/* Financeiro */}
                   <Card className="rounded-2xl shadow-xl shadow-slate-200/50 border-none overflow-hidden bg-slate-900 text-white">
                      <CardHeader className="p-8"><CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Parâmetros Financeiros</CardTitle></CardHeader>
                      <CardContent className="p-8 pt-0 space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Responsabilidade Financeira</Label>
                            <Select defaultValue={project?.paymentResponsibility || "COMPANY"}>
                               <SelectTrigger className="bg-white/10 border-white/5 h-11 text-white font-bold"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                  <SelectItem value="COMPANY">Construtora</SelectItem>
                                  <SelectItem value="CLIENT">Cliente (Direto)</SelectItem>
                                  <SelectItem value="CLIENT_REIMBURSEMENT">Reembolso</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Conta Corrente Padrão</Label>
                            <Select defaultValue={project?.defaultBankAccountId || "none"}>
                               <SelectTrigger className="bg-white/10 border-white/5 h-11 text-white font-bold"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                  <SelectItem value="none">Nenhuma</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                      </CardContent>
                   </Card>

                   {/* Resumo de Custos */}
                   <Card className="rounded-2xl shadow-xl shadow-slate-200/50 border-none bg-emerald-600 text-white">
                      <CardHeader className="p-8"><CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Resumo por m²</CardTitle></CardHeader>
                      <CardContent className="p-8 pt-0 space-y-8">
                         <div className="flex flex-col"><span className="text-[11px] uppercase font-bold opacity-60">Custo p/ Unidade Estimado</span><span className="text-3xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total / (project?.totalArea || 1))}</span></div>
                         <div className="pt-8 border-t border-white/10">
                           <p className="text-[11px] font-medium opacity-70 italic leading-relaxed">Cálculo baseado no Valor Final com BDI aplicado sobre o cronograma físico-financeiro atual.</p>
                         </div>
                      </CardContent>
                   </Card>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* 3. RESUMO RODAPÉ (FLOAT) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] px-10 py-5">
         <div className="max-w-[1700px] mx-auto flex justify-between items-center">
            <div className="flex gap-4">
               <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-2 border-slate-200 font-black h-12 px-8 uppercase text-[10px] tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all group">
                       <PlusCircle className="w-5 h-5 mr-3 text-emerald-500 group-hover:rotate-90 transition-transform" /> Inserir Nova Etapa
                    </Button>
                  </DialogTrigger>
               </Dialog>
            </div>

            <div className="flex items-center gap-14">
               <div className="hidden md:flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Custo Total de Materiais/Serviços</span>
                  <span className="text-lg font-black text-slate-600">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.subtotal)}
                  </span>
               </div>
               <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Lucro/BDI</span>
                     <Badge className="bg-blue-100 text-blue-700 border-none text-[9px] h-4 px-1.5 font-black">{budgetData?.budget?.bdi || 0}% avg</Badge>
                  </div>
                  <span className="text-lg font-black text-blue-600">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total - totals.subtotal)}
                  </span>
               </div>
               <div className="bg-emerald-600 text-white rounded-2xl px-12 py-4 flex flex-col items-end shadow-2xl shadow-emerald-200 hover:scale-[1.02] transition-transform cursor-pointer">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest mb-1">Valor Final Proposta</span>
                  <span className="text-3xl font-black tracking-tighter leading-none">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}
                  </span>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
