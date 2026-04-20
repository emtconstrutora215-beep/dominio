"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Percent, Calculator } from "lucide-react";
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

const discountFormSchema = z.object({
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]),
  discountValue: z.number().min(0, "O valor deve ser maior ou igual a zero"),
});

interface ProposalDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: z.infer<typeof discountFormSchema>) => void;
  currentValues: z.infer<typeof discountFormSchema>;
}

export function ProposalDiscountModal({ 
  isOpen, 
  onClose, 
  onSave,
  currentValues 
}: ProposalDiscountModalProps) {
  const form = useForm<z.infer<typeof discountFormSchema>>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: currentValues,
  });

  const onSubmit = (values: z.infer<typeof discountFormSchema>) => {
    onSave(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-white animate-in zoom-in-95 duration-200">
        <DialogHeader className="px-10 pt-10 pb-6 relative bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Percent className="w-6 h-6 text-white" />
             </div>
             <div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Aplicar Desconto</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ajuste o valor final da proposta</p>
             </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-8 top-10 text-slate-400 hover:bg-white rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-10 pb-10 pt-6">
            <div className="grid grid-cols-1 gap-8">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Desconto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-16 bg-white border-2 border-slate-100 rounded-2xl px-6 font-black text-slate-700 focus:border-blue-500 focus:ring-0 transition-all shadow-sm text-lg">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-2 p-2">
                        <SelectItem value="AMOUNT" className="rounded-xl font-bold py-3">Valor Fixo (R$)</SelectItem>
                        <SelectItem value="PERCENTAGE" className="rounded-xl font-bold py-3">Porcentagem (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                       {form.watch("discountType") === "AMOUNT" ? "Valor do Desconto" : "% do Desconto"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                           {form.watch("discountType") === "AMOUNT" ? (
                             <span className="text-xl font-black text-slate-400 tracking-tighter">R$</span>
                           ) : (
                             <Percent className="w-5 h-5 text-slate-400" />
                           )}
                        </div>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0,00"
                          className="h-16 bg-white border-2 border-slate-100 rounded-2xl pl-16 pr-6 font-black text-slate-800 text-2xl focus-visible:ring-1 focus-visible:ring-blue-500 shadow-sm transition-all tracking-tighter"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-2">
               <Button 
                type="submit" 
                className="w-full h-16 bg-[#1A3C5E] hover:bg-blue-900 text-white font-black text-lg rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest shadow-xl shadow-blue-100"
               >
                Confirmar Desconto
               </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
