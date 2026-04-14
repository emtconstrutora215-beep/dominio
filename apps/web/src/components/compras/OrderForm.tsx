"use client";

import React, { useState, useMemo, useEffect, Fragment } from "react";
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
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  BadgeDollarSign,
  Loader2,
  PackageSearch,
  Lock,
  Save,
  Calendar,
  User,
  CheckCircle2,
  MoreVertical,
  ChevronUp,
  Building2,
  FileText,
  Truck,
  CreditCard,
  Phone,
  Share2,
  Printer,
  Search,
  PlusCircle,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { AddBudgetItemDialog } from "@/components/orcamentos/AddBudgetItemDialog";
import { ProjectStageSelectorDialog } from "./ProjectStageSelectorDialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
  approverId: z.string().optional(),
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

  const { data: projects = [] } = trpc.projects.getAll.useQuery();
  const { data: users } = trpc.company.getUsers.useQuery();
  const { data: suppliersData } = trpc.contact.list.useQuery({ type: 'SUPPLIER', perPage: 100 });
  
  const suppliers = useMemo(() => 
    suppliersData?.items || [], 
  [suppliersData]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
      approverId: initialData?.approverId || "",
    },
  });

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

    const payload = {
      ...values,
      items,
      supplierName: selectedSupplier?.name || "Fornecedor Direto",
    };

    if (mode === "create") {
      createOrder.mutate(payload);
    } else {
      updateOrder.mutate({ ...payload, orderId: initialData.id });
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

  const isPending = createOrder.isPending || updateOrder.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f8fafc] font-sans antialiased text-slate-900 overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* 1. TOP HEADER - PREMIUM ERP STYLE */}
          <div className="bg-white border-b border-slate-200 flex-none px-6 py-4 shadow-sm z-40">
            <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="pr-6 border-r border-slate-100">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">COMPRAS</span>
                   <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-2">
                     Ordem de Compra
                   </h1>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">VALOR TOTAL</span>
                    <div className="flex items-baseline gap-1">
                       <span className="text-xs font-black text-slate-400 uppercase leading-none">R$</span>
                       <span className="text-xl font-black text-slate-900 tracking-tighter leading-none tabular-nums">
                        {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                       </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CRIAÇÃO</span>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-0 h-6 px-3 rounded text-xs">
                       {mode === "create" ? format(new Date(), 'dd/MM/yyyy') : format(new Date(initialData?.createdAt), 'dd/MM/yyyy')}
                    </Badge>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CRIADO POR</span>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 font-bold border-0 h-6 px-3 rounded text-xs">
                       Administrador
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" className="h-9 border-slate-200 bg-white font-bold text-slate-600 gap-2 hover:bg-slate-50">
                   <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
                   $ Lançamento
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending || isBlocked} 
                  className="h-9 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black px-6 border-0 gap-2 shadow-sm active:scale-95 transition-all"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
                <Link href="/dashboard/compras/ordens">
                  <Button variant="outline" type="button" className="h-9 w-9 p-0 border-0 bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* 2. SCROLLABLE CONTENT AREA */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f8fafc]">
            {/* METADATA BAR (FIELDS BELOW HEADER) */}
            <div className="bg-[#f8fafc] border-b border-slate-200 px-6 py-4">
               <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-end gap-6">
                  <div className="w-32">
                    <FormField
                      control={form.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Número:</FormLabel>
                          <FormControl>
                            <Input className="h-9 bg-white border-slate-200 font-bold text-slate-700" {...field} placeholder="Automático" disabled={isBlocked} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-[300px]">
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                            Fornecedor: <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isBlocked}>
                            <FormControl>
                              <SelectTrigger className="h-9 bg-white border-slate-200 font-bold text-slate-700">
                                <SelectValue placeholder="Selecione um fornecedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="w-64">
                     <FormField
                      control={form.control}
                      name="approverId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Aprovação:</FormLabel>
                          <div className="flex gap-2">
                             <Select onValueChange={field.onChange} value={field.value} disabled={isBlocked}>
                                <FormControl>
                                  <SelectTrigger className="h-9 bg-white border-slate-200 font-bold text-slate-700">
                                    <SelectValue placeholder="Em aberto" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button variant="outline" size="icon" type="button" className="h-9 w-9 shrink-0 border-slate-200 bg-white">
                                 <Phone className="w-4 h-4 text-blue-500" />
                              </Button>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center ml-auto gap-2 h-9">
                     <Button variant="outline" size="icon" type="button" className="h-9 w-9 bg-white border-slate-200 text-green-600 hover:text-green-700">
                        <Phone className="w-4 h-4" />
                     </Button>
                     <Button variant="outline" size="icon" type="button" className="h-9 w-9 bg-white border-slate-200 text-slate-600">
                        <Share2 className="w-4 h-4" />
                     </Button>
                     <Button variant="outline" size="icon" type="button" className="h-9 w-9 bg-white border-slate-200 text-slate-600">
                        <Printer className="w-4 h-4" />
                     </Button>
                  </div>
               </div>
            </div>

            {/* 3. TABS NAVIGATION */}
            <div className="px-6 bg-white border-b border-slate-200 z-30 overflow-x-auto">
               <div className="max-w-[1700px] mx-auto flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
                    <TabsList className="h-12 bg-transparent p-0 gap-8">
                      <TabsTrigger value="itens" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent rounded-none px-2 font-bold text-slate-500 data-[state=active]:text-[#3b82f6] transition-all uppercase tracking-widest text-[11px]">Itens</TabsTrigger>
                      <TabsTrigger value="informações" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent rounded-none px-2 font-bold text-slate-500 data-[state=active]:text-[#3b82f6] transition-all uppercase tracking-widest text-[11px]">Informações</TabsTrigger>
                      <TabsTrigger value="resumo" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent rounded-none px-2 font-bold text-slate-500 data-[state=active]:text-[#3b82f6] transition-all uppercase tracking-widest text-[11px]">Resumo da Compra</TabsTrigger>
                      <TabsTrigger value="arquivos" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#3b82f6] data-[state=active]:bg-transparent rounded-none px-2 font-bold text-slate-500 data-[state=active]:text-[#3b82f6] transition-all uppercase tracking-widest text-[11px]">Arquivos</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {items.length > 0 && activeTab === "itens" && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        type="button"
                        onClick={() => {
                          setSelectedContext({ projectId: null, stageId: null });
                          setIsAddItemDialogOpen(true);
                        }}
                        className="h-8 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-widest hover:border-blue-300 hover:text-blue-500"
                      >
                         <Plus className="w-3 h-3 mr-1" />
                         + Empresa
                      </Button>
                      <Button 
                        variant="outline" 
                        type="button"
                        onClick={() => setIsProjectSelectorOpen(true)}
                        className="h-8 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-widest hover:border-orange-300 hover:text-orange-500"
                      >
                         <Plus className="w-3 h-3 mr-1" />
                         + Obra
                      </Button>
                    </div>
                  )}
               </div>
            </div>

            <div className="max-w-[1700px] mx-auto p-6">
              <Tabs value={activeTab} className="w-full">
                <TabsContent value="itens" className="mt-0 outline-none">
                   {items.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-32 flex flex-col items-center justify-center text-center shadow-inner">
                         <p className="text-slate-400 font-bold text-xl mb-10 max-w-lg">
                           Para começar a colocar itens deve ser preciso informar o centro de custos primeiro
                         </p>
                         <div className="flex flex-wrap justify-center gap-6">
                            <Button 
                              type="button" 
                              onClick={() => setIsProjectSelectorOpen(true)}
                              className="h-16 bg-[#bbf7d0] hover:bg-[#86efac] text-[#166534] font-black px-10 rounded-2xl gap-3 shadow-lg shadow-green-200/50 transition-all active:scale-95 text-lg"
                            >
                               <PlusCircle className="w-6 h-6" />
                               + Obra
                            </Button>
                            <Button 
                              type="button"
                              onClick={() => {
                                setSelectedContext({ projectId: null, stageId: null });
                                setIsAddItemDialogOpen(true);
                              }}
                              className="h-16 bg-[#bbf7d0] hover:bg-[#86efac] text-[#166534] font-black px-10 rounded-2xl gap-3 shadow-lg shadow-green-200/50 transition-all active:scale-95 text-lg"
                            >
                               <Briefcase className="w-6 h-6" />
                               + Empresa
                            </Button>
                         </div>
                         <div className="mt-16 flex flex-col items-center gap-6">
                            <span className="text-slate-300 font-bold uppercase text-[10px] tracking-[0.3em]">ou</span>
                            <Button variant="outline" type="button" className="h-14 border-2 border-slate-100 bg-white text-slate-400 font-black px-8 rounded-2xl gap-3 hover:bg-slate-50 hover:border-slate-200 transition-colors">
                               <Search className="w-5 h-5" />
                               Buscar solicitação
                            </Button>
                         </div>
                      </div>
                   ) : (
                      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white mb-6">
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="hover:bg-transparent border-b border-slate-200">
                                <TableHead className="w-[50px] text-center font-black text-slate-400 text-[10px] uppercase tracking-wider pl-4">#</TableHead>
                                <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Descrição do Material / Serviço</TableHead>
                                <TableHead className="w-[100px] text-center font-black text-slate-500 text-[10px] uppercase tracking-wider">Unid.</TableHead>
                                <TableHead className="w-[120px] text-center font-black text-slate-500 text-[10px] uppercase tracking-wider">Qtd.</TableHead>
                                <TableHead className="w-[160px] text-right font-black text-slate-500 text-[10px] uppercase tracking-wider">Preço Unit.</TableHead>
                                <TableHead className="w-[160px] text-right font-black text-slate-500 text-[10px] uppercase tracking-wider pr-4">Total</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
                                const [projId, stageId] = groupKey.split('-');
                                const project = projects?.find(p => p.id === projId);
                                const stage = project?.stages.find(s => s.id === stageId);
                                
                                return (
                                  <Fragment key={groupKey}>
                                    <TableRow className="bg-slate-50/60 hover:bg-slate-100/80 border-y border-slate-200 select-none">
                                      <TableCell colSpan={7} className="py-2.5 px-5">
                                        <div className="flex items-center group">
                                          <div className="flex items-center gap-4 flex-1">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-[#F07B2B]" />
                                              </div>
                                              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                                {project?.name || "SEDE / ADMINISTRATIVO"}
                                              </span>
                                            </div>
                                            {stage && (
                                              <div className="flex items-center gap-2.5 border-l border-slate-300/50 pl-4">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                  <FileText className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 uppercase">
                                                  {stage.name}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          <Button 
                                            variant="ghost" 
                                            type="button"
                                            onClick={() => {
                                              setSelectedContext({ projectId: projId === "HEADQUARTERS" ? null : projId, stageId: stageId === "NONE" ? null : stageId });
                                              setIsAddItemDialogOpen(true);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 h-8 gap-2 text-blue-600 font-bold hover:bg-blue-50"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Adicionar Item
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    {groupItems.map((item, idx) => {
                                      const globalIndex = items.indexOf(item);
                                      return (
                                        <TableRow key={globalIndex} className="hover:bg-blue-50/20 border-b border-slate-50 last:border-0 h-[72px] transition-colors">
                                          <TableCell className="text-center font-bold text-slate-300 text-xs pl-4">{globalIndex + 1}</TableCell>
                                          <TableCell>
                                             <div className="space-y-1.5">
                                                <Input 
                                                  className="h-8 border-transparent hover:border-slate-200 focus:border-blue-500 bg-transparent text-sm font-semibold p-1 transition-all"
                                                  value={item.description}
                                                  onChange={e => !isBlocked && setItems(items.map((it, i) => i === globalIndex ? {...it, description: e.target.value} : it))}
                                                  disabled={isBlocked}
                                                />
                                                <div className="flex gap-2">
                                                  <Badge variant="outline" className="text-[9px] font-bold uppercase bg-slate-100 border-slate-200 text-slate-400">
                                                    {project?.name || "Sede"}
                                                  </Badge>
                                                  {stage && (
                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase bg-blue-50 border-blue-100 text-blue-400">
                                                      {stage.name}
                                                    </Badge>
                                                  )}
                                                </div>
                                             </div>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Input 
                                              className="h-8 w-16 mx-auto text-center font-bold border-transparent hover:border-slate-200 bg-transparent"
                                              value={item.unit}
                                              onChange={e => !isBlocked && setItems(items.map((it, i) => i === globalIndex ? {...it, unit: e.target.value} : it))}
                                              disabled={isBlocked}
                                            />
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Input 
                                              type="number"
                                              className="h-8 w-20 mx-auto text-center font-bold border-transparent hover:border-slate-200 bg-transparent"
                                              value={item.quantity}
                                              onChange={e => !isBlocked && setItems(items.map((it, i) => i === globalIndex ? {...it, quantity: parseFloat(e.target.value)} : it))}
                                              disabled={isBlocked}
                                            />
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Input 
                                              type="number"
                                              className="h-8 w-28 ml-auto text-right font-bold border-transparent hover:border-slate-200 bg-transparent"
                                              value={item.unitPrice}
                                              onChange={e => !isBlocked && setItems(items.map((it, i) => i === globalIndex ? {...it, unitPrice: parseFloat(e.target.value)} : it))}
                                              disabled={isBlocked}
                                            />
                                          </TableCell>
                                          <TableCell className="text-right font-black text-slate-800 pr-4">
                                            R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                              onClick={() => !isBlocked && setItems(items.filter((_, i) => i !== globalIndex))}
                                              disabled={isBlocked}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                   )}
                </TabsContent>

                <TabsContent value="informações" className="mt-0 outline-none">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="p-6">
                           <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-6">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                 <Truck className="w-5 h-5 text-orange-500" />
                              </div>
                              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Logística & Entrega</h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField
                               control={form.control}
                               name="deliveryDays"
                               render={({ field }) => (
                                 <FormItem className="space-y-1.5">
                                   <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Prazo de Entrega (dias):</FormLabel>
                                   <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="h-11 bg-slate-50 border-slate-200 font-bold" disabled={isBlocked} />
                                 </FormItem>
                               )}
                             />
                           </div>
                        </div>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="p-6">
                           <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-6">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                 <CreditCard className="w-5 h-5 text-emerald-500" />
                              </div>
                              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Dados Financeiros</h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                               control={form.control}
                               name="paymentTerms"
                               render={({ field }) => (
                                 <FormItem className="space-y-1.5">
                                   <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Condição de Pagamento:</FormLabel>
                                   <Input {...field} className="h-11 bg-slate-50 border-slate-200 font-bold" placeholder="Ex: 30/60 dias" disabled={isBlocked} />
                                 </FormItem>
                               )}
                             />
                             <div className="grid grid-cols-2 gap-4">
                               <FormField
                                 control={form.control}
                                 name="installments"
                                 render={({ field }) => (
                                   <FormItem className="space-y-1.5">
                                     <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Parcelas:</FormLabel>
                                     <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="h-11 bg-slate-50 border-slate-200 font-bold" disabled={isBlocked} />
                                   </FormItem>
                                 )}
                               />
                               <FormField
                                 control={form.control}
                                 name="firstDueDate"
                                 render={({ field }) => (
                                   <FormItem className="space-y-1.5">
                                     <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">1º Vencimento:</FormLabel>
                                     <Input type="date" {...field} className="h-11 bg-slate-50 border-slate-200 font-bold" disabled={isBlocked} />
                                   </FormItem>
                                 )}
                               />
                             </div>
                           </div>
                        </div>
                      </Card>
                   </div>
                </TabsContent>
              </Tabs>
            </div>
          </div> {/* END OF SCROLLABLE AREA */}

          {/* 3. ERP BOTTOM ACTION BAR (HORIZONTAL SUMMARY) */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] flex-none z-50">
             <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1 w-full min-w-0">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-none select-none">(+) FRETE</span>
                      <div className="flex items-center gap-2.5 px-3 h-11 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                         <span className="text-[10px] font-bold text-slate-400">R$</span>
                         <input 
                           type="number"
                           step="0.01"
                           className="bg-transparent border-0 outline-none w-full text-sm font-black text-slate-700 placeholder:text-slate-300"
                           {...form.register("freight", { valueAsNumber: true })}
                           disabled={isBlocked}
                           placeholder="0,00"
                         />
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none tracking-widest pl-1 select-none">(+) OUTRAS</span>
                      <div className="flex items-center gap-2.5 px-3 h-11 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                         <span className="text-[10px] font-bold text-slate-400">R$</span>
                         <input 
                           type="number"
                           step="0.01"
                           className="bg-transparent border-0 outline-none w-full text-sm font-black text-slate-700 placeholder:text-slate-300"
                           {...form.register("otherExpenses", { valueAsNumber: true })}
                           disabled={isBlocked}
                           placeholder="0,00"
                         />
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none tracking-widest pl-1 select-none">(+) IMPOSTO</span>
                      <div className="flex items-center gap-2.5 px-3 h-11 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                         <span className="text-[10px] font-bold text-slate-400">R$</span>
                         <input 
                           type="number"
                           step="0.01"
                           className="bg-transparent border-0 outline-none w-full text-sm font-black text-slate-700 placeholder:text-slate-300"
                           {...form.register("taxes", { valueAsNumber: true })}
                           disabled={isBlocked}
                           placeholder="0,00"
                         />
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none tracking-widest pl-1 select-none">(-) DESC.</span>
                      <div className="flex items-center gap-2.5 px-3 h-11 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-50 transition-all">
                         <span className="text-[10px] font-bold text-slate-400">R$</span>
                         <input 
                           type="number"
                           step="0.01"
                           className="bg-transparent border-0 outline-none w-full text-sm font-black text-red-600 placeholder:text-red-200"
                           {...form.register("discounts", { valueAsNumber: true })}
                           disabled={isBlocked}
                           placeholder="0,00"
                         />
                      </div>
                    </div>
                 </div>

                 <div className="w-full md:w-auto flex flex-col items-end border-l-0 md:border-l border-slate-100 md:pl-10 min-w-max">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none select-none">TOTAL A PAGAR:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-slate-400">R$</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                       {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                 </div>
             </div>
          </div>
        </form>
      </Form>

      <ProjectStageSelectorDialog 
        isOpen={isProjectSelectorOpen}
        onClose={() => setIsProjectSelectorOpen(false)}
        projects={projects}
        onConfirm={(projectId, stageId) => {
          setSelectedContext({ projectId, stageId });
          setIsProjectSelectorOpen(false);
          setIsAddItemDialogOpen(true);
        }}
      />

      {!isBlocked && (
        <AddBudgetItemDialog
          isOpen={isAddItemDialogOpen}
          onClose={() => setIsAddItemDialogOpen(false)}
          onConfirm={(selection: any) => {
            const newItem: OrderItem = {
              description: selection.description,
              unit: selection.unit,
              quantity: selection.quantity || 1,
              unitPrice: selection.unitCost || selection.computedCost || 0,
              projectId: selectedContext?.projectId || null,
              stageId: selectedContext?.stageId || null
            };
            setItems([...items, newItem]);
            setIsAddItemDialogOpen(false);
          }}
          title="Buscar no Catálogo"
          type="INPUT"
        />
      )}
    </div>
  );
}
