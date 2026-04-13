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
  User, 
  Calendar as CalendarIcon, 
  LayoutDashboard,
  Box,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  ListFilter,
  Search,
  Building2,
  History,
  FileSpreadsheet,
  Layers,
  HardHat,
  ChevronRight,
  Loader2,
  X,
  MapPin,
  FileText,
  Trophy
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
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
import { ptBR } from "date-fns/locale";

const quoteSchema = z.object({
  quoteNumber: z.string(),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres"),
  status: z.enum([
    "OPEN", 
    "REQUESTED", 
    "SENT_TO_SUPPLIER", 
    "PARTIALLY_ANSWERED", 
    "PARTIALLY_QUOTED", 
    "QUOTED", 
    "FINISHED"
  ]),
  priority: z.boolean().default(false),
  necessityDate: z.string().min(1, "Data de necessidade é obrigatória"),
  requesterId: z.string().min(1, "Selecione um solicitante"),
  projectId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  // Delivery Address
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

export default function NewQuotePage() {
  const { data: requests } = trpc.purchasing.getRequests.useQuery();
  const [quoteNumber, setQuoteNumber] = useState("...");

  useEffect(() => {
    if (requests) {
      setQuoteNumber((requests.length + 1).toString());
    }
  }, [requests]);

  const { data: options, isLoading: isLoadingOptions } = trpc.projects.formOptions.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();
  const users = options?.users || [];

  // Local States
  const [activeTab, setActiveTab] = useState("items");
  const [costCenterType, setCostCenterType] = useState<'NONE' | 'CENTRAL' | 'PROJECT'>('NONE');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteSuppliers, setQuoteSuppliers] = useState<any[]>([]);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: catalogItems } = trpc.catalogItem.list.useQuery({ search: searchTerm }, { enabled: showAddItemDialog });
  const { data: availableSuppliers } = trpc.contact.list.useQuery({ 
    type: 'SUPPLIER', 
    search: supplierSearch 
  }, { 
    enabled: isSupplierDialogOpen 
  });
  const { data: compositions } = trpc.composition.list.useQuery({ search: searchTerm }, { enabled: showAddItemDialog });

  // Map State (Comparisons)
  const [comparisonData, setComparisonData] = useState<Record<string, Record<string, { unitPrice: number; brand: string }>>>({});
  const [winners, setWinners] = useState<Record<string, string>>({}); // itemId -> supplierId
  const [supplierFooters, setSupplierFooters] = useState<Record<string, { discount: number; paymentTerms: string; deliveryTime: string }>>({});

  // Sync Map Data when suppliers or items change
  useEffect(() => {
    setComparisonData(prev => {
      const next = { ...prev };
      quoteSuppliers.forEach(s => {
        if (!next[s.id]) next[s.id] = {};
        quoteItems.forEach(i => {
          if (!next[s.id][i.id]) {
            next[s.id][i.id] = { unitPrice: 0, brand: "" };
          }
        });
      });
      return next;
    });

    setSupplierFooters(prev => {
      const next = { ...prev };
      quoteSuppliers.forEach(s => {
        if (!next[s.id]) {
          next[s.id] = { discount: 0, paymentTerms: "PIX", deliveryTime: "" };
        }
      });
      return next;
    });
  }, [quoteSuppliers, quoteItems]);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quoteNumber,
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

  useEffect(() => {
    if (costCenterType === 'CENTRAL') {
      form.setValue('deliveryStreet', "Almoxarifado Central / Sede Administrativa");
      form.setValue('deliveryCep', "");
      form.setValue('deliveryNumber', "");
      form.setValue('deliveryComplement', "");
      form.setValue('deliveryNeighborhood', "");
      form.setValue('deliveryCity', "");
      form.setValue('deliveryState', "");
    } else if (costCenterType === 'PROJECT' && selectedProject) {
      form.setValue('deliveryCep', selectedProject.cep || "");
      form.setValue('deliveryStreet', selectedProject.street || "");
      form.setValue('deliveryNumber', selectedProject.number || "");
      form.setValue('deliveryComplement', selectedProject.complement || "");
      form.setValue('deliveryNeighborhood', selectedProject.neighborhood || "");
      form.setValue('deliveryCity', selectedProject.city || "");
      form.setValue('deliveryState', selectedProject.state || "");
    }
  }, [costCenterType, selectedProject, form]);

  const router = useRouter();
  
  const createQuoteMutation = trpc.purchasing.createStandaloneQuote.useMutation({
    onSuccess: () => {
      toast.success("Cotação gravada com sucesso!");
      router.push("/dashboard/compras/cotacoes");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const onSubmit = (data: QuoteFormValues) => {
    if (quoteItems.length === 0) {
      toast.error("Adicione pelo menos um item à cotação.");
      return;
    }
    
    createQuoteMutation.mutate({
      description: data.description,
      projectId: data.projectId,
      items: quoteItems.map(i => ({
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        catalogItemId: i.id
      })),
      suppliers: quoteSuppliers.map(s => s.id)
    });
  };

  const addItemToQuote = (item: any, type: 'MATERIAL' | 'COMPOSITION') => {
    const newItem: QuoteItem = {
      id: item.id,
      type,
      description: item.description,
      unit: item.unit || 'UN',
      quantity: 1,
    };
    setQuoteItems([...quoteItems, newItem]);
    setShowAddItemDialog(false);
    toast.success("Item adicionado à planilha.");
  };

  const removeItem = (id: string) => {
    setQuoteItems(quoteItems.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, qty: string) => {
    const num = parseFloat(qty) || 0;
    setQuoteItems(quoteItems.map(i => i.id === id ? { ...i, quantity: num } : i));
  };

  return (
    <div className="p-8 space-y-8 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. TOP INFO CONTAINER (Consolidated) */}
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
                  Cotação Avulsa
                </Badge>
                <div className="flex items-center gap-1.5 text-blue-200/60 text-[10px] font-bold uppercase tracking-widest pl-2 border-l border-white/10 ml-2">
                   <Clock className="w-3 h-3" /> {format(new Date(), "dd/MM/yyyy")}
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight italic">Nova Cotação</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 xl:gap-8 w-full xl:w-auto">
            {/* Stats Group */}
            <div className="flex items-center gap-8 bg-black/10 px-6 py-3 rounded-2xl border border-white/5">
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-60">Itens</p>
                 <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#F07B2B]" />
                    <span className="text-xl font-bold">{quoteItems.length}</span>
                 </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-60">Fornecedores</p>
                 <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xl font-bold">{quoteSuppliers.length}</span>
                 </div>
              </div>
            </div>

            {/* Actions Group */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={createQuoteMutation.isPending}
                className="bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-black px-8 h-12 rounded-2xl gap-2 active:scale-95 transition-all shadow-lg shadow-orange-950/20"
              >
                {createQuoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                {createQuoteMutation.isPending ? "Gravando..." : "Salvar Cotação"}
              </Button>
              <Link href="/dashboard/compras/cotacoes">
                <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 font-bold h-12 px-6 rounded-2xl">
                  Voltar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <div className="flex flex-col space-y-8">
        {/* TOP CONFIG BAR (Compact & Integrated) */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
           <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
                  <div className="lg:col-span-1 space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                      <label className="text-slate-400 font-black uppercase text-[9px] tracking-widest block mb-0.5">Cotação Nº</label>
                      <p className="text-lg font-black text-[#1A3C5E] truncate">{quoteNumber}</p>
                  </div>

                  <div className="lg:col-span-2">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-400 font-black uppercase text-[9px] tracking-widest px-1">Status</FormLabel>
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
                            <FormLabel className="text-slate-400 font-black uppercase text-[9px] tracking-widest px-1">Necessidade</FormLabel>
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
                            <FormLabel className="text-slate-400 font-black uppercase text-[9px] tracking-widest px-1">Solicitante</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                                <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 text-xs font-bold border-slate-100">
                                <SelectValue placeholder="Selecione..." />
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

                  <div className="lg:col-span-2">
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                        <FormItem className={`flex items-center justify-between p-2.5 rounded-xl border transition-all h-10 ${
                            field.value ? 'bg-orange-50 border-orange-200' : 'bg-slate-50/50 border-slate-100'
                        }`}>
                            <FormLabel className={`font-black text-[9px] uppercase tracking-wider ${field.value ? 'text-orange-700' : 'text-slate-400'}`}>Urgência</FormLabel>
                            <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75 origin-right" />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-400 font-black uppercase text-[9px] tracking-widest px-1">Obs / Objetivo</FormLabel>
                            <FormControl>
                            <Input placeholder="Breve objetivo..." className="h-10 rounded-xl bg-slate-50/50 text-xs font-medium border-slate-100" {...field} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                  </div>
              </div>
           </div>
        </div>

        {/* TABS SECTION (Items, Suppliers, Map) */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-16 bg-white rounded-3xl p-1.5 shadow-xl shadow-slate-200/50 mb-8 border border-slate-50">
              <TabsTrigger value="items" className="flex-1 rounded-2xl h-full data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white font-bold gap-2 transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Itens
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex-1 rounded-2xl h-full data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white font-bold gap-2 transition-all">
                <Truck className="w-4 h-4" /> Fornecedores
              </TabsTrigger>
              <TabsTrigger value="map" className="flex-1 rounded-2xl h-full data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white font-bold gap-2 transition-all">
                <LayoutDashboard className="w-4 h-4" /> Mapa de Cotação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="mt-0">
              {costCenterType === 'NONE' ? (
                <Card className="border-4 border-dashed border-slate-100 bg-white rounded-[2.5rem] p-16 text-center animate-in zoom-in-95 duration-500">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                        <Building2 className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1A3C5E] mb-2 tracking-tight">Vincule um Centro de Custo</h3>
                    <p className="text-slate-600 max-w-sm mb-10 font-medium">
                      Para começar a adicionar itens, selecione se esta compra é para a sede ou para uma obra específica.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button 
                          onClick={() => setCostCenterType('CENTRAL')}
                          className="h-14 rounded-2xl bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white px-10 font-bold shadow-xl shadow-blue-200/50 transition-all gap-2"
                        >
                          <Building2 className="w-5 h-5" /> Empresa (Sede)
                        </Button>
                        <Button 
                           onClick={() => setCostCenterType('PROJECT')}
                           className="h-14 rounded-2xl bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white px-10 font-bold shadow-xl shadow-orange-200 gap-2"
                        >
                          <HardHat className="w-5 h-5" /> Obra Específica
                        </Button>
                    </div>
                  </div>
                </Card>
              ) : costCenterType === 'PROJECT' && !form.watch('stageId') ? (
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white p-12 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div className="w-48 h-48 bg-orange-100/50 rounded-[3rem] flex items-center justify-center flex-shrink-0">
                            <Layers className="w-24 h-24 text-orange-500/30" />
                        </div>
                        <div className="flex-1 space-y-6 w-full">
                             <div className="space-y-2">
                                <Badge className="bg-orange-100 text-orange-700 rounded-lg px-2 py-0 border border-orange-200">Passo 02</Badge>
                                <h3 className="text-3xl font-black text-[#1A3C5E] tracking-tight">Selecione a Obra e a Etapa</h3>
                                <p className="text-slate-600 font-medium">Vincule sua cotação aos custos diretos de um projeto em andamento.</p>
                             </div>
                             
                             <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Obra</label>
                                    <Select 
                                      value={form.watch('projectId') || ""} 
                                      onValueChange={(id) => {
                                        const proj = projects?.find(p => p.id === id);
                                        setSelectedProject(proj);
                                        form.setValue('projectId', id);
                                        form.setValue('stageId', null); // Reset stage when project changes
                                      }}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-200">
                                            <SelectValue placeholder="Escolha a obra..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {projects?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Etapa da Obra</label>
                                    <Select 
                                        disabled={!form.watch('projectId')}
                                        value={form.watch('stageId') || ""} 
                                        onValueChange={(id) => {
                                            form.setValue('stageId', id);
                                        }}
                                    >
                                        <SelectTrigger className={`h-14 rounded-2xl border-slate-200 ${form.watch('projectId') ? 'bg-orange-50/50 border-orange-200 text-[#F07B2B] font-bold' : ''}`}>
                                            <SelectValue placeholder="Escolha a etapa..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {selectedProject?.stages.map((s: any) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>

                             <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                                <Button 
                                    className="h-14 rounded-2xl bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white px-10 font-bold shadow-xl shadow-orange-200 gap-2 w-full sm:w-auto"
                                    disabled={!form.watch('stageId')}
                                    onClick={() => {
                                        // A reatividade via watch já fará a transição automática,
                                        // mas podemos disparar um toast de confirmação
                                        toast.success("Vínculo com etapa estabelecido.");
                                    }}
                                >
                                    Confirmar e Prosseguir <ChevronRight className="w-4 h-4" />
                                </Button>

                                <Button 
                                    variant="ghost" 
                                    onClick={() => setCostCenterType('NONE')}
                                    className="text-slate-500 font-black px-4 hover:bg-slate-100 hover:text-slate-900 h-14 rounded-2xl transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                                </Button>
                             </div>
                        </div>
                    </div>
                </Card>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between px-4">
                     <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${costCenterType === 'CENTRAL' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                           {costCenterType === 'CENTRAL' ? <Building2 className="w-5 h-5 text-blue-600" /> : <HardHat className="w-5 h-5 text-orange-600" />}
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{costCenterType === 'CENTRAL' ? 'Empresa' : 'Obra'}</p>
                           <h4 className="text-lg font-bold text-[#1A3C5E]">
                             {costCenterType === 'CENTRAL' ? 'Sede / Almoxarifado Central' : selectedProject?.name}
                             {form.watch('stageId') && (
                                <span className="text-slate-300 font-medium ml-2 border-l pl-2 border-slate-200">
                                   {selectedProject?.stages.find((s: any) => s.id === form.watch('stageId'))?.name}
                                </span>
                             )}
                           </h4>
                        </div>
                     </div>
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                            setCostCenterType('NONE');
                            form.setValue('stageId', null);
                            setSelectedProject(null);
                        }}
                        className="rounded-xl text-slate-400 hover:text-orange-500 font-medium"
                      >
                        Alterar C. Custo
                     </Button>
                  </div>

                  <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                     <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-[#1A3C5E] flex items-center gap-2">
                           Planilha de Itens <Badge variant="secondary" className="rounded-full">{quoteItems.length}</Badge>
                        </h3>
                        <Button 
                           onClick={() => setShowAddItemDialog(true)}
                           className="bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white rounded-xl font-bold gap-2 h-10 px-5"
                        >
                           <Plus className="w-4 h-4" /> Adicionar Item
                        </Button>
                     </div>
                     <CardContent className="p-0">
                        <Table>
                           <TableHeader className="bg-slate-50/50">
                              <TableRow className="border-none">
                                 <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Item</TableHead>
                                 <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</TableHead>
                                 <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade</TableHead>
                                 <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantidade</TableHead>
                                 <TableHead className="pr-8"></TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {quoteItems.length === 0 ? (
                                <TableRow>
                                   <TableCell colSpan={5} className="py-20 text-center">
                                      <div className="flex flex-col items-center gap-2 opacity-20">
                                         <Plus className="w-12 h-12" />
                                         <p className="font-bold">Nenhum item adicionado ainda.</p>
                                      </div>
                                   </TableCell>
                                </TableRow>
                              ) : (
                                quoteItems.map((item, idx) => (
                                  <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                     <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                           <span className="text-[10px] font-bold text-slate-300">{(idx + 1).toString().padStart(2, '0')}</span>
                                           <div className={`p-2 rounded-lg ${item.type === 'MATERIAL' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                                              {item.type === 'MATERIAL' ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                                           </div>
                                        </div>
                                     </TableCell>
                                     <TableCell className="font-bold text-slate-700 max-w-sm">{item.description}</TableCell>
                                     <TableCell>
                                        <Badge variant="outline" className="rounded-lg bg-slate-50 border-slate-200 text-slate-400 font-black">{item.unit}</Badge>
                                     </TableCell>
                                     <TableCell>
                                        <Input 
                                           type="number" 
                                           value={item.quantity}
                                           onChange={(e) => updateQuantity(item.id, e.target.value)}
                                           className="w-24 h-10 rounded-xl bg-slate-50 border-none font-bold text-[#1A3C5E]" 
                                        />
                                     </TableCell>
                                     <TableCell className="pr-8 text-right">
                                        <Button 
                                           variant="ghost" 
                                           size="icon" 
                                           onClick={() => removeItem(item.id)}
                                           className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                                        >
                                           <Trash2 className="w-4 h-4" />
                                        </Button>
                                     </TableCell>
                                  </TableRow>
                                ))
                              )}
                           </TableBody>
                        </Table>
                     </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="suppliers" className="mt-0">
               {quoteSuppliers.length === 0 ? (
                 <Card className="border-4 border-dashed border-slate-100 bg-white rounded-[2.5rem] p-20 text-center animate-in zoom-in-95 duration-500">
                   <div className="flex flex-col items-center">
                     <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
                        <Truck className="w-12 h-12 text-emerald-500" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                           <Plus className="w-5 h-5 text-emerald-600" />
                        </div>
                     </div>
                     <h3 className="text-3xl font-black text-[#1A3C5E] mb-3 tracking-tight">Gerencie seus Fornecedores</h3>
                     <p className="text-slate-600 max-w-sm mb-12 font-medium leading-relaxed">
                       Selecione os parceiros que participarão desta rodada de cotação para garantir os melhores preços.
                     </p>
                     <Button 
                        onClick={() => setIsSupplierDialogOpen(true)}
                        className="h-16 rounded-[1.5rem] bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white px-12 font-bold shadow-2xl shadow-blue-200 gap-3 transition-all scale-110"
                     >
                        <Plus className="w-6 h-6" /> Incluir Fornecedor
                     </Button>
                   </div>
                 </Card>
               ) : (
                 <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                             <Truck className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-[#1A3C5E]">Lista de Fornecedores</h4>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{quoteSuppliers.length} selecionados para envio</p>
                          </div>
                       </div>
                       <Button 
                          onClick={() => setIsSupplierDialogOpen(true)}
                          variant="outline"
                          className="h-12 rounded-xl border-slate-200 font-bold gap-2 text-[#1A3C5E] hover:bg-slate-50"
                       >
                          <Plus className="w-4 h-4" /> Adicionar Mais
                       </Button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                       <Table>
                         <TableHeader className="bg-slate-50/50">
                           <TableRow className="hover:bg-transparent border-slate-100">
                             <TableHead className="text-xs font-black text-slate-500 uppercase tracking-widest py-6 px-6">Fornecedor</TableHead>
                             <TableHead className="text-xs font-black text-slate-500 uppercase tracking-widest py-6">CNPJ/CPF</TableHead>
                             <TableHead className="text-xs font-black text-slate-500 uppercase tracking-widest py-6">Contato</TableHead>
                             <TableHead className="w-[80px] text-right py-6 px-6"></TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {quoteSuppliers.map((supplier) => (
                             <TableRow key={supplier.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                               <TableCell className="py-5 px-6">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                                        {supplier.name.charAt(0)}
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-[#1A3C5E] truncate" title={supplier.name}>{supplier.name}</span>
                                        <span className="text-[10px] text-slate-400 font-medium truncate">{supplier.tradeName || 'Razão Social'}</span>
                                     </div>
                                  </div>
                               </TableCell>
                               <TableCell className="font-bold text-slate-600 text-xs">{supplier.document || '-'}</TableCell>
                               <TableCell className="py-5">
                                 <div className="flex flex-col gap-0.5">
                                   <span className="text-xs font-bold text-slate-500 truncate max-w-[150px]" title={supplier.email}>{supplier.email || '-'}</span>
                                   <span className="text-[10px] text-slate-400 font-medium">{supplier.phone || '-'}</span>
                                 </div>
                               </TableCell>
                               <TableCell className="text-right px-6">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                   onClick={() => {
                                      setQuoteSuppliers(prev => prev.filter(s => s.id !== supplier.id));
                                      toast.success("Fornecedor removido");
                                   }}
                                 >
                                   <Trash2 className="w-5 h-5" />
                                 </Button>
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 space-y-6">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-[#F07B2B]" />
                             </div>
                             <h4 className="text-xl font-black text-[#1A3C5E]">Local de Entrega</h4>
                          </div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic leading-none">Edição Manual Habilitada</p>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <FormField
                            control={form.control}
                            name="deliveryCep"
                            render={({ field }) => (
                              <FormItem className="col-span-1">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CEP</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryStreet"
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço / Logradouro</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryNumber"
                            render={({ field }) => (
                              <FormItem className="col-span-1">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryComplement"
                            render={({ field }) => (
                              <FormItem className="col-span-1">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complemento</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryNeighborhood"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bairro</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryCity"
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidade</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryState"
                            render={({ field }) => (
                              <FormItem className="col-span-1">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado (UF)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 transition-all font-bold text-[#1A3C5E]" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                       </div>
                    </div>
                 </div>
               )}
            </TabsContent>

            <TabsContent value="map">
               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                  {/* Header de Info */}
                  <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1A3C5E] rounded-2xl flex items-center justify-center text-white">
                           <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-[#1A3C5E]">Mapa de Escolha</h3>
                           <p className="text-xs text-slate-500 font-medium">Compare, selecione os vencedores e gere ordens de compra.</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Destaque: Melhor Preço</span>
                     </div>
                  </div>

                  {/* Matrix Container */}
                  <div className="overflow-x-auto custom-scrollbar">
                     <Table className="border-collapse">
                        <TableHeader className="bg-slate-50/50 sticky top-0 z-20">
                           <TableRow className="hover:bg-transparent border-slate-100">
                              {/* Sticky Item Column Header */}
                              <TableHead className="sticky left-0 z-30 bg-white border-r border-slate-100 min-w-[300px] py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                 Item / Referência
                              </TableHead>
                              <TableHead className="bg-slate-50 min-w-[120px] py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">
                                 Última Compra
                              </TableHead>

                              {/* Supplier Headers */}
                              {quoteSuppliers.map(supplier => (
                                 <TableHead key={supplier.id} className="min-w-[320px] py-6 px-4 bg-white border-r border-slate-100">
                                    <div className="flex flex-col items-center">
                                       <span className="text-xs font-black text-[#1A3C5E] uppercase tracking-tight">{supplier.name}</span>
                                       <span className="text-[10px] text-slate-400 font-medium">{supplier.document || '---'}</span>
                                    </div>
                                 </TableHead>
                              ))}
                           </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                           {quoteItems.map((item) => {
                              const lowestPrice = (() => {
                                 const prices = quoteSuppliers
                                   .map(s => comparisonData[s.id]?.[item.id]?.unitPrice)
                                   .filter(p => p && p > 0);
                                 return prices.length > 0 ? Math.min(...prices) : null;
                              })();

                              return (
                                 <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors border-slate-100">
                                    {/* Sticky Item Data Cell */}
                                    <TableCell className="sticky left-0 z-10 bg-white border-r border-slate-100 py-6 px-8">
                                       <div className="flex flex-col">
                                          <span className="font-bold text-[#1A3C5E] leading-tight">{item.description}</span>
                                          <div className="flex items-center gap-2 mt-1">
                                             <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-black uppercase tracking-widest">{item.unit}</span>
                                             <span className="text-[10px] text-slate-400 font-medium italic">Qtd: {item.quantity}</span>
                                          </div>
                                       </div>
                                    </TableCell>
                                    
                                    <TableCell className="bg-slate-50/50 text-center border-r border-slate-100 text-xs font-bold text-slate-400 italic">
                                       --
                                    </TableCell>

                                    {/* Supplier Input Cells */}
                                    {quoteSuppliers.map(supplier => {
                                       const data = comparisonData[supplier.id]?.[item.id] || { unitPrice: 0, brand: "" };
                                       const isWinner = winners[item.id] === supplier.id;
                                       const isLowest = lowestPrice !== null && data.unitPrice === lowestPrice;

                                       return (
                                          <TableCell 
                                             key={supplier.id} 
                                             className={`py-4 px-4 border-r border-slate-100 transition-all min-w-[320px] ${
                                                isWinner ? 'bg-emerald-50/30' : ''
                                             }`}
                                          >
                                             <div className={`p-4 rounded-3xl border-2 transition-all space-y-3 ${
                                                isWinner 
                                                ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-100' 
                                                : isLowest 
                                                  ? 'border-emerald-200 border-dashed bg-emerald-50/10'
                                                  : 'border-slate-50 bg-slate-50/30 focus-within:bg-white focus-within:border-[#1A3C5E]/20'
                                             }`}>
                                                <div className="flex items-center justify-between gap-3">
                                                   <div className="relative flex-1">
                                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                      <Input 
                                                         type="number"
                                                         placeholder="0,00"
                                                         className="h-10 pl-8 rounded-xl border-none bg-transparent font-black text-[#1A3C5E] focus-visible:ring-0 text-lg"
                                                         value={data.unitPrice || ""}
                                                         onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setComparisonData(prev => ({
                                                               ...prev,
                                                               [supplier.id]: {
                                                                  ...prev[supplier.id],
                                                                  [item.id]: { ...data, unitPrice: val }
                                                               }
                                                            }));
                                                         }}
                                                      />
                                                   </div>
                                                   <Button 
                                                      size="icon"
                                                      variant={isWinner ? "default" : "outline"}
                                                      className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                                                         isWinner 
                                                         ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200' 
                                                         : 'border-slate-100 text-slate-300 hover:text-emerald-500 hover:border-emerald-500'
                                                      }`}
                                                      onClick={() => {
                                                         setWinners(prev => ({
                                                            ...prev,
                                                            [item.id]: isWinner ? "" : supplier.id
                                                         }));
                                                      }}
                                                   >
                                                      <CheckCircle2 className={`w-5 h-5 ${isWinner ? 'animate-bounce-short' : ''}`} />
                                                   </Button>
                                                </div>
                                                <Input 
                                                   placeholder="Marca/Modelo..."
                                                   className="h-8 rounded-lg bg-white/50 border-slate-100 text-[10px] font-medium"
                                                   value={data.brand || ""}
                                                   onChange={(e) => {
                                                      setComparisonData(prev => ({
                                                         ...prev,
                                                         [supplier.id]: {
                                                            ...prev[supplier.id],
                                                            [item.id]: { ...data, brand: e.target.value }
                                                         }
                                                      }));
                                                   }}
                                                />
                                             </div>
                                          </TableCell>
                                       );
                                    })}
                                 </TableRow>
                              );
                           })}
                           
                           {/* Totals & Footer Row */}
                           <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-t-2 border-slate-200">
                              <TableCell className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 p-8">
                                 <div className="space-y-1 text-right">
                                    <p className="text-xs text-slate-500 font-medium">Totais calculados por proposta.</p>
                                 </div>
                              </TableCell>
                              <TableCell className="border-r border-slate-200 bg-slate-50/50" />
                              
                              {quoteSuppliers.map(supplier => {
                                 const footer = supplierFooters[supplier.id] || { discount: 0, paymentTerms: "PIX", deliveryTime: "" };
                                 
                                 // Total da Proposta (All Items)
                                 const totalProposed = quoteItems.reduce((acc, item) => {
                                    const price = comparisonData[supplier.id]?.[item.id]?.unitPrice || 0;
                                    return acc + (item.quantity * price);
                                 }, 0);

                                 // Subtotal (Won Items only)
                                 const subtotalWon = quoteItems.reduce((acc, item) => {
                                    if (winners[item.id] === supplier.id) {
                                       return acc + (item.quantity * (comparisonData[supplier.id]?.[item.id]?.unitPrice || 0));
                                    }
                                    return acc;
                                 }, 0);

                                 const discountFactor = (1 - (footer.discount / 100));
                                 const totalProposedNet = totalProposed * discountFactor;
                                 const finalTotalWon = subtotalWon * discountFactor;

                                 return (
                                    <TableCell key={supplier.id} className="p-8 border-r border-slate-100 align-top min-w-[320px]">
                                       <div className="space-y-6">
                                          {/* Stats & Comparison */}
                                          <div className="grid gap-4">
                                             <div className="flex flex-col gap-1 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm ring-1 ring-emerald-500/20">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                                   <Trophy className="w-3 h-3" /> Itens Selecionados
                                                </span>
                                                <span className="text-xl font-black text-emerald-700">
                                                   R$ {finalTotalWon.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                             </div>

                                             <div className="space-y-4 px-2">
                                                <div className="flex flex-col gap-1.5">
                                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Desconto (%)</label>
                                                   <Input 
                                                      type="number"
                                                      className="h-10 rounded-xl bg-white border-slate-100 font-bold"
                                                      value={footer.discount || ""}
                                                      onChange={(e) => setSupplierFooters(p => ({
                                                         ...p,
                                                         [supplier.id]: { ...footer, discount: parseFloat(e.target.value) || 0 }
                                                      }))}
                                                   />
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Condição de Pagamento</label>
                                                   <Select 
                                                      value={footer.paymentTerms}
                                                      onValueChange={(val) => setSupplierFooters(p => ({
                                                         ...p,
                                                         [supplier.id]: { ...footer, paymentTerms: val }
                                                      }))}
                                                   >
                                                      <SelectTrigger className="h-10 rounded-xl bg-white border-slate-100 font-bold">
                                                         <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent className="rounded-xl">
                                                         <SelectItem value="PIX">Pix / À Vista</SelectItem>
                                                         <SelectItem value="BOLETO_15">Boleto 15 Dias</SelectItem>
                                                         <SelectItem value="BOLETO_30">Boleto 30 Dias</SelectItem>
                                                         <SelectItem value="PARCELADO">Parcelado</SelectItem>
                                                      </SelectContent>
                                                   </Select>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Prazo de Entrega</label>
                                                   <Input 
                                                      placeholder="Ex: 5 dias úteis"
                                                      className="h-10 rounded-xl bg-white border-slate-100 font-bold"
                                                      value={footer.deliveryTime || ""}
                                                      onChange={(e) => setSupplierFooters(p => ({
                                                         ...p,
                                                         [supplier.id]: { ...footer, deliveryTime: e.target.value }
                                                      }))}
                                                   />
                                                </div>
                                             </div>

                                             <div className="p-6 bg-[#1A3C5E] rounded-[2rem] text-white shadow-xl shadow-blue-200/50">
                                                <div className="flex items-center justify-between mb-1">
                                                   <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Total da Proposta</p>
                                                   {footer.discount > 0 && (
                                                      <Badge className="bg-blue-400/20 text-blue-100 border-none text-[8px] font-black">C/ DESCONTO</Badge>
                                                   )}
                                                </div>
                                                <p className="text-3xl font-black italic">R$ {totalProposedNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                
                                                <Button 
                                                   disabled={subtotalWon === 0}
                                                   className="w-full mt-6 h-14 rounded-2xl bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-900/20 group"
                                                   onClick={() => {
                                                      toast.success(`Gerando Ordem de Compra para ${supplier.name}...`);
                                                   }}
                                                >
                                                   <FileText className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Gerar Ordem
                                                </Button>
                                             </div>
                                          </div>
                                       </div>
                                    </TableCell>
                                 );
                              })}
                           </TableRow>
                        </TableBody>
                     </Table>
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </Form>

      {/* DIALOG: ADD ITEM */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent showCloseButton={false} className="max-w-3xl p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
          <DialogHeader className="bg-[#1A3C5E] p-8 text-white relative">
            <DialogClose 
               onClick={() => setShowAddItemDialog(false)}
               className="absolute right-6 top-6 rounded-xl p-2 hover:bg-white/10 transition-all text-white/50 hover:text-white z-50"
            >
               <X className="w-6 h-6" />
            </DialogClose>
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Search className="w-24 h-24" />
            </div>
            <DialogTitle className="text-2xl font-black">Adicionar Item</DialogTitle>
            <DialogDescription className="text-blue-100/60 font-medium">
              Busque por insumos no catálogo ou composições de serviço.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                 placeholder="Digite o código ou descrição..." 
                 className="h-14 rounded-2xl pl-12 bg-slate-50 border-slate-100 focus:ring-[#F07B2B]"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Tabs defaultValue="materials" className="w-full">
               <TabsList className="bg-slate-100/50 p-1 rounded-xl mb-4">
                  <TabsTrigger value="materials" className="rounded-lg font-bold text-xs gap-2">Insumos (Físico)</TabsTrigger>
                  <TabsTrigger value="compositions" className="rounded-lg font-bold text-xs gap-2">Composições</TabsTrigger>
               </TabsList>
               
               <TabsContent value="materials" className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-2">
                    {catalogItems?.items.map((item: any) => (
                      <div 
                        key={item.id} 
                        onClick={() => addItemToQuote(item, 'MATERIAL')}
                        className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                              <Box className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="font-bold text-slate-900 group-hover:text-[#F07B2B] transition-colors">{item.description}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.code} | {item.unit}</p>
                           </div>
                        </div>
                        <Plus className="w-5 h-5 text-slate-200 group-hover:text-[#F07B2B] group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                    {(!catalogItems || catalogItems.items.length === 0) && (
                      <div className="py-10 text-center text-slate-400 text-sm font-medium">Nenhum insumo encontrado.</div>
                    )}
                  </div>
               </TabsContent>

               <TabsContent value="compositions" className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-2">
                    {compositions?.items.map((item: any) => (
                      <div 
                         key={item.id} 
                         onClick={() => addItemToQuote(item, 'COMPOSITION')}
                         className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                              <Layers className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="font-bold text-slate-900 group-hover:text-[#1A3C5E] transition-colors">{item.description}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.code} | {item.unit}</p>
                           </div>
                        </div>
                        <Plus className="w-5 h-5 text-slate-200 group-hover:text-[#1A3C5E] group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                    {(!compositions || compositions.items.length === 0) && (
                      <div className="py-10 text-center text-slate-400 text-sm font-medium">Nenhuma composição encontrada.</div>
                    )}
                  </div>
               </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Incluir Fornecedor */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
         <DialogContent showCloseButton={false} className="max-w-2xl rounded-[3rem] p-0 overflow-hidden bg-white border-none shadow-2xl focus:outline-none">
            <div className="bg-[#1A3C5E] p-8 text-white relative">
               <DialogClose 
                  onClick={() => setIsSupplierDialogOpen(false)}
                  className="absolute right-6 top-6 rounded-xl p-2 hover:bg-white/10 transition-all text-white/50 hover:text-white z-50"
               >
                  <X className="w-6 h-6" />
               </DialogClose>
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Truck className="w-6 h-6" />
                     </div>
                     <div>
                        <DialogTitle className="text-2xl font-black tracking-tight">Adicionar Fornecedores</DialogTitle>
                        <DialogDescription className="text-blue-200/70 text-sm font-medium">Selecione os parceiros da lista abaixo</DialogDescription>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 space-y-6">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                     placeholder="Buscar fornecedor por nome ou documento..."
                     className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:ring-2 focus:ring-[#1A3C5E]/20 transition-all font-medium"
                     value={supplierSearch}
                     onChange={(e) => setSupplierSearch(e.target.value)}
                  />
               </div>

               <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid gap-3">
                     {availableSuppliers?.items.map((supplier: any) => {
                        const isSelected = quoteSuppliers.some(s => s.id === supplier.id);
                        return (
                           <div 
                              key={supplier.id}
                              onClick={() => {
                                 if (isSelected) {
                                    setQuoteSuppliers(prev => prev.filter(s => s.id !== supplier.id));
                                 } else {
                                    setQuoteSuppliers(prev => [...prev, supplier]);
                                 }
                              }}
                              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                                 isSelected 
                                 ? 'border-emerald-500 bg-emerald-50/50' 
                                 : 'border-slate-50 bg-white hover:border-slate-200'
                              }`}
                           >
                              <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${
                                    isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                 }`}>
                                    {supplier.name.charAt(0)}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className={`font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{supplier.name}</span>
                                    <span className="text-xs text-slate-400 font-medium">{supplier.document || 'Sem documento'}</span>
                                 </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                 isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'
                              }`}>
                                 {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </div>
                           </div>
                        );
                     })}
                     {availableSuppliers?.items.length === 0 && (
                        <div className="text-center py-12">
                           <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                           <p className="text-slate-400 font-medium">Nenhum fornecedor encontrado.</p>
                        </div>
                     )}
                  </div>
               </div>

               <div className="pt-4 flex gap-3">
                  <Button 
                     onClick={() => setIsSupplierDialogOpen(false)}
                     className="flex-1 h-16 rounded-[1.5rem] bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white font-black text-lg shadow-xl shadow-blue-200/50"
                  >
                     Confirmar ({quoteSuppliers.length})
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
