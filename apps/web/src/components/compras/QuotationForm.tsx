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
  Share2,
  Check,
  Star,
  MessageSquare,
  FileText,
  Search,
  Plus,
  Trash2,
  Building2,
  HardHat,
  Loader2,
  Bell,
  FileBarChart,
  Thermometer,
  Info,
  ChevronUp,
  ChevronDown,
  Calendar,
  MoreVertical
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ProjectSelectorModal } from "./ProjectSelectorModal";
import { ItemSelectorDialog } from "@/components/catalogo/ItemSelectorDialog";
import { SupplierSelectorDialog } from "./SupplierSelectorDialog";

const quoteSchema = z.object({
  quoteNumber: z.string(),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres"),
  status: z.string(),
  priority: z.boolean(),
  necessityDate: z.string().min(1, "Data de necessidade é obrigatória"),
  requesterId: z.string().min(1, "Selecione um solicitante"),
  projectId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

const statusOptions = [
  { value: "OPEN", label: "Em aberto" },
  { value: "REQUESTED", label: "Solicitado" },
  { value: "SENT_TO_SUPPLIER", label: "Enviado ao Fornecedor" },
  { value: "PARTIALLY_ANSWERED", label: "Respondido Parcialmente" },
  { value: "FINISHED", label: "Finalizado" },
];

interface QuotationFormProps {
  mode: 'CREATE' | 'EDIT';
  requestId?: string;
}

export default function QuotationForm({ mode, requestId }: QuotationFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  
  const { data: existingData, isLoading: isLoadingExisting } = trpc.purchasing.getRequestWithQuote.useQuery(
    { requestId: requestId! },
    { enabled: mode === 'EDIT' && !!requestId }
  );

  const { data: requests } = trpc.purchasing.getRequests.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();
  const { data: options } = trpc.projects.formOptions.useQuery();
  const users = options?.users || [];

  const [quoteNumber, setQuoteNumber] = useState("...");
  const [activeTab, setActiveTab] = useState("items");
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [quoteSuppliers, setQuoteSuppliers] = useState<any[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [mapData, setMapData] = useState<Record<string, any>>({});
  const [editingCells, setEditingCells] = useState<Set<string>>(new Set());
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const toggleWinner = (id: string) => {
    setWinnerId(prev => prev === id ? null : id);
  };

  const toggleEdit = (id: string) => {
    setEditingCells(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isEditing = (id: string) => editingCells.has(id);

  const updateMapValue = (supplierId: string, itemIdx: number, field: string, value: any) => {
    setMapData(prev => ({
      ...prev,
      [supplierId]: {
        ...prev[supplierId],
        items: {
          ...(prev[supplierId]?.items || {}),
          [itemIdx]: {
            ...(prev[supplierId]?.items?.[itemIdx] || { brand: "", price: 0 }),
            [field]: value
          }
        }
      }
    }));
  };

  const updateSupplierMetadata = (supplierId: string, field: string, value: any) => {
    setMapData(prev => ({
      ...prev,
      [supplierId]: {
        ...prev[supplierId],
        [field]: value
      }
    }));
  };

  const calculateSupplierSubtotal = (supplierId: string) => {
    const items = mapData[supplierId]?.items || {};
    return quoteItems.reduce((acc, item, idx) => {
      const price = items[idx]?.price || 0;
      return acc + (price * (item.quantity || 1));
    }, 0);
  };

  const calculateSupplierTotal = (supplierId: string) => {
    const subtotal = calculateSupplierSubtotal(supplierId);
    const discount = mapData[supplierId]?.discount || 0;
    const freight = mapData[supplierId]?.freight || 0;
    return (subtotal * (1 - discount / 100)) + freight;
  };

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
      notes: "",
    },
  });

  useEffect(() => {
    if (mode === 'EDIT' && existingData) {
      form.reset({
        quoteNumber: existingData.id.slice(0, 8),
        description: existingData.notes || "",
        status: existingData.status,
        priority: false,
        necessityDate: format(existingData.createdAt, "yyyy-MM-dd"),
        requesterId: existingData.requesterId,
        projectId: existingData.projectId,
        stageId: existingData.stageId,
        notes: "",
      });
      setQuoteNumber(existingData.id.slice(0, 8));
    } else if (mode === 'CREATE' && requests) {
      const nextNum = (requests.length + 1).toString();
      setQuoteNumber(nextNum);
      form.setValue('quoteNumber', nextNum);
    }
  }, [mode, existingData, requests, form]);

  const createMutation = trpc.purchasing.createStandaloneQuote.useMutation({
    onSuccess: () => {
      toast.success("Cotação gravada!");
      router.push("/dashboard/compras/cotacoes");
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (data: QuoteFormValues) => {
    if (quoteItems.length === 0) {
      toast.error("Adicione itens.");
      return;
    }
    createMutation.mutate({
      ...data,
      items: quoteItems,
      suppliers: quoteSuppliers.map(s => s.id)
    });
  };

  if (mode === 'EDIT' && isLoadingExisting) return <div className="p-8">Carregando dados...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F1F5F9]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">Compras</span>
                <h1 className="text-2xl font-black text-[#1E3A5F] leading-none">Cotação</h1>
              </div>

              <div className="flex items-center gap-8 border-l border-slate-100 pl-8">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Itens</span>
                  <span className="text-xl font-black text-[#1E3A5F] leading-none">{quoteItems.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fornecedores</span>
                  <span className="text-xl font-black text-[#1E3A5F] leading-none">{quoteSuppliers.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Criação</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-sm px-2.5 py-1 text-xs font-bold text-slate-600">
                    {format(new Date(), "dd/MM/yyyy")}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Criado por</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-sm px-2.5 py-1 text-xs font-bold text-slate-600">
                    Desenvolvedor
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white h-8 px-5 text-xs font-bold rounded-sm gap-1.5 shadow-none"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-7 w-7 bg-[#2E3E4E] hover:bg-[#1a252f] text-white border-none rounded-sm">
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 bg-[#F3A04C] hover:bg-[#e6923d] text-white border-none rounded-sm"
                onClick={() => router.push("/dashboard/compras/cotacoes")}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Config Bar */}
          <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Número:</label>
              <div className="h-10 w-24 bg-slate-100 border border-slate-200 rounded-sm flex items-center px-3 text-sm font-bold text-slate-500">
                {quoteNumber}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Descrição</label>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="w-56 flex flex-col gap-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
                Status: <Info className="w-3.5 h-3.5" />
              </label>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="w-28 flex flex-col gap-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Prioridade:</label>
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex">
                      <Button 
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          "h-10 px-4 rounded-sm text-xs font-black uppercase flex items-center gap-1.5 border shadow-none",
                          field.value ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-slate-400 border-slate-200"
                        )}
                      >
                        {field.value ? "Sim" : "Não"} <Thermometer className={cn("w-4 h-4", field.value ? "text-red-500" : "text-slate-300")} />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="w-44 flex flex-col gap-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Necessidade:</label>
              <FormField
                control={form.control}
                name="necessityDate"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <Input type="date" {...field} className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium pr-8" />
                      <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="w-56 flex flex-col gap-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Solicitante:</label>
              <FormField
                control={form.control}
                name="requesterId"
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium focus:ring-0">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user: any) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 bg-[#337AB7] hover:bg-[#286090] text-white border-none rounded-sm">
                <Bell className="w-4.5 h-4.5" />
              </Button>
              <Button type="button" className="h-10 bg-[#5BC0DE] hover:bg-[#46b8da] text-white text-xs font-bold rounded-sm gap-1.5 shadow-none px-4">
                <FileBarChart className="w-4 h-4" /> Relatórios <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-transparent justify-start h-auto p-0 border-b border-slate-200 rounded-none mb-6">
                <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2079D2] data-[state=active]:text-[#2079D2] bg-transparent text-xs font-bold uppercase tracking-tight px-6 py-2.5">
                  Itens
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2079D2] data-[state=active]:text-[#2079D2] bg-transparent text-xs font-bold uppercase tracking-tight px-6 py-2.5">
                  Fornecedores
                </TabsTrigger>
                <TabsTrigger value="map" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2079D2] data-[state=active]:text-[#2079D2] bg-transparent text-xs font-bold uppercase tracking-tight px-6 py-2.5">
                  Mapa de Cotação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="flex-1 m-0 focus-visible:ring-0">
                {quoteItems.length === 0 && !form.getValues("projectId") ? (
                  <div className="flex-1 bg-white border border-slate-200 rounded-sm flex flex-col items-center justify-center py-20 px-4">
                    <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-tight text-center max-w-md">
                      Clique no botão abaixo para adicionar centros de custo nesta Cotação
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                      <Button 
                        type="button" 
                        onClick={() => setIsProjectModalOpen(true)}
                        className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-bold h-10 px-8 rounded-sm text-xs gap-2 shadow-none"
                      >
                        <Plus className="w-4 h-4" /> Obra
                      </Button>
                      <Button type="button" className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-bold h-10 px-8 rounded-sm text-xs gap-2 shadow-none">
                        <Plus className="w-4 h-4" /> Empresa
                      </Button>
                    </div>
                    <span className="text-xs font-bold text-slate-300 uppercase mb-4 italic">ou</span>
                    <Button type="button" variant="outline" className="h-10 px-8 rounded-sm text-xs font-bold gap-2 text-slate-600 border-slate-200">
                      <Search className="w-4 h-4 text-slate-400" /> Buscar solicitação
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Project/Stage Group Section */}
                    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-600">
                            <strong className="font-bold">Obra:</strong> {projects?.find(p => p.id === form.getValues("projectId"))?.name || "003 - Recuperação do Ramal do Gama"}
                          </span>
                          <span className="text-xs text-slate-600 ml-4">
                            <strong className="font-bold">Etapa 1:</strong> {projects?.find(p => p.id === form.getValues("projectId"))?.stages.find(s => s.id === form.getValues("stageId"))?.name || "GERÊNCIA TÉCNICA"}
                          </span>
                        </div>
                        <ChevronUp className="w-4.5 h-4.5 text-slate-400" />
                      </div>

                      <div className="min-h-[100px]">
                        <div className="grid grid-cols-[120px_1fr_120px_120px] gap-4 px-6 py-2.5 bg-white border-b border-slate-100 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">Item <ChevronDown className="w-3.5 h-3.5 text-slate-300" /></div>
                          <span>Descrição</span>
                          <span className="text-center">Unidade</span>
                          <span className="text-center">Quantidade</span>
                        </div>

                        {quoteItems.length === 0 ? (
                          <div className="py-8 text-center text-[11px] font-medium text-slate-400 italic bg-white">
                            Nenhum item adicionado.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50 bg-white">
                            {quoteItems.map((item, idx) => (
                              <div key={idx} className="grid grid-cols-[120px_1fr_120px_120px] gap-4 px-6 py-2.5 items-center hover:bg-slate-50 transition-colors">
                                <div className="text-xs font-bold text-slate-500">{idx + 1}</div>
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">{item.description}</div>
                                <div className="text-xs font-bold text-slate-500 text-center">{item.unit}</div>
                                <div className="flex justify-center">
                                  <Input 
                                    type="number" 
                                    value={item.quantity || 1} 
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setQuoteItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                                    }}
                                    className="h-8 w-20 bg-white border-slate-200 rounded-sm text-center text-xs font-black text-[#2079D2] focus:ring-1 focus:ring-[#2079D2]"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                        <Button 
                          type="button" 
                          onClick={() => setIsItemModalOpen(true)}
                          className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-black h-9 px-6 rounded-sm text-xs gap-2 shadow-none"
                        >
                          <Plus className="w-4 h-4" /> Item
                        </Button>
                        <Button type="button" className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-black h-9 px-6 rounded-sm text-xs gap-2 shadow-none">
                          <Plus className="w-4 h-4" /> Etapa
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
                          <MoreVertical className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="suppliers" className="flex-1 m-0 focus-visible:ring-0 space-y-6">
                {/* Fornecedores List / Empty State */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Participantes da Cotação</span>
                    <Button 
                      type="button" 
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-black h-8 px-5 rounded-sm text-[10px] gap-2 shadow-none"
                    >
                      <Plus className="w-3.5 h-3.5" /> Fornecedor
                    </Button>
                  </div>

                  {quoteSuppliers.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center bg-white">
                      <p className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-tight text-center">
                        Clique no botão acima para adicionar fornecedores nesta Cotação
                      </p>
                      <Button 
                        type="button" 
                        onClick={() => setIsSupplierModalOpen(true)}
                        className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-black h-10 px-10 rounded-sm text-xs gap-2 shadow-none"
                      >
                        <Plus className="w-4 h-4" /> Fornecedor
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      <div className="grid grid-cols-[80px_1fr_200px_150px_60px] gap-4 px-6 py-2.5 bg-white font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <span>Código</span>
                        <span>Nome / Razão Social</span>
                        <span>Cidade / UF</span>
                        <span>Telefone</span>
                        <span className="text-center">Ação</span>
                      </div>
                      {quoteSuppliers.map((supplier, idx) => (
                        <div key={supplier.id} className="grid grid-cols-[80px_1fr_200px_150px_60px] gap-4 px-6 py-3.5 items-center hover:bg-slate-50 transition-colors bg-white">
                          <div className="text-xs font-bold text-slate-500">#{idx + 1}</div>
                          <div className="text-sm font-bold text-slate-700 uppercase">{supplier.name}</div>
                          <div className="text-xs font-bold text-slate-500">{supplier.city || "-"}{supplier.state ? ` / ${supplier.state}` : ""}</div>
                          <div className="text-xs font-bold text-slate-500">{supplier.phone || "-"}</div>
                          <div className="flex justify-center">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setQuoteSuppliers(prev => prev.filter(s => s.id !== supplier.id))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Local de Entrega Section */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-tight">Local de Entrega</h3>
                      <Button variant="outline" className="h-6 px-2 text-[10px] font-black uppercase border-slate-200 text-slate-500 bg-slate-50 rounded-sm">
                        Buscar endereço
                      </Button>
                    </div>
                    <ChevronUp className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                  
                  <div className="p-6 grid grid-cols-12 gap-x-6 gap-y-4">
                    <div className="col-span-3 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">CEP:</label>
                      <Input placeholder="00.000-000" className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium" />
                    </div>
                    <div className="col-span-5 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Endereço:</label>
                      <Input className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Número:</label>
                      <Input placeholder="s/n" className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Complemento:</label>
                      <Input className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium" />
                    </div>

                    <div className="col-span-4 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Bairro:</label>
                      <Input className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium" />
                    </div>
                    <div className="col-span-4 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Estado:</label>
                      <Select>
                        <SelectTrigger className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium focus:ring-0">
                          <SelectValue placeholder="Selecione o Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">Amazonas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-tight">Cidade:</label>
                      <Select>
                        <SelectTrigger className="h-10 bg-white border-slate-200 rounded-sm text-sm font-medium focus:ring-0">
                          <SelectValue placeholder="Selecione a Cidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GUAJARA">Guajará</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="map" className="flex-1 m-0 focus-visible:ring-0 overflow-hidden flex flex-col bg-white border border-slate-200 rounded-sm shadow-sm">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1200px]">
                    <thead className="bg-[#337AB7] text-white">
                      <tr>
                        <th className="py-3 px-4 text-[11px] font-black uppercase text-left w-[300px] sticky left-0 bg-[#337AB7] z-20 border-r border-white/10">Item</th>
                        <th className="py-3 px-2 text-[10px] font-black uppercase text-center w-[80px]">Qtde. Cotada</th>
                        <th className="py-3 px-2 text-[10px] font-black uppercase text-center w-[80px]">Qtde. Comprada</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-right w-[120px] border-r border-white/10 flex items-center justify-end gap-1">
                          Valor Orçamento <Info className="w-3 h-3" />
                        </th>
                        
                        {/* Dynamic Supplier Columns */}
                        {quoteSuppliers.map(supplier => (
                          <th key={supplier.id} className="py-3 px-4 text-[11px] font-black uppercase text-center border-r border-white/10 min-w-[250px]">
                            {supplier.name}
                          </th>
                        ))}

                        <th className="py-3 px-4 text-[11px] font-black uppercase text-center bg-[#2E3E4E] sticky right-0 z-20 min-w-[150px]">
                          <div className="flex flex-col items-center">
                            <Button type="button" onClick={() => setIsSupplierModalOpen(true)} className="h-6 px-2 bg-[#5CB85C] hover:bg-[#4cae4c] text-[9px] gap-1 mb-1 shadow-none">
                              <Plus className="w-3 h-3" /> Fornec.
                            </Button>
                            <span className="flex items-center gap-1">Melhor Compra <Info className="w-3 h-3" /></span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quoteItems.length === 0 ? (
                        <tr>
                          <td colSpan={5 + quoteSuppliers.length} className="py-20 text-center text-sm font-medium text-slate-400 italic">
                            Adicione itens e fornecedores para visualizar o mapa.
                          </td>
                        </tr>
                      ) : (
                        quoteItems.map((item, itemIdx) => (
                          <tr key={itemIdx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 sticky left-0 bg-white z-10 border-r border-slate-100 group-hover:bg-slate-50">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 uppercase">{item.description}</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Unidade: {item.unit}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-center text-sm font-bold text-slate-600">{item.quantity}</td>
                            <td className="py-4 px-2 text-center text-sm font-bold text-slate-300">-</td>
                            <td className="py-4 px-4 text-right border-r border-slate-100">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-400">R$ 0,00</span>
                                <span className="text-xs font-bold text-slate-400">R$ 0,00</span>
                              </div>
                            </td>

                            {/* Supplier Item Price Inputs */}
                            {quoteSuppliers.map(supplier => {
                              const cellId = `${supplier.id}-${itemIdx}`;
                              const supplierItemData = mapData[supplier.id]?.items?.[itemIdx] || { brand: "", price: 0 };
                              const editing = isEditing(cellId);

                              if (!editing) {
                                return (
                                  <td 
                                    key={supplier.id} 
                                    className="p-4 border-r border-slate-100 bg-[#E3F2FD]/30 cursor-pointer hover:bg-[#E3F2FD]/50 transition-colors"
                                    onClick={() => toggleEdit(cellId)}
                                  >
                                    <div className="flex flex-col items-center justify-center min-h-[60px]">
                                      <span className="text-xs font-bold text-slate-500 italic mb-1 uppercase tracking-tight">
                                        {supplierItemData.brand || "Marca / Modelo"}
                                      </span>
                                      <span className="text-sm font-black text-[#2079D2] uppercase tracking-tight">
                                        R$ {supplierItemData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                                        Total: R$ {(supplierItemData.price * (item.quantity || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={supplier.id} className="p-4 border-r border-slate-100 bg-[#FFF9C4]/40">
                                  <div className="flex flex-col gap-2 relative">
                                    {/* Brand Input */}
                                    <div className="flex items-center gap-1.5 group">
                                       <div className="w-5 h-5 bg-[#F0AD4E] rounded-sm flex items-center justify-center cursor-pointer shrink-0">
                                          <Trash2 className="w-3 h-3 text-white" />
                                       </div>
                                       <Input 
                                          placeholder="Marca / Modelo" 
                                          value={supplierItemData.brand}
                                          onChange={(e) => updateMapValue(supplier.id, itemIdx, "brand", e.target.value)}
                                          className="h-8 text-[11px] font-medium bg-white border-slate-200 rounded-sm text-center shadow-sm placeholder:italic" 
                                       />
                                       <div 
                                          className="w-5 h-5 bg-[#5CB85C] rounded-sm flex items-center justify-center cursor-pointer shrink-0"
                                          onClick={(e) => { e.stopPropagation(); toggleEdit(cellId); }}
                                       >
                                          <Check className="w-3 h-3 text-white" />
                                       </div>
                                    </div>

                                    {/* Price Input */}
                                    <div className="flex items-center gap-1.5 group">
                                       <div className="w-5 h-5 bg-[#F0AD4E] rounded-sm flex items-center justify-center cursor-pointer shrink-0">
                                          <Trash2 className="w-3 h-3 text-white" />
                                       </div>
                                       <Input 
                                         type="number"
                                         placeholder="0,00"
                                         value={supplierItemData.price || ""}
                                         onChange={(e) => updateMapValue(supplier.id, itemIdx, "price", parseFloat(e.target.value) || 0)}
                                         className="h-8 text-sm font-black text-slate-700 bg-white border-slate-200 rounded-sm text-center shadow-sm" 
                                         autoFocus
                                       />
                                       <div 
                                          className="w-5 h-5 bg-[#5CB85C] rounded-sm flex items-center justify-center cursor-pointer shrink-0"
                                          onClick={(e) => { e.stopPropagation(); toggleEdit(cellId); }}
                                       >
                                          <Check className="w-3 h-3 text-white" />
                                       </div>
                                    </div>

                                    {/* Total Display */}
                                    <div className="text-[11px] font-bold text-slate-400 text-center py-1 bg-slate-100/50 rounded-sm uppercase tracking-tight">
                                      R$ {(supplierItemData.price * (item.quantity || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}

                            <td className="py-4 px-4 sticky right-0 bg-white z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-400 italic">R$ 0,00</span>
                                <span className="text-xs font-bold text-slate-400">R$ 0,00</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Footer Rows */}
                      {quoteItems.length > 0 && (
                        <>
                          <tr className="bg-slate-50 font-bold text-slate-600">
                            <td className="py-4 px-4 sticky left-0 bg-slate-50 border-r border-slate-100 text-[11px] uppercase tracking-tight">Subtotal</td>
                            <td className="py-4 px-2 text-center text-sm"></td>
                            <td className="py-4 px-2 text-center text-sm"></td>
                            <td className="py-4 px-4 text-right border-r border-slate-100 text-xs uppercase">R$ 0,00</td>
                            {quoteSuppliers.map(s => (
                              <td key={s.id} className="py-4 px-4 text-center border-r border-slate-100 text-sm font-black text-slate-700">
                                R$ {calculateSupplierSubtotal(s.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            ))}
                            <td className="py-4 px-4 text-right sticky right-0 bg-slate-50 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] text-xs">R$ 0,00</td>
                          </tr>

                          {/* Discount Row */}
                          <tr className="text-slate-500">
                            <td className="py-4 px-4 sticky left-0 bg-white border-r border-slate-100 text-[11px] font-black uppercase tracking-tight">(-) Desconto %</td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-4 text-right border-r border-slate-100 text-xs">-</td>
                            {quoteSuppliers.map(s => {
                              const cellId = `${s.id}-discount`;
                              const editing = isEditing(cellId);
                              if (!editing) {
                                return (
                                  <td 
                                    key={s.id} 
                                    className="py-4 px-4 text-center border-r border-slate-100 text-xs font-bold bg-[#E3F2FD]/20 cursor-pointer hover:bg-[#E3F2FD]/40 transition-colors"
                                    onClick={() => toggleEdit(cellId)}
                                  >
                                    {mapData[s.id]?.discount?.toLocaleString('pt-BR', { minimumFractionDigits: 3 }) || "0,000"}%
                                  </td>
                                );
                              }
                              return (
                                <td key={s.id} className="p-4 border-r border-slate-100 bg-[#FFF9C4]/40">
                                  <div className="flex items-center gap-1.5 max-w-[150px] mx-auto">
                                     <div className="w-5 h-5 bg-[#F0AD4E] rounded-sm flex items-center justify-center cursor-pointer shrink-0">
                                        <Trash2 className="w-3 h-3 text-white" />
                                     </div>
                                     <Input 
                                        placeholder="0,000%" 
                                        className="h-8 text-[11px] font-bold text-center bg-white border-slate-200 rounded-sm shadow-sm"
                                        value={mapData[s.id]?.discount || ""}
                                        onChange={(e) => updateSupplierMetadata(s.id, "discount", parseFloat(e.target.value) || 0)}
                                        autoFocus
                                     />
                                     <div 
                                        className="w-5 h-5 bg-[#5CB85C] rounded-sm flex items-center justify-center cursor-pointer shrink-0"
                                        onClick={() => toggleEdit(cellId)}
                                     >
                                        <Check className="w-3 h-3 text-white" />
                                     </div>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="py-4 px-4 text-right sticky right-0 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] text-xs">-</td>
                          </tr>

                          {/* Freight Row */}
                          <tr className="text-slate-500">
                            <td className="py-4 px-4 sticky left-0 bg-white border-r border-slate-100 text-[11px] font-black uppercase tracking-tight">(+) Frete</td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-4 text-right border-r border-slate-100 text-xs">-</td>
                            {quoteSuppliers.map(s => {
                              const cellId = `${s.id}-freight`;
                              const editing = isEditing(cellId);
                              if (!editing) {
                                return (
                                  <td 
                                    key={s.id} 
                                    className="py-4 px-4 text-center border-r border-slate-100 text-xs font-bold bg-[#E3F2FD]/20 cursor-pointer hover:bg-[#E3F2FD]/40 transition-colors"
                                    onClick={() => toggleEdit(cellId)}
                                  >
                                    R$ {mapData[s.id]?.freight?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                                  </td>
                                );
                              }
                              return (
                                <td key={s.id} className="p-4 border-r border-slate-100 bg-[#FFF9C4]/40">
                                  <div className="flex items-center gap-1.5 max-w-[150px] mx-auto">
                                     <div className="w-5 h-5 bg-[#F0AD4E] rounded-sm flex items-center justify-center cursor-pointer shrink-0">
                                        <Trash2 className="w-3 h-3 text-white" />
                                     </div>
                                     <Input 
                                        placeholder="0,00" 
                                        className="h-8 text-[11px] font-bold text-center bg-white border-slate-200 rounded-sm shadow-sm"
                                        value={mapData[s.id]?.freight || ""}
                                        onChange={(e) => updateSupplierMetadata(s.id, "freight", parseFloat(e.target.value) || 0)}
                                        autoFocus
                                     />
                                     <div 
                                        className="w-5 h-5 bg-[#5CB85C] rounded-sm flex items-center justify-center cursor-pointer shrink-0"
                                        onClick={() => toggleEdit(cellId)}
                                     >
                                        <Check className="w-3 h-3 text-white" />
                                     </div>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="py-4 px-4 text-right sticky right-0 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] text-xs">R$ 0,00</td>
                          </tr>

                          {/* Payment Condition Row */}
                          <tr className="text-slate-500">
                            <td className="py-4 px-4 sticky left-0 bg-white border-r border-slate-100 text-[11px] font-black uppercase tracking-tight">Condição de Pagamento</td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-4 text-right border-r border-slate-100 text-xs">-</td>
                            {quoteSuppliers.map(s => {
                              const cellId = `${s.id}-paymentCondition`;
                              const editing = isEditing(cellId);
                              if (!editing) {
                                return (
                                  <td 
                                    key={s.id} 
                                    className="py-4 px-4 text-center border-r border-slate-100 text-[10px] font-bold bg-[#E3F2FD]/20 cursor-pointer hover:bg-[#E3F2FD]/40 transition-colors uppercase"
                                    onClick={() => toggleEdit(cellId)}
                                  >
                                    {mapData[s.id]?.paymentCondition || "Selecione"}
                                  </td>
                                );
                              }
                              return (
                                <td key={s.id} className="p-4 border-r border-slate-100 bg-[#FFF9C4]/40">
                                  <Select onValueChange={(val) => { updateSupplierMetadata(s.id, "paymentCondition", val); toggleEdit(cellId); }}>
                                     <SelectTrigger className="h-8 text-[10px] font-bold bg-white border-slate-200 rounded-sm shadow-sm focus:ring-0 uppercase">
                                        <SelectValue placeholder="Selecione" />
                                     </SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="AVISTA">À Vista</SelectItem>
                                        <SelectItem value="30DIAS">30 Dias</SelectItem>
                                        <SelectItem value="15/30/45">15/30/45 Dias</SelectItem>
                                     </SelectContent>
                                  </Select>
                                </td>
                              );
                            })}
                            <td className="py-4 px-4 text-center sticky right-0 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] text-xs">-</td>
                          </tr>

                          {/* Delivery Time Row */}
                          <tr className="text-slate-500">
                            <td className="py-4 px-4 sticky left-0 bg-white border-r border-slate-100 text-[11px] font-black uppercase tracking-tight">Prazo de Entrega</td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-2"></td>
                            <td className="py-4 px-4 text-right border-r border-slate-100 text-xs">-</td>
                            {quoteSuppliers.map(s => {
                              const cellId = `${s.id}-deliveryTime`;
                              const editing = isEditing(cellId);
                              if (!editing) {
                                return (
                                  <td 
                                    key={s.id} 
                                    className="py-4 px-4 text-center border-r border-slate-100 text-[10px] font-bold bg-[#E3F2FD]/20 cursor-pointer hover:bg-[#E3F2FD]/40 transition-colors uppercase"
                                    onClick={() => toggleEdit(cellId)}
                                  >
                                    {mapData[s.id]?.deliveryTime ? `${mapData[s.id].deliveryTime} DIAS` : "-"}
                                  </td>
                                );
                              }
                              return (
                                <td key={s.id} className="p-4 border-r border-slate-100 bg-[#FFF9C4]/40">
                                  <div className="flex items-center gap-1.5 max-w-[150px] mx-auto">
                                     <div className="w-5 h-5 bg-[#F0AD4E] rounded-sm flex items-center justify-center cursor-pointer shrink-0">
                                        <Trash2 className="w-3 h-3 text-white" />
                                     </div>
                                     <Input 
                                        placeholder="dias" 
                                        className="h-8 text-[11px] font-bold text-center bg-white border-slate-200 rounded-sm shadow-sm"
                                        onChange={(e) => updateSupplierMetadata(s.id, "deliveryTime", e.target.value)}
                                        autoFocus
                                     />
                                     <div 
                                        className="w-5 h-5 bg-[#5CB85C] rounded-sm flex items-center justify-center cursor-pointer shrink-0"
                                        onClick={() => toggleEdit(cellId)}
                                     >
                                        <Check className="w-3 h-3 text-white" />
                                     </div>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="py-4 px-4 text-center sticky right-0 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] text-xs">-</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Final Total Bar */}
                {quoteItems.length > 0 && (
                  <div className="flex min-w-[1200px] bg-[#337AB7] text-white font-black text-xs uppercase overflow-x-auto no-scrollbar">
                    <div className="w-[300px] sticky left-0 bg-[#337AB7] px-6 py-6 flex items-center justify-between border-r border-white/10 z-20">
                      <span className="tracking-widest">Total</span>
                      <span className="text-sm font-black">R$ 0,00</span>
                    </div>
                    <div className="w-[80px] py-6"></div>
                    <div className="w-[80px] py-6"></div>
                    <div className="w-[120px] py-6 border-r border-white/10"></div>
                    
                    {quoteSuppliers.map(s => {
                      const total = calculateSupplierTotal(s.id);
                      const isWinner = winnerId === s.id;
                      return (
                        <div key={s.id} className="min-w-[250px] border-r border-white/10 flex flex-col items-center">
                          <div className="w-full py-4 px-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div 
                                  className={cn(
                                    "w-5 h-5 border-2 rounded-full flex items-center justify-center cursor-pointer transition-all",
                                    isWinner ? "border-white bg-white/20" : "border-white/40 hover:border-white"
                                  )}
                                  onClick={() => toggleWinner(s.id)}
                               >
                                  <div className={cn("w-2 h-2 bg-white rounded-full", isWinner ? "opacity-100" : "opacity-0")} />
                               </div>
                               <Star className={cn("w-5 h-5 transition-all", isWinner ? "text-[#F0AD4E] fill-[#F0AD4E] scale-110" : "text-white/20")} />
                            </div>
                            <span className="text-base font-black">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <Info className="w-3.5 h-3.5 inline ml-1 opacity-60" /></span>
                            <div className="cursor-pointer hover:opacity-80">
                               <MessageSquare className="w-5 h-5 text-white/60" />
                            </div>
                          </div>
                          <Button className="w-full rounded-none bg-white/10 hover:bg-white/20 h-10 text-[10px] font-black uppercase border-t border-white/10 tracking-widest transition-colors">
                            Gerar OC
                          </Button>
                        </div>
                      );
                    })}

                    <div className="min-w-[150px] sticky right-0 bg-[#2E3E4E] border-l border-white/10 z-20 flex flex-col items-center">
                      <div className="w-full py-4 px-6 flex items-center justify-between">
                        <div className="w-5 h-5 border-2 border-white/40 rounded-full" />
                        <span className="text-base font-black">R$ {calculateSupplierTotal("BEST").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="w-full bg-black/20 py-3 text-[9px] text-center font-black uppercase tracking-widest border-t border-white/5">
                        Economia <Info className="w-3.5 h-3.5 inline ml-1 opacity-60" /> : -
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Observations Footer */}
            <div className="mt-6 bg-white border border-slate-200 rounded-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">Observações</span>
                <ChevronUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea 
                          {...field}
                          className="w-full min-h-[150px] p-3 text-sm font-medium border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <ProjectSelectorModal 
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            onSelect={(data) => {
                form.setValue("projectId", data.projectId);
                form.setValue("stageId", data.stageId || null);
                
                if (data.importFromBudget) {
                  // Mocking budget items import
                  const mockItems = [
                    { description: "Cimento CP II 50kg", unit: "SC", quantity: 10 },
                    { description: "Areia Grossa", unit: "M3", quantity: 5 },
                  ];
                  setQuoteItems(mockItems);
                  toast.success("Itens do orçamento importados com sucesso!");
                }
                // Removed setIsItemModalOpen(true) to allow manual addition only
            }}
          />

          <ItemSelectorDialog 
            isOpen={isItemModalOpen}
            onOpenChange={setIsItemModalOpen}
            onSelect={(items) => {
                const newItems = items.map(item => ({
                    description: item.description,
                    unit: item.unit,
                    quantity: 1,
                    code: item.code,
                    type: item._source // INSUMO or COMPOSICAO
                }));
                setQuoteItems(prev => [...prev, ...newItems]);
                toast.success(`${items.length} item(s) adicionado(s) com sucesso!`);
            }}
          />

          <SupplierSelectorDialog 
            isOpen={isSupplierModalOpen}
            onOpenChange={setIsSupplierModalOpen}
            onSelect={(suppliers) => {
                // Add only non-duplicates
                setQuoteSuppliers(prev => {
                    const existingIds = prev.map(s => s.id);
                    const newSuppliers = suppliers.filter(s => !existingIds.includes(s.id));
                    return [...prev, ...newSuppliers];
                });
                toast.success(`${suppliers.length} participante(s) adicionado(s)!`);
            }}
          />
        </form>
      </Form>
    </div>
  );
}
