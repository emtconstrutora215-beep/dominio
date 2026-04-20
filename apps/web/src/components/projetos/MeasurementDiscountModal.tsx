"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const discountFormSchema = z.object({
  type: z.string().min(1, "Selecione o tipo de desconto"),
  value: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  percentage: z.coerce.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

interface MeasurementDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (discount: z.infer<typeof discountFormSchema>) => void;
}

export function MeasurementDiscountModal({ isOpen, onClose, onSave }: MeasurementDiscountModalProps) {
  const form = useForm<z.infer<typeof discountFormSchema>>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      type: "",
      value: 0,
      percentage: 0,
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof discountFormSchema>) => {
    onSave(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-2xl overflow-hidden border-none shadow-2xl bg-white">
        <DialogHeader className="px-8 pt-8 pb-4 relative">
          <DialogTitle className="text-2xl font-black text-slate-700">Inserir desconto</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-6 top-8 text-slate-400 hover:bg-slate-50 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-8 pb-8">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[11px] font-black text-emerald-500 uppercase tracking-widest ml-1">Tipo de desconto</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-14 bg-white border-2 border-slate-100 rounded-xl px-4 font-bold text-slate-600 focus:border-emerald-500 focus:ring-0 transition-all shadow-sm">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl p-1">
                      <SelectItem value="adiantamento" className="rounded-lg font-bold text-slate-600">Adiantamento</SelectItem>
                      <SelectItem value="compra de materiais" className="rounded-lg font-bold text-slate-600">Compra de materiais</SelectItem>
                      <SelectItem value="faturamento direto" className="rounded-lg font-bold text-slate-600">Faturamento direto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="ml-1" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do desconto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0,00"
                          className="h-14 bg-white border border-slate-200 rounded-xl pl-11 pr-4 font-bold text-slate-600 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-sm transition-all"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="ml-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percentage"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">% do Desconto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          placeholder="0"
                          className="h-14 bg-white border border-slate-200 rounded-xl px-4 font-bold text-slate-600 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-sm transition-all"
                          {...field} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                      </div>
                    </FormControl>
                    <FormMessage className="ml-1" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Alguma observação adicional?"
                      className="min-h-[100px] bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-600 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-sm transition-all resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="ml-1" />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#e2e2e2] hover:bg-emerald-500 hover:text-white text-slate-400 font-black text-lg rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest shadow-sm group"
            >
              Salvar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
