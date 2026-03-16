"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

const configSchema = z.object({
  approvalThreshold: z.number().min(0, "O valor não pode ser negativo"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function ConfigPage() {
  const { data: config, isLoading } = trpc.company.getConfig.useQuery();
  
  const utils = trpc.useUtils();
  const updateMutation = trpc.company.updateThreshold.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso!");
      utils.company.getConfig.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar configurações");
    }
  });

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      approvalThreshold: 5000,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        approvalThreshold: config.approvalThreshold
      });
    }
  }, [config, form]);

  function onSubmit(data: ConfigFormValues) {
    updateMutation.mutate({ threshold: data.approvalThreshold });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-slate-500">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações da Empresa</h1>
        <p className="text-slate-500 mt-2">
          Gerencie os parâmetros globais e limites de aprovação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Parâmetros de Compras
          </CardTitle>
          <CardDescription>
            Configure as regras de alçada para aprovação de solicitações e ordens de compra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="approvalThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Aprovação do Engenheiro (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value))} 
                        className="max-w-md"
                      />
                    </FormControl>
                    <FormDescription>
                      Valores de ordens de compra até este limite podem ser aprovados por Engenheiros. Valores superiores exigem aprovação de um Administrador. Apenas usuários `ADMIN` podem reconfigurar esta chave.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
