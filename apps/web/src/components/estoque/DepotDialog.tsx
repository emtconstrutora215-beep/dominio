"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { 
  Building2, 
  MapPin, 
  Plus, 
  Warehouse,
  Loader2
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const depotSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  location: z.string().optional(),
  projectId: z.string().optional(),
});

export function DepotDialog({ 
  onSuccess, 
  editDepot,
  children 
}: { 
  onSuccess?: () => void, 
  editDepot?: any,
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const isEditing = !!editDepot;
  
  const { data: projects, isLoading: isLoadingProjects } = trpc.projects.listProjects.useQuery();

  const form = useForm<z.infer<typeof depotSchema>>({
    resolver: zodResolver(depotSchema),
    defaultValues: {
      name: editDepot?.name || "",
      location: editDepot?.location || "",
      projectId: editDepot?.projectId || "central",
    },
  });

  const createMutation = trpc.stock.createDepot.useMutation({
    onSuccess: () => {
      toast.success("Depósito criado com sucesso!");
      setOpen(false);
      form.reset();
      utils.stock.getDepots.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Erro ao criar depósito: ${err.message}`);
    },
  });

  const updateMutation = trpc.stock.updateDepot.useMutation({
    onSuccess: () => {
      toast.success("Depósito atualizado com sucesso!");
      setOpen(false);
      utils.stock.getDepots.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar depósito: ${err.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof depotSchema>) => {
    const payload = {
      name: data.name,
      location: data.location,
      projectId: (data.projectId && data.projectId !== "central") ? data.projectId : null,
    };

    if (isEditing) {
      updateMutation.mutate({
        id: editDepot.id,
        ...payload
      });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val && editDepot) {
        form.reset({
          name: editDepot.name,
          location: editDepot.location || "",
          projectId: editDepot.projectId || "central",
        });
      }
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button className="h-11 rounded-xl px-6 bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white font-bold gap-2">
            <Plus className="h-4 w-4" />
            Novo Depósito
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        <DialogHeader className="p-8 bg-[#1A3C5E] text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Warehouse className="h-24 w-24" />
          </div>
          <DialogTitle className="text-2xl font-black">
            {isEditing ? "Editar Depósito" : "Novo Depósito"}
          </DialogTitle>
          <DialogDescription className="text-blue-100/70 font-medium">
            {isEditing ? "Atualize as informações do almoxarifado selecionado." : "Configure um novo local de armazenamento para seus materiais."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Nome do Depósito</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Almoxarifado Central" className="h-11 rounded-xl border-slate-200 bg-slate-50/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Localização / Endereço</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Cidade, Bairro ou Endereço" className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Centro de Custo (Empresa ou Obra)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50">
                          <SelectValue placeholder="Selecione o centro de custo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        <SelectItem value="central" className="font-bold text-[#1A3C5E]">🏢 Empresa (Sede / Central)</SelectItem>
                        {projects?.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 opacity-50" />
                              {project.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 flex flex-row gap-4">
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEditing ? "Salvando..." : "Criando..."}
                    </div>
                  ) : (
                    isEditing ? "Salvar Alterações" : "Criar Depósito"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
