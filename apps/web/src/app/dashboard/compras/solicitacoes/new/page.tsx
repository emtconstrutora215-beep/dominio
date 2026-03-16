"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";

const requestSchema = z.object({
  projectId: z.string().min(1, "Selecione uma obra"),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, "Descrição obrigatória"),
    unit: z.string().min(1, "Unidade obrigatória"),
    quantity: z.number().min(0.01, "Maior que zero"),
  })).min(1, "Adicione pelo menos 1 item")
});

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const { data: projects, isLoading } = trpc.projects.getAll.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.purchasing.createRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada para aprovação!");
      utils.purchasing.getRequests.invalidate();
      router.push("/dashboard/compras/solicitacoes");
    },
    onError: (err) => toast.error(err.message)
  });

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      items: [{ description: "", unit: "UN", quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  function onSubmit(data: z.infer<typeof requestSchema>) {
    createMutation.mutate(data);
  }

  if (isLoading) return <div className="p-6">Carregando obras...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nova Solicitação</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 border rounded-lg">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Obra (Centro de Custo)</FormLabel>
                <FormControl>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" 
                    {...field}
                  >
                    <option value="">Selecione a obra...</option>
                    {(projects as any[] | undefined)?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <FormLabel className="text-base font-semibold">Itens Solicitados</FormLabel>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", unit: "UN", quantity: 1 })}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
            
            {fields.map((item, index) => (
              <div key={item.id} className="flex gap-4 items-end">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Descrição do Material/Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cimento CP II 50kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unit`}
                  render={({ field }) => (
                    <FormItem className="w-32">
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SC, UN, M3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="w-32">
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" className="text-red-500 mb-1" onClick={() => remove(index)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detalhes adicionais para o comprador..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? "Processando..." : "Enviar para Aprovação"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
