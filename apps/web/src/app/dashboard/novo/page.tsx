"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { HardHat, Save, X, Plus, Trash2, Building, DollarSign, Users, MapPin, Search, ArrowRight, ChevronLeft, Calculator, Building2, Loader2 } from "lucide-react";

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
  const editId = searchParams.get("id");
  const isEditing = !!editId;
  
  // -- Queries para selects --
  const { data: options, isLoading: loadingOptions } = trpc.projects.formOptions.useQuery();

  const { data: projectData, isLoading: loadingProject } = trpc.projects.getById.useQuery(
    { id: editId as string },
    { enabled: isEditing }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      status: (statusParam as any) || "PLANNING",
      type: "",
      code: "",
      clientId: "",
      users: [],
      showInFinancial: true,
      showInInvoicing: true,
      showInPurchasing: true,
      totalArea: null,
      areaUnit: "m2",
      art: "",
      ceiCno: "",
      technicalLeadId: "",
      projectManagerId: "",
      address: "",
      budget: null,
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      paymentResponsibility: "COMPANY",
      defaultBankAccountId: "",
      projectContacts: [],
      hasInvoicingData: false,
      invoicingContact: {
        personType: 'LEGAL',
        name: "",
        document: "",
        email: "",
        phone: "",
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: ""
      }
    }
  });

  // Atualizar status se o parâmetro mudar
  useEffect(() => {
    if (statusParam && !isEditing) {
      form.setValue("status", statusParam as any);
    }
  }, [statusParam, form, isEditing]);

  // Carregar dados para edição
  useEffect(() => {
    if (isEditing && projectData) {
      form.reset({
        name: projectData.name || "",
        code: projectData.code || "",
        type: projectData.type || "",
        status: projectData.status as any,
        clientId: projectData.clientId || "",
        totalArea: projectData.totalArea || null,
        areaUnit: projectData.areaUnit || "m2",
        art: projectData.art || "",
        ceiCno: projectData.ceiCno || "",
        technicalLeadId: projectData.technicalLeadId || "",
        projectManagerId: projectData.projectManagerId || "",
        cep: projectData.cep || "",
        street: projectData.street || "",
        number: projectData.number || "",
        complement: projectData.complement || "",
        neighborhood: projectData.neighborhood || "",
        city: projectData.city || "",
        state: projectData.state || "",
        budget: projectData.budget || null,
        paymentResponsibility: (projectData.paymentResponsibility as any) || "COMPANY",
        defaultBankAccountId: projectData.defaultBankAccountId || "",
        users: projectData.users?.map((u: any) => u.id) || [],
        showInFinancial: projectData.showInFinancial ?? true,
        showInInvoicing: projectData.showInInvoicing ?? true,
        showInPurchasing: projectData.showInPurchasing ?? true,
        projectContacts: (projectData.projectContacts as any[]) || [],
        hasInvoicingData: !!projectData.invoicingContactId,
        invoicingContact: projectData.invoicingContact ? {
          ...projectData.invoicingContact,
          name: projectData.invoicingContact.name || ""
        } : {
          personType: 'LEGAL',
          name: "",
          document: "",
          email: "",
          phone: "",
          cep: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: ""
        }
      });
    }
  }, [isEditing, projectData, form]);

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "projectContacts"
  });

  const selectedClientId = form.watch("clientId");
  const hasInvoicing = form.watch("hasInvoicingData");
  const billingPersonType = form.watch("invoicingContact.personType");

  // Auto-fill ao selecionar cliente
  useEffect(() => {
    if (selectedClientId && options?.clients) {
      const client = options.clients.find(c => c.id === selectedClientId);
      if (client) {
        // Preencher endereço da obra (se estiver vazio)
        if (!form.getValues("cep")) form.setValue("cep", client.cep || "");
        if (!form.getValues("street")) form.setValue("street", client.street || "");
        if (!form.getValues("number")) form.setValue("number", client.number || "");
        if (!form.getValues("complement")) form.setValue("complement", client.complement || "");
        if (!form.getValues("neighborhood")) form.setValue("neighborhood", client.neighborhood || "");
        if (!form.getValues("city")) form.setValue("city", client.city || "");
        if (!form.getValues("state")) form.setValue("state", client.state || "");

        // Preencher dados de faturamento
        form.setValue("hasInvoicingData", true);
        form.setValue("invoicingContact.personType", client.personType as any || "LEGAL");
        form.setValue("invoicingContact.name", client.name);
        form.setValue("invoicingContact.document", client.document || "");
        form.setValue("invoicingContact.email", client.email || "");
        form.setValue("invoicingContact.phone", client.phone || "");
        form.setValue("invoicingContact.cep", client.cep || "");
        form.setValue("invoicingContact.street", client.street || "");
        form.setValue("invoicingContact.number", client.number || "");
        form.setValue("invoicingContact.complement", client.complement || "");
        form.setValue("invoicingContact.neighborhood", client.neighborhood || "");
        form.setValue("invoicingContact.city", client.city || "");
        form.setValue("invoicingContact.state", client.state || "");
        
        toast.info("Dados do cliente registrados com sucesso!");
      }
    }
  }, [selectedClientId, options?.clients]); // Removido form do array para evitar loop infinito
  
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Obra cadastrada com sucesso!");
      router.push(`/dashboard/obras/minhas`);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar obra: ${error.message}`);
    }
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Obra atualizada com sucesso!");
      router.push(`/dashboard/obras/minhas/${editId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar obra: ${error.message}`);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: FormValues) => {
    // Se não habilitou faturamento, limpar o objeto para o back-end
    if (!data.hasInvoicingData) {
      data.invoicingContact = null;
    }
    
    if (isEditing) {
      updateMutation.mutate({ ...data, id: editId as string } as any);
    } else {
      createMutation.mutate(data as any); 
    }
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
          
          {/* HEADER DO FORMULÁRIO DETALHADO */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-100">
            <div className="space-y-1 border-l-4 border-[#1862a3] pl-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[9px] uppercase font-semibold tracking-widest bg-slate-50 text-slate-700 px-2 py-0.5 border-slate-100 italic">
                  {isEditing ? "Editar Detalhes da Obra" : "Cadastrar Nova Obra"}
                </Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                {form.watch("name") || (isEditing ? "Carregando..." : "Ficha da Obra")}
              </h1>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" type="button" onClick={() => router.back()} className="font-bold uppercase text-[10px] h-11 px-6 border-2">Sair</Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="bg-[#1862a3] hover:bg-[#124d80] text-white font-black px-8 shadow-lg shadow-blue-100 h-11 text-[10px] uppercase tracking-widest">
                {isPending ? "Salvando..." : <><Save className="w-4 h-4 mr-2"/> {isEditing ? "Salvar Alterações" : "Gravar Obra"}</>}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="geral" className="w-full mt-8">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-8 bg-slate-50 p-1 border-2">
              <TabsTrigger value="geral"><Building className="w-4 h-4 mr-2" /> Geral</TabsTrigger>
              <TabsTrigger value="endereco"><MapPin className="w-4 h-4 mr-2" /> Localização</TabsTrigger>
              <TabsTrigger value="financeiro"><DollarSign className="w-4 h-4 mr-2" /> Financeiro</TabsTrigger>
              <TabsTrigger value="contatos"><Users className="w-4 h-4 mr-2" /> Equipe</TabsTrigger>
            </TabsList>

            {/* ABA GERAL */}
            <TabsContent value="geral" className="space-y-6">
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase text-slate-800">Identificação da Obra</CardTitle>
                  <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Informações principais que dão nome ao projeto.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Nome da Obra <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="Ex: Residencial Alphaville..." {...field} className="h-11 focus-visible:ring-[#1862a3] border-2 font-medium" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Código Interno</FormLabel>
                      <FormControl><Input placeholder="Ex: OB-2501" {...field} className="h-11 border-2 font-medium" /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Tipo da Obra</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={(val) => {
                          if (val === "OUTRO") {
                            field.onChange("");
                          } else {
                            field.onChange(val);
                          }
                        }} value={["RESIDENCIAL", "COMERCIAL", "INDUSTRIAL", "REFORMA", "INFRAESTRUTURA"].includes(field.value?.toUpperCase() || "") ? field.value?.toUpperCase() : (field.value ? "OUTRO" : "")}>
                          <FormControl><SelectTrigger className="h-11 border-2 font-medium flex-1"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="RESIDENCIAL">Residencial</SelectItem>
                            <SelectItem value="COMERCIAL">Comercial</SelectItem>
                            <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                            <SelectItem value="REFORMA">Reforma</SelectItem>
                            <SelectItem value="INFRAESTRUTURA">Infraestrutura</SelectItem>
                            <SelectItem value="OUTRO">Outro (Especificar...)</SelectItem>
                          </SelectContent>
                        </Select>
                        {(!["RESIDENCIAL", "COMERCIAL", "INDUSTRIAL", "REFORMA", "INFRAESTRUTURA"].includes(field.value?.toUpperCase() || "") && field.value !== undefined) && (
                          <Input 
                            placeholder="Especifique o tipo..." 
                            value={field.value} 
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-11 border-2 font-medium flex-1"
                          />
                        )}
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Status Inicial</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="BUDGETING">Em Orçamento</SelectItem>
                          <SelectItem value="PLANNING">A Iniciar</SelectItem>
                          <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                          <SelectItem value="PAUSED">Paralisada</SelectItem>
                          <SelectItem value="COMPLETED">Finalizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cliente Associado</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="Selecione um cliente (Opcional)" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Deixar em branco</SelectItem>
                          {options?.clients?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[9px] uppercase font-medium">Busca contatos marcados como Clientes.</FormDescription>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase text-slate-800">Engenharia e Responsáveis</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <FormField control={form.control} name="totalArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Área Total</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value))} className="h-11 border-2 font-medium" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="areaUnit" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Un. Medida</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "m2"}>
                        <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="M2" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="m2">m²</SelectItem>
                          <SelectItem value="hectare">Hectare</SelectItem>
                          <SelectItem value="km">km</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="art" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">A.R.T.</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="ceiCno" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">CEI / CNO</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="technicalLeadId" render={({ field }: { field: any }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Engenheiro / Resp. Técnico</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="Usuário do sistema..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {options?.users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="projectManagerId" render={({ field }: { field: any }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Mestre de Obras / Resp. Obra</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="Usuário do sistema..." /></SelectTrigger></FormControl>
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
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase text-slate-800">Endereço do Canteiro/Obra</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <FormField control={form.control} name="cep" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">CEP</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input placeholder="00000-000" {...field} className="h-11 border-2 font-medium" /></FormControl>
                        <Button type="button" variant="secondary" onClick={() => handleCepSearch(field.value || "")} className="h-11 border-2">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="street" render={({ field }) => (
                    <FormItem className="col-span-4"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Logradouro/Rua</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="number" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Número</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="complement" render={({ field }) => (
                    <FormItem className="col-span-4"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Complemento</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="neighborhood" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Bairro</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem className="col-span-3"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cidade</FormLabel><FormControl><Input {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem className="col-span-1"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">UF</FormLabel><FormControl><Input placeholder="SP" maxLength={2} {...field} value={field.value || ""} className="h-11 border-2 font-medium" /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA FINANCEIRO */}
            <TabsContent value="financeiro" className="space-y-6">
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase text-slate-800">Pagamentos e Faturamento</CardTitle>
                  <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Gerencie por onde passa o fluxo de caixa do projeto.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Conta e Pagamento */}
                  <div className="space-y-6 border-r pr-4">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><DollarSign className="w-4 h-4 text-slate-400"/> Responsabilidade e Conta</h3>
                    
                    <FormField control={form.control} name="paymentResponsibility" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Quem Paga?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
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
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Conta Bancária Padrão</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                          <FormControl><SelectTrigger className="h-11 border-2 font-medium"><SelectValue placeholder="Bancos da Construtora..." /></SelectTrigger></FormControl>
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 p-4 bg-slate-50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold uppercase text-slate-800 tracking-tight">Dados de Faturamento</FormLabel>
                          <FormDescription className="text-[9px] uppercase font-medium">Ative se esta obra exigir faturamento isolado.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />

                    {hasInvoicing && (
                      <div className="space-y-6 border-2 rounded-xl p-6 bg-blue-50/20 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-2 mb-2 border-b-2 border-blue-100 pb-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">Detalhes do Faturamento</h4>
                        </div>

                        <FormField control={form.control} name="invoicingContact.personType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Natureza do Emitente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-white border-2 h-11"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="LEGAL">Pessoa Jurídica (CNPJ)</SelectItem>
                                <SelectItem value="PHYSICAL">Pessoa Física (CPF)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="invoicingContact.name" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{billingPersonType === 'LEGAL' ? 'Razão Social' : 'Nome Completo'}</FormLabel>
                              <FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="invoicingContact.document" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{billingPersonType === 'LEGAL' ? 'CNPJ' : 'CPF'}</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                          )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="invoicingContact.email" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">E-mail de Cobrança</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="invoicingContact.phone" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Telefone</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                          )} />
                        </div>

                        <div className="space-y-4 pt-4 border-t-2 border-blue-100">
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-blue-400">Endereço de Faturamento</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="invoicingContact.cep" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">CEP</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl><Input placeholder="00000-000" {...field} className="h-11 bg-white border-2 font-medium" /></FormControl>
                                  <Button type="button" variant="secondary" onClick={() => handleCepSearch(field.value || "", true)} className="h-11 border-2">
                                    <Search className="w-4 h-4" />
                                  </Button>
                                </div>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="invoicingContact.street" render={({ field }) => (
                              <FormItem className="md:col-span-2"><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Logradouro</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                            )} />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField control={form.control} name="invoicingContact.number" render={({ field }) => (
                              <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Número</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="invoicingContact.neighborhood" render={({ field }) => (
                              <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Bairro</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="invoicingContact.city" render={({ field }) => (
                              <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cidade</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="invoicingContact.state" render={({ field }) => (
                              <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">UF</FormLabel><FormControl><Input className="bg-white border-2 h-11 font-medium" maxLength={2} {...field} /></FormControl></FormItem>
                            )} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase text-slate-800">Módulos Ativos (Exibir Obra Para)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="showInFinancial" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border-2 p-4 shadow-sm bg-slate-50"><div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase text-slate-600">Financeiro</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="showInInvoicing" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border-2 p-4 shadow-sm bg-slate-50"><div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase text-slate-600">Faturamentos</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="showInPurchasing" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border-2 p-4 shadow-sm bg-slate-50"><div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase text-slate-600">Compras</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA CONTATOS DA EQUIPE/OBRA */}
            <TabsContent value="contatos" className="space-y-6">
              
              <Card className="border-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase text-slate-800">Acesso ao Sistema</CardTitle>
                  <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Selecione quais usuários do seu ERP podem visualizar esta obra.</CardDescription>
                </CardHeader>
                <CardContent>
                   <FormField control={form.control} name="users" render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-center justify-between pl-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider italic">Controle de Permissões</FormLabel>
                        <div className="text-[10px] font-bold uppercase text-slate-400">{(field.value || []).length} selecionado(s)</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border-2 rounded-xl bg-slate-50 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                        {loadingOptions ? (
                          <div className="col-span-full py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300"/></div>
                        ) : options?.users?.map(user => {
                          const isSelected = (field.value || []).includes(user.id);
                          return (
                            <div 
                              key={user.id} 
                              onClick={() => {
                                const current = field.value || [];
                                const next = isSelected 
                                  ? current.filter(id => id !== user.id)
                                  : [...current, user.id];
                                field.onChange(next);
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? "border-[#1862a3] bg-blue-50/50 shadow-sm" 
                                  : "border-slate-100 bg-white hover:border-slate-200"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected ? "bg-[#1862a3] border-[#1862a3]" : "border-slate-300"
                              }`}>
                                {isSelected && <Save className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-bold leading-tight truncate ${isSelected ? "text-[#1862a3]" : "text-slate-700"}`}>{user.name}</span>
                                <span className="text-[10px] font-medium text-slate-400 truncate">{user.email}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {(!field.value || field.value.length === 0) && (
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest pl-1 mt-2">
                          ⚠️ Nenhum selecionado: A obra ficará visível para toda a empresa por padrão.
                        </p>
                      )}
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold uppercase text-slate-800">Contatos Livres (Agenda da Obra)</CardTitle>
                    <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Telefones de encarregados, fornecedores ou clientes.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendContact({ name: "", email: "", phone: "", role: "" })} className="h-11 px-4 border-2 font-black uppercase text-[10px] tracking-widest">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Contato
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactFields.length === 0 && (
                     <div className="text-center p-8 border-2 border-dashed rounded-lg text-slate-400 uppercase font-black text-[10px] tracking-widest">
                       Nenhum contato adicionado ainda.
                     </div>
                  )}

                  {contactFields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end p-4 border-2 rounded-lg bg-slate-50 relative group">
                      <FormField control={form.control} name={`projectContacts.${index}.name`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Nome</FormLabel><FormControl><Input className="bg-white border-2 h-10 font-medium" {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name={`projectContacts.${index}.role`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cargo/Função</FormLabel><FormControl><Input className="bg-white border-2 h-10 font-medium" placeholder="Ex: Síndico" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`projectContacts.${index}.phone`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Telefone</FormLabel><FormControl><Input className="bg-white border-2 h-10 font-medium" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`projectContacts.${index}.email`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">E-mail</FormLabel><FormControl><Input className="bg-white border-2 h-10 font-medium" {...field} /></FormControl><FormMessage/></FormItem>
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

          <div className="flex justify-end pt-8 border-t-2 border-slate-100 mt-8">
             <Button 
               type="submit" 
               disabled={isPending} 
               className="bg-[#1862a3] hover:bg-[#124d80] text-white font-black px-12 h-14 shadow-xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest text-xs"
             >
                {isPending ? "Salvando Obra..." : (
                  <span className="flex items-center gap-3">
                    {isEditing ? "Salvar Alterações" : "Finalizar Cadastro da Obra"} <ArrowRight className="w-5 h-5 ml-2" />
                  </span>
                )}
             </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
