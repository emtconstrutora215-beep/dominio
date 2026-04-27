"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { 
  Plus, 
  Warehouse,
  Loader2,
  X,
  ChevronLeft,
  Search,
  ChevronDown
} from "lucide-react";

import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const depotSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  projectId: z.string().optional(),
  managerIds: z.array(z.string()),
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
  
  const { data: projects } = trpc.projects.getAll.useQuery();
  const { data: users } = trpc.company.getUsers.useQuery();

  const form = useForm<z.infer<typeof depotSchema>>({
    resolver: zodResolver(depotSchema) as any,
    defaultValues: {
      name: editDepot?.name || "",
      projectId: editDepot?.projectId || "central",
      managerIds: editDepot?.managerIds || [],
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
      projectId: (data.projectId && data.projectId !== "central") ? data.projectId : null,
      // managerIds: data.managerIds, // Backend update might be needed
    };

    if (isEditing) {
      updateMutation.mutate({
        id: editDepot.id,
        ...payload
      } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const toggleManager = (userId: string) => {
    const current = form.getValues("managerIds");
    if (current.includes(userId)) {
      form.setValue("managerIds", current.filter(id => id !== userId));
    } else {
      form.setValue("managerIds", [...current, userId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="h-9 px-4 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
            <Plus className="h-4 w-4" />
            NOVO DEPÓSITO
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden border-none rounded-none shadow-2xl bg-white">
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left Side: Illustration & Text */}
          <div className="flex-1 bg-[#F8FAFC] p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="mb-8 relative z-10">
              {/* Illustration Placeholder - Using SVG for high fidelity */}
              <div className="w-64 h-48 bg-white rounded-xl shadow-sm flex items-center justify-center p-6 border border-slate-100">
                <div className="relative w-full h-full">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full opacity-50 -mr-16 -mt-16"></div>
                   <Warehouse className="w-full h-full text-blue-100/50" strokeWidth={1} />
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-50 flex flex-col gap-2 w-40">
                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                        <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                        <div className="h-8 w-full bg-blue-50 rounded-lg mt-2"></div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="max-w-xs relative z-10">
              <h2 className="text-3xl font-bold text-[#1A3C5E] mb-4 leading-tight">
                Crie e gerencie seus depósitos de forma rápida e prática
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-2">
                Gerencie insumos de um ou mais depósitos
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Transfira insumos entre depósitos
              </p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-[1.2] p-12">
            <div className="flex items-center gap-4 mb-10">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded border-slate-300" onClick={() => setOpen(false)}>
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {isEditing ? "Editar Depósito" : "Criar Depósito"}
              </DialogTitle>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <SelectTrigger className="h-12 border-slate-300 bg-white text-slate-900 font-bold rounded-none border-x-0 border-t-0 border-b shadow-none px-0 focus:ring-0">
                            <SelectValue placeholder="Centro de Custo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="central" className="font-bold">🏢 Empresa (Sede / Central)</SelectItem>
                            {projects?.map(project => (
                              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Nome do Depósito" 
                          className="h-12 border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 rounded-none border-x-0 border-t-0 border-b shadow-none px-0 focus-visible:ring-0" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerIds"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Permissão para editar</FormLabel>
                      <div className="min-h-[100px] p-3 border border-slate-300 rounded-lg flex flex-wrap gap-2 relative group bg-slate-50/30">
                        {field.value.map(id => {
                          const user = users?.find(u => u.id === id);
                          return (
                            <Badge key={id} variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 flex items-center gap-1.5 font-bold text-[11px] shadow-sm">
                              {user?.name || id}
                              <X className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-red-500" onClick={() => toggleManager(id)} />
                            </Badge>
                          );
                        })}
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex-1 min-w-[120px] flex items-center justify-between cursor-pointer px-1">
                               <span className="text-xs text-slate-400 font-medium italic">Digite para buscar usuários...</span>
                               <ChevronDown className="h-4 w-4 text-slate-600" />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <div className="p-2 border-b bg-slate-50">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <Input className="h-9 pl-8 text-xs border-slate-200 bg-white focus-visible:ring-1" placeholder="Buscar usuário..." />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-1">
                              {users?.map(user => (
                                <div 
                                  key={user.id} 
                                  className={cn(
                                    "px-3 py-2.5 text-xs rounded-md cursor-pointer hover:bg-slate-100 flex items-center justify-between transition-colors",
                                    field.value.includes(user.id) ? "bg-blue-50 text-[#1A3C5E] font-black" : "text-slate-600"
                                  )}
                                  onClick={() => toggleManager(user.id)}
                                >
                                  {user.name}
                                  {field.value.includes(user.id) && <div className="h-1.5 w-1.5 rounded-full bg-[#1A3C5E]" />}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-56 h-11 bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white font-black text-[11px] uppercase tracking-widest rounded-lg shadow-lg shadow-blue-900/10 transition-all active:scale-95"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR DEPÓSITO"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
