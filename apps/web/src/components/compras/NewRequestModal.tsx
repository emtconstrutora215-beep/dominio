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
  AlertCircle
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
      <DialogContent className="sm:max-w-[600px] p-10 rounded-[2rem] border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-[28px] font-extrabold text-[#1A73E8] tracking-tight">
            Nova Solicitação
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-[15px] font-bold text-slate-600">
                      Selecione um centro de custo <span className="text-rose-500">*</span>
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="bg-slate-100 p-1 rounded-full cursor-help">
                            <Info className="w-3 h-3 text-slate-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Escolha a obra para a qual os itens serão destinados.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                <FormItem className="space-y-3">
                  <FormLabel className="text-[15px] font-bold text-slate-600">Título da solicitação</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Materiais brutos" 
                      className="h-14 bg-white border-slate-200 rounded-xl px-4 font-medium text-slate-600 shadow-sm focus-visible:ring-[#1A73E8]/20 focus-visible:border-[#1A73E8]"
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
                <FormItem className="space-y-3">
                  <FormLabel className="text-[15px] font-bold text-slate-600">Espera receber os itens quando?</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="date"
                        className="h-14 bg-white border-slate-200 rounded-xl px-4 font-medium text-slate-600 shadow-sm focus-visible:ring-[#1A73E8]/20 focus-visible:border-[#1A73E8] appearance-none"
                        {...field} 
                      />
                      <CalendarIcon 
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A3C5E] cursor-pointer pointer-events-auto" 
                        onClick={(e) => {
                          const container = e.currentTarget.parentElement;
                          const input = container?.querySelector('input');
                          if (input && 'showPicker' in input) {
                            (input as any).showPicker();
                          }
                        }}
                      />
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
                <FormItem className="space-y-4">
                  <FormLabel className="text-[15px] font-bold text-slate-600">Prioridade</FormLabel>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-0 border border-slate-200 rounded-lg overflow-hidden h-12 shadow-sm">
                      <div className={`px-4 h-full flex items-center justify-center text-xs font-bold transition-colors ${!field.value ? "bg-slate-50 text-slate-400" : "bg-white text-slate-300"}`}>
                        Não
                      </div>
                      <FormControl>
                        <div className="px-2 bg-slate-50 h-full flex items-center">
                           <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-rose-500"
                          />
                        </div>
                      </FormControl>
                      <div className={`px-4 h-full flex items-center justify-center text-xs font-bold transition-colors ${field.value ? "bg-rose-50 text-rose-600" : "bg-white text-slate-300"}`}>
                        Urgente
                      </div>
                    </div>
                    <AlertCircle className={`w-5 h-5 ${field.value ? "text-rose-500 animate-pulse" : "text-slate-300"}`} />
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-row justify-start gap-4 pt-4">
              <Button 
                type="submit" 
                className="bg-[#A1D99B] hover:bg-[#8fc988] text-white font-extrabold px-12 h-14 rounded-xl text-lg transition-all active:scale-95 shadow-lg shadow-emerald-100/50"
              >
                Começar
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-200 text-slate-500 font-bold px-12 h-14 rounded-xl text-lg hover:bg-slate-50"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
