"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { ArrowRightLeft, Warehouse } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const transferSchema = z.object({
  fromDepotId: z.string().min(1, "Selecione a origem"),
  toDepotId: z.string().min(1, "Selecione o destino"),
  material: z.string().min(1, "Selecione o material para transferir"),
  quantity: z.number().positive("A quantidade deve ser maior que 0"),
}).refine(data => data.fromDepotId !== data.toDepotId, {
  message: "O almoxarifado de destino não pode ser o mesmo da origem",
  path: ["toDepotId"]
});

export default function StockTransfersPage() {
  const utils = trpc.useUtils();
  
  const { data: depots } = trpc.stock.getDepots.useQuery();

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { fromDepotId: "", toDepotId: "", material: "", quantity: 0 }
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedFrom = form.watch("fromDepotId");

  const { data: sourceBalances } = trpc.stock.getBalancesByDepot.useQuery(
    { depotId: selectedFrom },
    { enabled: !!selectedFrom }
  );

  const transferMutation = trpc.stock.transferStock.useMutation({
    onSuccess: () => {
      toast.success("Transferência realizada com sucesso!");
      utils.stock.getBalancesByDepot.invalidate();
      form.reset({
        fromDepotId: form.getValues('fromDepotId'),
        toDepotId: form.getValues('toDepotId'),
        material: "",
        quantity: 0
      });
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (data: z.infer<typeof transferSchema>) => transferMutation.mutate(data);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Transferência entre Almoxarifados</h1>
        <p className="text-slate-500 mt-1">
          Mova materiais do Almoxarifado Central para as Obras, re-calculando custos automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
           <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-primary" /> Nova Transferência</CardTitle>
           <CardDescription>O histórico e o Custo Médio Ponderado (CMP) são preservados durante a movimentação.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6 p-4 rounded-lg bg-orange-50 border border-orange-100">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-900 font-semibold border-b border-orange-200 pb-2">
                    <Warehouse className="w-4 h-4"/> Almoxarifado de Origem
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="fromDepotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                            <option value="" disabled>Retirar do almoxarifado...</option>
                            {(depots as any[] | undefined)?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedFrom && (
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-900">Material disponível na Origem</FormLabel>
                          <FormControl>
                            <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                              <option value="" disabled>Selecione um item com saldo...</option>
                              {sourceBalances?.filter(b => b.quantity > 0).map(b => (
                                <option key={b.id} value={b.material}>{b.material} (Saldo Disponível: {b.quantity} {b.unit})</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                          {sourceBalances?.filter(b => b.quantity > 0).length === 0 && (
                            <FormDescription className="text-red-500">Estoque zerado neste local.</FormDescription>
                          )}
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-900 font-semibold border-b border-orange-200 pb-2">
                    <ArrowRightLeft className="w-4 h-4"/> Almoxarifado de Destino
                  </div>

                  <FormField
                    control={form.control}
                    name="toDepotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                            <option value="" disabled>Enviar para o almoxarifado...</option>
                            {(depots as any[] | undefined)?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedFrom && (
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-900">Quantidade a Enviar</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.01" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <Button type="submit" size="lg" disabled={transferMutation.isPending}>
                   {transferMutation.isPending ? "Transferindo..." : "Confirmar Transferência"}
                 </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
