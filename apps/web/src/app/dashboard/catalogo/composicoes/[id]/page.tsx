"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  ChevronLeft, Save, Plus, X, Box, Info, Check,
  Settings2, Layers, Tag, Calculator, MoreVertical, Trash2
} from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import { UnitSelect } from "@/components/ui/unit-select";
import { CompositionTypeSelect } from "@/components/ui/composition-type-select";
import { BaseSelect } from "@/components/ui/base-select";
import { InsumoDialog } from "@/components/catalogo/InsumoDialog";
import { ItemSelectorDialog } from "@/components/catalogo/ItemSelectorDialog";

const compositionSchema = z.object({
  id: z.string(),
  code: z.string().optional().nullable(),
  description: z.string().min(1, "A descrição é obrigatória"),
  unit: z.string().min(1, "A unidade é obrigatória"),
  type: z.string().optional().nullable(),
  base: z.string().nullable().default("Própria"),
  isActive: z.boolean().default(true),
  detailedDescription: z.string().optional().nullable(),
  bdi: z.number().min(0).default(0),

  // Custos Manuais
  laborCost: z.number().default(0),
  materialCost: z.number().default(0),
  equipmentCost: z.number().default(0),
  serviceCost: z.number().default(0),

  items: z.array(z.object({
    catalogItemId: z.string().optional().nullable(),
    childCompositionId: z.string().optional().nullable(),
    quantity: z.number().min(0.000001),
    _name: z.string().optional(),
    _code: z.string().optional(),
    _unit: z.string().optional(),
    _unitCost: z.number().optional(),
    _type: z.string().optional(),
  })).default([])
});

type CompositionFormValues = z.infer<typeof compositionSchema>;

export default function EditarComposicaoPage() {
  const router = useRouter();
  const { id } = useParams();
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>("");
  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: composition, isLoading } = trpc.composition.get.useQuery(id as string);
  const { data: insumos } = trpc.catalogItem.listAll.useQuery();

  const updateMutation = trpc.composition.update.useMutation({
    onSuccess: () => {
      toast.success("Composição atualizada!");
      utils.composition.get.invalidate(id as string);
      router.push("/dashboard/catalogo/composicoes");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`)
  });

  const deleteMutation = trpc.composition.delete.useMutation({
    onSuccess: () => {
      toast.success("Composição excluída!");
      router.push("/dashboard/catalogo/composicoes");
    }
  });

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CompositionFormValues>({
    resolver: zodResolver(compositionSchema),
    defaultValues: { items: [] }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (composition) {
      reset({
        id: composition.id,
        code: composition.code,
        description: composition.description,
        unit: composition.unit,
        type: composition.type,
        base: composition.base,
        isActive: composition.isActive,
        detailedDescription: composition.detailedDescription,
        bdi: composition.bdi,
        laborCost: composition.laborCost || 0,
        materialCost: composition.materialCost || 0,
        equipmentCost: composition.equipmentCost || 0,
        serviceCost: composition.serviceCost || 0,
        items: composition.items.map(i => ({
          catalogItemId: i.catalogItemId,
          childCompositionId: i.childCompositionId,
          quantity: i.quantity,
          _name: i.catalogItem?.description || i.childComposition?.description || "",
          _code: i.catalogItem?.code || i.childComposition?.code || "",
          _unit: i.catalogItem?.unit || i.childComposition?.unit || "",
          _unitCost: i.catalogItem?.unitCost || i.childComposition?.computedCost || 0,
          _type: i.catalogItem?.type || 'COMPOSIÇÃO'
        }))
      });
    }
  }, [composition, reset]);

  // Usar useWatch para monitoramento profundo e reativo
  const watchedItems = useWatch({ control, name: "items" });
  const watchedBdi = useWatch({ control, name: "bdi" });
  const watchedLaborCost = useWatch({ control, name: "laborCost" });
  const watchedMaterialCost = useWatch({ control, name: "materialCost" });
  const watchedEquipmentCost = useWatch({ control, name: "equipmentCost" });
  const watchedServiceCost = useWatch({ control, name: "serviceCost" });

  const totals = useMemo(() => {
    const items = watchedItems || [];
    const hasItems = items.length > 0;
    const breakdown = { LABOR: 0, MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0, OTHERS: 0 };
    let totalCost = 0;

    if (hasItems) {
      items.forEach((item: any) => {
        const qty = Number(item.quantity) || 0;
        const unitCost = Number(item._unitCost) || 0;
        const cost = unitCost * qty;
        
        const type = item._type || 'OTHERS';
        if (type === 'LABOR') breakdown.LABOR += cost;
        else if (type === 'MATERIAL') breakdown.MATERIAL += cost;
        else if (type === 'EQUIPMENT') breakdown.EQUIPMENT += cost;
        else if (type === 'SERVICE') breakdown.SERVICE += cost;
        else breakdown.OTHERS += cost;
        
        totalCost += cost;
      });
    } else {
      breakdown.LABOR = Number(watchedLaborCost) || 0;
      breakdown.MATERIAL = Number(watchedMaterialCost) || 0;
      breakdown.EQUIPMENT = Number(watchedEquipmentCost) || 0;
      breakdown.SERVICE = Number(watchedServiceCost) || 0;
      totalCost = breakdown.LABOR + breakdown.MATERIAL + breakdown.EQUIPMENT + breakdown.SERVICE;
    }

    const bdiValue = Number(watchedBdi) || 0;
    const priceWithBdi = totalCost * (1 + (bdiValue / 100));
    return { totalCost, breakdown, priceWithBdi, hasItems };
  }, [watchedItems, watchedBdi, watchedLaborCost, watchedMaterialCost, watchedEquipmentCost, watchedServiceCost]);

  const handleAddItems = (selectedItems: any[]) => {
    selectedItems.forEach(item => {
      if (item._source === 'INSUMO') {
        append({
          catalogItemId: item.id,
          childCompositionId: null,
          quantity: 1,
          _name: item.description,
          _code: item.code || "",
          _unit: item.unit,
          _unitCost: item.unitCost,
          _type: item.type
        });
      } else {
        append({
          catalogItemId: null,
          childCompositionId: item.id,
          quantity: 1,
          _name: item.description,
          _code: item.code || "",
          _unit: item.unit,
          _unitCost: item.computedCost,
          _type: 'COMPOSIÇÃO'
        });
      }
    });
    toast.success(`${selectedItems.length} item(s) adicionado(s)`);
  };

  const onSubmit = (data: CompositionFormValues) => {
    updateMutation.mutate({
      ...data,
      items: data.items.map(item => ({
        catalogItemId: item.catalogItemId || null,
        childCompositionId: item.childCompositionId || null,
        quantity: item.quantity
      }))
    });
  };

  if (isLoading) return <div className="p-10 text-center text-sm font-bold text-slate-400">Carregando composição...</div>;


  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] overflow-hidden text-slate-700">
      <InsumoDialog 
        isOpen={isInsumoDialogOpen} 
        onOpenChange={setIsInsumoDialogOpen} 
        onSuccess={() => {
          utils.catalogItem.listAll.invalidate();
        }}
      />
      <ItemSelectorDialog
        isOpen={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={handleAddItems}
      />
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div className="border-l-4 border-blue-500 pl-3">
             <span className="text-xs uppercase font-bold text-slate-400 block leading-none mb-1">Catálogo</span>
             <h1 className="text-xl font-bold text-slate-700 leading-none">Composição</h1>
           </div>

           <div className="flex items-center gap-10">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Custo Unitário</span>
                <span className="text-xl font-bold text-slate-600">{formatCurrency(totals.totalCost)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">BDI</span>
                <div className="flex items-center gap-1 bg-slate-50 border px-2 py-0.5 rounded">
                  <Input 
                    type="number" {...register("bdi", { valueAsNumber: true })}
                    className="h-5 w-14 text-sm font-bold border-none bg-transparent p-0 focus-visible:ring-0"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Preço Unitário</span>
                <div className="flex items-center gap-1 bg-slate-50 border px-2 py-0.5 rounded">
                  <span className="text-lg font-bold text-slate-600">{formatCurrency(totals.priceWithBdi)}</span>
                </div>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Status</span>
                <div className="flex bg-slate-100 rounded border p-0.5">
                  <button onClick={() => setValue("isActive", true)} className={`text-[10px] font-bold px-3 py-1 rounded transition-all ${watch("isActive") ? 'bg-[#33b5e5] text-white' : 'text-slate-400'}`}>ATIVO</button>
                  <button onClick={() => setValue("isActive", false)} className={`text-[10px] font-bold px-3 py-1 rounded transition-all ${!watch("isActive") ? 'bg-[#33b5e5] text-white' : 'text-slate-400'}`}>INATIVO</button>
                </div>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit(onSubmit)} className="bg-[#5cb85c] hover:bg-[#4cae4c] h-9 px-6 text-sm font-bold text-white shadow-sm flex items-center gap-2">
            <Check className="h-4 w-4" /> Salvar
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 bg-orange-400 hover:bg-orange-500 text-white transition-colors"><ChevronLeft className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-3 space-y-3 overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-3 flex-shrink-0">
          <div className="col-span-8 bg-white border border-slate-200 rounded p-4 grid grid-cols-12 gap-4">
             <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Código:</Label>
                <Input {...register("code")} className="h-9 border-slate-200 text-sm px-3" />
             </div>
             <div className="col-span-10 space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Descrição:</Label>
                <Input {...register("description")} className="h-9 border-slate-200 text-sm px-3 uppercase font-medium" />
             </div>
             <div className="col-span-3 space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Base: <Info className="h-3 w-3 inline" /> <span className="text-red-500">*</span></Label>
                <Controller
                   name="base"
                   control={control}
                   render={({ field }) => (
                     <BaseSelect value={field.value} onChange={field.onChange} placeholder="Selecione..." />
                   )}
                />
             </div>
             <div className="col-span-3 space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Unidade:</Label>
                <Controller name="unit" control={control} render={({ field }) => (
                  <UnitSelect value={field.value} onChange={field.onChange} />
                )} />
             </div>
             <div className="col-span-6 space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Tipo:</Label>
                <Controller name="type" control={control} render={({ field }) => (
                  <CompositionTypeSelect value={field.value} onChange={field.onChange} />
                )} />
             </div>
             <div className="col-span-3 space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Base:</Label>
                <Input {...register("base")} className="h-9 border-slate-200 text-sm px-3" />
             </div>
          </div>

          <div className="col-span-4 bg-white border border-slate-200 rounded p-4 flex flex-col">
             <Label className="text-xs font-bold text-slate-500 uppercase mb-1">Descrição detalhada:</Label>
             <Textarea {...register("detailedDescription")} className="flex-1 min-h-[80px] resize-none border-slate-200 text-sm p-3 leading-snug" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded overflow-hidden flex flex-col h-auto min-h-[120px] max-h-[calc(100vh-380px)]">
            <div className="bg-slate-50 border-b px-6 py-4 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Itens da Composição</h3>
                  <Button 
                    type="button"
                    onClick={() => setIsSelectorOpen(true)}
                    className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-[10px] font-black uppercase h-8 px-4 gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3" /> Item
                  </Button>
               </div>
               
               <div className="flex items-center gap-6">
                  <div className="text-right">
                     <p className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1">Custo Direto</p>
                     <p className="text-sm font-black text-slate-700 leading-none">{formatCurrency(totals.totalCost)}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200" />
                  <div className="text-right">
                     <p className="text-[9px] font-black uppercase text-[#337ab7] leading-none mb-1">Preço c/ BDI</p>
                     <p className="text-lg font-black text-[#337ab7] leading-none">{formatCurrency(totals.priceWithBdi)}</p>
                  </div>
               </div>
            </div>
           
           <div className="overflow-auto flex-initial max-h-[calc(100vh-450px)] min-h-[120px]">
              <Table>
                <TableHeader className="bg-white border-b sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Código</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 h-10">Descrição</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 h-10 text-center">Unidade</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 h-10 text-right">Coeficiente</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 h-10 text-right">Custo Unitário</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 h-10 text-right px-4">Custo Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(watchedItems || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-sm text-slate-400">Nenhum item adicionado</TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => {
                      const currentItem = watchedItems?.[index];
                      const qty = Number(currentItem?.quantity) || 0;
                      const unitCost = Number(currentItem?._unitCost) || 0;
                      const rowTotal = qty * unitCost;

                      return (
                        <TableRow key={field.id} className="border-b last:border-none hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-xs text-slate-500 px-4">{currentItem?._code || "-"}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-800 uppercase">{currentItem?._name}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500 uppercase">{currentItem?._unit}</TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number" step="0.000001"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                              className="h-8 w-24 ml-auto text-right text-xs border-slate-200 bg-slate-50 px-2 font-bold"
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500 font-mono">{formatCurrency(unitCost)}</TableCell>
                          <TableCell className="text-right text-sm font-bold text-slate-900 px-4 font-mono">{formatCurrency(rowTotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
           </div>
        </div>

        {/* Rodapé: Custos Unitários */}
        <div className="bg-white border border-slate-200 rounded p-4 flex-shrink-0 space-y-3">
           <div className="flex items-center justify-between">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhamento de Custos Unitários</h2>
             {totals.hasItems && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Cálculo Automático Ativo</span>}
           </div>
           <div className="grid grid-cols-4 gap-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Mão de Obra</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    {...register("laborCost", { valueAsNumber: true })}
                    disabled={totals.hasItems}
                    value={totals.hasItems ? (totals.breakdown.LABOR || 0).toFixed(2) : (watchedLaborCost ?? 0)}
                    className="h-9 border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 px-4 disabled:opacity-100 disabled:cursor-not-allowed"
                  />
                  {totals.hasItems && <div className="absolute inset-0 bg-transparent" title="Calculado automaticamente" />}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Material</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    {...register("materialCost", { valueAsNumber: true })}
                    disabled={totals.hasItems}
                    value={totals.hasItems ? (totals.breakdown.MATERIAL || 0).toFixed(2) : (watchedMaterialCost ?? 0)}
                    className="h-9 border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 px-4 disabled:opacity-100 disabled:cursor-not-allowed"
                  />
                  {totals.hasItems && <div className="absolute inset-0 bg-transparent" title="Calculado automaticamente" />}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Equipamento</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    {...register("equipmentCost", { valueAsNumber: true })}
                    disabled={totals.hasItems}
                    value={totals.hasItems ? (totals.breakdown.EQUIPMENT || 0).toFixed(2) : (watchedEquipmentCost ?? 0)}
                    className="h-9 border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 px-4 disabled:opacity-100 disabled:cursor-not-allowed"
                  />
                  {totals.hasItems && <div className="absolute inset-0 bg-transparent" title="Calculado automaticamente" />}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Outros / Serviços</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    {...register("serviceCost", { valueAsNumber: true })}
                    disabled={totals.hasItems}
                    value={totals.hasItems ? ((totals.breakdown.SERVICE || 0) + (totals.breakdown.OTHERS || 0)).toFixed(2) : (watchedServiceCost ?? 0)}
                    className="h-9 border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 px-4 disabled:opacity-100 disabled:cursor-not-allowed"
                  />
                  {totals.hasItems && <div className="absolute inset-0 bg-transparent" title="Calculado automaticamente" />}
                </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
