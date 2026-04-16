"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Save, 
  GitCompare, 
  Box,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Building2,
  FileSpreadsheet,
  Layers,
  HardHat,
  ChevronRight,
  Loader2,
  X,
  MapPin,
  FileText,
  Trophy,
  LayoutDashboard,
  Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const quoteSchema = z.object({
  quoteNumber: z.string(),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres"),
  status: z.string(),
  priority: z.boolean(),
  necessityDate: z.string().min(1, "Data de necessidade é obrigatória"),
  requesterId: z.string().min(1, "Selecione um solicitante"),
  projectId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  deliveryCep: z.string().optional().nullable(),
  deliveryStreet: z.string().optional().nullable(),
  deliveryNumber: z.string().optional().nullable(),
  deliveryComplement: z.string().optional().nullable(),
  deliveryNeighborhood: z.string().optional().nullable(),
  deliveryCity: z.string().optional().nullable(),
  deliveryState: z.string().optional().nullable(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteItem {
  id: string;
  type: 'MATERIAL' | 'COMPOSITION';
  description: string;
  unit: string;
  quantity: number;
}

const statusOptions = [
  { value: "OPEN", label: "Em Aberto" },
  { value: "REQUESTED", label: "Solicitado" },
  { value: "SENT_TO_SUPPLIER", label: "Enviado ao Fornecedor" },
  { value: "PARTIALLY_ANSWERED", label: "Respondido Parcialmente" },
  { value: "PARTIALLY_QUOTED", label: "Cotado Parcialmente" },
  { value: "QUOTED", label: "Cotado" },
  { value: "FINISHED", label: "Finalizado" },
];

interface QuotationFormProps {
  mode: 'CREATE' | 'EDIT';
  requestId?: string;
}

export default function QuotationForm({ mode, requestId }: QuotationFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  
  // Data Fetching
  const { data: existingData, isLoading: isLoadingExisting } = trpc.purchasing.getRequestWithQuote.useQuery(
    { requestId: requestId! },
    { enabled: mode === 'EDIT' && !!requestId }
  );

  const { data: requests } = trpc.purchasing.getRequests.useQuery();
  const { data: options } = trpc.projects.formOptions.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();
  const users = options?.users || [];

  const [quoteNumber, setQuoteNumber] = useState("...");
  const [activeTab, setActiveTab] = useState("items");
  const [costCenterType, setCostCenterType] = useState<'NONE' | 'CENTRAL' | 'PROJECT'>('NONE');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteSuppliers, setQuoteSuppliers] = useState<any[]>([]);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(null);

  const { data: catalogItems } = trpc.catalogItem.list.useQuery({ search: searchTerm }, { enabled: showAddItemDialog });
  const { data: availableSuppliers } = trpc.contact.list.useQuery({ 
    type: 'SUPPLIER', 
    search: supplierSearch 
  }, { 
    enabled: isSupplierDialogOpen 
  });
  const { data: compositions } = trpc.composition.list.useQuery({ search: searchTerm }, { enabled: showAddItemDialog });

  // Map State
  const [comparisonData, setComparisonData] = useState<Record<string, Record<string, { unitPrice: number; brand: string }>>>({});
  const [winners, setWinners] = useState<Record<string, string>>({});
  const generateOrderMutation = trpc.purchasing.generateOrder.useMutation({
    onSuccess: () => {
      toast.success("Ordem de Compra gerada com sucesso!");
      router.push("/dashboard/compras/ordens");
    },
    onError: (err) => toast.error(err.message)
  });

  const [supplierFooters, setSupplierFooters] = useState<Record<string, { 
     discount: number, 
     paymentTerms: string, 
     deliveryTime: string,
     billingType: "COMPANY" | "CLIENT" | "DIRECT" | "MANUAL",
     billingManualName?: string
  }>>({});

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quoteNumber: "...",
      description: "",
      status: "OPEN",
      priority: false,
      necessityDate: format(new Date(), "yyyy-MM-dd"),
      requesterId: "",
      projectId: null,
      stageId: null,
      deliveryCep: "",
      deliveryStreet: "",
      deliveryNumber: "",
      deliveryComplement: "",
      deliveryNeighborhood: "",
      deliveryCity: "",
      deliveryState: "",
    },
  });

  // Populate data in EDIT mode
  useEffect(() => {
    if (mode === 'EDIT' && existingData) {
      form.reset({
        quoteNumber: existingData.id.slice(0, 8),
        description: existingData.notes || "",
        status: existingData.status,
        priority: false, // Could be added to schema if needed
        necessityDate: format(existingData.createdAt, "yyyy-MM-dd"),
        requesterId: existingData.requesterId,
        projectId: existingData.projectId,
        stageId: existingData.stageId,
        deliveryCep: existingData.project?.cep || "",
        deliveryStreet: existingData.project?.street || "",
        deliveryNumber: existingData.project?.number || "",
        deliveryComplement: existingData.project?.complement || "",
        deliveryNeighborhood: existingData.project?.neighborhood || "",
        deliveryCity: existingData.project?.city || "",
        deliveryState: existingData.project?.state || "",
      });

      setQuoteNumber(existingData.id.slice(0, 8));
      setCostCenterType(existingData.projectId ? 'PROJECT' : (existingData.notes?.includes('Sede') ? 'CENTRAL' : 'NONE'));
      setSelectedProject(existingData.project);
      
      setQuoteItems(existingData.items.map(i => ({
        id: i.id, // Using request item ID
        type: 'MATERIAL', // Defaulting to material
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
      })));

      const quote = existingData.quotes[0];
      if (quote) {
        setQuoteId(quote.id);
        setQuoteSuppliers(quote.suppliers.map(s => ({
          id: s.id,
          name: s.supplierName,
          totalPrice: s.totalPrice,
          deliveryTime: s.deliveryDays.toString(),
          paymentTerms: s.paymentTerms,
          isWinner: s.isWinner
        })));

        // Reconstruct winners map (supplier level in DB, so we map all items to winner)
        const currentWinners: Record<string, string> = {};
        const winner = quote.suppliers.find(s => s.isWinner);
        if (winner) {
          existingData.items.forEach(i => {
              currentWinners[i.id] = winner.id;
          });
        }
        setWinners(currentWinners);

        // Populate comparison data with total prices as fallback
        const comp: any = {};
        quote.suppliers.forEach(s => {
          comp[s.id] = {};
          existingData.items.forEach(i => {
            comp[s.id][i.id] = { unitPrice: s.unitPrice, brand: "" };
          });
          
          setSupplierFooters(prev => ({
            ...prev,
            [s.id]: { 
              discount: 0, 
              paymentTerms: s.paymentTerms, 
              deliveryTime: s.deliveryDays.toString(),
              billingType: "COMPANY",
              billingManualName: ""
            }
          }));
        });
        setComparisonData(comp);
      }
    } else if (mode === 'CREATE' && requests) {
      setQuoteNumber((requests.length + 1).toString());
      form.setValue('quoteNumber', (requests.length + 1).toString());
    }
  }, [mode, existingData, requests, form]);

  const createMutation = trpc.purchasing.createStandaloneQuote.useMutation({
    onSuccess: (data) => {
      toast.success("Cotação gravada!");
      if (data?.quotes?.[0]?.id) setQuoteId(data.quotes[0].id);
      router.push("/dashboard/compras/cotacoes");
    },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = trpc.purchasing.updateQuotation.useMutation({
    onSuccess: (data) => {
      toast.success("Cotação atualizada!");
      if (data?.id) setQuoteId(data.id);
      utils.purchasing.getRequestWithQuote.invalidate({ requestId });
      router.push("/dashboard/compras/cotacoes");
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (data: QuoteFormValues) => {
    if (quoteItems.length === 0) {
      toast.error("Adicione itens.");
      return;
    }

    const payload = {
      description: data.description,
      projectId: data.projectId,
      stageId: data.stageId,
      items: quoteItems.map(i => ({
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
      })),
      suppliers: quoteSuppliers.map(s => {
        // Calculate total for this supplier from comparisonData
        const total = quoteItems.reduce((acc, item) => {
           return acc + (item.quantity * (comparisonData[s.id]?.[item.id]?.unitPrice || 0));
        }, 0);
        
        const footer = supplierFooters[s.id] || { discount: 0, paymentTerms: s.paymentTerms || "PIX", deliveryTime: "0" };
        const discountFactor = (1 - (footer.discount / 100));

        return {
          supplierName: s.name,
          totalPrice: total * discountFactor,
          deliveryDays: parseInt(footer.deliveryTime) || 0,
          paymentTerms: footer.paymentTerms,
          freight: 0,
          isWinner: Object.values(winners).includes(s.id)
        };
      })
    };

    if (mode === 'CREATE') {
      createMutation.mutate({
        ...payload,
        suppliers: quoteSuppliers.map(s => s.id) // Create expects IDs
      });
    } else {
      updateMutation.mutate({
        requestId: requestId!,
        ...payload
      });
    }
  };

  const addItemToQuote = (item: any, type: 'MATERIAL' | 'COMPOSITION') => {
    const newItem: QuoteItem = {
      id: item.id || `temp-${Date.now()}`,
      type,
      description: item.description,
      unit: item.unit || 'UN',
      quantity: 1,
    };
    setQuoteItems([...quoteItems, newItem]);
    setShowAddItemDialog(false);
  };

  const removeItem = (id: string) => setQuoteItems(quoteItems.filter(i => i.id !== id));
  const updateQuantity = (id: string, qty: string) => {
    const num = parseFloat(qty) || 0;
    setQuoteItems(quoteItems.map(i => i.id === id ? { ...i, quantity: num } : i));
  };

  if (mode === 'EDIT' && isLoadingExisting) return <div className="p-8">Carregando dados...</div>;

  return (
    <div className="p-8 space-y-8 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. TOP INFO CONTAINER */}
      <div className="bg-[#1A3C5E] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <GitCompare className="h-40 w-40 rotate-12" />
        </div>
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative z-10">
          <div className="flex items-center gap-5">
            <Link href="/dashboard/compras/cotacoes">
              <Button variant="ghost" size="icon" className="rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-[#F07B2B] text-white border-none px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
                  {mode === 'CREATE' ? 'Nova Cotação Avulsa' : 'Editando Cotação'}
                </Badge>
              </div>
              <h1 className="text-3xl font-black tracking-tight italic">{mode === 'CREATE' ? 'Nova Cotação' : `Cotação #${quoteNumber}`}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-black px-8 h-12 rounded-2xl gap-2 active:scale-95 transition-all shadow-lg shadow-orange-950/20"
            >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                {mode === 'CREATE' ? "Salvar Cotação" : "Atualizar Cotação"}
            </Button>
            <Link href="/dashboard/compras/cotacoes">
                <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 font-bold h-12 px-6 rounded-2xl">
                    Voltar
                </Button>
            </Link>
          </div>
        </div>
      </div>

      <Form {...form}>
        <div className="flex flex-col space-y-8">
          {/* CONFIG BAR */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
             <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-1 space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                        <label className="text-slate-400 font-black uppercase text-[9px] tracking-widest block mb-0.5">Nº</label>
                        <p className="text-lg font-black text-[#1A3C5E] truncate">{quoteNumber}</p>
                    </div>

                    <div className="lg:col-span-2">
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                            <FormItem>
                                <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50/50 text-xs font-bold">
                                    <SelectValue placeholder="Status..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    {statusOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <FormField
                            control={form.control}
                            name="necessityDate"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input type="date" className="h-10 rounded-xl bg-slate-50/50 text-xs font-bold border-slate-100" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <FormField
                            control={form.control}
                            name="requesterId"
                            render={({ field }) => (
                            <FormItem>
                                <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 text-xs font-bold border-slate-100">
                                    <SelectValue placeholder="Solicitante..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    {users.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id} className="text-xs">{user.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="lg:col-span-5">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Obs / Objetivo..." className="h-10 rounded-xl bg-slate-50/50 text-xs font-medium border-slate-100" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
             </div>
          </div>

          {/* TABS */}
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start h-16 bg-white rounded-3xl p-1.5 shadow-xl shadow-slate-200/50 mb-8 border border-slate-50">
                <TabsTrigger value="items" className="flex-1 rounded-2xl h-full data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white font-bold gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Itens
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="flex-1 rounded-2xl h-full data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white font-bold gap-2">
                  <Truck className="w-4 h-4" /> Fornecedores
                </TabsTrigger>
                <TabsTrigger value="map" className="flex-1 rounded-2xl h-full data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white font-bold gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Mapa de Cotação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-0">
                {costCenterType === 'NONE' ? (
                  <Card className="border-4 border-dashed border-slate-100 bg-white rounded-[2.5rem] p-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                          <Building2 className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-2xl font-black text-[#1A3C5E] mb-2">Vincule um Centro de Custo</h3>
                      <div className="flex gap-4">
                          <Button onClick={() => setCostCenterType('CENTRAL')} className="h-14 rounded-2xl bg-[#1A3C5E] text-white px-10 font-bold">Sede</Button>
                          <Button onClick={() => setCostCenterType('PROJECT')} className="h-14 rounded-2xl bg-[#F07B2B] text-white px-10 font-bold">Obra</Button>
                      </div>
                    </div>
                  </Card>
                ) : costCenterType === 'PROJECT' && !form.watch('stageId') ? (
                  <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white p-12">
                      <div className="flex flex-col md:flex-row gap-10 items-center">
                          <div className="flex-1 space-y-6 w-full">
                               <h3 className="text-3xl font-black text-[#1A3C5E]">Selecione a Obra e Etapa</h3>
                               <div className="grid md:grid-cols-2 gap-4">
                                  <Select 
                                    value={form.watch('projectId') || ""} 
                                    onValueChange={(id) => {
                                      const proj = projects?.find(p => p.id === id);
                                      setSelectedProject(proj);
                                      form.setValue('projectId', id);
                                      form.setValue('stageId', null);
                                    }}
                                  >
                                      <SelectTrigger className="h-14 rounded-2xl border-slate-200"><SelectValue placeholder="Obra..." /></SelectTrigger>
                                      <SelectContent>
                                          {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                                  
                                  <Select 
                                      disabled={!form.watch('projectId')}
                                      value={form.watch('stageId') || ""} 
                                      onValueChange={(id) => form.setValue('stageId', id)}
                                  >
                                      <SelectTrigger className="h-14 rounded-2xl border-slate-200"><SelectValue placeholder="Etapa..." /></SelectTrigger>
                                      <SelectContent>
                                          {selectedProject?.stages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                               </div>
                               <Button variant="ghost" onClick={() => setCostCenterType('NONE')}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
                          </div>
                      </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                       <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                          <h3 className="font-bold text-[#1A3C5E]">Planilha de Itens <Badge variant="secondary">{quoteItems.length}</Badge></h3>
                          <Button onClick={() => setShowAddItemDialog(true)} className="bg-[#1A3C5E] text-white rounded-xl font-bold gap-2 h-10 px-5">
                             <Plus className="w-4 h-4" /> Adicionar Item
                          </Button>
                       </div>
                       <CardContent className="p-0">
                          <Table>
                             <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                   <TableHead className="pl-8 uppercase text-[9px] font-black">Item</TableHead>
                                   <TableHead className="uppercase text-[9px] font-black">Descrição</TableHead>
                                   <TableHead className="uppercase text-[9px] font-black">Unidade</TableHead>
                                   <TableHead className="uppercase text-[9px] font-black">Quantidade</TableHead>
                                   <TableHead></TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {quoteItems.map((item, idx) => (
                                  <TableRow key={item.id} className="group hover:bg-slate-50/50">
                                     <TableCell className="pl-8 py-5">
                                        <span className="text-[10px] font-bold text-slate-300">{(idx + 1).toString().padStart(2, '0')}</span>
                                     </TableCell>
                                     <TableCell className="font-bold text-slate-700">{item.description}</TableCell>
                                     <TableCell><Badge variant="outline">{item.unit}</Badge></TableCell>
                                     <TableCell>
                                        <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, e.target.value)} className="w-24 h-10 rounded-xl bg-slate-50 border-none font-bold" />
                                     </TableCell>
                                     <TableCell className="pr-8 text-right">
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                                     </TableCell>
                                  </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                       </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="suppliers" className="mt-0">
                 {quoteSuppliers.length === 0 ? (
                   <Card className="border-4 border-dashed border-slate-100 bg-white rounded-[2.5rem] p-20 text-center">
                     <div className="flex flex-col items-center">
                       <Truck className="w-12 h-12 text-emerald-500 mb-8" />
                       <h3 className="text-3xl font-black text-[#1A3C5E] mb-3">Selecione Fornecedores</h3>
                       <Button onClick={() => setIsSupplierDialogOpen(true)} className="h-16 rounded-[1.5rem] bg-[#1A3C5E] text-white px-12 font-bold shadow-2xl scale-110">
                          <Plus className="w-6 h-6" /> Incluir Fornecedor
                       </Button>
                     </div>
                   </Card>
                 ) : (
                   <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="py-6 px-6">Fornecedor</TableHead>
                            <TableHead className="w-[80px] text-right px-6"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quoteSuppliers.map((supplier) => (
                            <TableRow key={supplier.id} className="hover:bg-slate-50/50">
                              <TableCell className="py-5 px-6 font-bold">{supplier.name}</TableCell>
                              <TableCell className="text-right px-6">
                                <Button variant="ghost" size="icon" onClick={() => setQuoteSuppliers(prev => prev.filter(s => s.id !== supplier.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button onClick={() => setIsSupplierDialogOpen(true)} variant="outline" className="m-6">Adicionar Mais</Button>
                   </div>
                 )}
              </TabsContent>

              <TabsContent value="map">
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto">
                    <Table>
                       <TableHeader className="bg-slate-50/50">
                          <TableRow>
                             <TableHead className="min-w-[300px] py-6 px-8">Item</TableHead>
                             {quoteSuppliers.map(supplier => (
                                <TableHead key={supplier.id} className="min-w-[320px] text-center font-black">{supplier.name}</TableHead>
                             ))}
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {quoteItems.map((item) => (
                             <TableRow key={item.id}>
                                <TableCell className="py-6 px-8 flex flex-col">
                                   <span className="font-bold text-[#1A3C5E]">{item.description}</span>
                                   <span className="text-[10px] text-slate-400">Qtd: {item.quantity} {item.unit}</span>
                                </TableCell>
                                {quoteSuppliers.map(supplier => {
                                   const data = comparisonData[supplier.id]?.[item.id] || { unitPrice: 0, brand: "" };
                                   const isWinner = winners[item.id] === supplier.id;
                                   return (
                                      <TableCell key={supplier.id} className={`p-4 ${isWinner ? 'bg-emerald-50' : ''}`}>
                                         <div className="flex items-center gap-2">
                                            <Input 
                                               type="number" 
                                               value={data.unitPrice || ""} 
                                               onChange={(e) => {
                                                  const val = parseFloat(e.target.value) || 0;
                                                  setComparisonData(prev => ({
                                                     ...prev,
                                                     [supplier.id]: { ...prev[supplier.id], [item.id]: { ...data, unitPrice: val } }
                                                  }));
                                               }}
                                               className="h-10 rounded-xl"
                                            />
                                            <Button 
                                               size="icon" 
                                               variant={isWinner ? "default" : "outline"}
                                               onClick={() => setWinners(prev => ({ ...prev, [item.id]: isWinner ? "" : supplier.id }))}
                                            >
                                               <CheckCircle2 className="w-4 h-4" />
                                            </Button>
                                         </div>
                                      </TableCell>
                                   );
                                })}
                             </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                             <TableCell className="p-8 font-black text-[#1A3C5E] uppercase text-xs tracking-widest">Resumo da Proposta</TableCell>
                             {quoteSuppliers.map(supplier => {
                                const subtotalWon = quoteItems.reduce((acc, item) => {
                                   if (winners[item.id] === supplier.id) return acc + (item.quantity * (comparisonData[supplier.id]?.[item.id]?.unitPrice || 0));
                                   return acc;
                                }, 0);
                                
                                const footer = supplierFooters[supplier.id] || { discount: 0, paymentTerms: "À Vista", deliveryTime: "0" };
                                const discountAmount = subtotalWon * (footer.discount / 100);
                                const totalWithDiscount = subtotalWon - discountAmount;

                                return (
                                   <TableCell key={supplier.id} className="p-8 space-y-6">
                                      <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                         <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold uppercase">Subtotal</span>
                                            <span className="font-bold text-slate-600">R$ {subtotalWon.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                         </div>
                                         
                                         <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase w-20">Desconto %</span>
                                            <Input 
                                               type="number" 
                                               value={footer.discount || ""} 
                                               onChange={(e) => setSupplierFooters(prev => ({ ...prev, [supplier.id]: { ...footer, discount: parseFloat(e.target.value) || 0 } }))}
                                               className="h-8 rounded-lg text-xs font-bold text-red-500 bg-red-50/50 border-red-100"
                                            />
                                         </div>

                                         <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                                            <span className="text-[10px] font-black text-[#1A3C5E] uppercase mb-1">Total Final</span>
                                            <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                                               R$ {totalWithDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                         </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                         <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pagamento</label>
                                            <Input 
                                               value={footer.paymentTerms || "À Vista"} 
                                               onChange={(e) => setSupplierFooters(prev => ({ ...prev, [supplier.id]: { ...footer, paymentTerms: e.target.value } }))}
                                               className="h-9 rounded-xl text-[10px] font-bold"
                                               placeholder="Ex: 30 dias"
                                            />
                                         </div>
                                         <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Prazo (Dias)</label>
                                            <Input 
                                               type="number"
                                               value={footer.deliveryTime || "0"} 
                                               onChange={(e) => setSupplierFooters(prev => ({ ...prev, [supplier.id]: { ...footer, deliveryTime: e.target.value } }))}
                                               className="h-9 rounded-xl text-[10px] font-bold"
                                            />
                                         </div>
                                      </div>

                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Faturamento</label>
                                         <Select 
                                            value={footer.billingType || "COMPANY"} 
                                            onValueChange={(val: any) => setSupplierFooters(prev => ({ ...prev, [supplier.id]: { ...footer, billingType: val } }))}
                                         >
                                            <SelectTrigger className="h-9 rounded-xl text-[10px] font-bold">
                                               <SelectValue placeholder="Tipo de Faturamento" />
                                            </SelectTrigger>
                                            <SelectContent>
                                               <SelectItem value="COMPANY">Empresa</SelectItem>
                                               <SelectItem value="CLIENT">Cliente</SelectItem>
                                               <SelectItem value="DIRECT">Faturamento Direto</SelectItem>
                                               <SelectItem value="MANUAL">Manualmente</SelectItem>
                                            </SelectContent>
                                         </Select>
                                      </div>

                                      {footer.billingType === "MANUAL" && (
                                         <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Faturamento</label>
                                            <Input 
                                               value={footer.billingManualName || ""} 
                                               onChange={(e) => setSupplierFooters(prev => ({ ...prev, [supplier.id]: { ...footer, billingManualName: e.target.value } }))}
                                               className="h-9 rounded-xl text-[10px] font-bold"
                                               placeholder="Nome da empresa/pessoa"
                                            />
                                         </div>
                                      )}

                                      <Button 
                                         disabled={subtotalWon === 0 || generateOrderMutation.isPending}
                                         className="w-full h-14 rounded-2xl bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-900/20 group gap-2"
                                         onClick={() => {
                                            if (quoteId) {
                                               generateOrderMutation.mutate({
                                                  quoteId: quoteId,
                                                  billingType: footer.billingType || "COMPANY",
                                                  billingManualName: footer.billingManualName,
                                                  installments: 1,
                                                  firstDueDate: new Date().toISOString(),
                                                  category: "Materiais"
                                               });
                                            } else {
                                               toast.error("Salve a cotação antes de gerar a ordem.");
                                            }
                                         }}
                                      >
                                         {generateOrderMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                         ) : (
                                            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                         )}
                                         Gerar Ordem
                                      </Button>
                                   </TableCell>
                                );
                             })}
                          </TableRow>
                       </TableBody>
                    </Table>
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Form>

      {/* DIALOGS */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-3xl rounded-[2rem]">
          <DialogHeader><DialogTitle>Adicionar Item</DialogTitle></DialogHeader>
          <div className="p-4 space-y-4">
             <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <div className="grid gap-2 max-h-96 overflow-auto">
                {catalogItems?.items.map((item: any) => (
                   <div key={item.id} onClick={() => addItemToQuote(item, 'MATERIAL')} className="p-4 border rounded-xl cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                      <span>{item.description}</span>
                      <Plus className="w-4 h-4" />
                   </div>
                ))}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
         <DialogContent className="max-w-2xl rounded-[3rem]">
            <DialogHeader><DialogTitle>Adicionar Fornecedores</DialogTitle></DialogHeader>
            <div className="p-4 space-y-4">
               <Input placeholder="Buscar..." value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} />
               <div className="grid gap-2 max-h-80 overflow-auto">
                  {availableSuppliers?.items.map((supplier: any) => {
                     const isSelected = quoteSuppliers.some(s => s.id === supplier.id);
                     return (
                        <div key={supplier.id} onClick={() => setQuoteSuppliers(isSelected ? prev => prev.filter(s => s.id !== supplier.id) : prev => [...prev, supplier])} className={`p-4 border rounded-xl cursor-pointer flex justify-between items-center ${isSelected ? 'border-emerald-500 bg-emerald-50' : ''}`}>
                           <span>{supplier.name}</span>
                           <CheckCircle2 className={`w-5 h-5 ${isSelected ? 'text-emerald-500' : 'text-slate-200'}`} />
                        </div>
                     );
                  })}
               </div>
               <Button onClick={() => setIsSupplierDialogOpen(false)} className="w-full h-12">Confirmar</Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
