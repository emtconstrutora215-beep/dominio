"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Info, 
  ChevronDown,
  AlertCircle,
  Thermometer
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { ProjectSelector } from "./ProjectSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formSchema = z.object({
  projectId: z.string().min(1, "Selecione um centro de custo"),
  title: z.string().min(1, "O título é obrigatório"),
  requiredDate: z.string().min(1, "A data é obrigatória"),
  isUrgent: z.boolean(),
});

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
}

export function NewRequestModal({ isOpen, onClose, projects }: NewRequestModalProps) {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      title: "",
      requiredDate: "",
      isUrgent: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Navigate to the full form with pre-filled data
    const params = new URLSearchParams({
      projectId: values.projectId,
      title: values.title,
      requiredDate: values.requiredDate,
      isUrgent: values.isUrgent.toString(),
    });
    
    router.push(`/dashboard/compras/solicitacoes/new?${params.toString()}`);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-8 bg-white rounded-lg border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-3xl font-bold text-[#2079D2] tracking-tight">
            Nova Solicitação
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <FormLabel className="text-base font-medium text-slate-500">
                      Selecione um centro de custo <span className="text-rose-500">*</span>
                    </FormLabel>
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  <FormControl>
                    <ProjectSelector
                      projects={projects}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-base font-medium text-slate-500">Descrição da solicitação</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Materiais brutos" 
                      className="h-10 bg-white border-slate-300 rounded-sm px-3 text-sm text-slate-600 focus-visible:ring-0 focus-visible:border-slate-400"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiredDate"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-base font-medium text-slate-500">Espera receber os itens quando?</FormLabel>
                  <FormControl>
                    <div className="flex bg-white border border-slate-300 rounded-sm overflow-hidden h-10 group focus-within:border-slate-400">
                      <Input 
                        type="date"
                        className="flex-1 border-none h-full px-3 text-sm text-slate-600 focus-visible:ring-0"
                        {...field} 
                      />
                      <div className="bg-slate-50 border-l border-slate-300 px-3 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                        <CalendarIcon className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isUrgent"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-base font-medium text-slate-500">Prioridade</FormLabel>
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex bg-white border border-slate-300 rounded-sm overflow-hidden h-10 cursor-pointer select-none"
                      onClick={() => field.onChange(!field.value)}
                    >
                      <div className={`px-4 h-full flex items-center justify-center text-sm transition-colors ${!field.value ? "bg-slate-100 text-slate-600" : "bg-white text-slate-400"}`}>
                        Não
                      </div>
                      <div className={`px-4 h-full flex items-center justify-center text-sm transition-colors ${field.value ? "bg-rose-100 text-rose-600 font-medium" : "bg-white text-slate-400"}`}>
                        Sim
                      </div>
                    </div>
                    <Thermometer className={`w-4 h-4 ${field.value ? "text-rose-500" : "text-slate-400"}`} />
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 pt-4">
              <Button 
                type="submit" 
                className="bg-[#92D193] hover:bg-[#82bd83] text-white font-medium px-8 h-10 rounded-sm shadow-none"
              >
                Começar
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-300 text-slate-600 font-medium px-8 h-10 rounded-sm hover:bg-slate-50"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
