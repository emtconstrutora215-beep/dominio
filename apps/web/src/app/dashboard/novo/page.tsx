"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { HardHat, Save, X, Plus, Trash2, Building, DollarSign, Users, MapPin, Search, ArrowRight, ChevronLeft, Calculator, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// -- Schema --
const projectContactSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  role: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional()
});

const formSchema = z.object({
  // Cabeçalho
  name: z.string().min(1, "O nome da obra é obrigatório"),
  type: z.string().optional(),
  status: z.enum(['BUDGETING', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  code: z.string().optional(),
  clientId: z.string().optional(), // Vai vir do select de contatos (roles: CLIENT)

  // Permissões / Visibilidade
  users: z.array(z.string()).optional(),
  showInFinancial: z.boolean().default(true),
  showInInvoicing: z.boolean().default(true),
  showInPurchasing: z.boolean().default(true),

  // Dados Técnicos
  totalArea: z.number().optional().nullable(),
  areaUnit: z.string().optional(),
  art: z.string().optional(),
  ceiCno: z.string().optional(),
  technicalLeadId: z.string().optional(),
  projectManagerId: z.string().optional(),

  // Endereço
  address: z.string().optional(),
  budget: z.number().optional().nullable(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),

  // Conta Bancária
  paymentResponsibility: z.enum(['COMPANY', 'CLIENT', 'CLIENT_REIMBURSEMENT', 'DIRECT_BILLING']).default('COMPANY'),
  defaultBankAccountId: z.string().optional().nullable(),

  // Field Arrays
  projectContacts: z.array(projectContactSchema).optional(),

  // Faturamento
  hasInvoicingData: z.boolean().default(false), // Apenas controle de UI
  invoicingContact: z.object({
    personType: z.enum(['PHYSICAL', 'LEGAL']).default('LEGAL'),
    name: z.string().min(1, "Razão Social/Nome obrigatório"),
    document: z.string().optional(),
    stateRegistration: z.string().optional(),
    municipalRegistration: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional()
  }).optional().nullable()

}).superRefine((data, ctx) => {
  if (data.hasInvoicingData && (!data.invoicingContact || !data.invoicingContact.name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Se ativado, o Nome/Razão Social do faturamento é obrigatório.",
      path: ["invoicingContact", "name"]
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

export default function NovaObraPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando formulário...</div>}>
      <NovaObraForm />
    </Suspense>
  );
}

function NovaObraForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const [isStarted, setIsStarted] = useState(false);
  
  // -- Queries para selects --
  const { data: options, isLoading: loadingOptions } = trpc.projects.formOptions.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      status: (statusParam as any) || "PLANNING",
      type: "",
      code: "",
      showInFinancial: true,
      showInInvoicing: true,
      showInPurchasing: true,
      paymentResponsibility: "COMPANY",
      hasInvoicingData: false,
      projectContacts: [],
      users: []
    }
  });

  // Atualizar status se o parâmetro mudar
  useEffect(() => {
    if (statusParam) {
      form.setValue("status", statusParam as any);
    }
  }, [statusParam, form]);

  const handleObraSelect = (id: string) => {
    if (id === "__new__") {
      form.reset({
        ...form.getValues(),
        name: "",
        code: "",
      });
      return;
    }

    const project = (options?.projects as any[])?.find((p: any) => p.id === id);
    if (project) {
      const p = project as any;
      // Pre-encher dados da obra selecionada
      form.reset({
        ...form.getValues(),
        name: p.name,
        code: p.code || "",
        clientId: p.clientId || "",
        address: p.address || "",
        cep: p.cep || "",
        street: p.street || "",
        number: p.number || "",
        complement: p.complement || "",
        neighborhood: p.neighborhood || "",
        city: p.city || "",
        state: p.state || "",
        totalArea: p.totalArea || null,
        areaUnit: p.areaUnit || "m2",
        budget: p.budget || 0,
        technicalLeadId: p.technicalLeadId || "",
        projectManagerId: p.projectManagerId || "",
        showInFinancial: p.showInFinancial ?? true,
        showInInvoicing: p.showInInvoicing ?? true,
        showInPurchasing: p.showInPurchasing ?? true,
        paymentResponsibility: (p.paymentResponsibility as any) || "COMPANY",
        defaultBankAccountId: p.defaultBankAccountId || ""
      });
    }
  };

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "projectContacts"
  });

  const hasInvoicing = form.watch("hasInvoicingData");
  const billingPersonType = form.watch("invoicingContact.personType");
  const paymentResp = form.watch("paymentResponsibility");

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (project: any) => {
      toast.success("Obra iniciada com sucesso!");
      router.push(`/dashboard/obras/orcamentos/${project.id}/detalhes`);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar obra: ${error.message}`);
    }
  });

  const onSubmit = (data: FormValues) => {
    // Se não habilitou faturamento, limpar o objeto para o back-end
    if (!data.hasInvoicingData) {
      data.invoicingContact = null;
    }
    createMutation.mutate(data as any); 
  };

  const handleCepSearch = async (cep: string, isBilling: boolean = false) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        if (isBilling) {
          form.setValue('invoicingContact.street', data.logradouro);
          form.setValue('invoicingContact.neighborhood', data.bairro);
          form.setValue('invoicingContact.city', data.localidade);
          form.setValue('invoicingContact.state', data.uf);
        } else {
          form.setValue('street', data.logradouro);
          form.setValue('neighborhood', data.bairro);
          form.setValue('city', data.localidade);
          form.setValue('state', data.uf);
        }
        toast.success("Endereço preenchido!");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* FASE 0: ENTRADA DOS DADOS MESTRES */}
          {!isStarted ? (
            <div className="flex items-center justify-center min-h-[70vh]">
              <Card className="w-full max-w-xl shadow-sm border-t-4 border-t-emerald-600">
                <CardHeader className="pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Novo Orçamento</CardTitle>
                      <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">
                        Definição de parâmetros iniciais
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="code" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cód. Orçamento</FormLabel>
                        <FormControl><Input placeholder="ORC-24-01" {...field} className="h-10 focus-visible:ring-emerald-500" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Status da Obra</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="BUDGETING">Em Orçamento</SelectItem>
                            <SelectItem value="PLANNING">A Iniciar (Planejamento)</SelectItem>
                            <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                            <SelectItem value="PAUSED">Paralisada</SelectItem>
                            <SelectItem value="COMPLETED">Finalizada</SelectItem>
                            <SelectItem value="CANCELLED">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Selecionar Obra Existente</FormLabel>
                       <Select onValueChange={handleObraSelect} defaultValue="__new__">
                         <FormControl><SelectTrigger className="h-11 border-slate-300 bg-slate-50/50"><SelectValue /></SelectTrigger></FormControl>
                         <SelectContent>
                           <SelectItem value="__new__" className="font-bold text-emerald-600 italic">-- Criar Obra do Zero --</SelectItem>
                           {(options as any)?.projects?.map((p: any) => (
                             <SelectItem key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>

                    {!form.getValues("name") && (
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="animate-in slide-in-from-top-2">
                           <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Nome da Obra</FormLabel>
                           <FormControl><Input placeholder="Ex: Residencial Alphaville" {...field} className="h-10" /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    <FormField control={form.control} name="clientId" render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cliente Base</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                          <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="none">Particular / Sem Cliente</SelectItem>
                            {options?.clients?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
                <CardFooter className="pt-8 pb-10">
                  <Button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Iniciando..." : 
                      <span className="flex items-center gap-2">Próxima Etapa <ArrowRight className="w-4 h-4" /></span>
                    }
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : (
            <>
              {/* HEADER DO FORMULÁRIO DETALHADO */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-100">
                <div className="space-y-1 border-l-4 border-emerald-500 pl-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsStarted(false)} className="h-7 px-2 text-[10px] uppercase font-bold text-slate-500">
                      <ChevronLeft className="w-3 h-3 mr-1" /> Configurações
                    </Button>
                    <Badge variant="outline" className="text-[9px] uppercase font-semibold tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 border-emerald-100">Ficha da Obra</Badge>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-primary uppercase">
                    {form.getValues("name")}
                  </h1>
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" type="button" onClick={() => router.back()} className="font-bold uppercase text-[10px] h-11 px-6">Sair</Button>
                  <Button onClick={form.handleSubmit(onSubmit)} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-100 h-11 text-[10px] uppercase">
                    {createMutation.isPending ? "Salvando..." : <><Save className="w-4 h-4 mr-2"/> Gravar Obra</>}
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="geral" className="w-full mt-8">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-8">
                  <TabsTrigger value="geral"><Building className="w-4 h-4 mr-2" /> Geral</TabsTrigger>
                  <TabsTrigger value="endereco"><MapPin className="w-4 h-4 mr-2" /> Localização</TabsTrigger>
                  <TabsTrigger value="financeiro"><DollarSign className="w-4 h-4 mr-2" /> Financeiro</TabsTrigger>
                  <TabsTrigger value="contatos"><Users className="w-4 h-4 mr-2" /> Equipe</TabsTrigger>
                </TabsList>

            {/* ABA GERAL */}
            <TabsContent value="geral" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Identificação da Obra</CardTitle>
                  <CardDescription>Informações principais que dão nome ao projeto.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Nome da Obra <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="Ex: Residencial Alphaville..." {...field} className="focus-visible:ring-emerald-500" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Interno</FormLabel>
                      <FormControl><Input placeholder="Ex: OB-2501" {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo da Obra</FormLabel>
                      <FormControl><Input placeholder="Ex: Residencial, Comercial, Infraestrutura..." {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="BUDGETING">Em Orçamento</SelectItem>
                          <SelectItem value="PLANNING">A Iniciar (Planejamento)</SelectItem>
                          <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                          <SelectItem value="PAUSED">Paralisada</SelectItem>
                          <SelectItem value="COMPLETED">Finalizada</SelectItem>
                          <SelectItem value="CANCELLED">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente Associado</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente (Opcional)" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Deixar em branco</SelectItem>
                          {options?.clients?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Busca contatos marcados como Clientes.</FormDescription>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engenharia e Responsáveis</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <FormField control={form.control} name="totalArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área Total</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="areaUnit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Un. Medida</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "m2"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="M2" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="m2">m²</SelectItem>
                          <SelectItem value="hectare">Hectare</SelectItem>
                          <SelectItem value="km">km</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="art" render={({ field }) => (
                    <FormItem><FormLabel>A.R.T.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="ceiCno" render={({ field }) => (
                    <FormItem><FormLabel>CEI / CNO</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="technicalLeadId" render={({ field }: { field: any }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Engenheiro / Resp. Técnico</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Usuário do sistema..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {options?.users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="projectManagerId" render={({ field }: { field: any }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Mestre de Obras / Resp. Obra</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Usuário do sistema..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {options?.users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA ENDEREÇO */}
            <TabsContent value="endereco">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço do Canteiro/Obra</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <FormField control={form.control} name="cep" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>CEP</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                        <Button type="button" variant="secondary" onClick={() => handleCepSearch(field.value || "")}>
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="street" render={({ field }) => (
                    <FormItem className="col-span-4"><FormLabel>Logradouro/Rua</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="number" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="complement" render={({ field }) => (
                    <FormItem className="col-span-4"><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="neighborhood" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem className="col-span-3"><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem className="col-span-1"><FormLabel>UF</FormLabel><FormControl><Input placeholder="SP" maxLength={2} {...field} /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA FINANCEIRO */}
            <TabsContent value="financeiro" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pagamentos e Faturamento</CardTitle>
                  <CardDescription>Gerencie por onde passa o fluxo de caixa do projeto.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Conta e Pagamento */}
                  <div className="space-y-6 border-r pr-4">
                    <h3 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400"/> Responsabilidade e Conta</h3>
                    
                    <FormField control={form.control} name="paymentResponsibility" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quem Paga?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="COMPANY">Empresa (Construtora)</SelectItem>
                            <SelectItem value="CLIENT">Cliente (Direto)</SelectItem>
                            <SelectItem value="CLIENT_REIMBURSEMENT">Cliente via Reembolso</SelectItem>
                            <SelectItem value="DIRECT_BILLING">Faturamento Direto</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="defaultBankAccountId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta Bancária Padrão</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Bancos da Construtora..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma Exigida</SelectItem>
                            {options?.bankAccounts?.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name} - Cc: {b.accountNumber}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  {/* Faturamento Aninhado */}
                  <div className="space-y-4">
                    <FormField control={form.control} name="hasInvoicingData" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">Dados Específicos para Faturamento</FormLabel>
                          <FormDescription>Ative se esta obra exigir faturamento contra um CNPJ/CPF isolado que você preencherá agora.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />

                    {hasInvoicing && (
                      <div className="space-y-4 border rounded-md p-4 bg-blue-50/20 animate-in fade-in zoom-in-95">
                        <FormField control={form.control} name="invoicingContact.personType" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Natureza do Emitente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="LEGAL">Pessoa Jurídica (CNPJ)</SelectItem>
                                <SelectItem value="PHYSICAL">Pessoa Física (CPF)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="invoicingContact.name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{billingPersonType === 'LEGAL' ? 'Razão Social' : 'Nome Completo'}</FormLabel>
                            <FormControl><Input className="bg-white" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="invoicingContact.document" render={({ field }) => (
                            <FormItem><FormLabel>{billingPersonType === 'LEGAL' ? 'CNPJ' : 'CPF'}</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl></FormItem>
                          )} />
                          {billingPersonType === 'LEGAL' && (
                            <FormField control={form.control} name="invoicingContact.stateRegistration" render={({ field }) => (
                              <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl></FormItem>
                            )} />
                          )}
                        </div>

                        {/* Minimizado address do InvoicingContact por simplicidade (o modelo prevê, mas no form o user pediu infos level contatos, a gente já atende com CNPJ/PF). */}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Módulos Ativos (Exibir Obra Para)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="showInFinancial" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel>Lançamentos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="showInInvoicing" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel>Faturamentos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="showInPurchasing" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel>Compras</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA CONTATOS DA EQUIPE/OBRA */}
            <TabsContent value="contatos" className="space-y-6">
              
              {/* Visível Para (Permissões de Usuário do Sistema) */}
              <Card>
                <CardHeader>
                  <CardTitle>Acesso ao Sistema</CardTitle>
                  <CardDescription>Quais usuários do seu ERP podem ver esta obra?</CardDescription>
                </CardHeader>
                <CardContent>
                   <FormField control={form.control} name="users" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuários Permitidos</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          const current = field.value || [];
                          if (!current.includes(val)) field.onChange([...current, val]);
                        }} 
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Adicionar usuário..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {options?.users?.filter(u => !(field.value || []).includes(u.id)).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {field.value?.length === 0 && <span className="text-sm text-slate-400">Toda a empresa terá acesso por padrão.</span>}
                        {field.value?.map(userId => {
                          const u = options?.users?.find(x => x.id === userId);
                          return (
                            <Badge key={userId} variant="secondary" className="flex items-center gap-1.5 py-1.5">
                              {u?.name}
                              <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => field.onChange((field.value || []).filter(id => id !== userId))} />
                            </Badge>
                          );
                        })}
                      </div>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Contatos Livres */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Contatos Livres (Agenda da Obra)</CardTitle>
                    <CardDescription>Telefones de encarregados, fornecedores locais, ou clientes para fácil acesso.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendContact({ name: "", email: "", phone: "", role: "" })}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Contato
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactFields.length === 0 && (
                     <div className="text-center p-8 border-2 border-dashed rounded-lg text-slate-400">
                       Nenhum contato adicionado ainda.
                     </div>
                  )}

                  {contactFields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end p-4 border rounded-lg bg-slate-50 relative group">
                      <FormField control={form.control} name={`projectContacts.${index}.name`} render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name={`projectContacts.${index}.role`} render={({ field }) => (
                        <FormItem><FormLabel>Cargo/Função</FormLabel><FormControl><Input className="bg-white" placeholder="Ex: Síndico" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`projectContacts.${index}.phone`} render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`projectContacts.${index}.email`} render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input className="bg-white" {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)} className="text-slate-400 hover:text-red-500 mb-0.5">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-8 border-t border-slate-100 mt-8">
             <Button 
               type="submit" 
               disabled={createMutation.isPending} 
               className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-12 h-14 shadow-lg shadow-emerald-100 transition-all active:scale-95 uppercase tracking-tight"
             >
                {createMutation.isPending ? "Salvando Obra..." : (
                  <span className="flex items-center gap-3">
                    Finalizar Cadastro <ArrowRight className="w-5 h-5 ml-2" />
                  </span>
                )}
             </Button>
          </div>
        </>
      )}
        </form>
      </Form>
    </div>
  );
}
