"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Copy, Trash2, X, AlertTriangle, Save, PlusCircle
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UnitSelect } from "@/components/ui/unit-select";
import { BaseSelect } from "@/components/ui/base-select";
import { InsumoCategorySelect } from "@/components/ui/insumo-category-select";

type InsumoDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any; // Se presente, modo edição
  onSuccess: () => void;
  filterOptions?: { bases: string[], categories: string[] };
};

type InsumoFormData = {
  id?: string;
  code?: string;
  description: string;
  unit: string;
  type: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'SERVICE';
  typeCategory?: string;
  base?: string;
  unitCost: number;
  salary?: number;
  charges?: number;
  benefits?: number;
  isActive: boolean;
  observations?: string;
};

export function InsumoDialog({ isOpen, onOpenChange, item, onSuccess, filterOptions }: InsumoDialogProps) {
  const [activeStatus, setActiveStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const utils = trpc.useUtils();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<InsumoFormData>({
    defaultValues: { 
      type: 'MATERIAL', 
      unitCost: 0, 
      salary: 0,
      charges: 0,
      benefits: 0,
      isActive: true,
      base: 'Própria'
    }
  });

  useEffect(() => {
    if (item) {
      reset({
        id: item.id,
        code: item.code || "",
        description: item.description,
        unit: item.unit,
        type: item.type,
        typeCategory: item.typeCategory || "",
        base: item.base || "Própria",
        unitCost: item.unitCost,
        salary: item.salary || 0,
        charges: item.charges || 0,
        benefits: item.benefits || 0,
        isActive: item.isActive,
        observations: item.observations || ""
      });
      setActiveStatus(item.isActive ? "ACTIVE" : "INACTIVE");
    } else {
      reset({ 
        id: undefined, 
        code: "", 
        description: "", 
        unit: "", 
        type: 'MATERIAL', 
        unitCost: 0, 
        salary: 0,
        charges: 0,
        benefits: 0,
        isActive: true,
        base: 'Própria',
        observations: ""
      });
      setActiveStatus("ACTIVE");
    }
  }, [item, reset, isOpen]);
  
  const watchedType = watch("type");
  const watchedSalary = watch("salary") || 0;
  const watchedCharges = watch("charges") || 0;
  const watchedBenefits = watch("benefits") || 0;

  // Cálculo automático do unitCost para Mão de Obra
  useEffect(() => {
    if (watchedType === 'LABOR') {
      const total = (Number(watchedSalary) * (1 + (Number(watchedCharges) / 100))) + Number(watchedBenefits);
      setValue("unitCost", Number(total.toFixed(2)));
    }
  }, [watchedType, watchedSalary, watchedCharges, watchedBenefits, setValue]);

  const createMutation = trpc.catalogItem.create.useMutation({
    onSuccess: () => {
      utils.catalogItem.list.invalidate();
      utils.catalogItem.getFilterOptions.invalidate();
      onOpenChange(false);
      toast.success("Insumo cadastrado com sucesso!");
      onSuccess();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`)
  });

  const updateMutation = trpc.catalogItem.update.useMutation({
    onSuccess: () => {
      utils.catalogItem.list.invalidate();
      utils.catalogItem.getFilterOptions.invalidate();
      onOpenChange(false);
      toast.success("Insumo atualizado com sucesso!");
      onSuccess();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`)
  });

  const deleteMutation = trpc.catalogItem.delete.useMutation({
    onSuccess: () => {
      utils.catalogItem.list.invalidate();
      onOpenChange(false);
      toast.success("Insumo excluído!");
      onSuccess();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`)
  });

  const onSubmit = (data: InsumoFormData) => {
    const payload = {
      ...data,
      unitCost: Number(data.unitCost),
      isActive: activeStatus === "ACTIVE"
    };

    if (item && data.id) {
      updateMutation.mutate({ ...payload, id: data.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDuplicate = () => {
    setValue('id', undefined);
    setValue('code', '');
    toast.info("Insumo duplicado! Altere o código/descrição e salve.");
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este insumo?")) {
      if (item?.id) deleteMutation.mutate(item.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[1200px] w-[95vw] p-0 border-none shadow-2xl overflow-hidden rounded-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col bg-white">
          {/* Header customizado como no print */}
          <div className="bg-[#f8fafc] border-b px-6 py-4 flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-[#1A3C5E] uppercase tracking-tight">
              {item ? "Ficha do Insumo" : "Cadastro de Insumos"}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {item && (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 bg-[#33b5e5] hover:bg-[#2bbbad] text-white border-none shadow-sm"
                    onClick={handleDuplicate}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 bg-[#ff4444] hover:bg-[#cc0000] text-white border-none shadow-sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-[#ffbb33] hover:bg-[#ff8800] text-white border-none shadow-sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Grupo (Principal) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Grupo:</label>
              <Select 
                value={watch("type")} 
                onValueChange={(v: any) => setValue("type", v)}
              >
                <SelectTrigger className="h-10 border-2 border-slate-100 bg-slate-50 font-bold text-xs">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="LABOR">Mão de Obra</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipamento</SelectItem>
                  <SelectItem value="SERVICE">Serviço/Taxa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 2: Código, Descrição, Unidade */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Código: <span className="text-red-500">*</span></label>
                <Input {...register("code")} placeholder="Auto" className="h-10 border-2 border-slate-100 font-bold text-xs" />
              </div>
              <div className="col-span-8 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Descrição: <span className="text-red-500">*</span></label>
                <Input {...register("description", { required: true })} className="h-10 border-2 border-slate-100 font-bold text-xs uppercase" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Unidade: <span className="text-red-500">*</span></label>
                <Controller
                  name="unit"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <UnitSelect 
                      value={field.value} 
                      onChange={field.onChange} 
                      placeholder="Und"
                    />
                  )}
                />
                {errors.unit && <p className="text-[9px] text-red-500">Obrigatório</p>}
              </div>
            </div>

            {/* Linha 3: Tipo, Base, Custo, Status */}
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-3 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo (Categoria):</label>
                <Controller
                  name="typeCategory"
                  control={control}
                  render={({ field }) => (
                    <InsumoCategorySelect value={field.value} onChange={field.onChange} placeholder="Selecione..." />
                  )}
                />
              </div>
              <div className="col-span-3 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Base: <span className="text-red-500">*</span></label>
                <Controller
                  name="base"
                  control={control}
                  render={({ field }) => (
                    <BaseSelect value={field.value} onChange={field.onChange} placeholder="Selecione..." />
                  )}
                />
              </div>
              {watchedType === 'LABOR' ? (
                <>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Salário:</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                      <Input type="number" step="0.01" {...register("salary", { valueAsNumber: true })} className="h-10 pl-8 border-2 border-slate-100 font-bold text-xs" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Encargos (%):</label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                      <Input type="number" step="0.01" {...register("charges", { valueAsNumber: true })} className="h-10 pr-8 border-2 border-slate-100 font-bold text-xs" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Benefícios:</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                      <Input type="number" step="0.01" {...register("benefits", { valueAsNumber: true })} className="h-10 pl-8 border-2 border-slate-100 font-bold text-xs" />
                    </div>
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Total:</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">R$</span>
                      <Input type="number" step="0.01" value={watch("unitCost")} readOnly className="h-10 pl-8 border-2 border-slate-50 bg-slate-50 font-black text-xs text-blue-600 font-mono cursor-not-allowed" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Custo Unitário:</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} className="h-10 pl-8 border-2 border-slate-100 font-bold text-xs" />
                  </div>
                </div>
              )}
              <div className="col-span-3 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Status:</label>
                <Tabs value={activeStatus} onValueChange={v => setActiveStatus(v as any)} className="w-full">
                  <TabsList className="w-full h-10 bg-slate-100 p-1 border-2 border-slate-100">
                    <TabsTrigger value="ACTIVE" className="flex-1 text-[10px] font-black uppercase rounded-sm data-[state=active]:bg-[#33b5e5] data-[state=active]:text-white">Ativo</TabsTrigger>
                    <TabsTrigger value="INACTIVE" className="flex-1 text-[10px] font-black uppercase rounded-sm data-[state=active]:bg-[#33b5e5] data-[state=active]:text-white">Inativo</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Observações:</label>
              <Textarea 
                {...register("observations")} 
                placeholder="Detalhes técnicos, fornecedores sugeridos, etc..." 
                className="min-h-[100px] border-2 border-slate-100 font-bold text-xs focus-visible:ring-blue-400/20"
              />
            </div>
          </div>

          {/* Footer com botões de salvar */}
          <div className="bg-slate-50 px-6 py-6 border-t flex justify-end gap-3">
             {!item && (
               <Button 
                type="button" 
                variant="outline" 
                className="h-11 border-2 border-[#5cb85c] text-[#5cb85c] hover:bg-[#5cb85c] hover:text-white font-black uppercase tracking-wider text-[10px] px-6"
                onClick={handleSubmit((d) => {
                  onSubmit(d);
                  // Manter aberto para novo cadastro se desejar lógica extra
                })}
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Salvar e inserir novo
              </Button>
             )}
            <Button 
              type="submit" 
              className="h-11 bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-black uppercase tracking-wider text-[10px] px-10 shadow-lg gap-2"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
