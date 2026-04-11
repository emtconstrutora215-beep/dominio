"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { 
  Plus, 
  Package,
  PackageOpen,
  Replace, 
  Search,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  Wrench,
  Truck
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const movementSchema = z.object({
  type: z.enum(['ENTRY', 'EXIT', 'TRANSFER']),
  depotId: z.string().min(1, "Selecione o depósito"),
  toDepotId: z.string().optional(),
  catalogItemId: z.string().min(1, "Selecione o item"),
  quantity: z.number().positive("Quantidade deve ser maior que 0"),
  unitCost: z.number().nonnegative().optional(),
  projectStageId: z.string().optional(),
  notes: z.string().optional(),
  assetIds: z.array(z.string()).optional(),
});

export function StockMovementDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  
  const { data: catalogItems } = trpc.catalogItem.listAll.useQuery();
  const { data: depots } = trpc.stock.getDepots.useQuery();

  const form = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: { 
      type: 'ENTRY', 
      depotId: "", 
      catalogItemId: "", 
      quantity: 1, 
      unitCost: 0, 
      assetIds: [] 
    }
  });

  const selectedType = form.watch("type");
  const selectedCatalogId = form.watch("catalogItemId");
  const selectedDepotId = form.watch("depotId");
  const quantity = form.watch("quantity");

  const catalogItem = catalogItems?.find(i => i.id === selectedCatalogId);
  const isEquipment = catalogItem?.type === 'EQUIPMENT';

  // Fetch available assets if it's a departure (Exit or Transfer) and it's equipment
  const { data: availableAssets } = trpc.stock.getAssets.useQuery(
    { 
      catalogItemId: selectedCatalogId, 
      depotId: selectedDepotId, 
      status: 'AVAILABLE' 
    },
    { enabled: isEquipment && (selectedType === 'EXIT' || selectedType === 'TRANSFER') && !!selectedDepotId }
  );

  const entryMutation = trpc.stock.registerEntry.useMutation({
    onSuccess: () => {
      toast.success("Entrada registrada!");
      setOpen(false);
      form.reset();
      utils.stock.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message)
  });

  const exitMutation = trpc.stock.registerExit.useMutation({
    onSuccess: () => {
      toast.success("Saída/Consumo registrados!");
      setOpen(false);
      form.reset();
      utils.stock.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message)
  });

  const transferMutation = trpc.stock.transferInventory.useMutation({
    onSuccess: () => {
      toast.success("Transferência realizada!");
      setOpen(false);
      form.reset();
      utils.stock.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (data: z.infer<typeof movementSchema>) => {
    if (isEquipment && (data.type === 'EXIT' || data.type === 'TRANSFER')) {
        if (!data.assetIds || data.assetIds.length !== (data.quantity || 0)) {
            toast.error(`Selecione exatamente ${data.quantity} equipamentos registrados.`);
            return;
        }
    }

    if (data.type === 'ENTRY') {
      entryMutation.mutate({
        depotId: data.depotId,
        catalogItemId: data.catalogItemId,
        quantity: data.quantity,
        unitCost: data.unitCost || 0,
        notes: data.notes
      });
    } else if (data.type === 'EXIT') {
      exitMutation.mutate({
        depotId: data.depotId,
        catalogItemId: data.catalogItemId,
        quantity: data.quantity,
        projectStageId: data.projectStageId,
        assetIds: data.assetIds,
        notes: data.notes
      });
    } else if (data.type === 'TRANSFER') {
      if (!data.toDepotId) return toast.error("Selecione o almoxarifado de destino.");
      transferMutation.mutate({
        fromDepotId: data.depotId,
        toDepotId: data.toDepotId,
        catalogItemId: data.catalogItemId,
        quantity: data.quantity,
        assetIds: data.assetIds,
        notes: data.notes
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl px-6 bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white font-bold gap-2">
          <Plus className="h-4 w-4" />
          Nova Movimentação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-[#1A3C5E] p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Package className="h-24 w-24" />
          </div>
          <DialogTitle className="text-2xl font-black">Registrar Movimentação</DialogTitle>
          <DialogDescription className="text-blue-100/70 font-medium">
            Entradas, saídas e transferências de materiais ou equipamentos.
          </DialogDescription>
        </div>

        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tipo de Operação</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ENTRY" className="rounded-lg">
                            <div className="flex items-center gap-2"><PackageOpen className="h-4 w-4 text-emerald-500" /> Entrada</div>
                          </SelectItem>
                          <SelectItem value="EXIT">
                            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-red-500" /> Saída / Consumo</div>
                          </SelectItem>
                          <SelectItem value="TRANSFER">
                            <div className="flex items-center gap-2"><Replace className="h-4 w-4 text-blue-500" /> Transferência</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="catalogItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Item do Catálogo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50">
                            <SelectValue placeholder="Escolha o material..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {catalogItems?.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.description}
                              {item.type === 'EQUIPMENT' && <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-1 rounded font-bold">EQP</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="depotId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        {selectedType === 'ENTRY' ? 'Depósito de Entrada' : 'Depósito de Origem'}
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50">
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {depots?.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === 'TRANSFER' && (
                  <FormField
                    control={form.control}
                    name="toDepotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-[#F07B2B]">Depósito Destino</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-[#F07B2B]/20 bg-orange-50/30">
                              <SelectValue placeholder="Para onde vai?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {depots?.filter(d => d.id !== selectedDepotId).map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {selectedType === 'ENTRY' && (
                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Preço Unitário (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-11 rounded-xl bg-slate-50/50" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11 rounded-xl bg-slate-50/50" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ASSET SELECTION BOX (The user's core request) */}
              {isEquipment && (selectedType === 'EXIT' || selectedType === 'TRANSFER') && selectedDepotId && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Escolha os Equipamentos Específicos</h3>
                    <Badge variant="outline" className="bg-white">{form.watch("assetIds")?.length || 0} de {quantity} selecionados</Badge>
                  </div>
                  
                  {isLoadingAssets ? (
                    <p className="text-xs text-slate-400 italic">Buscando equipamentos no depósito...</p>
                  ) : availableAssets?.length === 0 ? (
                    <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 text-xs">
                      <AlertCircle className="h-4 w-4" />
                      Não há equipamentos deste tipo disponíveis neste depósito.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {availableAssets?.map(asset => (
                        <div key={asset.id} className="flex items-center space-x-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 transition-all">
                          <Checkbox 
                            id={`asset-${asset.id}`} 
                            checked={form.watch("assetIds")?.includes(asset.id)}
                            onCheckedChange={(checked) => {
                              const current = form.getValues("assetIds") || [];
                              if (checked) {
                                if (current.length < quantity) {
                                  form.setValue("assetIds", [...current, asset.id]);
                                } else {
                                  toast.error("Capacidade atingida para a quantidade informada.");
                                }
                              } else {
                                form.setValue("assetIds", current.filter(id => id !== asset.id));
                              }
                            }}
                          />
                          <label htmlFor={`asset-${asset.id}`} className="grid gap-1 current-pointer flex-1">
                            <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              <span className="font-mono text-orange-600">TAG: {asset.tag}</span>
                              {asset.serialNumber && <span className="text-slate-400 font-normal">| SN: {asset.serialNumber}</span>}
                            </p>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">
                    * Seleção individual obrigatória para equipamentos.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Motivo, romaneio, responsável..." className="rounded-xl bg-slate-50/50 min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex-1 h-12 rounded-xl text-slate-400 font-bold"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-12 rounded-xl bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-bold"
                  disabled={entryMutation.isPending}
                >
                  {entryMutation.isPending ? "Processando..." : "Confirmar Movimentação"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
