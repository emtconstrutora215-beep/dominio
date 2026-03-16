"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Send, Building2, UserCircle } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";

const exitSchema = z.object({
  depotId: z.string().min(1, "Selecione o almoxarifado"),
  material: z.string().min(1, "Selecione o material"),
  quantity: z.number().positive("A quantidade deve ser maior que 0"),
  projectId: z.string().min(1, "Selecione a obra de destino"),
  projectStageId: z.string().min(1, "Selecione a etapa de consumo"),
  notes: z.string().optional() // Optional annotation (e.g., worker name)
});

export default function StockExitsPage() {
  const utils = trpc.useUtils();
  
  const { data: depots } = trpc.stock.getDepots.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();

  const form = useForm<z.infer<typeof exitSchema>>({
    resolver: zodResolver(exitSchema),
    defaultValues: { depotId: "", material: "", quantity: 0, projectId: "", projectStageId: "", notes: "" }
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedDepot = form.watch("depotId");
  const selectedProject = form.watch("projectId");

  const { data: balances } = trpc.stock.getBalancesByDepot.useQuery(
    { depotId: selectedDepot },
    { enabled: !!selectedDepot }
  );

  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: selectedProject },
    { enabled: !!selectedProject }
  );

  const exitMutation = trpc.stock.registerExit.useMutation({
    onSuccess: () => {
      toast.success("Saída de material e custo registrados com sucesso na etapa!");
      utils.stock.getBalancesByDepot.invalidate();
      form.reset({
         depotId: form.getValues('depotId'),
         projectId: form.getValues('projectId'),
         projectStageId: form.getValues('projectStageId'),
         material: "",
         quantity: 0,
         notes: ""
      });
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (data: z.infer<typeof exitSchema>) => exitMutation.mutate(data);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Consumo e Saídas (Apropriação)</h1>
        <p className="text-slate-500 mt-1">Registre a saída de materiais e envie os custos dinâmicos (CMP) direto para as etapas da Obra.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary"/> Nova Solicitação de Saída</CardTitle>
          <CardDescription>O Custo Médio Ponderado no momento da saída será incorporado como Conta Realizada na etapa destino.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6 p-4 rounded-lg bg-slate-50 border">
                {/* SOURCE DEPOT */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold border-b pb-2">
                    <Building2 className="w-4 h-4"/> Origem (Almoxarifado)
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="depotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local</FormLabel>
                        <FormControl>
                          <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                            <option value="" disabled>Selecione um almox...</option>
                            {(depots as any[] | undefined)?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedDepot && (
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material a retirar</FormLabel>
                          <FormControl>
                            <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                              <option value="" disabled>Selecione o material disponível...</option>
                              {(balances as any[] | undefined)?.filter((b: any) => b.quantity > 0).map((b: any) => (
                                <option key={b.id} value={b.material}>{b.material} (Saldo: {b.quantity} {b.unit})</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                          {(balances as any[] | undefined)?.filter((b: any) => b.quantity > 0).length === 0 && (
                            <FormDescription className="text-red-500">Nenhum estoque disponível.</FormDescription>
                          )}
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedDepot && (
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Saída</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.01" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* DESTINATION STAGE */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold border-b pb-2">
                    <UserCircle className="w-4 h-4"/> Destino (Apropriação)
                  </div>

                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obra Consumidora</FormLabel>
                        <FormControl>
                          <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                            <option value="" disabled>Para qual obra?</option>
                            {(projects as any[] | undefined)?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedProject && (
                    <FormField
                      control={form.control}
                      name="projectStageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Etapa/Fase Destino</FormLabel>
                          <FormControl>
                            <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" {...field}>
                              <option value="" disabled>Selecione a etapa para custear...</option>
                              {(projectDetails?.stages as any[] | undefined)?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações de Retirada (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Retirado por João (Empreiteiro Gesso)" {...field} />
                        </FormControl>
                        <FormDescription>Anotação para fins de auditoria não-contábil.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={exitMutation.isPending}>
                 {exitMutation.isPending ? "Processando..." : "Confirmar Saída e Transferir Custos"} 
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {/* 
        This approach satisfies your P1 & P2: 
        1. It lets people choose the Stage to absorb the material costs, executing the backend CMP engine
        2. Leaves Notes field as completely optional
      */}
    </div>
  );
}
