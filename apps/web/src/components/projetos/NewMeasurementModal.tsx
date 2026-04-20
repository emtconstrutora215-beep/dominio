"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Calendar as CalendarIcon, 
  Info
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
import { ProjectSelector } from "./ProjectSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formSchema = z.object({
  projectId: z.string().min(1, "Selecione uma obra"),
  title: z.string().min(1, "O título é obrigatório"),
  date: z.string().min(1, "A data da medição é obrigatória"),
});

interface NewMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
}

export function NewMeasurementModal({ isOpen, onClose, projects }: NewMeasurementModalProps) {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      title: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const params = new URLSearchParams({
      projectId: values.projectId,
      title: values.title,
      date: values.date,
    });
    
    router.push(`/dashboard/obras/medicao/nova?${params.toString()}`);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-8 rounded-[2rem] border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300 bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[26px] font-extrabold text-[#1A73E8] tracking-tight">
            Nova Medição
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-[14px] font-bold text-slate-600 ml-1">
                      Selecione a obra <span className="text-rose-500">*</span>
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="bg-slate-50 p-1 rounded-full cursor-help">
                            <Info className="w-3 h-3 text-slate-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Escolha a obra para a qual deseja realizar a medição.
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
                  <FormMessage className="ml-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-[14px] font-bold text-slate-600 ml-1">Título da medição <span className="text-rose-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Medição Quinzenal - Outubro" 
                      className="h-14 bg-white border-slate-200 rounded-xl px-4 font-medium text-slate-600 shadow-sm focus-visible:ring-[#1A73E8]/20 focus-visible:border-[#1A73E8]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="ml-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-[14px] font-bold text-slate-600 ml-1">Data da medição <span className="text-rose-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="date"
                        className="h-14 bg-white border-slate-200 rounded-xl px-4 font-medium text-slate-600 shadow-sm focus-visible:ring-[#1A73E8]/20 focus-visible:border-[#1A73E8] appearance-none"
                        {...field} 
                      />
                      <CalendarIcon 
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A73E8] cursor-pointer pointer-events-auto" 
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
                  <FormMessage className="ml-1" />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-row justify-start gap-3 pt-4">
              <Button 
                type="submit" 
                className="bg-[#A1D99B] hover:bg-[#8fc988] text-white font-extrabold px-10 h-14 rounded-xl text-lg transition-all active:scale-95 shadow-lg shadow-emerald-100/50"
              >
                Começar
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-200 text-slate-400 font-bold px-10 h-14 rounded-xl text-lg hover:bg-slate-50 transition-colors"
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
