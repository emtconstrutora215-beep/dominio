"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  MoreVertical, 
  Save, 
  Bell, 
  Paperclip,
  MessageSquare,
  History,
  Info,
  ArrowLeft,
  Lock,
  ChevronUp,
  ChevronDown,
  MessageCircle
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ProjectSelector } from "@/components/compras/ProjectSelector";
import { ApropriacaoModal } from "@/components/compras/ApropriacaoModal";

const requestSchema = z.object({
  projectId: z.string().min(1, "Selecione uma obra"),
  notes: z.string().optional(),
  isUrgent: z.boolean(),
  requiredDate: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, "Descrição obrigatória"),
    unit: z.string().min(1, "Unidade obrigatória"),
    quantity: z.number().min(0.01, "Maior que zero"),
  })).min(1, "Adicione pelo menos 1 item")
});

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const { data: projects, isLoading } = trpc.projects.getAll.useQuery();
  const { data: nextNumber, isLoading: isLoadingNumber } = trpc.purchasing.getNextRequestNumber.useQuery();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("itens");
  const [isApropriacaoOpen, setIsApropriacaoOpen] = useState(false);

  const createMutation = trpc.purchasing.createRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada para aprovação!");
      utils.purchasing.getRequests.invalidate();
      router.push("/dashboard/compras/solicitacoes");
    },
    onError: (err) => toast.error(err.message)
  });

  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      projectId: searchParams.get("projectId") || "",
      notes: searchParams.get("title") || "",
      isUrgent: searchParams.get("isUrgent") === "true",
      requiredDate: searchParams.get("requiredDate") || "",
      items: []
    }
  });

  useEffect(() => {
    if (searchParams.get("projectId")) {
      form.setValue("projectId", searchParams.get("projectId") || "");
      form.setValue("notes", searchParams.get("title") || "");
      form.setValue("isUrgent", searchParams.get("isUrgent") === "true");
      form.setValue("requiredDate", searchParams.get("requiredDate") || "");
    }
  }, [searchParams, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  function onSubmit(data: z.infer<typeof requestSchema>) {
    createMutation.mutate(data);
  }

  const handleAddItem = () => {
    setIsApropriacaoOpen(true);
  };

  const onSelectApropriacao = (item: { description: string; unit: string; stageId?: string; budgetItemId?: string }) => {
    append({
      description: item.description,
      unit: item.unit,
      quantity: 1,
    });
  };

  if (isLoading) return <div className="p-6">Carregando obras...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
          
          <header className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-8">
              <div className="flex flex-col border-l-4 border-[#2079D2] pl-3">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Compras</span>
                <h1 className="text-xl font-bold text-slate-700 leading-tight">Solicitação</h1>
              </div>

              <div className="flex items-center gap-0">
                <div className="flex flex-col px-4 border-r border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Número</span>
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-0.5 rounded mt-0.5">
                    {isLoadingNumber ? "..." : nextNumber}
                  </span>
                </div>
                <div className="flex flex-col px-4 border-r border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Criação</span>
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-0.5 rounded mt-0.5">
                    {format(new Date(), 'dd/MM/yyyy')}
                  </span>
                </div>
                <div className="flex flex-col px-4 border-r border-slate-100">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Solicitante</span>
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-0.5 rounded mt-0.5">Desenvolvedor</span>
                </div>
                <div className="flex flex-col px-4">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Status</span>
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-0.5 rounded mt-0.5">Em aberto</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 text-slate-400 border-slate-300">
                <Info className="w-4 h-4" />
              </Button>
              <Button 
                type="button" 
                size="icon" 
                className="h-8 w-8 bg-[#F3A04C] hover:bg-[#e6923d] text-white rounded-md shadow-none"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </header>

          <section className="bg-slate-50 px-6 py-4 flex flex-wrap items-end gap-4 border-b border-slate-200">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Centro de custo</label>
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <ProjectSelector
                        projects={projects || []}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!!field.value}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex-[1.5] min-w-[240px] space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Descrição da solicitação</label>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input 
                        placeholder="Ex: Materiais brutos" 
                        {...field} 
                        className="h-10 bg-white border-slate-300 rounded-sm text-sm focus-visible:ring-0" 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="w-48 space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Necessidade</label>
              <FormField
                control={form.control}
                name="requiredDate"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <div className="flex bg-white border border-slate-300 rounded-sm h-10">
                        <Input type="date" {...field} className="flex-1 border-none h-full px-3 text-sm focus-visible:ring-0" />
                        <div className="bg-slate-50 border-l border-slate-300 px-2 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-slate-500 rotate-45" />
                        </div>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Prioridade</label>
              <div 
                className="flex bg-white border border-slate-300 rounded-sm h-10 overflow-hidden cursor-pointer select-none"
                onClick={() => form.setValue("isUrgent", !form.watch("isUrgent"))}
              >
                <div className={cn(
                  "px-4 h-full flex items-center justify-center text-[11px] font-medium transition-colors",
                  !form.watch("isUrgent") ? "bg-slate-100 text-slate-600" : "text-slate-400"
                )}>Não</div>
                <div className={cn(
                  "px-4 h-full flex items-center justify-center text-[11px] font-medium transition-colors",
                  form.watch("isUrgent") ? "bg-rose-100 text-rose-600" : "text-slate-400"
                )}>Sim</div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Aprovação</label>
              <div className="flex items-center bg-white border border-slate-300 rounded-sm h-10 p-1">
                <Button type="button" variant="ghost" className="h-full rounded-sm text-[11px] font-medium px-4 bg-slate-100 text-slate-600">Aguardando</Button>
                <Button type="button" variant="ghost" className="h-full rounded-sm text-[11px] font-medium px-4 text-slate-400 hover:bg-slate-50">Aprovado</Button>
                <Button type="button" variant="ghost" className="h-full rounded-sm text-[11px] font-medium px-4 text-slate-400 hover:bg-slate-50">Recusado</Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white bg-[#2079D2] hover:bg-[#1a64b0] rounded-sm">
                  <Bell className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button type="button" size="icon" className="h-10 w-10 bg-[#5CC8E1] hover:bg-[#4FB2C9] rounded-sm shadow-none ml-auto">
              <Lock className="w-5 h-5 text-white" />
            </Button>
          </section>

          <main className="flex-1 bg-slate-50 p-6 space-y-6">
            <Tabs defaultValue="itens" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="bg-transparent p-0 h-9 justify-start gap-4">
                <TabsTrigger 
                  value="itens" 
                  className="rounded-none px-4 h-full text-sm font-medium text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#2079D2] border-b-2 border-transparent data-[state=active]:border-[#2079D2]"
                >
                  Itens
                </TabsTrigger>
                <TabsTrigger 
                  value="arquivos" 
                  className="rounded-none px-4 h-full text-sm font-medium text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#2079D2] border-b-2 border-transparent data-[state=active]:border-[#2079D2]"
                >
                  Arquivos
                </TabsTrigger>
              </TabsList>
              
              <div className="bg-white border border-slate-200 rounded-sm mt-4 shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Sem apropriação</span>
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                </div>
                
                <TabsContent value="itens" className="m-0">
                  {fields.length === 0 ? (
                    <div className="p-8 flex items-center gap-3">
                      <Button 
                        type="button" 
                        className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-medium h-8 px-6 rounded-sm text-xs gap-2"
                        onClick={handleAddItem}
                      >
                        <Plus className="w-4 h-4" /> Item
                      </Button>
                      <Button 
                        type="button" 
                        className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-medium h-8 px-6 rounded-sm text-xs gap-2"
                        onClick={() => append({ description: "", unit: "UN", quantity: 1 })}
                      >
                        <Plus className="w-4 h-4" /> Item avulso
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="min-h-[150px]">
                        <div className="grid grid-cols-[180px_1fr_100px_120px_100px_120px] gap-4 px-6 py-2 bg-white border-b border-slate-100 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">Item <ChevronDown className="w-3 h-3 text-slate-300" /></div>
                          <span>Descrição</span>
                          <span className="text-center">Unidade</span>
                          <span className="text-center">Qtde solicitada</span>
                          <span className="text-center">Status</span>
                          <span className="text-center">Prev entrega</span>
                        </div>

                        <div className="divide-y divide-slate-100">
                           {fields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-[180px_1fr_100px_120px_100px_120px] gap-4 items-center px-6 py-2 group">
                               <FormField
                                 control={form.control}
                                 name={`items.${index}.description`}
                                 render={({ field }) => (
                                   <FormControl>
                                     <Input placeholder="Buscar item..." {...field} className="h-8 border-slate-200 rounded-sm text-xs" />
                                   </FormControl>
                                 )}
                               />
                               <div className="text-xs text-slate-600 truncate">-</div>
                               <FormField
                                 control={form.control}
                                 name={`items.${index}.unit`}
                                 render={({ field }) => (
                                   <FormControl>
                                     <Input {...field} className="h-8 border-slate-200 rounded-sm text-xs text-center" />
                                   </FormControl>
                                 )}
                               />
                               <FormField
                                 control={form.control}
                                 name={`items.${index}.quantity`}
                                 render={({ field }) => (
                                   <FormControl>
                                     <Input 
                                       type="number" 
                                       {...field} 
                                       className="h-8 border-slate-200 rounded-sm text-xs text-center"
                                       onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                     />
                                   </FormControl>
                                 )}
                               />
                               <div className="text-xs text-slate-400 text-center">-</div>
                               <div className="text-xs text-slate-400 text-center">-</div>
                             </div>
                           ))}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
                        <Button 
                          type="button" 
                          className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-medium h-7 px-4 rounded-sm text-[11px] gap-1.5"
                          onClick={handleAddItem}
                        >
                          <Plus className="w-3.5 h-3.5" /> Item
                        </Button>
                        <Button 
                          type="button" 
                          className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-medium h-7 px-4 rounded-sm text-[11px] gap-1.5"
                          onClick={() => append({ description: "", unit: "UN", quantity: 1 })}
                        >
                          <Plus className="w-3.5 h-3.5" /> Item avulso
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="arquivos" className="m-0">
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 italic">
                    Nenhum arquivo anexado.
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <section className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Comentários</span>
                <ChevronUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="min-h-[120px] bg-white border-slate-200 rounded-sm text-sm resize-none focus-visible:ring-0 p-4" 
                          placeholder=""
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">1000 caracteres</span>
                  <Button type="button" className="bg-[#78B1D6] hover:bg-[#669ebd] text-white text-[11px] font-medium h-8 px-6 rounded-sm">
                    Salvar Comentário
                  </Button>
                </div>
              </div>
            </section>
          </main>

          <footer className="bg-white border-t border-slate-200 p-3 flex items-center justify-end gap-3 sticky bottom-0 z-30">
            <Button 
              type="button" 
              variant="outline"
              className="h-9 px-6 rounded-sm font-medium text-slate-600 border-slate-300 bg-white flex items-center gap-2 text-xs"
            >
              <MessageCircle className="w-4 h-4" /> Atender solicitação
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="h-9 px-6 rounded-sm font-medium text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 transition-all text-xs"
            >
              {createMutation.isPending ? "Gravando..." : "Registrar recebimento"}
            </Button>
          </footer>

          <ApropriacaoModal 
            isOpen={isApropriacaoOpen}
            onClose={() => setIsApropriacaoOpen(false)}
            projectId={form.getValues("projectId")}
            onSelect={onSelectApropriacao}
          />
        </form>
      </Form>
    </div>
  );
}
