"use client";

import React, { useState, useMemo, Fragment } from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Save,
  ChevronUp,
  Building2,
  FileText,
  Truck,
  CreditCard,
  Share2,
  Printer,
  Search,
  PlusCircle,
  Briefcase,
  DollarSign,
  ArrowLeft,
  MoreVertical,
  ChevronDown,
  MessageSquare
} from "lucide-react";
import { AddBudgetItemDialog } from "@/components/orcamentos/AddBudgetItemDialog";
import { ProjectStageSelectorDialog } from "./ProjectStageSelectorDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TAB_STYLE = "h-12 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent rounded-none px-2 font-black text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-[0.2em] text-[10px]";
const FIELD_LABEL = "text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1";

const formSchema = z.object({
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  freight: z.coerce.number().min(0),
  otherExpenses: z.coerce.number().min(0),
  taxes: z.coerce.number().min(0),
  discounts: z.coerce.number().min(0),
  deliveryDays: z.coerce.number().min(0),
  paymentTerms: z.string().min(1, "Informe a condição de pagamento"),
  installments: z.coerce.number().min(1),
  firstDueDate: z.string().min(1, "Selecione a data de vencimento"),
  category: z.string(),
  orderNumber: z.string().optional(),
  status: z.enum(['OPEN', 'NEGOTIATING', 'PENDING_APPROVAL', 'REJECTED', 'ISSUED', 'AWAITING_RECEIPT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'PARTIALLY_PAID', 'PAID']).default('OPEN'),
  approverId: z.string().optional(),
  billingType: z.enum(['COMPANY', 'CLIENT', 'DIRECT', 'MANUAL']).default('COMPANY'),
  billingManualName: z.string().optional(),
});

type OrderItem = {
  id?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  projectId?: string | null;
  stageId?: string | null;
};

interface OrderFormProps {
  initialData?: any;
  mode: "create" | "edit";
}

export function OrderForm({ initialData, mode }: OrderFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<OrderItem[]>(initialData?.quote?.request?.items || []);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{ projectId: string | null, stageId: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState("itens");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ "HEADQUARTERS-NONE": true });

  const { data: nextNumberData } = trpc.purchasing.getNextOrderNumber.useQuery(undefined, {
    enabled: mode === "create" && !initialData?.number,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: projects = [] } = trpc.projects.getAll.useQuery();
  const { data: users } = trpc.company.getUsers.useQuery();
  const { data: suppliersData } = trpc.contact.list.useQuery({ type: 'SUPPLIER', perPage: 100 });
  
  const suppliers = useMemo(() => suppliersData?.items || [], [suppliersData]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      supplierId: initialData?.quote?.suppliers?.[0]?.id || "",
      freight: initialData?.quote?.suppliers?.[0]?.freight || 0,
      otherExpenses: initialData?.otherExpenses || 0,
      taxes: initialData?.taxes || 0,
      discounts: initialData?.discounts || 0,
      deliveryDays: initialData?.quote?.suppliers?.[0]?.deliveryDays || 0,
      paymentTerms: initialData?.quote?.suppliers?.[0]?.paymentTerms || "À Vista",
      installments: initialData?.financialEntries?.length || 1,
      firstDueDate: initialData?.financialEntries?.[0]?.dueDate 
        ? new Date(initialData.financialEntries[0].dueDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      category: initialData?.financialEntries?.[0]?.category || "Materiais",
      orderNumber: initialData?.number || "",
      status: initialData?.status || "OPEN",
      approverId: initialData?.approverId || "",
      billingType: initialData?.billingType || "COMPANY",
      billingManualName: initialData?.billingManualName || "",
    },
  });

  // Auto-fill order number on create
  React.useEffect(() => {
    if (mode === "create" && nextNumberData && !form.getValues("orderNumber")) {
      form.setValue("orderNumber", nextNumberData);
    }
  }, [nextNumberData, mode, form]);

  const createOrder = trpc.purchasing.createDirectOrder.useMutation({
    onSuccess: () => {
      toast.success("Ordem de compra criada com sucesso!");
      router.push("/dashboard/compras/ordens");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateOrder = trpc.purchasing.updateDirectOrder.useMutation({
    onSuccess: () => {
      toast.success("Ordem de compra atualizada com sucesso!");
      router.push("/dashboard/compras/ordens");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item à ordem");
      return;
    }
    const selectedSupplier = suppliers.find(s => s.id === values.supplierId);
    const sanitizedItems = items.map(({ id, ...rest }) => rest);

    if (mode === "create") {
      createOrder.mutate({ 
        ...values, 
        items: sanitizedItems, 
        supplierName: selectedSupplier?.name || "Fornecedor Direto" 
      });
    } else {
      updateOrder.mutate({ 
        ...values, 
        items: sanitizedItems, 
        supplierName: selectedSupplier?.name || "Fornecedor Direto", 
        orderId: initialData.id 
      });
    }
  };

  const itemsAmount = useMemo(() => 
    items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
  [items]);

  const totalValue = useMemo(() => {
    const v = form.watch();
    return itemsAmount + (v.freight || 0) + (v.otherExpenses || 0) + (v.taxes || 0) - (v.discounts || 0);
  }, [itemsAmount, form.watch("freight"), form.watch("otherExpenses"), form.watch("taxes"), form.watch("discounts")]);

  const isBlocked = initialData?.status === 'RECEIVED' || initialData?.status === 'PARTIALLY_RECEIVED';

  const groupedItems = useMemo(() => {
    const groups: Record<string, OrderItem[]> = {};
    items.forEach(item => {
      const key = `${item.projectId || 'HEADQUARTERS'}-${item.stageId || 'NONE'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f8fafc] font-sans antialiased text-slate-900 overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          
          {/* 1. TOP HEADER - INSTITUTIONAL PREMIUM */}
          <div className="bg-white border-b border-slate-200 flex-none px-6 py-4 shadow-sm z-40">
            <div className="max-w-[1700px] mx-auto flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="pr-6 border-r border-slate-100">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">COMPRAS</span>
                   <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Ordem de Compra</h1>
                </div>

                <div className="flex items-center gap-10">
                  <HeaderMetric label="VALOR TOTAL" value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <HeaderMetric label="CRIAÇÃO" value={mode === "create" ? format(new Date(), 'dd/MM/yyyy') : format(new Date(initialData?.createdAt), 'dd/MM/yyyy')} />
                  <HeaderMetric label="CRIADO POR" value="Usuário Logado" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <Button variant="outline" type="button" className="h-10 px-4 bg-white border-slate-200 text-slate-600 font-bold gap-2 hover:bg-slate-50 transition-all rounded-xl shadow-sm">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    $ Lançamento
                 </Button>
                 <Button type="submit" disabled={isBlocked} className="h-10 px-6 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black gap-2 transition-all rounded-xl shadow-lg shadow-green-100 uppercase text-xs tracking-wider">
                    <Save className="w-4 h-4" />
                    Salvar
                 </Button>
                 <Button variant="outline" size="icon" type="button" className="h-10 w-10 bg-white border-slate-200 text-slate-600 rounded-xl">
                    <MoreVertical className="w-4 h-4" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   type="button" 
                   onClick={() => router.back()}
                   className="h-10 w-10 p-0 text-orange-500 hover:bg-orange-50 rounded-xl"
                 >
                    <ArrowLeft className="w-6 h-6" />
                 </Button>
              </div>
            </div>
          </div>

          {/* 2. METADATA BAR (QUICK INFO) */}
          <div className="bg-[#fcfdff] border-b border-slate-100 px-6 py-4 flex-none z-30">
             <div className="max-w-[1700px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8 flex-1">
                   <div className="w-[100px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">Número:</span>
                      <Input value={form.watch("orderNumber") || "Auto"} disabled className="h-10 bg-slate-50/50 border-slate-100 font-black text-slate-400 rounded-xl" />
                   </div>
                   
                   <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem className="w-[300px] space-y-1.5">
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fornecedor:</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBlocked}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-slate-700 rounded-xl focus:ring-blue-500/20">
                                <SelectValue placeholder="Selecione o fornecedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                   <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="w-[220px] space-y-1.5">
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Aprovação:</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBlocked}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-slate-700 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="OPEN" className="font-bold">Em aberto</SelectItem>
                              <SelectItem value="NEGOTIATING" className="font-bold">Negociando</SelectItem>
                              <SelectItem value="PENDING_APPROVAL" className="font-bold">Aguardando aprovação</SelectItem>
                              <SelectItem value="ISSUED" className="font-bold">Aprovado</SelectItem>
                              <SelectItem value="REJECTED" className="font-bold">Negado</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                </div>

                <div className="flex items-center gap-2 pl-6 border-l border-slate-100 ml-6">
                   <ToolButton icon={<MessageSquare className="w-4 h-4" />} color="text-emerald-500 hover:bg-emerald-50" />
                   <ToolButton icon={<Share2 className="w-4 h-4" />} color="text-blue-500 hover:bg-blue-50" />
                   <ToolButton icon={<Printer className="w-4 h-4" />} color="text-slate-500 hover:bg-slate-50" />
                </div>
             </div>
          </div>

          {/* 3. TABS NAVIGATION */}
          <div className="px-6 bg-white border-b border-slate-200 z-20 flex-none overflow-x-auto">
             <div className="max-w-[1700px] mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
                  <TabsList className="h-12 bg-transparent p-0 gap-8">
                    <TabsTrigger value="itens" className={TAB_STYLE}>Itens</TabsTrigger>
                    <TabsTrigger value="informações" className={TAB_STYLE}>Informações</TabsTrigger>
                    <TabsTrigger value="resumo" className={TAB_STYLE}>Resumo da Compra</TabsTrigger>
                    <TabsTrigger value="arquivos" className={TAB_STYLE}>Arquivos</TabsTrigger>
                  </TabsList>
                </Tabs>
             </div>
          </div>

          {/* 4. MAIN CONTENT AREA (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
            <div className="max-w-[1700px] mx-auto p-6">
               <Tabs value={activeTab} className="w-full">
                  <TabsContent value="itens" className="m-0 outline-none space-y-6">
                    {items.length === 0 ? (
                      <EmptyState onObra={() => setIsProjectSelectorOpen(true)} onEmpresa={() => {
                        setItems([...items, { description: "", unit: "un", quantity: 1, unitPrice: 0, projectId: null, stageId: null }]);
                        setExpandedGroups({ "HEADQUARTERS-NONE": true });
                      }} />
                    ) : (
                      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-b border-slate-200 h-10">
                              <TableHead className="w-[80px] text-center font-black text-slate-400 text-[10px] uppercase tracking-wider pl-4">Item</TableHead>
                              <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Descrição</TableHead>
                              <TableHead className="w-[100px] text-center font-black text-slate-500 text-[10px] uppercase tracking-wider">Unidade</TableHead>
                              <TableHead className="w-[120px] text-center font-black text-slate-500 text-[10px] uppercase tracking-wider">Quantidade</TableHead>
                              <TableHead className="w-[160px] text-right font-black text-slate-500 text-[10px] uppercase tracking-wider">Valor Unitário</TableHead>
                              <TableHead className="w-[160px] text-right font-black text-slate-500 text-[10px] uppercase tracking-wider pr-4">Valor</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
                              const [projId, stageId] = groupKey.split('-');
                              const project = projects?.find(p => p.id === projId);
                              const stage = project?.stages.find(s => s.id === stageId);
                              const isExpanded = expandedGroups[groupKey] !== false;

                              return (
                                <Fragment key={groupKey}>
                                  <TableRow 
                                    className="bg-slate-50/60 hover:bg-slate-100/80 border-y border-slate-200 cursor-pointer select-none h-11"
                                    onClick={() => toggleGroup(groupKey)}
                                  >
                                    <TableCell colSpan={7} className="py-0 px-5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                                              <Building2 className="w-3.5 h-3.5 text-orange-600" />
                                            </div>
                                            <span className="text-xs font-black text-slate-700 uppercase">{project?.name || "Empresa"}</span>
                                          </div>
                                          {stage && (
                                            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                              </div>
                                              <span className="text-xs font-bold text-slate-500 uppercase">{stage.name}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                           <Button 
                                             size="sm" 
                                             type="button"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setItems([...items, { description: "", unit: "un", quantity: 1, unitPrice: 0, projectId: projId === "HEADQUARTERS" ? null : projId, stageId: stageId === "NONE" ? null : stageId }]);
                                               if (!isExpanded) toggleGroup(groupKey);
                                             }}
                                             className="h-7 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black px-3 rounded-lg text-[9px] uppercase shadow-sm"
                                           >
                                             <Plus className="w-3 h-3 mr-1" /> Item
                                           </Button>
                                           <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && groupItems.map((item, idx) => {
                                    const gIdx = items.indexOf(item);
                                    return (
                                      <TableRow key={gIdx} className="hover:bg-blue-50/10 border-b border-slate-50 last:border-0 h-16 group">
                                        <TableCell className="text-center font-bold text-slate-300 text-xs">{gIdx + 1}</TableCell>
                                        <TableCell>
                                          <Input 
                                            value={item.description} 
                                            onChange={e => setItems(items.map((it, i) => i === gIdx ? {...it, description: e.target.value} : it))}
                                            className="h-9 border-transparent hover:border-slate-200 bg-transparent font-bold text-slate-700 focus:bg-white focus:border-blue-400 rounded-lg transition-all" 
                                          />
                                        </TableCell>
                                        <TableCell><Input value={item.unit} onChange={e => setItems(items.map((it, i) => i === gIdx ? {...it, unit: e.target.value} : it))} className="h-9 w-12 mx-auto text-center border-transparent hover:border-slate-200 bg-transparent font-bold" /></TableCell>
                                        <TableCell><Input type="number" value={item.quantity} onChange={e => setItems(items.map((it, i) => i === gIdx ? {...it, quantity: parseFloat(e.target.value)} : it))} className="h-9 w-20 mx-auto text-center border-transparent hover:border-slate-200 bg-transparent font-bold" /></TableCell>
                                        <TableCell><Input type="number" value={item.unitPrice} onChange={e => setItems(items.map((it, i) => i === gIdx ? {...it, unitPrice: parseFloat(e.target.value)} : it))} className="h-9 w-28 ml-auto text-right border-transparent hover:border-slate-200 bg-transparent font-bold" /></TableCell>
                                        <TableCell className="text-right font-black text-slate-800 pr-5 tracking-tight tabular-nums">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell>
                                          <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== gIdx))} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="informações" className="m-0 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <SectionCard icon={<Truck className="w-4 h-4 text-orange-500" />} title="LOGÍSTICA & ENTREGA" bgColor="bg-orange-50">
                           <FormField control={form.control} name="deliveryDays" render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                 <FormLabel className={FIELD_LABEL}>Prazo de Entrega (dias):</FormLabel>
                                 <Input type="number" {...field} className="h-11 bg-slate-50 border-slate-200 font-bold rounded-xl" />
                              </FormItem>
                           )} />
                        </SectionCard>
                        <SectionCard icon={<CreditCard className="w-4 h-4 text-emerald-500" />} title="DADOS FINANCEIROS & FATURAMENTO" bgColor="bg-emerald-50">
                           <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                       <FormLabel className={FIELD_LABEL}>Condição de Pagamento:</FormLabel>
                                       <Input {...field} className="h-11 bg-slate-50 border-slate-200 font-bold rounded-xl" />
                                    </FormItem>
                                 )} />
                                 <FormField control={form.control} name="firstDueDate" render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                       <FormLabel className={FIELD_LABEL}>1º Vencimento:</FormLabel>
                                       <Input type="date" {...field} className="h-11 bg-slate-50 border-slate-200 font-bold rounded-xl" />
                                    </FormItem>
                                 )} />
                              </div>

                              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <FormField
                                    control={form.control}
                                    name="billingType"
                                    render={({ field }) => (
                                      <FormItem className="space-y-1.5">
                                        <FormLabel className={FIELD_LABEL}>Faturamento:</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBlocked}>
                                          <FormControl>
                                            <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-bold rounded-xl">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent className="rounded-xl">
                                            <SelectItem value="COMPANY" className="font-bold">Empresa</SelectItem>
                                            <SelectItem value="CLIENT" className="font-bold">Cliente</SelectItem>
                                            <SelectItem value="DIRECT" className="font-bold">Faturamento Direto</SelectItem>
                                            <SelectItem value="MANUAL" className="font-bold">Manualmente</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />

                                {form.watch("billingType") === 'MANUAL' && (
                                  <FormField
                                      control={form.control}
                                      name="billingManualName"
                                      render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                          <FormLabel className={FIELD_LABEL}>Nome Manual:</FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="Digite o nome..." className="h-11 bg-slate-50 border-slate-200 font-bold rounded-xl" />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                )}
                              </div>
                           </div>
                        </SectionCard>
                     </div>
                  </TabsContent>
               </Tabs>
            </div>
          </div>

          {/* 5. FINANCIAL ADJUSTMENTS BAR */}
          <div className="bg-white border-t border-slate-200 px-6 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex-none">
             <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-10">
                <div className="grid grid-cols-4 gap-4 flex-1">
                   <FinancialInput label="(+) Frete:" name="freight" form={form} disabled={isBlocked} />
                   <FinancialInput label="(+) Despesas:" name="otherExpenses" form={form} disabled={isBlocked} />
                   <FinancialInput label="(+) Impostos:" name="taxes" form={form} disabled={isBlocked} />
                   <FinancialInput label="(-) Desconto:" name="discounts" form={form} disabled={isBlocked} type="discount" />
                </div>
                <div className="flex flex-col items-end min-w-max border-l border-slate-100 pl-10">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Pagar:</span>
                   <div className="flex items-baseline gap-2">
                      <span className="text-xs font-black text-slate-400">R$</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                         {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                   </div>
                </div>
             </div>
          </div>

          {/* 6. GLOBAL FOOTER ACTIONS */}
          <div className="bg-[#f1f5f9] border-t border-slate-200 px-6 py-3 flex-none">
             <div className="max-w-[1700px] mx-auto flex items-center gap-3">
                <Button variant="outline" type="button" className="h-9 px-4 bg-white border-slate-300 text-slate-600 font-bold text-[11px] uppercase gap-2 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
                   <Search className="w-3.5 h-3.5 text-emerald-500" />
                   Buscar solicitação
                </Button>
             </div>
          </div>

        </form>
      </Form>

      {/* DIALOGS */}
      <ProjectStageSelectorDialog 
        isOpen={isProjectSelectorOpen} onClose={() => setIsProjectSelectorOpen(false)} projects={projects}
        onConfirm={(projectId, stageId) => {
          setSelectedContext({ projectId, stageId });
          setIsProjectSelectorOpen(false);
          setIsAddItemDialogOpen(true);
        }}
      />
      {!isBlocked && (
        <AddBudgetItemDialog
          isOpen={isAddItemDialogOpen} onClose={() => setIsAddItemDialogOpen(false)}
          onConfirm={(selection: any) => {
            setItems([...items, {
              description: selection.description, unit: selection.unit, quantity: selection.quantity || 1,
              unitPrice: selection.unitCost || selection.computedCost || 0,
              projectId: selectedContext?.projectId || null, stageId: selectedContext?.stageId || null
            }]);
            setIsAddItemDialogOpen(false);
          }}
          title="Buscar no Catálogo" type="INPUT"
        />
      )}
    </div>
  );
}

// SUBCOMPONENTS
function HeaderMetric({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-base font-black text-slate-900 tracking-tight leading-none">{value}</span>
    </div>
  );
}

function ToolButton({ icon, color }: { icon: React.ReactNode, color: string }) {
  return (
    <Button variant="ghost" size="icon" type="button" className={cn("h-9 w-9 rounded-xl transition-all", color)}>
      {icon}
    </Button>
  );
}

function SectionCard({ icon, title, bgColor, children }: { icon: React.ReactNode, title: string, bgColor: string, children: React.ReactNode }) {
  return (
     <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-6">
           <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-6">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bgColor)}>{icon}</div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h3>
           </div>
           {children}
        </div>
     </Card>
  );
}

function FinancialInput({ label, name, form, disabled, type }: { label: string, name: any, form: any, disabled: boolean, type?: string }) {
  return (
    <div className="space-y-1">
       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</span>
       <div className={cn("flex items-center gap-2 px-3 h-9 bg-slate-50 rounded-lg border transition-all focus-within:ring-2", 
          type === "discount" ? "border-red-100 focus-within:border-red-400 focus-within:ring-red-50" : "border-slate-200 focus-within:border-blue-400 focus-within:ring-blue-50")}>
          <span className="text-[10px] font-bold text-slate-300">R$</span>
          <input 
            type="number" step="0.01" disabled={disabled}
            className={cn("bg-transparent border-0 outline-none w-full text-xs font-bold tabular-nums", 
               type === "discount" ? "text-red-600 placeholder:text-red-200" : "text-slate-700 placeholder:text-slate-300")}
            {...form.register(name, { valueAsNumber: true })}
            placeholder="0,00"
          />
       </div>
    </div>
  );
}

function EmptyState({ onObra, onEmpresa }: { onObra: () => void, onEmpresa: () => void }) {
  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 flex flex-col items-center justify-center text-center shadow-inner">
       <p className="text-slate-400 font-bold text-lg mb-10 max-w-sm px-6">
         Selecione o destino da compra para começar a adicionar itens
       </p>
       <div className="flex flex-wrap justify-center gap-4">
          <Button type="button" onClick={onObra} className="h-14 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black px-8 rounded-2xl gap-3 transition-all active:scale-95 shadow-lg shadow-blue-100/50">
             <PlusCircle className="w-5 h-5" /> + Obra
          </Button>
          <Button type="button" onClick={onEmpresa} className="h-14 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black px-8 rounded-2xl gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-100/50">
             <Briefcase className="w-5 h-5" /> + Empresa
          </Button>
       </div>
    </div>
  );
}
