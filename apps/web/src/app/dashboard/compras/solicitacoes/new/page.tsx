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
  Info
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ProjectSelector } from "@/components/compras/ProjectSelector";
import { Badge } from "@/components/ui/badge";
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
      items: [{ description: "", unit: "UN", quantity: 1 }]
    }
  });

  // Update form values if searchParams change
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
    const projectId = form.getValues("projectId");
    if (projectId && projectId !== "EMPRESA") {
      setIsApropriacaoOpen(true);
    } else {
      append({ description: "", unit: "UN", quantity: 1 });
    }
  };

  const onSelectApropriacao = (item: { description: string; unit: string; stageId?: string; budgetItemId?: string }) => {
    append({
      description: item.description,
      unit: item.unit,
      quantity: 1,
      // Aqui poderíamos estender o schema para salvar stageId e budgetItemId
    });
  };

  if (isLoading) return <div className="p-6">Carregando obras...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
          
          {/* Header Superior (Branco) */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Compras</span>
                <h1 className="text-2xl font-black text-[#1A3C5E] leading-tight">Solicitação</h1>
              </div>

              <div className="flex items-center gap-4 h-10 ml-4">
                <div className="flex flex-col px-3 border-r border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Número</span>
                  <span className="text-sm font-bold text-[#4A72B2] bg-blue-50/50 px-2 rounded mt-0.5">
                    {isLoadingNumber ? "..." : nextNumber}
                  </span>
                </div>
                <div className="flex flex-col px-3 border-r border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Criação</span>
                  <span className="text-sm font-bold text-slate-700 mt-0.5">{format(new Date(), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex flex-col px-3 border-r border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Solicitante</span>
                  <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2 rounded mt-0.5">Desenvolvedor</span>
                </div>
                <div className="flex flex-col px-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Status</span>
                  <span className="text-sm font-bold text-slate-500 bg-slate-50 px-2 rounded mt-0.5 whitespace-nowrap">Em aberto</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
                <MoreVertical className="w-5 h-5" />
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 bg-amber-500 hover:bg-amber-600 text-white rounded-md"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Barra de Configuração (Cinza Claro) */}
          <section className="bg-slate-50/80 border-b border-slate-200 px-6 py-6 flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[300px] space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                Centro de custo <Info className="w-3 h-3 text-slate-400" />
              </label>
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <div className="relative">
                        <ProjectSelector
                          projects={projects || []}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!!field.value}
                        />
                        {field.value && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className="bg-slate-100 text-slate-400 p-1 rounded-md">
                              <Save className="w-3 h-3 opacity-50" />
                            </span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex-1 min-w-[240px] space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Título da solicitação</label>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input 
                        placeholder="teste" 
                        {...field} 
                        className="h-11 bg-white border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-slate-300" 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="w-48 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Necessidade</label>
              <FormField
                control={form.control}
                name="requiredDate"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="h-11 bg-white border-slate-200 rounded-lg shadow-none focus-visible:ring-0" 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Prioridade</label>
              <div className="flex items-center gap-2 h-11 bg-white border border-slate-200 rounded-lg px-2 group">
                <Button 
                  type="button"
                  variant={form.watch("isUrgent") ? "default" : "ghost"} 
                  size="sm" 
                  className={cn(
                    "h-8 text-[11px] font-bold uppercase tracking-wider transition-all",
                    form.watch("isUrgent") ? "bg-[#4A72B2] text-white shadow-none hover:bg-[#3D5D91]" : "text-slate-400"
                  )}
                  onClick={() => form.setValue("isUrgent", true)}
                >
                  Sim
                </Button>
                <Button 
                  type="button"
                  variant={!form.watch("isUrgent") ? "default" : "ghost"} 
                  size="sm" 
                  className={cn(
                    "h-8 text-[11px] font-bold uppercase tracking-wider transition-all",
                    !form.watch("isUrgent") ? "bg-[#4A72B2] text-white shadow-none hover:bg-[#3D5D91]" : "text-slate-400"
                  )}
                  onClick={() => form.setValue("isUrgent", false)}
                >
                  Não
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Aprovação</label>
              <div className="flex items-center gap-0.5 h-11 bg-white border border-slate-200 rounded-lg p-1">
                <Button type="button" variant="ghost" className="h-full rounded text-[11px] font-bold uppercase px-3 bg-slate-100 text-slate-600">Aguardando</Button>
                <Button type="button" variant="ghost" className="h-full rounded text-[11px] font-bold uppercase px-3 text-slate-400">Aprovado</Button>
                <Button type="button" variant="ghost" className="h-full rounded text-[11px] font-bold uppercase px-3 text-slate-400">Recusado</Button>
                <Separator orientation="vertical" className="mx-1 h-6 h-auto" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#4A72B2] bg-blue-50/50 hover:bg-blue-100"><Bell className="w-4 h-4" /></Button>
              </div>
            </div>

            <Button size="icon" className="h-11 w-11 bg-[#5CC8E1] hover:bg-[#4FB2C9] rounded-lg shadow-none">
              <Save className="w-5 h-5 text-white" />
            </Button>
          </section>

          {/* Abas e Listagem */}
          <main className="flex-1 p-6 flex flex-col gap-6">
            <Tabs defaultValue="itens" className="w-full flex-1 flex flex-col gap-0" onValueChange={setActiveTab}>
              <TabsList className="bg-slate-100/50 p-0 h-10 w-full justify-start rounded-t-lg rounded-b-none border border-slate-200 border-b-0 overflow-hidden">
                <TabsTrigger 
                  value="itens" 
                  className="rounded-none h-full px-8 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:border-slate-200 data-[state=active]:border-r data-[state=active]:text-[#1A3C5E] border-r border-slate-200"
                >
                  Itens
                </TabsTrigger>
                <TabsTrigger 
                  value="arquivos" 
                  className="rounded-none h-full px-8 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:border-slate-200 data-[state=active]:border-r data-[state=active]:text-[#1A3C5E]"
                >
                  Arquivos
                </TabsTrigger>
              </TabsList>
              
              <div className="bg-white border border-slate-200 rounded-b-xl flex-1 flex flex-col items-center justify-center p-12 min-h-[300px] shadow-sm">
                <TabsContent value="itens" className="w-full h-full m-0 flex flex-col items-center justify-center space-y-8">
                  {fields.length === 0 ? (
                    <>
                      <div className="text-center space-y-2">
                        <p className="text-slate-400 font-bold text-lg">Comece apropriando uma etapa ou inserindo itens sem apropriação</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white font-bold h-10 px-10 rounded-md flex items-center gap-3 transition-all shadow-sm"
                        onClick={handleAddItem}
                      >
                        <Plus className="w-5 h-5" /> 
                        <span className="text-sm uppercase tracking-wider">Itens</span>
                      </Button>
                    </>
                  ) : (
                    <div className="w-full space-y-4">
                       <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Relação de Itens</h3>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-4 rounded-lg border-2 border-[#58B391]/20 text-[#58B391] font-bold hover:bg-[#58B391]/5"
                            onClick={handleAddItem}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Adicionar
                          </Button>
                       </div>
                       <div className="grid grid-cols-[1fr_120px_120px_50px] gap-4 px-4 py-2 bg-slate-50/50 rounded-lg font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                          <span>Descrição do Item</span>
                          <span>Unidade</span>
                          <span>Quantidade</span>
                          <span></span>
                       </div>
                       {fields.map((field, index) => (
                         <div key={field.id} className="grid grid-cols-[1fr_120px_120px_50px] gap-4 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                           <FormField
                             control={form.control}
                             name={`items.${index}.description`}
                             render={({ field }) => (
                               <FormControl>
                                 <Input placeholder="Descreva o material ou serviço..." {...field} className="h-10 border-slate-200 rounded-lg text-sm" />
                               </FormControl>
                             )}
                           />
                           <FormField
                             control={form.control}
                             name={`items.${index}.unit`}
                             render={({ field }) => (
                               <FormControl>
                                 <Input {...field} className="h-10 border-slate-200 rounded-lg text-sm text-center" />
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
                                   className="h-10 border-slate-200 rounded-lg text-sm text-center"
                                   onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                 />
                               </FormControl>
                             )}
                           />
                           <Button type="button" variant="ghost" size="icon" className="text-slate-300 hover:text-rose-500" onClick={() => remove(index)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="arquivos" className="w-full h-full m-0 flex flex-col items-center justify-center">
                   <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Paperclip className="w-16 h-16 opacity-20" />
                      <p className="font-bold text-lg">Nenhum anexo encontrado</p>
                      <Button variant="outline" className="rounded-lg border-2 border-dashed border-slate-200">Upload de arquivos</Button>
                   </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Seção de Comentários */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Comentários</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400"><History className="w-4 h-4" /></Button>
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
                          className="min-h-[120px] bg-white border-slate-100 rounded-lg text-sm resize-none focus-visible:ring-0 focus-visible:border-slate-200 shadow-none p-4" 
                          placeholder="Digite seu comentário aqui..."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">1000 caracteres restantes</span>
                  <Button type="button" className="bg-[#4A72B2]/10 hover:bg-[#4A72B2]/20 text-[#4A72B2] text-[10px] font-black uppercase tracking-widest h-8 px-4 border border-[#4A72B2]/20 rounded-md">
                    Salvar Comentário
                  </Button>
                </div>
              </div>
            </section>
          </main>

          {/* Barra de Ferramentas Inferior */}
          <footer className="bg-slate-50/50 border-t border-slate-200 p-4 sticky bottom-0 z-30 flex items-center justify-between backdrop-blur-md">
            <Button 
               type="button" 
               className="bg-[#58B391] hover:bg-[#4a9a7c] text-white px-6 rounded-lg font-bold h-10 shadow-sm"
               onClick={handleAddItem}
            >
              <Plus className="w-5 h-5 mr-2" /> Etapa
            </Button>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" className="h-10 px-6 rounded-lg font-bold text-slate-600 border-slate-200 bg-white flex items-center gap-2 shadow-sm">
                 <History className="w-4 h-4" /> Atender solicitação
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="h-10 px-10 rounded-lg font-extrabold text-[#1A3C5E] border-2 border-[#1A3C5E]/20 bg-white hover:bg-slate-50 transition-all shadow-sm"
              >
                {createMutation.isPending ? "Gravando..." : "Registrar recebimento"}
              </Button>
            </div>
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
