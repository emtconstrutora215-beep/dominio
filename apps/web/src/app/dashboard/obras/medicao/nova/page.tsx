"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { 
  Plus, Save, ArrowLeft, ChevronDown, Loader2,
  Printer, MoreVertical, Edit2, DollarSign, Percent, Calculator, Hash, Check, X, FileText, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MeasurementDiscountModal } from "@/components/projetos/MeasurementDiscountModal";
import { MeasurementRetentionModal } from "@/components/projetos/MeasurementRetentionModal";

// --- TELA PRINCIPAL ---

export default function NovaMedicaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  
  const [title, setTitle] = useState("Medição de Obra");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [measurements, setMeasurements] = useState<Record<string, { quantity: number; value: number; percentage: number }>>({});
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [retentions, setRetentions] = useState<any[]>([]);
  const [comments, setComments] = useState<string>("");
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [status, setStatus] = useState("Rascunho");

  const { data: projectData, isLoading: isLoadingProject } = trpc.measurement.getDataForNewMeasurement.useQuery(
    { projectId: projectId || "" },
    { enabled: !!projectId }
  );

  const { data: me } = trpc.company.getMe.useQuery();

  const { flattenedItems } = useMemo(() => {
    if (!projectData?.items) return { flattenedItems: [] };
    const flattened: any[] = [];
    const traverse = (items: any[], depth = 0, parentNumber = "", parentId: string | null = null) => {
      items.forEach((item, index) => {
        const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
        flattened.push({ ...item, depth, number, parentId });
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1, number, item.id);
        }
      });
    };
    traverse(projectData.items);
    return { flattenedItems: flattened };
  }, [projectData]);

  const isVisible = (item: any) => {
    let currentParentId = item.parentId;
    while (currentParentId) {
      if (collapsedItems[currentParentId]) return false;
      const parent = flattenedItems.find(i => i.id === currentParentId);
      currentParentId = parent?.parentId || null;
    }
    return true;
  };

  const handleUpdateItem = (id: string, field: 'quantity' | 'value' | 'percentage', inputVal: string, unitPrice: number, budgetedQty: number) => {
    const val = parseFloat(inputVal) || 0;
    let newQty = 0, newValue = 0, newPercent = 0;
    if (field === 'quantity') { newQty = val; newValue = val * unitPrice; newPercent = budgetedQty > 0 ? (val / budgetedQty) * 100 : 0; }
    else if (field === 'value') { newValue = val; newQty = unitPrice > 0 ? val / unitPrice : 0; newPercent = (budgetedQty * unitPrice) > 0 ? (val / (budgetedQty * unitPrice)) * 100 : 0; }
    else if (field === 'percentage') { newPercent = val; newQty = budgetedQty * (val / 100); newValue = newQty * unitPrice; }
    setMeasurements(prev => ({ ...prev, [id]: { quantity: newQty, value: newValue, percentage: newPercent } }));
  };

  // Função auxiliar para pegar todos os descendentes de um item
  const getDescendants = (parentId: string) => {
    const descendants: any[] = [];
    const find = (id: string) => {
      const children = flattenedItems.filter(i => i.parentId === id);
      children.forEach(c => {
        descendants.push(c);
        find(c.id);
      });
    };
    find(parentId);
    return descendants;
  };

  const totals = useMemo(() => {
    const orçado = flattenedItems.filter(item => item.depth === 0).reduce((acc, item) => acc + item.totalValue, 0);
    const acumulado = flattenedItems.filter(item => item.depth === 0).reduce((acc, item) => acc + item.accumulatedValue, 0);
    const atual = Object.values(measurements).reduce((acc, m) => acc + m.value, 0);
    const totalDiscounts = discounts.reduce((acc, d) => acc + d.value, 0);
    const totalRetentions = retentions.reduce((acc, r) => acc + r.value, 0);
    return { orçado, acumulado, atual, saldo: orçado - acumulado, saldoPercent: orçado > 0 ? ((orçado - acumulado) / orçado) * 100 : 0, atualPercent: orçado > 0 ? (atual / orçado) * 100 : 0, netValue: atual - totalDiscounts - totalRetentions, totalDiscounts, totalRetentions };
  }, [flattenedItems, measurements, discounts, retentions]);

  const createMutation = trpc.measurement.createMeasurement.useMutation({
    onSuccess: () => { toast.success("Medição salva!"); router.push("/dashboard/obras/medicao"); },
    onError: (err) => toast.error(err.message)
  });

  const handleSave = () => {
    if (!projectId) return;
    const items = Object.entries(measurements).filter(([_, data]) => data.quantity > 0).map(([id, data]) => ({ budgetItemId: id, quantity: data.quantity }));
    if (items.length === 0) return toast.error("Insira ao menos um item.");
    createMutation.mutate({ projectId, title, notes: comments, items, discounts, retentions });
  };

  if (isLoadingProject) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-700">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-8">
             <div className="flex flex-col"><span className="text-xs font-medium text-slate-400 uppercase tracking-widest leading-tight">Obras</span><h1 className="text-2xl font-bold text-slate-800 tracking-tight">Medição</h1></div>
             <div className="flex flex-col border border-slate-100 bg-slate-50/50 rounded-md px-3 py-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Número</span><span className="text-sm font-bold text-slate-600">{projectData?.nextNumber}</span></div>
             <div className="flex flex-col border border-slate-100 rounded-md px-4 py-1 bg-white"><span className="text-[10px] font-bold text-slate-400 uppercase">Obra</span><span className="text-sm font-bold text-slate-700 uppercase truncate max-w-[400px]">{projectData?.project.code} - {projectData?.project.name}</span></div>
             <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-0.5">Status</span>
                <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-40 text-sm font-bold border-slate-200"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Rascunho">Rascunho</SelectItem><SelectItem value="Em Revisão">Em Revisão</SelectItem><SelectItem value="Aprovado">Aprovado</SelectItem></SelectContent></Select>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="h-10 px-5 rounded-md border-slate-200 font-bold text-xs uppercase tracking-wider gap-2 text-slate-600 bg-slate-50 hover:bg-slate-100"><FileText className="w-4 h-4" /> Gerar Relatório</Button>
             <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200 text-slate-400"><MoreVertical className="w-4 h-4" /></Button>
             <Button onClick={() => router.back()} variant="outline" size="icon" className="h-10 w-10 border-slate-200 text-slate-400"><ArrowLeft className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-12 mt-2 px-1">
           <div className="flex flex-col gap-0.5"><span className="text-[11px] font-bold text-slate-400 uppercase">Título</span><div className="flex items-center gap-2 group cursor-pointer"><span className="text-sm font-bold text-slate-700">{title}</span><Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" /></div></div>
           <div className="flex items-center gap-12">
              <div className="flex flex-col gap-0.5"><span className="text-[11px] font-bold text-slate-400 uppercase">Data da medição</span><div className="flex items-center gap-2 group cursor-pointer"><span className="text-sm font-bold text-slate-700">{format(new Date(date), 'dd/MM/yyyy')}</span><Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" /></div></div>
              <div className="flex flex-col gap-0.5"><span className="text-[11px] font-bold text-slate-400 uppercase">Criado por</span><span className="text-sm font-bold text-slate-700">{me?.name || "Carregando..."}</span></div>
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <Table className="min-w-[1300px]">
            <TableHeader className="bg-slate-50/50 border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead rowSpan={2} className="px-6 font-bold text-xs text-slate-400 uppercase">Itens</TableHead>
                <TableHead colSpan={2} className="text-center border-l border-slate-200 px-4 bg-slate-50/20"><div className="flex flex-col gap-1.5"><span className="text-[11px] font-bold text-slate-400 uppercase">Total orçado (Preço)</span><span className="text-sm font-bold text-slate-600">R$ {totals.orçado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div></TableHead>
                <TableHead colSpan={3} className="text-center border-l border-slate-200 px-4 bg-slate-50/40">
                   <div className="flex items-center justify-center gap-6"><div className="flex flex-col items-end gap-1"><span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">Saldo a medir <ArrowLeft className="w-3 h-3 rotate-180" /></span><span className="text-sm font-bold text-slate-600">R$ {totals.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div><div className="relative w-12 h-12 flex items-center justify-center"><svg className="w-full h-full -rotate-90"><circle cx="24" cy="24" r="20" className="stroke-slate-200 fill-none" strokeWidth="5" /><circle cx="24" cy="24" r="20" className="stroke-blue-500 fill-none" strokeWidth="5" strokeDasharray="125.6" strokeDashoffset={125.6 - (totals.saldoPercent * 1.256)} /></svg><span className="absolute text-[10px] font-bold text-blue-600">{totals.saldoPercent.toFixed(1)}%</span></div></div>
                </TableHead>
                <TableHead colSpan={3} className="text-center border-l border-blue-500 px-4 bg-blue-600 border-b-blue-700">
                   <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-blue-100 uppercase">Medição atual</span>
                      <div className="flex items-center justify-center gap-3">
                         <span className="text-sm font-bold text-white">R$ {totals.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         <Badge className="h-5 px-2 bg-white text-blue-600 text-[10px] font-bold border-none">{totals.atualPercent.toFixed(0)}%</Badge>
                      </div>
                   </div>
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent border-t border-slate-100">
                <TableHead className="w-20 border-l border-slate-200 text-center text-[10px] font-bold uppercase text-slate-400">Qtde</TableHead><TableHead className="w-40 text-right text-[10px] font-bold uppercase text-slate-400 pr-4">Valor total</TableHead>
                <TableHead className="w-20 border-l border-slate-200 text-center text-[10px] font-bold uppercase text-slate-400">Qtde</TableHead><TableHead className="w-40 text-right text-[10px] font-bold uppercase text-slate-400">Valor</TableHead><TableHead className="w-20 text-center text-[10px] font-bold uppercase text-slate-400">%</TableHead>
                <TableHead className="w-28 border-l border-blue-400 bg-blue-600 text-center text-[10px] font-bold uppercase text-blue-50">Qtde</TableHead>
                <TableHead className="w-40 bg-blue-600 text-right text-[10px] font-bold uppercase text-blue-50 px-4">Valor</TableHead>
                <TableHead className="w-20 bg-blue-600 text-center text-[10px] font-bold uppercase text-blue-50 pr-4">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedItems.filter(isVisible).map((item) => {
                const isStage = item.type === "STAGE" || item.type === "SUB_STAGE";
                const m = measurements[item.id] || { quantity: 0, value: 0, percentage: 0 };
                const isCollapsed = collapsedItems[item.id];
                
                let currentVal = m.value;
                let currentPercent = m.percentage;

                if (isStage) {
                   const descendants = getDescendants(item.id);
                   currentVal = descendants.reduce((acc, d) => acc + (measurements[d.id]?.value || 0), 0);
                   currentPercent = item.totalValue > 0 ? (currentVal / item.totalValue) * 100 : 0;
                }

                return (
                  <TableRow key={item.id} className={cn("group transition-colors border-b border-slate-100", isStage ? "bg-slate-50/50 cursor-pointer h-14" : "bg-white h-12 hover:bg-slate-50")} onClick={() => isStage && setCollapsedItems(p => ({ ...p, [item.id]: !p[item.id] }))}>
                    <TableCell className="px-6 py-2">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-blue-600 min-w-[24px]">{item.number}</span>
                        <span className={cn("text-sm tracking-tight", isStage ? "font-bold text-blue-700 uppercase" : "font-medium text-slate-600")} style={{ marginLeft: `${item.depth * 20}px` }}>
                          {item.description}
                          {!isStage && <span className="ml-2 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">- {item.unit}</span>}
                        </span>
                        {isStage && (
                          <div className="ml-auto">
                             {isCollapsed ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronUp className="w-4 h-4 text-emerald-500" />}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center border-l border-slate-100 text-sm font-medium text-slate-500">{!isStage && item.quantity}</TableCell>
                    <TableCell className="text-right text-sm font-bold text-slate-700 pr-4">R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>

                    <TableCell className="text-center border-l border-slate-100 text-sm font-medium text-slate-400">{!isStage && (item.quantity - item.accumulatedQuantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-bold text-slate-600">R$ {(item.totalValue - item.accumulatedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center p-0 w-20 relative">
                       <div className="flex items-center justify-center h-full relative z-10">
                          <span className={cn("text-xs font-bold", isStage ? "text-blue-700" : "text-slate-500")}>{item.accumulatedPercentage.toFixed(2)}</span>
                       </div>
                       {isStage && (
                          <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500" style={{ height: '100%', opacity: 0.8 }} />
                       )}
                    </TableCell>

                    <TableCell className="p-0 border-l border-blue-100" onClick={e => e.stopPropagation()}>
                       {!isStage && (
                         <Input type="number" className="h-full w-full border-none bg-blue-50/5 text-center font-bold text-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-blue-400 transition-colors" value={m.quantity || ""} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value, item.unitPrice, item.quantity)} placeholder="0" />
                       )}
                    </TableCell>
                    <TableCell className="p-0 text-right bg-blue-50/30" onClick={e => e.stopPropagation()}>
                       {isStage ? (
                         <span className="text-sm font-bold text-blue-700 px-4">R$ {currentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       ) : (
                         <Input type="number" className="h-full w-full border-none bg-transparent text-right font-bold text-blue-700 text-sm px-4 focus-visible:ring-1 focus-visible:ring-blue-400 transition-colors" value={m.value ? m.value.toFixed(2) : ""} onChange={(e) => handleUpdateItem(item.id, 'value', e.target.value, item.unitPrice, item.quantity)} placeholder="R$ 0,00" />
                       )}
                    </TableCell>
                    <TableCell className="p-0 text-center bg-blue-50/30" onClick={e => e.stopPropagation()}>
                       {isStage ? (
                         <span className="text-sm font-bold text-blue-500">{currentPercent.toFixed(0)}</span>
                       ) : (
                         <Input type="number" className="h-full w-full border-none bg-transparent text-center font-bold text-blue-600 text-sm focus-visible:ring-1 focus-visible:ring-blue-400 transition-colors" value={m.percentage ? m.percentage.toFixed(2) : ""} onChange={(e) => handleUpdateItem(item.id, 'percentage', e.target.value, item.unitPrice, item.quantity)} placeholder="0" />
                       )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-10 pb-40">
           <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descontos</h3>
                 <button onClick={() => setIsDiscountModalOpen(true)} className="text-[11px] font-bold text-emerald-600 uppercase hover:text-emerald-700 flex items-center gap-2">+ NOVO DESCONTO <ChevronDown className="w-4 h-4" /></button>
              </div>
              <Table><TableHeader className="bg-white"><TableRow className="h-12 border-b border-slate-100"><TableHead className="px-6 text-[10px] font-bold uppercase text-slate-400">Tipo de Desconto</TableHead><TableHead className="px-6 text-[10px] font-bold uppercase text-slate-400">Observações</TableHead><TableHead className="w-60 text-right text-[10px] font-bold uppercase text-slate-400">Valor do Desconto</TableHead><TableHead className="w-40 text-center text-[10px] font-bold uppercase text-slate-400">% de Desconto</TableHead></TableRow></TableHeader>
                 <TableBody>{discounts.length === 0 ? <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-slate-400 italic">Nenhum item encontrado</TableCell></TableRow> : discounts.map((d, i) => (<TableRow key={i} className="group"><TableCell className="px-6 py-4 text-sm font-bold text-slate-700 capitalize">{d.type}</TableCell><TableCell className="px-6 py-4 text-xs text-slate-500">{d.description || "-"}</TableCell><TableCell className="text-right px-6 text-sm font-bold text-slate-700">R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-center text-sm font-medium text-slate-500">0%</TableCell></TableRow>))}
                    <TableRow className="bg-slate-50/30 font-bold"><TableCell colSpan={2} className="text-right pr-12 text-[11px] uppercase text-slate-400">Total</TableCell><TableCell className="text-right px-6 text-sm text-slate-800">R$ {totals.totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-center text-sm text-slate-400">0%</TableCell></TableRow>
                 </TableBody>
              </Table>
           </div>
           <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retenções</h3>
                 <button onClick={() => setIsRetentionModalOpen(true)} className="text-[11px] font-bold text-blue-600 uppercase hover:text-blue-700 flex items-center gap-2">+ NOVA RETENÇÃO <ChevronDown className="w-4 h-4" /></button>
              </div>
              <Table><TableHeader className="bg-white"><TableRow className="h-12 border-b border-slate-100"><TableHead className="px-6 text-[10px] font-bold uppercase text-slate-400">Tipo de Retenção</TableHead><TableHead className="px-6 text-[10px] font-bold uppercase text-slate-400">Observações</TableHead><TableHead className="w-60 text-right text-[10px] font-bold uppercase text-slate-400">Valor da Retenção</TableHead><TableHead className="w-40 text-center text-[10px] font-bold uppercase text-slate-400">% da Retenção</TableHead></TableRow></TableHeader>
                 <TableBody>{retentions.length === 0 ? <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-slate-400 italic">Nenhum item encontrado</TableCell></TableRow> : retentions.map((r, i) => (<TableRow key={i} className="group"><TableCell className="px-6 py-4 text-sm font-bold text-slate-700 capitalize">{r.type}</TableCell><TableCell className="px-6 py-4 text-xs text-slate-500">{r.description || "-"}</TableCell><TableCell className="text-right px-6 text-sm font-bold text-slate-700">R$ {r.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-center text-sm font-medium text-slate-500">0%</TableCell></TableRow>))}
                    <TableRow className="bg-slate-50/30 font-bold"><TableCell colSpan={2} className="text-right pr-12 text-[11px] uppercase text-slate-400">Total</TableCell><TableCell className="text-right px-6 text-sm text-slate-800">R$ {totals.totalRetentions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-center text-sm text-slate-400">0%</TableCell></TableRow>
                 </TableBody>
              </Table>
           </div>
        </div>
      </main>

      <MeasurementDiscountModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} onSave={(discount) => setDiscounts([...discounts, discount])} />
      <MeasurementRetentionModal isOpen={isRetentionModalOpen} onClose={() => setIsRetentionModalOpen(false)} onSave={(retention) => setRetentions([...retentions, retention])} />

      <div className="fixed bottom-0 left-[85px] right-0 h-24 bg-white border-t border-slate-200 shadow-2xl px-12 flex items-center justify-between z-50">
         <div className="flex gap-12">
            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Medido</span><span className="text-xl font-bold text-slate-800 tracking-tight">R$ {totals.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descontos/Retenções</span><span className="text-xl font-bold text-rose-500 tracking-tight">R$ {(totals.totalDiscounts + totals.totalRetentions).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
         </div>
         <div className="flex items-center gap-10">
            <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">VALOR LÍQUIDO</span><span className="text-4xl font-bold text-blue-700 leading-none tracking-tighter">R$ {totals.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <Button onClick={handleSave} className="bg-[#10b981] hover:bg-[#059669] text-white px-10 h-14 rounded-xl shadow-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-all" disabled={createMutation.isPending}>{createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirmar Medição"}</Button>
         </div>
      </div>
    </div>
  );
}
