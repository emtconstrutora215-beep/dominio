"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, BarChart, ChevronLeft, ChevronRight, X, Box } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type CompositionFormData = {
  code?: string;
  description: string;
  unit: string;
  items: {
    catalogItemId: string;
    quantity: number;
    // UI Helpers passados pra form (ignorados no submiT)
    _unitCost?: number; 
    _name?: string;
  }[];
};

export default function ComposicoesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState("");

  const utils = trpc.useUtils();
  
  // Lista Paginada
  const { data, isLoading } = trpc.composition.list.useQuery({
    page,
    perPage: 10,
    search: search.length >= 2 ? search : undefined
  });

  // Lista Fixa para o Select Simples (~1000 items limite pra evitar travar render)
  const { data: insumos } = trpc.catalogItem.listAll.useQuery();

  const createMutation = trpc.composition.create.useMutation({
    onSuccess: () => {
      utils.composition.list.invalidate();
      setIsDialogOpen(false);
      reset({ items: [] });
      toast.success("Composição criada com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<CompositionFormData>({
    defaultValues: { items: [] }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const formItems = watch("items");

  const onSubmit = (formData: CompositionFormData) => {
    if (formData.items.length === 0) {
      toast.error("Adicione ao menos um insumo para formar a composição.");
      return;
    }
    
    createMutation.mutate({
      code: formData.code,
      description: formData.description,
      unit: formData.unit,
      items: formData.items.map(i => ({
        catalogItemId: i.catalogItemId,
        quantity: Number(i.quantity)
      }))
    });
  };

  const handleAddInsumo = () => {
    if (!selectedInsumo) return;
    const itemEncontrado = insumos?.find(i => i.id === selectedInsumo);
    if (!itemEncontrado) return;

    if (fields.some(f => f.catalogItemId === selectedInsumo)) {
      toast.error("Este insumo já está na composição");
      return;
    }

    append({
      catalogItemId: itemEncontrado.id,
      quantity: 1,
      _unitCost: itemEncontrado.unitCost,
      _name: itemEncontrado.description
    });
    setSelectedInsumo(""); // clear selection
  };

  const calcTotalCusto = () => {
    return formItems.reduce((acc, curr) => {
      const custo = curr._unitCost || 0;
      const qtd = Number(curr.quantity) || 0;
      return acc + (custo * qtd);
    }, 0);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <BarChart className="h-7 w-7 text-blue-600" /> Composições
          </h1>
          <p className="text-muted-foreground">Combine insumos para formar receitas e custos de serviços.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Buscar receita..." 
              className="pl-9 w-full md:w-[320px]"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { reset({ items: [] }); setSelectedInsumo(""); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4 mr-2" /> Criar Composição</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b bg-white">
                <DialogTitle>Elaborar Composição (Serviço)</DialogTitle>
                <DialogDescription>
                  Defina o que será produzido e a "receita de bolo" de insumos necessários.
                </DialogDescription>
              </DialogHeader>
              
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <form id="compositionForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Cabeçalho da Composição */}
                  <div className="grid grid-cols-6 gap-4 bg-blue-50/50 p-4 rounded-md border border-blue-100">
                    <div className="col-span-2 space-y-2">
                      <label className="text-sm font-medium">Cód. Serviço</label>
                      <Input {...register("code")} placeholder="Ex: SERV-01" className="bg-white" />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <label className="text-sm font-medium">Nome / Descrição da Composição *</label>
                      <Input {...register("description", { required: true })} placeholder="Ex: Alvenaria de elevação 1m²" className="bg-white" />
                      {errors.description && <span className="text-xs text-red-500">Obrigatório</span>}
                    </div>
                    <div className="col-span-1 space-y-2">
                      <label className="text-sm font-medium text-center block">Unidade *</label>
                      <Input {...register("unit", { required: true })} placeholder="m²" className="bg-white text-center font-semibold" />
                    </div>
                  </div>

                  {/* Gerenciador de Insumos */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium border-b pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2"><Box className="w-4 h-4 text-slate-500"/> Insumos Utilizados</span>
                      {fields.length > 0 && <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">Custo Final: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcTotalCusto())} p/ Unit</span>}
                    </h3>
                    
                    {/* Botoeira Add Insumo */}
                    <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-md border border-dashed border-slate-300">
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm disabled:opacity-50"
                        value={selectedInsumo}
                        onChange={(e) => setSelectedInsumo(e.target.value)}
                      >
                        <option value="">Selecione um Insumo do banco...</option>
                        {insumos?.map(ins => (
                          <option key={ins.id} value={ins.id}>{ins.code ? `[${ins.code}] ` : ''}{ins.description} - R$ {ins.unitCost} / {ins.unit}</option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" onClick={handleAddInsumo} className="whitespace-nowrap bg-white">
                        <Plus className="w-4 h-4 mr-1" /> Embutir
                      </Button>
                    </div>

                    {/* Lista Injetada */}
                    {fields.length > 0 ? (
                      <div className="border rounded-md divide-y overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100/50 sticky top-0 font-medium">
                            <tr>
                              <th className="px-3 py-2">Insumo</th>
                              <th className="px-3 py-2 text-right">Índice / Qtd</th>
                              <th className="px-3 py-2 text-right">Custo. Unit</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {fields.map((field, index) => (
                              <tr key={field.id} className="bg-white">
                                <td className="px-3 py-2 align-middle max-w-[200px] truncate" title={field._name}>
                                  {field._name}
                                </td>
                                <td className="px-3 py-2 align-middle text-right">
                                  <Input type="number" step="0.000001" className="h-7 w-24 text-right mx-auto" {...register(`items.${index}.quantity`, { required: true })} />
                                </td>
                                <td className="px-3 py-2 align-middle text-right text-slate-500 font-mono text-xs">
                                  R$ {field._unitCost}
                                </td>
                                <td className="px-3 py-2 align-middle text-center">
                                  <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 transition-colors">
                                    <X className="w-4 h-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-md border-dashed border-slate-200 text-slate-400 text-sm">
                        Nenhum insumo atrelado.
                      </div>
                    )}

                  </div>
                </form>
              </div>

              <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" form="compositionForm" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Gravar Composição"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-md border shadow-sm flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código SERV.</TableHead>
                <TableHead>Composição / Serviço</TableHead>
                <TableHead>Qtd. de Insumos Base</TableHead>
                <TableHead className="text-right">Custo Paramétrico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-muted-foreground">
                    Nenhuma composição registrada.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((comp: any) => (
                  <TableRow key={comp.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-slate-500 whitespace-nowrap">
                      {comp.code ? comp.code : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{comp.description}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{comp.items?.length || 0} Itens</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <span className="font-semibold text-slate-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.computedCost || 0)}
                       </span>
                       <span className="text-slate-500 ml-1">/ {comp.unit}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="border-t p-4 flex items-center justify-between bg-slate-50/50 rounded-b-md">
          <div className="text-sm text-muted-foreground">
            Total de {data?.totalCount || 0} registros
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium px-4">
              Página {page} de {data?.totalPages || 1}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))} disabled={page >= (data?.totalPages || 1) || isLoading}>
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
