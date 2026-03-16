"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  address: z.string().min(5, "O endereço deve ter pelo menos 5 caracteres").optional().or(z.literal("")),
  budget: z.coerce.number().min(0, "O orçamento não pode ser negativo"),
});

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      budget: 0,
    },
  });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Obra criada com sucesso!");
      utils.projects.getAll.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Erro ao criar obra: ${error.message}`);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createProject.mutate({
      name: values.name,
      address: values.address || undefined,
      budget: values.budget,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-secondary hover:bg-secondary/90 text-white rounded-none font-bold px-6 shadow-lg shadow-secondary/20 transition-all active:scale-95">
          <Plus className="mr-2 h-5 w-5" /> NOVA OBRA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-none border-2 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Cadastrar Nova Obra</DialogTitle>
          <DialogDescription className="text-xs uppercase font-medium tracking-wider text-slate-500">
            Preencha os dados básicos para iniciar o acompanhamento da obra.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-700">Nome da Obra</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Residencial Safira" {...field} className="rounded-none border-2 focus-visible:ring-secondary" />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-700">Endereço (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua das Flores, 123" {...field} className="rounded-none border-2 focus-visible:ring-secondary" />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-700">Orçamento Previsto (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as any} className="rounded-none border-2 focus-visible:ring-secondary" />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold" />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6">
              <Button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-none font-black h-12 uppercase tracking-widest"
                disabled={createProject.isPending}
              >
                {createProject.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    SALVANDO...
                  </>
                ) : (
                  "CRIAR OBRA"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
