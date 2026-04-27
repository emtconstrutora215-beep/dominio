"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { 
  Plus, Save, ArrowLeft, ChevronDown, Loader2, 
  Calculator, Info, Pencil, Check, Clock, Trash2, X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

interface Retention {
  id: string;
  type: string;
  percentage: number;
  amount: number;
}

export default function NovoFaturamentoPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Queries
  const { data: options, isLoading: isLoadingOptions } = trpc.financial.getCreateOptions.useQuery();

  // State
  const [isRetentionDialogOpen, setIsRetentionDialogOpen] = useState(false);
  const [retentionsList, setRetentionsList] = useState<Retention[]>([]);
  
  const [form, setForm] = useState({
    type: "INCOME" as "INCOME" | "EXPENSE",
    category: "Prestação de Serviços",
    description: "",
    amount: 0, // Bruto
    retentions: 0,
    dueDate: "",
    competencyDate: format(new Date(), "yyyy-MM-dd"),
    releaseDate: format(new Date(), "yyyy-MM-dd"),
    documentNumber: "",
    paymentCondition: "À Vista",
    paymentMethod: "Boleto",
    contactId: "",
    bankAccountId: "",
    costCenter: "COMPANY",
    observations: "",
    status: "PENDING" as "PENDING" | "PAID",
    receiptDate: "",
    salespersonId: "",
    installments: 0,
  });

  // Sync retentions total with form
  useEffect(() => {
    const total = retentionsList.reduce((acc, curr) => acc + curr.amount, 0);
    setForm(prev => ({ ...prev, retentions: total }));
  }, [retentionsList]);

  // Derived Data
  const netValue = useMemo(() => {
    return form.amount - form.retentions;
  }, [form.amount, form.retentions]);

  // Mutations
  const createEntry = trpc.financial.createEntry.useMutation({
    onSuccess: () => {
      toast.success("Faturamento salvo com sucesso!");
      utils.financial.getEntries.invalidate();
      router.push("/dashboard/financeiro/faturamentos");
    },
    onError: (err) => toast.error(err.message)
  });

  // Handlers
  const handleSave = () => {
    if (!form.competencyDate || !form.costCenter || !form.bankAccountId || !form.dueDate) {
      toast.error("Por favor, preencha os campos obrigatórios marcados com *.");
      return;
    }

    const isCompany = form.costCenter === "COMPANY";

    createEntry.mutate({
      ...form,
      amount: form.amount,
      payerType: isCompany ? "Empresa" : "Obra",
      splits: isCompany ? undefined : [{
        projectId: form.costCenter,
        percentage: 100,
        amount: form.amount
      }]
    });
  };

  const handleAddRetention = () => {
    setRetentionsList([
      ...retentionsList, 
      { id: Math.random().toString(), type: "", percentage: 0, amount: 0 }
    ]);
  };

  const handleRemoveRetention = (id: string) => {
    setRetentionsList(retentionsList.filter(r => r.id !== id));
  };

  const handleRetentionChange = (id: string, field: keyof Retention, value: any) => {
    setRetentionsList(retentionsList.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === "percentage") {
          updated.amount = (value / 100) * form.amount;
        } else if (field === "amount") {
          updated.percentage = form.amount > 0 ? (value / form.amount) * 100 : 0;
        }
        return updated;
      }
      return r;
    }));
  };

  if (isLoadingOptions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-600">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-700">Novo Faturamento</h1>
        <div className="flex items-center gap-2">
          <Button 
            className="bg-[#56ab2f] hover:bg-[#4a9328] text-white h-8 text-xs font-bold gap-2 px-4 rounded-sm shadow-sm"
            onClick={handleSave}
            disabled={createEntry.isPending}
          >
            <Check className="w-4 h-4" /> Salvar
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 bg-orange-500 border-orange-500 text-white hover:bg-orange-600 rounded-sm shadow-sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">
        
        {/* Dados Gerais Section */}
        <div className="bg-white border border-slate-200 rounded shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Dados Gerais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Data de Lançamento: <span className="text-red-500">*</span></Label>
              <Input type="date" className="h-9 bg-slate-50 border-slate-200 text-xs" value={form.releaseDate} readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Data de Competência: <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input type="date" className="h-9 border-slate-300 text-xs pr-10" value={form.competencyDate} onChange={e => setForm({...form, competencyDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Responsável:</Label>
              <Input className="h-9 bg-slate-50 border-slate-200 text-xs font-bold" value={user?.user_metadata?.full_name || user?.email || "Carregando..."} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Cliente:</Label>
              <Select value={form.contactId} onValueChange={v => setForm({...form, contactId: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white text-slate-400">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {options?.contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Centro de Custo: <Info className="w-3 h-3 text-slate-400" /> <span className="text-red-500">*</span></Label>
              <Select value={form.costCenter} onValueChange={v => setForm({...form, costCenter: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Empresa</SelectItem>
                  {options?.projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Descrição:</Label>
              <Input className="h-9 border-slate-300 text-xs" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Natureza: <span className="text-red-500">*</span></Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white">
                  <SelectValue placeholder="Prestação de Serviços" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="Prestação de Serviços">Prestação de Serviços</SelectItem>
                  <SelectItem value="Execução de Obras">Execução de Obras</SelectItem>
                  <SelectItem value="Medição">Medição</SelectItem>
                  <SelectItem value="Taxa de Administração">Taxa de Administração</SelectItem>
                  <SelectItem value="Bonificação de Economia">Bonificação de Economia</SelectItem>
                  <SelectItem value="Licitação">Licitação</SelectItem>
                  <SelectItem value="Venda de Imóveis">Venda de Imóveis</SelectItem>
                  <SelectItem value="Projetos">Projetos</SelectItem>
                  <SelectItem value="Instalações">Instalações</SelectItem>
                  <SelectItem value="Venda">Venda</SelectItem>
                  <SelectItem value="Contrato">Contrato</SelectItem>
                  <SelectItem value="Aditivo de Contrato">Aditivo de Contrato</SelectItem>
                  <SelectItem value="Venda de Materiais">Venda de Materiais</SelectItem>
                  <SelectItem value="Venda de Equipamentos">Venda de Equipamentos</SelectItem>
                  <SelectItem value="Venda de Bens">Venda de Bens</SelectItem>
                  <SelectItem value="Aluguel de Equipamentos">Aluguel de Equipamentos</SelectItem>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  <SelectItem value="Reembolso">Reembolso</SelectItem>
                  <SelectItem value="Financiamento Bancário">Financiamento Bancário</SelectItem>
                  <SelectItem value="Empréstimo">Empréstimo</SelectItem>
                  <SelectItem value="Aporte de Capital">Aporte de Capital</SelectItem>
                  <SelectItem value="Aporte de Investidor">Aporte de Investidor</SelectItem>
                  <SelectItem value="Juros de Aplicação Financeira">Juros de Aplicação Financeira</SelectItem>
                  <SelectItem value="Juros de Contrato">Juros de Contrato</SelectItem>
                  <SelectItem value="Distrato">Distrato</SelectItem>
                  <SelectItem value="Estorno">Estorno</SelectItem>
                  <SelectItem value="Antecipação de Recebíveis">Antecipação de Recebíveis</SelectItem>
                  <SelectItem value="Crédito de Imposto">Crédito de Imposto</SelectItem>
                  <SelectItem value="Outras Receitas">Outras Receitas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Arquivos:</Label>
              <div className="border-2 border-dashed border-slate-200 rounded p-4 h-24 flex flex-col items-center justify-center gap-1 hover:border-slate-300 transition-colors cursor-pointer group bg-slate-50/50">
                 <div className="flex items-center gap-2">
                    <div className="bg-white p-1 rounded-full shadow-sm">
                       <Plus className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Clique ou arraste aqui</span>
                 </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Observação:</Label>
              <Textarea className="h-24 border-slate-300 text-xs resize-none" value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Dados do Faturamento Section */}
        <div className="bg-white border border-slate-200 rounded shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Dados do Faturamento</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Valor Bruto:</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><Calculator className="w-3.5 h-3.5" /></span>
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  className="h-9 border-slate-300 text-xs pl-14 font-bold" 
                  value={form.amount} 
                  onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Impostos Retidos:</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><Calculator className="w-3.5 h-3.5" /></span>
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  className="h-9 bg-slate-50 border-slate-200 text-xs pl-14 font-bold" 
                  value={form.retentions} 
                  readOnly
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-blue-500 transition-colors"
                  onClick={() => setIsRetentionDialogOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Valor Líquido:</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><Calculator className="w-3.5 h-3.5" /></span>
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <Input className="h-9 bg-slate-50 border-slate-200 text-xs pl-14 font-black text-slate-700" value={netValue.toFixed(2)} readOnly />
              </div>
            </div>
          </div>

          {/* Rest of the form... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Condição de Recebimento:</Label>
              <Select value={form.paymentCondition} onValueChange={v => setForm({...form, paymentCondition: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white">
                  <SelectValue placeholder="À Vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="À Vista">À Vista</SelectItem>
                  <SelectItem value="Parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Data de Vencimento: <span className="text-red-500">*</span></Label>
              <Input type="date" className="h-9 border-slate-300 text-xs" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Quantidade de Parcelas: <span className="text-red-500">*</span></Label>
              <Input type="number" className="h-9 border-slate-300 text-xs" value={form.installments} onChange={e => setForm({...form, installments: parseInt(e.target.value) || 0})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Conta: <span className="text-red-500">*</span></Label>
              <Select value={form.bankAccountId} onValueChange={v => setForm({...form, bankAccountId: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white text-slate-400">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {options?.bankAccounts.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Forma de Recebimento:</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm({...form, paymentMethod: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white text-slate-400">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Antecipação de duplicata">Antecipação de duplicata</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Débito Automático">Débito Automático</SelectItem>
                  <SelectItem value="Depósito em conta">Depósito em conta</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Permuta">Permuta</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Promissória">Promissória</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Data de Recebimento:</Label>
              <Input 
                type="date" 
                className={`h-9 text-xs ${form.status !== 'PAID' ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-60' : 'border-slate-300 bg-slate-50'}`} 
                value={form.receiptDate} 
                onChange={e => setForm({...form, receiptDate: e.target.value})} 
                disabled={form.status !== 'PAID'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">N. Doc:</Label>
              <Input className="h-9 border-slate-300 text-xs" value={form.documentNumber} onChange={e => setForm({...form, documentNumber: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Vendedor: <Info className="w-3 h-3 text-slate-400" /></Label>
              <Select value={form.salespersonId} onValueChange={v => setForm({...form, salespersonId: v})}>
                <SelectTrigger className="h-9 border-slate-300 text-xs bg-white text-slate-400">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="v1">Vendedor Exemplo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Checkbox id="recebido" checked={form.status === 'PAID'} onCheckedChange={checked => setForm({...form, status: checked ? 'PAID' : 'PENDING'})} />
            <Label htmlFor="recebido" className="text-[11px] font-bold text-slate-600 flex items-center gap-1">Recebido <Info className="w-3 h-3 text-slate-400" /></Label>
          </div>

          <div className="mt-4 p-4 border border-blue-100 bg-blue-50/50 rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="bg-blue-500 p-1.5 rounded-sm">
                  <div className="text-white font-bold text-[10px] flex flex-col items-center leading-none">
                    <span>|||</span>
                    <span>|||</span>
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="text-[13px] font-black text-blue-800 leading-tight">Cobrançafácil</span>
                  <p className="text-[10px] text-blue-600">Emita e envie um boleto de cobrança automaticamente desse faturamento.</p>
               </div>
            </div>
            <Button variant="ghost" className="text-blue-600 font-bold text-[11px] flex items-center gap-2 hover:bg-blue-100">
               <div className="flex flex-col gap-0.5">
                  <div className="h-[2px] w-4 bg-blue-600" />
                  <div className="h-[2px] w-4 bg-blue-600" />
                  <div className="h-[2px] w-4 bg-blue-600" />
               </div>
               Emitir boleto
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isRetentionDialogOpen} onOpenChange={setIsRetentionDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Retenções de Impostos</DialogTitle>
            <DialogDescription>Gerencie as retenções de impostos para este faturamento.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col bg-white">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
               <div className="flex items-center gap-2">
                  <div className="bg-[#56ab2f] p-1 rounded">
                     <Calculator className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">Retenções de Impostos</span>
               </div>
               <div className="flex items-center gap-2">
                  <Button 
                    className="bg-[#56ab2f] hover:bg-[#4a9328] text-white h-7 text-[10px] font-bold px-4 rounded-sm"
                    onClick={() => setIsRetentionDialogOpen(false)}
                  >
                    <Check className="w-3 h-3 mr-1" /> Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 bg-orange-500 border-orange-500 text-white hover:bg-orange-600 rounded-sm"
                    onClick={() => setIsRetentionDialogOpen(false)}
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
               </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50/50">
               <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Valor Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <Input className="h-10 bg-white border-slate-200 text-sm font-bold pl-9" value={form.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} readOnly />
                  </div>
               </div>
               <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Valor das Retenções</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <Input className="h-10 bg-slate-100 border-slate-200 text-sm font-bold pl-9 text-red-500" value={form.retentions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} readOnly />
                  </div>
               </div>
               <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Valor Líquido <Info className="w-3 h-3 text-slate-400" /></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <Input className="h-10 bg-slate-100 border-slate-200 text-sm font-black pl-9 text-slate-700" value={netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} readOnly />
                  </div>
               </div>
            </div>

            {/* Retentions Table */}
            <div className="p-6 space-y-4">
               <div className="grid grid-cols-[1fr_80px_180px_40px] gap-4 items-center">
                  <Label className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Tipo de Retenção</Label>
                  <Label className="text-[11px] font-black text-slate-500 uppercase tracking-tight text-center">%</Label>
                  <Label className="text-[11px] font-black text-slate-500 uppercase tracking-tight flex items-center gap-1">Valor Retido <Info className="w-3 h-3 text-slate-400" /></Label>
                  <span></span>
               </div>

               <div className="space-y-3 min-h-[100px] max-h-[300px] overflow-auto pr-2">
                  {retentionsList.map((ret) => (
                    <div key={ret.id} className="grid grid-cols-[1fr_80px_180px_40px] gap-4 items-center animate-in slide-in-from-left-2 duration-200">
                      <Select value={ret.type} onValueChange={(v) => handleRetentionChange(ret.id, 'type', v)}>
                        <SelectTrigger className="h-10 border-slate-200 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COFINS">COFINS</SelectItem>
                          <SelectItem value="CSLL">CSLL</SelectItem>
                          <SelectItem value="ICMS">ICMS</SelectItem>
                          <SelectItem value="INSS">INSS</SelectItem>
                          <SelectItem value="IPI">IPI</SelectItem>
                          <SelectItem value="IR">IR</SelectItem>
                          <SelectItem value="ISS">ISS</SelectItem>
                          <SelectItem value="PIS">PIS</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="relative">
                        <Input 
                          type="number" 
                          className="h-10 border-slate-200 text-sm text-center pr-6" 
                          value={ret.percentage} 
                          onChange={(e) => handleRetentionChange(ret.id, 'percentage', parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                        <Input 
                          type="number" 
                          className="h-10 bg-slate-50 border-slate-200 text-sm pl-9 font-bold" 
                          value={ret.amount} 
                          onChange={(e) => handleRetentionChange(ret.id, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => handleRemoveRetention(ret.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {retentionsList.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
                       <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhuma retenção adicionada</span>
                    </div>
                  )}
               </div>

               <Button 
                 className="bg-[#56ab2f] hover:bg-[#4a9328] text-white h-9 text-xs font-bold gap-2 px-6 rounded shadow-sm"
                 onClick={handleAddRetention}
               >
                 <Plus className="w-4 h-4" /> Retenção
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
