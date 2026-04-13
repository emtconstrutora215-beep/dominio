"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
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
  CardDescription,
  CardHeader,
  CardTitle,
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
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Building2,
  BadgeDollarSign,
  Loader2,
  PackageSearch
} from "lucide-react";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AddBudgetItemDialog } from "@/components/orcamentos/AddBudgetItemDialog";

const formSchema = z.object({
  projectId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  freight: z.number().min(0),
  otherExpenses: z.number().min(0),
  taxes: z.number().min(0),
  discounts: z.number().min(0),
  deliveryDays: z.number().min(0),
  paymentTerms: z.string().min(1, "Informe a condição de pagamento"),
  installments: z.number().min(1),
  firstDueDate: z.string().min(1, "Selecione a data de vencimento"),
  category: z.string(),
});

type OrderItem = {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export default function NewDirectOrderPage() {
  const router = useRouter();
  const [costCenterType, setCostCenterType] = useState<"PROJECT" | "HEADQUARTERS">("PROJECT");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);

  const { data: projects } = trpc.projects.getAll.useQuery();
  const { data: suppliersData } = trpc.contact.list.useQuery({ type: 'SUPPLIER', perPage: 100 });
  const suppliers = suppliersData?.items || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: null,
      stageId: null,
      supplierId: "",
      freight: 0,
      otherExpenses: 0,
      taxes: 0,
      discounts: 0,
      deliveryDays: 0,
      paymentTerms: "À Vista",
      installments: 1,
      firstDueDate: "",
      category: "Materiais",
    },
  });

  const createOrder = trpc.purchasing.createDirectOrder.useMutation({
    onSuccess: () => {
      toast.success("Ordem de Compra emitida com sucesso!");
      router.push("/dashboard/compras/ordens");
    },
    onError: (err) => {
      toast.error(`Erro ao criar ordem: ${err.message}`);
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido.");
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === values.supplierId);

    createOrder.mutate({
      projectId: costCenterType === "PROJECT" ? values.projectId : null,
      supplierName: selectedSupplier?.name || "Fornecedor Direto",
      items: items.map(i => ({
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })),
      projectId: values.projectId,
      stageId: values.stageId,
      freight: values.freight,
      otherExpenses: values.otherExpenses,
      taxes: values.taxes,
      discounts: values.discounts,
      deliveryDays: values.deliveryDays,
      paymentTerms: values.paymentTerms,
      installments: values.installments,
      firstDueDate: values.firstDueDate,
      category: values.category
    });
  };

  const handleAddItemFromCatalog = (selection: any) => {
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: selection.description,
      unit: selection.unit,
      quantity: selection.quantity || 1,
      unitPrice: selection.unitCost || selection.computedCost || 0
    };
    setItems([...items, newItem]);
    setIsAddItemDialogOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const totalValue = useMemo(() => {
    const itemsTotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const freight = form.watch("freight") || 0;
    const otherExpenses = form.watch("otherExpenses") || 0;
    const taxes = form.watch("taxes") || 0;
    const discounts = form.watch("discounts") || 0;
    return (itemsTotal + freight + otherExpenses + taxes) - discounts;
  }, [items, form.watch("freight"), form.watch("otherExpenses"), form.watch("taxes"), form.watch("discounts")]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/compras/ordens">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nova Ordem Direta</h1>
          <p className="text-slate-500">Crie um pedido de compra sem necessidade de cotações prévias.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1. SELEÇÃO DE CENTRO DE CUSTO E FORNECEDOR */}
            <Card className="md:col-span-2 border-slate-200">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#F07B2B]" />
                  Identificação do Pedido
                </CardTitle>
                <CardDescription>Defina para onde vai a compra e de quem está comprando.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Onde será alocado?</label>
                  <RadioGroup
                    value={costCenterType}
                    onValueChange={(v: any) => setCostCenterType(v)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 bg-slate-100 px-4 py-3 rounded-xl border border-slate-200 flex-1 hover:bg-slate-200 transition-colors cursor-pointer">
                      <RadioGroupItem value="PROJECT" id="project" />
                      <label htmlFor="project" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                        Obra / Projeto
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-100 px-4 py-3 rounded-xl border border-slate-200 flex-1 hover:bg-slate-200 transition-colors cursor-pointer">
                      <RadioGroupItem value="HEADQUARTERS" id="hq" />
                      <label htmlFor="hq" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                        Empresa (Sede)
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {costCenterType === "PROJECT" && (
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecione a Obra</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("stageId", null); // Reset stage when project changes
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl">
                              <SelectValue placeholder="Selecione um projeto..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {costCenterType === "PROJECT" && form.watch("projectId") && (
                  <FormField
                    control={form.control}
                    name="stageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecione a Etapa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl">
                              <SelectValue placeholder="Escolha a etapa da obra..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.find(p => p.id === form.watch("projectId"))?.stages.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Busque um fornecedor cadastrado..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} {s.document ? `(${s.document})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 2. RESUMO FINANCEIRO */}
            <Card className="border-slate-200 bg-[#1e293b] text-white overflow-hidden h-fit sticky top-6">
              <CardHeader className="bg-white/5 border-b border-white/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BadgeDollarSign className="w-5 h-5 text-[#F07B2B]" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm">Valor Total do Pedido</p>
                  <h3 className="text-4xl font-black text-white">
                    <span className="text-[#F07B2B] text-2xl mr-1">R$</span>
                    {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                  {form.watch("paymentTerms") === "PARCELADO" && (
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-slate-400">Parcelamento</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="bg-white/10 border-white/20 text-white h-11"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="firstDueDate"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-slate-400">1º Vencimento</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-white/10 border-white/20 text-white h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createOrder.isPending}
                  className="w-full bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-black h-14 rounded-2xl text-lg gap-2 shadow-2xl shadow-orange-500/10 mt-4 active:scale-95 transition-all"
                >
                  {createOrder.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                  {createOrder.isPending ? "Emitindo..." : "Emitir Ordem de Compra"}
                </Button>
              </CardContent>
            </Card>

            {/* 3. LISTAGEM DE ITENS */}
            <Card className="md:col-span-2 border-slate-200">
              <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PackageSearch className="w-5 h-5 text-[#F07B2B]" />
                    Itens do Pedido
                  </CardTitle>
                  <CardDescription>Liste os materiais ou serviços desta ordem.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddItemDialogOpen(true)}
                  className="h-10 rounded-xl px-4 border-slate-200 gap-1 bg-white hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[50%]">Descrição</TableHead>
                      <TableHead className="w-[10%]">Und</TableHead>
                      <TableHead className="w-[15%]">Qtd</TableHead>
                      <TableHead className="w-[20%] text-right">Preço Unit.</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                          Nenhum item adicionado. Clique no botão acima para começar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-transparent">
                          <TableCell className="py-4">
                            <Input
                              placeholder="Ex: Cimento CP-II"
                              className="h-10 border-0 bg-slate-50 focus-visible:ring-1"
                              value={item.description}
                              onChange={e => updateItem(item.id, 'description', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="SC"
                              className="h-10 border-0 bg-slate-50 focus-visible:ring-1 text-center"
                              value={item.unit}
                              onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-10 border-0 bg-slate-50 focus-visible:ring-1 text-center font-bold"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 bg-slate-50 rounded-md px-2 focus-within:ring-1 ring-slate-200">
                              <span className="text-slate-400 text-xs">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-10 border-0 bg-transparent text-right font-bold focus-visible:ring-0"
                                value={item.unitPrice}
                                onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50"
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

            {/* 4. CONDIÇÕES GERAIS */}
            <Card className="md:col-span-2 border-slate-200">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-lg">Logística e Pagamento</CardTitle>
                <CardDescription>Prazos e termos acordados com o fornecedor.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="freight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frete (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-12 rounded-xl" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="otherExpenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outras Desp. (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-12 rounded-xl" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impostos (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-12 rounded-xl" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-red-500">Descontos (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-12 rounded-xl border-red-100 bg-red-50/30 text-red-600" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <FormField
                    control={form.control}
                    name="deliveryDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de Entrega (Dias Úteis)</FormLabel>
                        <FormControl>
                          <Input type="number" className="h-12 rounded-xl" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condição de Pagamento</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PIX">Pix / À Vista</SelectItem>
                            <SelectItem value="BOLETO_15">Boleto 15 Dias</SelectItem>
                            <SelectItem value="BOLETO_30">Boleto 30 Dias</SelectItem>
                            <SelectItem value="PARCELADO">Parcelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>

      <AddBudgetItemDialog
        isOpen={isAddItemDialogOpen}
        onClose={() => setIsAddItemDialogOpen(false)}
        onConfirm={handleAddItemFromCatalog}
        title="Buscar no Catálogo"
        type="INPUT"
      />
    </div>
  );
}
