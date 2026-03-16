"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Plus, Warehouse, Building2, Locate } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const depotSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  location: z.string().optional(),
  projectId: z.string().optional(),
});

export default function DepotsPage() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  
  const { data: depots, isLoading } = trpc.stock.getDepots.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();

  const createMutation = trpc.stock.createDepot.useMutation({
    onSuccess: () => {
      toast.success("Almoxarifado criado com sucesso!");
      utils.stock.getDepots.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(err.message)
  });

  const form = useForm<z.infer<typeof depotSchema>>({
    resolver: zodResolver(depotSchema),
    defaultValues: { name: "", location: "", projectId: "" }
  });

  const onSubmit = (data: z.infer<typeof depotSchema>) => createMutation.mutate(data);

  if (isLoading) return <div className="p-6">Carregando almoxarifados...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Almoxarifados</h1>
          <p className="text-slate-500 mt-1">Gerencie os locais de armazenamento da empresa e das obras.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Novo Almoxarifado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Almoxarifado</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Identificador</FormLabel>
                      <FormControl><Input placeholder="Ex: Almoxarifado Central" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ex: Galpão A - Prateleira 2" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obra Vinculada (Opcional)</FormLabel>
                      <FormControl>
                        <select className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" {...field}>
                          <option value="">Nenhuma (Almoxarifado Central da Empresa)</option>
                          {(projects as any[] | undefined)?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Salvando..." : "Criar Almoxarifado"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(depots as any[] | undefined)?.map((depot: any) => (
          <Card key={depot.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${depot.projectId ? 'bg-orange-500' : 'bg-blue-600'}`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-slate-500" />
                  <CardTitle className="text-xl">{depot.name}</CardTitle>
                </div>
                <Badge variant={depot.projectId ? "secondary" : "default"}>
                  {depot.projectId ? "Obra" : "Central"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2 mt-2">
                {depot.project && (
                  <div className="flex items-center text-slate-600">
                    <Building2 className="w-4 h-4 mr-2" /> {depot.project.name}
                  </div>
                )}
                {depot.location && (
                  <div className="flex items-center text-slate-600">
                    <Locate className="w-4 h-4 mr-2" /> {depot.location}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-slate-500">Saldo Ativo: </span>
                  <span className="font-semibold text-slate-900">{depot._count.stockItems} item(s)</span>
                </div>
                <div className="text-xs text-slate-400">
                  Criado {format(new Date(depot.createdAt), 'dd/MM/yy', { locale: ptBR })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {depots?.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed rounded-lg">
            Nenhum almoxarifado cadastrado. Crie o primeiro Almoxarifado Central ou vincule um a uma Obra.
          </div>
        )}
      </div>
    </div>
  );
}
