"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, Boxes, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type InsumoFormData = {
  code?: string;
  description: string;
  unit: string;
  type: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'SERVICE';
  typeCategory?: string;
  base?: string;
  salary?: number;
  charges?: number;
  benefits?: number;
  unitCost: number;
};

export default function InsumosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  
  const { data, isLoading } = trpc.catalogItem.list.useQuery({
    page,
    perPage: 15,
    search: search.length >= 2 ? search : undefined
  });

  const { data: existingTypes } = trpc.catalogItem.listAllTypes.useQuery();

  const createMutation = trpc.catalogItem.create.useMutation({
    onSuccess: () => {
      utils.catalogItem.list.invalidate();
      utils.catalogItem.listAllTypes.invalidate();
      setIsDialogOpen(false);
      reset({ type: 'MATERIAL', unitCost: 0, salary: 0, charges: 0, benefits: 0 });
      toast.success("Insumo cadastrado com sucesso no catálogo!");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<InsumoFormData>({
    defaultValues: { type: 'MATERIAL', unitCost: 0, salary: 0, charges: 0, benefits: 0 }
  });

  const selectedGroup = watch("type");
  const watchSalario = watch("salary") || 0;
  const watchEncargos = watch("charges") || 0;
  const watchBeneficios = watch("benefits") || 0;

  const calculatedTotal = useMemo(() => {
    if (selectedGroup === 'LABOR') {
      const sal = Number(watchSalario);
      const encargos = Number(watchEncargos);
      const ben = Number(watchBeneficios);
      return sal * (1 + encargos / 100) + ben;
    }
    return 0;
  }, [selectedGroup, watchSalario, watchEncargos, watchBeneficios]);

  const onSubmit = (formData: InsumoFormData) => {
    const finalUnitCost = selectedGroup === 'LABOR' ? calculatedTotal : Number(formData.unitCost);
    
    createMutation.mutate({
      ...formData,
      salary: formData.salary ? Number(formData.salary) : undefined,
      charges: formData.charges ? Number(formData.charges) : undefined,
      benefits: formData.benefits ? Number(formData.benefits) : undefined,
      unitCost: finalUnitCost
    });
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case 'MATERIAL': return <Badge variant="outline" className="bg-orange-50 text-orange-700">Material</Badge>;
      case 'LABOR': return <Badge variant="outline" className="bg-blue-50 text-blue-700">Mão de Obra</Badge>;
      case 'EQUIPMENT': return <Badge variant="outline" className="bg-amber-50 text-amber-700">Equipamento</Badge>;
      case 'SERVICE': return <Badge variant="outline" className="bg-purple-50 text-purple-700">Serviço/Taxa</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Boxes className="h-7 w-7 text-indigo-600" /> Banco de Insumos
          </h1>
          <p className="text-muted-foreground">Construa e classifique as frações mínimas dos seus orçamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Buscar por código ou nome..." 
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
            if (!open) reset();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="h-4 w-4 mr-2" /> Novo Insumo</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Insumo</DialogTitle>
                <DialogDescription>
                  Adicione um material, equipamento ou mão de obra base.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grupo principal *</label>
                    <select {...register("type")} className="flex h-10 w-full rounded-md border border-input bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="MATERIAL">Materiáis Físicos</option>
                      <option value="LABOR">Mão de Obra</option>
                      <option value="EQUIPMENT">Equipamentos e Máquinas</option>
                      <option value="SERVICE">Serviços / Terceiros</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código</label>
                    <Input {...register("code")} placeholder="Opcional" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição *</label>
                    <Input {...register("description", { required: true })} placeholder="Ex: Areia Média Lavada" />
                    {errors.description && <span className="text-xs text-red-500">A descrição é obrigatória</span>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unidade *</label>
                      <Input {...register("unit", { required: true })} placeholder="Ex: m³, h, un" />
                      {errors.unit && <span className="text-xs text-red-500">Obrigatória</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo</label>
                      <Input list="typeList" {...register("typeCategory")} placeholder="Ex: Areia, Pedra, Profissional" autoComplete="off" />
                      <datalist id="typeList">
                        {existingTypes?.map((t: string) => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  </div>

                  {selectedGroup === 'LABOR' ? (
                    <div className="space-y-4 bg-blue-50/50 p-4 rounded border border-blue-100">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-700">Salário / Base (R$)</label>
                          <Input type="number" step="0.01" {...register("salary")} placeholder="0.00" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-700">Encargos (%)</label>
                          <Input type="number" step="0.01" {...register("charges")} placeholder="0.00" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-700">Benefícios (R$)</label>
                          <Input type="number" step="0.01" {...register("benefits")} placeholder="0.00" className="bg-white" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                        <span className="text-sm font-semibold text-blue-900">Total (Computado Automático):</span>
                        <span className="text-lg font-bold text-blue-700">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedTotal)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-slate-50 p-3 rounded border">
                      <label className="text-sm font-medium text-slate-700">Custo Base Unitário R$</label>
                      <Input type="number" step="0.01" {...register("unitCost", { required: true })} placeholder="0.00" className="bg-white" />
                    </div>
                  )}

                  <DialogFooter className="mt-6 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Gravar Insumo"}
                  </Button>
                </DialogFooter>
              </form>

            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela de Insumos */}
      <div className="bg-white rounded-md border shadow-sm flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Descrição do Insumo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unid.</TableHead>
                <TableHead className="text-right">Custo Unit. (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground">
                    Nenhum insumo encontrado no catálogo.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-slate-500 whitespace-nowrap">
                      {item.code ? item.code : <span className="text-slate-300 italic">S/N</span>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.description}</div>
                    </TableCell>
                    <TableCell>
                      {getBadgeType(item.type)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost)}
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
