"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { 
  Plus, Save, X, Trash2, Upload, FileText, 
  ArrowLeft, Check, ChevronDown, Loader2,
  Printer, MoreVertical, Edit2, Info, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
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

// Componentes Auxiliares Locais
const SummaryCard = ({ title, value, subValue, icon, progress, color = "blue" }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 flex-1 relative overflow-hidden">
    <div className="flex justify-between items-start">
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
          {title} {icon}
        </span>
        <span className="text-2xl font-black text-slate-700">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      {subValue !== undefined && (
        <div className={cn(
          "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1",
          color === "blue" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
        )}>
          {subValue}%
        </div>
      )}
    </div>
    {progress !== undefined && (
      <div className="mt-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
          <span>PROGRESSO</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-slate-100" indicatorClassName={color === "blue" ? "bg-blue-500" : "bg-emerald-500"} />
      </div>
    )}
  </div>
);

import { cn } from "@/lib/utils";

export default function NovaMedicaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const contractId = searchParams.get("contractId"); // Na verdade redirecionamos com projectId e vamos buscar o contrato principal ou deixar escolher
  const initialTitle = searchParams.get("title") || "";
  const initialDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  // State
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [retentions, setRetentions] = useState<any[]>([]);
  const [comments, setComments] = useState<string>("");
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Queries
  // Como agora temos vários contratos por obra, precisamos saber qual contrato estamos medindo.
  // Por simplicidade, se não vier contractId, vamos buscar os contratos da obra.
  const { data: contractData, isLoading: isLoadingContract } = trpc.measurement.getDataForNewMeasurement.useQuery(
    { contractId: contractId || "" },
    { enabled: !!contractId }
  );

  const { data: projectContracts } = trpc.projects.getById.useQuery(
    { id: projectId || "" },
    { enabled: !!projectId && !contractId }
  );

  // Se não tiver contractId na URL, mas tivermos os contratos da obra, vamos pegar o primeiro por enquanto ou mostrar um seletor
  // (O ideal seria o modal anterior já passar o contractId, mas lá passamos projectId. Vou ajustar o modal depois se necessário)
  const activeContractId = contractId || projectContracts?.contracts?.[0]?.id;

  const { data: activeContractData, isLoading: isLoadingActive } = trpc.measurement.getDataForNewMeasurement.useQuery(
    { contractId: activeContractId || "" },
    { enabled: !!activeContractId }
  );

  // Agrupamento de Itens por Etapa
  const groupedItems = useMemo(() => {
    if (!activeContractData) return {};
    return activeContractData.items.reduce((acc: any, item) => {
      const stage = item.projectStageName || "Geral";
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(item);
      return acc;
    }, {});
  }, [activeContractData]);

  // Totais
  const totals = useMemo(() => {
    if (!activeContractData) return { 
      orçado: 0, 
      saldo: 0, 
      atual: 0, 
      saldoPercent: 0, 
      atualPercent: 0,
      totalDiscounts: 0,
      totalRetentions: 0,
      netValue: 0
    };
    
    const orçado = activeContractData.items.reduce((acc, item) => acc + item.totalValue, 0);
    const saldo = activeContractData.items.reduce((acc, item) => acc + item.remainingValue, 0);
    
    const atual = activeContractData.items.reduce((acc, item) => {
      const qty = measurements[item.id] || 0;
      return acc + (qty * item.unitPrice);
    }, 0);

    const totalDiscounts = discounts.reduce((acc, d) => acc + d.value, 0);
    const totalRetentions = retentions.reduce((acc, r) => acc + r.value, 0);

    return { 
      orçado, 
      saldo, 
      atual,
      saldoPercent: orçado > 0 ? (saldo / orçado) * 100 : 0,
      atualPercent: orçado > 0 ? (atual / orçado) * 100 : 0,
      totalDiscounts,
      totalRetentions,
      netValue: atual - totalDiscounts - totalRetentions
    };
  }, [activeContractData, measurements, discounts, retentions]);

  const createMutation = trpc.measurement.createMeasurement.useMutation({
    onSuccess: () => {
      toast.success("Medição salva com sucesso!");
      router.push("/dashboard/obras/medicao");
    },
    onError: (err) => toast.error(err.message)
  });

  const handleSave = () => {
    if (!activeContractId) return;
    
    const items = Object.entries(measurements)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({
        contractItemId: id,
        quantity: qty
      }));

    if (items.length === 0) {
      toast.error("Insira pelo menos um item medido.");
      return;
    }

    createMutation.mutate({
      contractId: activeContractId,
      title,
      items,
      discounts,
      retentions,
      notes: comments
    });
  };

  if (isLoadingContract || isLoadingActive) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#1A73E8]" />
          <span className="text-slate-500 font-medium">Carregando dados da obra...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      {/* HEADER SUPERIOR */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Obras</span>
              <h1 className="text-2xl font-black text-slate-700 flex items-center gap-3">
                Medição 
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase">Número {activeContractData?.nextNumber || '-'}</span>
              </h1>
            </div>
            <div className="h-10 w-[1px] bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Obra</span>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                <span className="text-sm font-bold text-slate-600">
                  {activeContractData?.contract.project.code ? `${activeContractData.contract.project.code} - ` : ''}
                  {activeContractData?.contract.project.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Status</span>
              <div className="border border-emerald-500 text-emerald-600 px-4 py-1.5 rounded-lg text-sm font-bold bg-emerald-50/30">
                Rascunho
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-slate-600 gap-2 h-11 px-6 shadow-sm">
              <FileText className="w-4 h-4" /> Gerar Relatório
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-11 w-11 shadow-sm">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl border-slate-200 h-11 w-11 shadow-sm">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-12 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Título</span>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-sm font-black text-slate-600 group-hover:text-[#1A73E8] transition-colors">{title || "Sem título"}</span>
              <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-[#1A73E8]" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Data da medição</span>
            <div className="flex items-center gap-2 group cursor-pointer">
               <span className="text-sm font-black text-slate-600">{format(new Date(date), "dd/MM/yyyy")}</span>
               <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-[#1A73E8]" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Criado por</span>
            <span className="text-sm font-black text-slate-600 uppercase tracking-tight">Desenvolvedor</span>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="px-8 py-6 flex gap-4">
        <SummaryCard 
          title="Total orçado (Preço)" 
          value={totals.orçado} 
        />
        <SummaryCard 
          title="Saldo a medir" 
          icon={<ArrowLeft className="w-3 h-3 rotate-180" />}
          value={totals.saldo} 
          subValue={totals.saldoPercent.toFixed(1)}
          progress={Number(totals.saldoPercent.toFixed(1))}
          color="blue"
        />
        <SummaryCard 
          title="Medição atual" 
          value={totals.atual} 
          subValue={totals.atualPercent.toFixed(1)}
          color="emerald"
        />
      </div>

      {/* ITEMS TABLE */}
      <div className="flex-1 overflow-auto px-8 pb-32">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest h-12">Itens</TableHead>
                <TableHead className="w-[120px] text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor total</TableHead>
                
                {/* Saldo Headers */}
                <TableHead className="w-[100px] text-right text-[10px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-100">Qtde</TableHead>
                <TableHead className="w-[120px] text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</TableHead>
                <TableHead className="w-[80px] text-right text-[10px] font-black text-slate-500 uppercase tracking-widest pr-4">%</TableHead>
                
                {/* Medição Atual Headers */}
                <TableHead className="w-[100px] text-center text-[10px] font-black text-white bg-blue-500/90 uppercase tracking-widest border-l border-white/20">Qtde</TableHead>
                <TableHead className="w-[120px] text-center text-[10px] font-black text-white bg-blue-500/90 uppercase tracking-widest border-l border-white/20">Valor</TableHead>
                <TableHead className="w-[80px] text-center text-[10px] font-black text-white bg-blue-500/90 uppercase tracking-widest border-l border-white/20 pr-4">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedItems).map(([stageName, stageItems]: [string, any]) => (
                <React.Fragment key={stageName}>
                  {/* Linha da Etapa - Agrupador */}
                  <TableRow className="bg-slate-50/30 hover:bg-slate-50 border-b border-slate-100">
                    <TableCell colSpan={9} className="py-2 px-6">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-4 h-4 text-[#1A73E8]" />
                        <span className="text-xs font-black text-[#1A73E8] uppercase tracking-wider">{stageName}</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Itens da Etapa */}
                  {stageItems.map((item: any) => {
                    const currentQty = measurements[item.id] || 0;
                    const currentValue = currentQty * item.unitPrice;
                    const currentPercent = item.totalValue > 0 ? (currentValue / item.totalValue) * 100 : 0;

                    return (
                      <TableRow key={item.id} className="group hover:bg-white transition-colors border-b border-slate-50 last:border-0 h-14">
                        <TableCell className="font-bold text-slate-600 text-sm pl-12 pr-4 py-4 truncate max-w-[400px]">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-slate-600">
                          R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        
                        {/* Saldo Values */}
                        <TableCell className="text-right text-xs font-semibold text-slate-500 border-l border-slate-100 bg-slate-50/10">
                          {item.remainingQuantity.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-500 bg-slate-50/10">
                          R$ {item.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-blue-500 bg-slate-50/10 pr-4">
                          {item.remainingPercentage.toFixed(2)}
                        </TableCell>

                        {/* Medição Atual Row Inputs */}
                        <TableCell className="p-0 border-l border-slate-100 bg-blue-50/10">
                          <Input 
                            type="number" 
                            className="h-10 w-full border-none bg-transparent rounded-none text-center font-bold text-slate-600 focus-visible:ring-1 focus-visible:ring-blue-400"
                            placeholder="0"
                            value={measurements[item.id] || ""}
                            onChange={(e) => setMeasurements({...measurements, [item.id]: parseFloat(e.target.value) || 0})}
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-400 bg-blue-50/10 h-full">
                          R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center text-xs font-black text-slate-400 bg-blue-50/10 h-full pr-4">
                          {currentPercent.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* FOOTER ACCORDIONS (EXPANDABLE SECTIONS) */}
        <div className="flex flex-col gap-3 pb-20">
           {/* Seção de Descontos */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div 
               className="px-6 py-4 flex justify-between items-center cursor-pointer group hover:bg-slate-50 transition-colors"
               onClick={() => setIsDiscountModalOpen(true)}
             >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Descontos</span>
                  {discounts.length > 0 && <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 font-bold border-none">{discounts.length}</Badge>}
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full group-hover:bg-emerald-100 transition-colors">
                     <Plus className="w-3 h-3 text-emerald-600" />
                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                       + NOVO DESCONTO
                     </span>
                   </div>
                   <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
             </div>
             
             {discounts.length > 0 && (
               <div className="px-6 pb-6 pt-2">
                 <Table>
                   <TableHeader className="bg-slate-50/50">
                     <TableRow className="hover:bg-transparent border-none">
                       <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0">Tipo de Desconto</TableHead>
                       <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações</TableHead>
                       <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor do Desconto</TableHead>
                       <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-0">% de Desconto</TableHead>
                       <TableHead className="w-10"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {discounts.map((d, i) => (
                       <TableRow key={i} className="hover:bg-transparent border-b border-slate-50 last:border-0 group">
                         <TableCell className="font-bold text-slate-600 text-sm pl-0 capitalize">{d.type}</TableCell>
                         <TableCell className="text-slate-500 text-xs italic">{d.description || "-"}</TableCell>
                         <TableCell className="text-right font-bold text-slate-600">R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                         <TableCell className="text-right font-black text-slate-400 pr-0">{d.percentage || 0}%</TableCell>
                         <TableCell className="pr-0">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                             onClick={() => setDiscounts(discounts.filter((_, idx) => idx !== i))}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             )}
           </div>

           {/* Seção de Retenções */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div 
               className="px-6 py-4 flex justify-between items-center cursor-pointer group hover:bg-slate-50 transition-colors"
               onClick={() => {/* Implementar modal de retenção similar ao de desconto se necessário */}}
             >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Retenções</span>
                  {retentions.length > 0 && <Badge variant="secondary" className="bg-blue-50 text-blue-600 font-bold border-none">{retentions.length}</Badge>}
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full group-hover:bg-blue-100 transition-colors">
                     <Plus className="w-3 h-3 text-blue-600" />
                     <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                       + NOVA RETENÇÃO
                     </span>
                   </div>
                   <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
             </div>
             
             {retentions.length > 0 && (
               <div className="px-6 pb-6 pt-2">
                 {/* Tabela de Retenções idêntica à de Descontos */}
               </div>
             )}
           </div>

           {/* Seção de Comentários */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 flex justify-between items-center cursor-pointer group hover:bg-slate-50 transition-colors">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Comentários</span>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full group-hover:bg-slate-100 transition-colors">
                     <Plus className="w-3 h-3 text-slate-400" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       + NOVO COMENTÁRIO
                     </span>
                   </div>
                   <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
             </div>
             <div className="px-6 py-8 flex flex-col items-center justify-center bg-slate-50/30 border-t border-slate-50">
                <span className="text-slate-400 text-xs italic font-medium">Não existe nenhum comentário cadastrado</span>
             </div>
           </div>

           {/* Seção de Arquivos */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 flex justify-between items-center cursor-pointer group hover:bg-slate-50 transition-colors">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Arquivos</span>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full group-hover:bg-slate-100 transition-colors">
                     <Plus className="w-3 h-3 text-slate-400" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       + NOVO ARQUIVO
                     </span>
                   </div>
                   <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
             </div>
             <div className="px-6 py-12 flex flex-col items-center justify-center bg-slate-50/30 border-t border-slate-50 gap-4">
                <span className="text-slate-400 text-sm font-medium">Clique no botão abaixo para criar uma Pasta</span>
                <Button className="bg-[#56ab2f] hover:bg-[#4a9328] text-white font-bold h-10 px-8 gap-2 rounded-lg">
                  <Plus className="w-4 h-4" /> Pasta
                </Button>
             </div>
           </div>
        </div>
      </div>

      {/* DISCOUNT MODAL */}

      <MeasurementDiscountModal 
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onSave={(discount) => setDiscounts([...discounts, discount])}
      />

      {/* FIXED FOOTER SUMMARY */}

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] px-8 flex items-center justify-between z-50">
         <div className="flex gap-4">
            <div className="bg-slate-50/80 px-6 py-2 rounded-xl border border-slate-100 flex flex-col items-center min-w-[140px]">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Total medido</span>
               <span className="text-lg font-black text-slate-700">R$ {totals.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-slate-50/80 px-6 py-2 rounded-xl border border-slate-100 flex flex-col items-center min-w-[100px]">
               <span className="text-[10px] font-bold text-slate-400 uppercase">% medido</span>
               <span className="text-lg font-black text-slate-700">{totals.atualPercent.toFixed(2)}%</span>
            </div>
            <div className="bg-slate-50/80 px-6 py-2 rounded-xl border border-slate-100 flex flex-col items-center min-w-[140px]">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Total descontos</span>
               <span className="text-lg font-black text-slate-700">R$ {totals.totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-slate-50/80 px-6 py-2 rounded-xl border border-slate-100 flex flex-col items-center min-w-[140px]">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Total retenções</span>
               <span className="text-lg font-black text-slate-700">R$ {totals.totalRetentions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Valor Líquido</span>
               <span className="text-3xl font-black text-[#1A73E8]">R$ {totals.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <Button 
               onClick={handleSave}
               className="bg-[#56ab2f] hover:bg-[#4a9328] text-white w-16 h-16 rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center group active:scale-95 transition-all"
               disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : <DollarSign className="w-8 h-8 group-hover:scale-110 transition-transform" />}
            </Button>
         </div>
      </div>
    </div>
  );
}
