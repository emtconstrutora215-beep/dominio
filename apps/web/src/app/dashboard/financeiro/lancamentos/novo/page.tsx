"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { 
  Plus, Search, Save, X, Trash2, Upload, FileText, 
  ArrowLeft, Check, ChevronDown, Loader2, Pencil, Calculator
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "sonner";

export default function NovoLancamentoPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  // Queries
  const { data: options, isLoading: isLoadingOptions } = trpc.financial.getCreateOptions.useQuery();

  // State
  const [form, setForm] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    category: "Geral",
    description: "",
    amount: 0,
    dueDate: format(new Date(), "yyyy-MM-dd"),
    competencyDate: format(new Date(), "yyyy-MM-dd"),
    documentNumber: "",
    paymentCondition: "À Vista",
    paymentMethod: "Boleto",
    contactId: "",
    bankAccountId: "",
    purchaseOrderId: "",
    goodsReceiptId: "",
    contractId: "",
    measurementId: "",
    retentions: 0,
    observations: "",
    payerType: "Empresa",
    status: "PENDING" as "PENDING" | "PAID",
  });

  const [splits, setSplits] = useState<any[]>([]);

  // Mutations
  const createEntry = trpc.financial.createEntry.useMutation({
    onSuccess: () => {
      toast.success("Lançamento salvo com sucesso!");
      utils.financial.getEntries.invalidate();
      router.push("/dashboard/financeiro/lancamentos");
    },
    onError: (err) => toast.error(err.message)
  });

  // Handlers
  const handleAddSplit = () => {
    setSplits([...splits, { projectId: "", projectStageId: "", amount: 0, percentage: 0 }]);
  };

  const handleRemoveSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, field: string, value: any) => {
    const newSplits = [...splits];
    newSplits[index][field] = value;

    // Recalculate percentage if amount changes, or vice versa
    if (field === "amount" && form.amount > 0) {
      newSplits[index].percentage = (value / form.amount) * 100;
    } else if (field === "percentage" && form.amount > 0) {
      newSplits[index].amount = (value / 100) * form.amount;
    }

    setSplits(newSplits);
  };

  const handleCostCenterChange = (value: string) => {
    setForm({...form, payerType: value});
    if (value === "Obra") {
      if (splits.length === 0) {
        setSplits([{ projectId: "", projectStageId: "", amount: form.amount, percentage: 100 }]);
      }
    } else {
      setSplits([]);
    }
  };


  const handleSave = (saveAndNew = false) => {
    if (!form.description || form.amount <= 0 || !form.contactId) {
      toast.error("Por favor, preencha os campos obrigatórios (Descrição, Valor e Favorecido).");
      return;
    }

    const totalSplit = splits.reduce((acc, s) => acc + s.amount, 0);
    if (splits.length > 0 && Math.abs(totalSplit - form.amount) > 0.01) {
      toast.error("A soma dos rateios deve ser igual ao valor total do lançamento.");
      return;
    }

    createEntry.mutate({
      ...form,
      splits: splits.length > 0 ? splits : undefined
    }, {
      onSuccess: () => {
        if (saveAndNew) {
          setForm({
            ...form,
            description: "",
            amount: 0,
            documentNumber: "",
            status: "PENDING",
          });
          setSplits([]);
        }
      }
    });
  };

  if (isLoadingOptions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9]">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#f8fafc] border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-slate-500 hover:bg-white border hover:border-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            Lançamentos <span className="p-1 px-1.5 bg-slate-200 text-slate-500 rounded text-[10px] font-bold">i</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-[#56ab2f] hover:bg-[#4a9328] text-white h-7 text-[11px] font-bold gap-1 px-3">
            <Plus className="w-3 h-3" /> Novo
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-blue-400 border-blue-400 text-white hover:bg-blue-500"><Save className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7 text-slate-400 border-slate-200 bg-white"><X className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7 text-slate-400 border-slate-200 bg-white"><ChevronDown className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        
        {/* Sticky Header Row Model */}
        <div className="bg-white border border-slate-200 rounded p-0 overflow-hidden shadow-sm">
          <div className="grid grid-cols-[100px_140px_200px_1fr_120px_180px_120px_120px_180px_40px] border-b border-slate-100 bg-slate-50/50">
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Lançamento</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Valor</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Pago a</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Descrição</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">N. Doc</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Categoria</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Condição</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Vencimento</div>
             <div className="p-2 border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Centro de Custo</div>
             <div className="p-2"></div>
          </div>
          <div className="grid grid-cols-[100px_140px_200px_1fr_120px_180px_120px_120px_180px_40px] p-1.5 items-center gap-2">
            <Input type="date" className="h-8 text-[11px] px-2 bg-slate-50 border-slate-200" value={form.competencyDate} onChange={e => setForm({...form, competencyDate: e.target.value})} />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">R$</span>
              <Input type="number" step="0.01" className="h-8 text-[11px] pl-7 border-slate-200" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
            </div>
            <Select value={form.contactId} onValueChange={v => setForm({...form, contactId: v})}>
              <SelectTrigger className="h-8 text-[11px] border-slate-200"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {options?.contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="h-8 text-[11px] border-slate-200" placeholder="Descrição curta" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <Input className="h-8 text-[11px] border-slate-200" value={form.documentNumber} onChange={e => setForm({...form, documentNumber: e.target.value})} />
            <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
              <SelectTrigger className="h-8 text-[11px] border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Geral">Geral</SelectItem>
                <SelectItem value="Materiais">Materiais</SelectItem>
                <SelectItem value="Mão de Obra">Mão de Obra</SelectItem>
                <SelectItem value="Impostos">Impostos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.paymentCondition} onValueChange={v => setForm({...form, paymentCondition: v})}>
              <SelectTrigger className="h-8 text-[11px] border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="À Vista">À Vista</SelectItem>
                <SelectItem value="30 Dias">30 Dias</SelectItem>
                <SelectItem value="60 Dias">60 Dias</SelectItem>
                <SelectItem value="Custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="h-8 text-[11px] border-slate-200" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            <Select value={form.payerType} onValueChange={handleCostCenterChange}>
              <SelectTrigger className="h-8 text-[11px] border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Empresa">Empresa</SelectItem>
                <SelectItem value="Obra">Obra</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-7 w-7 bg-orange-100 text-orange-500 hover:bg-orange-200"><ArrowLeft className="w-3.5 h-3.5 rotate-180" /></Button>
          </div>
        </div>

        {/* Detailed Section */}
        <div className="grid grid-cols-[380px_1fr] gap-4 flex-1 min-h-0">
          
          {/* Left Column: Additional Info */}
          <div className="bg-[#cbd5e1]/30 border border-slate-300 rounded p-4 flex flex-col gap-3 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Competência:</Label>
                <Input type="date" className="h-8 text-[11px] bg-white border-slate-300" value={form.competencyDate} onChange={e => setForm({...form, competencyDate: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">Quem Paga: <span className="p-0.5 bg-slate-200 text-slate-500 text-[8px] rounded-full px-1">i</span></Label>
                <Select value={form.payerType} onValueChange={handleCostCenterChange}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Empresa">Empresa</SelectItem>
                    <SelectItem value="Obra">Obra</SelectItem>
                    <SelectItem value="Direto">Cliente/Direto</SelectItem>
                  </SelectContent>
                </Select>

              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Forma Pgto:</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm({...form, paymentMethod: v})}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="TED">TED/DOC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Conta:</Label>
                <Select value={form.bankAccountId} onValueChange={v => setForm({...form, bankAccountId: v})}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {options?.bankAccounts.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Ordem de compra:</Label>
                <Select value={form.purchaseOrderId} onValueChange={v => setForm({...form, purchaseOrderId: v})}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {options?.purchaseOrders.map((po: any) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.number} - R$ {(po.quote.suppliers[0]?.totalPrice || 0).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Entrada Estoque:</Label>
                <Select value={form.goodsReceiptId} onValueChange={v => setForm({...form, goodsReceiptId: v})}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {options?.goodsReceipts.map(gr => (
                      <SelectItem key={gr.id} value={gr.id}>Rec. {format(new Date(gr.createdAt), 'dd/MM')} (PO {gr.purchaseOrder.number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">Contrato: <span className="p-0.5 bg-slate-200 text-slate-500 text-[8px] rounded-full px-1">i</span></Label>
                <Select value={form.contractId} onValueChange={v => setForm({...form, contractId: v})}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {options?.contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.supplierName} - {c.project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">Medição: <span className="p-0.5 bg-slate-200 text-slate-500 text-[8px] rounded-full px-1">i</span></Label>
                <Select value={form.measurementId} onValueChange={v => setForm({...form, measurementId: v})}>
                  <SelectTrigger className="h-8 text-[11px] bg-white border-slate-300"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {options?.measurements.map(m => (
                      <SelectItem key={m.id} value={m.id}>Med. R$ {m.netValue.toFixed(2)} ({m.contract.supplierName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 font-bold uppercase line-through">Retenções:</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" className="h-8 text-[11px] bg-slate-200 border-slate-300" disabled value={form.retentions} />
                <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-300"><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 font-bold uppercase">Observações:</Label>
              <Textarea className="h-20 text-[11px] bg-white border-slate-300 resize-none" value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 font-bold uppercase">Arquivos:</Label>
              <div className="border-2 border-dashed border-slate-400 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-[#cbd5e1]/10 hover:bg-[#cbd5e1]/20 transition-colors cursor-pointer group">
                 <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                 <span className="text-[10px] text-slate-500 font-medium">Clique ou arraste aqui</span>
              </div>
            </div>
          </div>

          {/* Right Column: Splits / Appropriation */}
          <div className="bg-white border border-slate-200 rounded flex flex-col shadow-sm">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="grid grid-cols-[1fr_1fr_120px_100px_80px] w-full text-[10px] font-bold text-slate-500 uppercase">
                 <span>Obra</span>
                 <span>Etapa / Item</span>
                 <span className="text-right pr-4">Valor</span>
                 <span className="text-right pr-4">Porcentagem</span>
                 <span></span>
              </div>
            </div>

            
            <div className="flex-1 overflow-auto bg-white min-h-[300px]">

              {splits.length === 0 ? (
                <span className="text-slate-300 text-xs italic">Nenhum centro de custo adicionado</span>
              ) : (
                <div className="w-full flex flex-col">
                  {splits.map((split, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_120px_100px_80px] gap-0 items-center border-b border-slate-50 hover:bg-slate-50/50 transition-colors py-1 px-4">
                      <Select value={split.projectId} onValueChange={v => handleSplitChange(index, "projectId", v)}>
                        <SelectTrigger className="h-8 text-[11px] border-none shadow-none bg-transparent focus:ring-0 focus:bg-white px-0"><SelectValue placeholder="Selecione a Obra" /></SelectTrigger>
                        <SelectContent className="text-[11px]">
                          {(options?.projects as any[])?.filter((p: any) => p && p.id).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ""}{p.name}</SelectItem>
                          ))}
                        </SelectContent>

                      </Select>
                      <Select value={split.projectStageId} onValueChange={v => handleSplitChange(index, "projectStageId", v)}>
                        <SelectTrigger className="h-8 text-[11px] border-none shadow-none bg-transparent focus:ring-0 focus:bg-white px-0"><SelectValue placeholder="Selecione a Etapa" /></SelectTrigger>
                        <SelectContent>
                          {options?.projects.find(p => p.id === split.projectId)?.stages.map((s, sIdx) => (
                            <SelectItem key={s.id} value={s.id}>Etapa {sIdx + 1} - {s.name}</SelectItem>
                          ))}
                        </SelectContent>

                      </Select>
                      <div className="relative pr-4">
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="h-8 text-[11px] border-none shadow-none bg-transparent focus:ring-0 focus:bg-white text-right pr-0" 
                          value={split.amount} 
                          onChange={e => handleSplitChange(index, "amount", parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                      <div className="relative pr-4">
                        <div className="flex items-center justify-end">
                          <Input 
                            type="number" 
                            step="0.1" 
                            className="h-8 text-[11px] border-none shadow-none bg-transparent focus:ring-0 focus:bg-white text-right w-16 pr-1" 
                            value={split.percentage} 
                            onChange={e => handleSplitChange(index, "percentage", parseFloat(e.target.value) || 0)} 
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleRemoveSplit(index)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

              )}
            </div>

            <div className="p-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex gap-2">
                 <div className="flex items-center overflow-hidden rounded border border-[#56ab2f]">
                    <Button 
                      variant="ghost" 
                      className="h-7 text-[10px] font-bold uppercase gap-1 text-white bg-[#56ab2f] hover:bg-[#4a9328] rounded-none px-3 border-r border-[#4a9328]" 
                      onClick={handleAddSplit}
                    >
                      <Plus className="w-3 h-3" /> Centro de Custo
                    </Button>
                    <div className="bg-[#56ab2f] h-7 px-1.5 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                 </div>

                 <div className="flex items-center overflow-hidden rounded border border-[#4eb9d9]">
                    <Button 
                      variant="ghost" 
                      className="h-7 text-[10px] font-bold uppercase gap-1 text-white bg-[#4eb9d9] hover:bg-[#43a1bc] rounded-none px-3 border-r border-[#43a1bc]" 
                      disabled
                    >
                      Apropriar insumos
                    </Button>
                    <div className="bg-white h-7 w-7 flex items-center justify-center">
                      {/* Box vazio como no mockup */}
                    </div>
                 </div>
               </div>

               <div className="flex gap-8 pr-12">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-bold text-slate-700">R$ {splits.reduce((acc, s) => acc + s.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[11px] font-bold ${Math.abs(splits.reduce((acc, s) => acc + s.percentage, 0) - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                      {splits.reduce((acc, s) => acc + s.percentage, 0).toFixed(0)}%
                    </span>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Bar Actions */}
      <div className="px-6 py-2 bg-[#cbd5e1]/40 border-t border-slate-300 flex items-center justify-between">
        <div className="text-[10px] text-slate-500 font-medium">
          Responsável:<br />
          <span className="font-bold flex items-center gap-1">Desenvolvedor <span className="p-0.5 bg-slate-300 rounded-full h-1 w-1" /> ONLINE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox id="pago" checked={form.status === 'PAID'} onCheckedChange={checked => setForm({...form, status: checked ? 'PAID' : 'PENDING'})} />
            <Label htmlFor="pago" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">Pago <span className="p-0.5 bg-slate-300 text-slate-500 text-[8px] rounded-full px-1 cursor-help">i</span></Label>
          </div>
          <Button variant="outline" className="h-8 text-[11px] font-bold text-[#56ab2f] border-slate-300 bg-white hover:bg-[#56ab2f]/10" onClick={() => handleSave(true)} disabled={createEntry.isPending}>
             Salvar e inserir novo
          </Button>
          <Button className="h-8 text-[11px] font-bold bg-[#56ab2f] hover:bg-[#4a9328] text-white px-6" onClick={() => handleSave(false)} disabled={createEntry.isPending}>
            {createEntry.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
          <Button variant="destructive" className="h-8 text-[11px] font-bold bg-[#e74c3c] hover:bg-[#c0392b] text-white gap-2 px-4 shadow-md" onClick={() => router.back()}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
