"use client";

import { useState } from "react";
import { 
  FileText, 
  Calendar, 
  User, 
  CreditCard, 
  Percent, 
  Save, 
  Settings, 
  Printer,
  Clock,
  LayoutList,
  Calculator
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import { ProposalDiscountModal } from "./ProposalDiscountModal";
import { ProposalPDF } from "./ProposalPDF";

interface ProposalTabProps {
  project: any;
  totals: { subtotal: number; total: number };
  onUpdate: (data: any) => void;
}

export function ProposalTab({ project, totals, onUpdate }: ProposalTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    proposalStatus: project?.proposalStatus || "UNDER_ELABORATION",
    proposalDeliveryDate: project?.proposalDeliveryDate ? new Date(project.proposalDeliveryDate) : null,
    proposalSaleDate: project?.proposalSaleDate ? new Date(project.proposalSaleDate) : null,
    technicalLeadId: project?.technicalLeadId || "",
    paymentCondition: project?.paymentCondition || "a_negociar",
    measurementPeriod: project?.measurementPeriod || "",
    installmentCount: project?.installmentCount || 1,
    downPaymentValue: project?.downPaymentValue || 0,
    discountValue: project?.discountValue || 0,
    discountType: project?.discountType || "AMOUNT",
  });

  const { data: options } = trpc.projects.formOptions.useQuery();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        ...formData,
        installmentCount: Number(formData.installmentCount),
        downPaymentValue: Number(formData.downPaymentValue),
        discountValue: Number(formData.discountValue),
      });
      toast.success("Dados da proposta salvos!");
    } catch (err) {
      toast.error("Erro ao salvar dados da proposta");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDiscountedPrice = () => {
    const baseTotal = totals.total;
    if (formData.discountType === "PERCENTAGE") {
      return baseTotal * (1 - (formData.discountValue || 0) / 100);
    }
    return Math.max(0, baseTotal - (formData.discountValue || 0));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 print:hidden">
        <Card className="rounded-3xl shadow-xl shadow-slate-200/50 border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-widest">Dados da Proposta</CardTitle>
                <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Parâmetros comerciais e prazos</p>
              </div>
            </div>
            <div className="flex gap-2">
               <Button 
                variant="outline" 
                className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 text-slate-500 hover:bg-slate-100"
                onClick={() => toast.info("Configurações da Proposta em breve")}
               >
                  <Settings className="w-4 h-4 mr-2" /> Configurar
               </Button>
               <Button 
                  className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#1A3C5E] text-white hover:bg-blue-900 shadow-lg"
                  onClick={() => window.print()}
               >
                  <Printer className="w-4 h-4 mr-2" /> Gerar Proposta
               </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {/* Status */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-blue-500" /> Status da Proposta
                </Label>
                <Select 
                  value={formData.proposalStatus} 
                  onValueChange={(val: any) => setFormData({...formData, proposalStatus: val})}
                >
                  <SelectTrigger className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-[#1A3C5E] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    <SelectItem value="UNDER_ELABORATION" className="font-bold">Em Elaboração</SelectItem>
                    <SelectItem value="INITIAL_CONTACT" className="font-bold">Contato Inicial</SelectItem>
                    <SelectItem value="SENT_TO_COMMERCIAL" className="font-bold">Entregue ao Comercial</SelectItem>
                    <SelectItem value="UNDER_REVISION" className="font-bold">Em Revisão</SelectItem>
                    <SelectItem value="SENT_TO_CLIENT" className="font-bold">Entregue ao Cliente</SelectItem>
                    <SelectItem value="SOLD" className="font-bold">Venda</SelectItem>
                    <SelectItem value="LOST" className="font-bold">Perdido</SelectItem>
                    <SelectItem value="DISCONTINUED" className="font-bold">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Criacao */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-emerald-500" /> Data de Criação
                </Label>
                <div className="h-12 flex items-center px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl font-black text-xs text-slate-500">
                  {format(new Date(project.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>

              {/* Data Entrega */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-orange-500" /> Data de Entrega
                </Label>
                <Input 
                  type="date"
                  className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-[#1A3C5E]"
                  value={formData.proposalDeliveryDate ? format(formData.proposalDeliveryDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setFormData({...formData, proposalDeliveryDate: e.target.value ? new Date(e.target.value) : null})}
                />
              </div>

               {/* Data Venda */}
               <div className="space-y-2.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-blue-500" /> Data de Venda
                </Label>
                <Input 
                  type="date"
                  className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-[#1A3C5E]"
                  value={formData.proposalSaleDate ? format(formData.proposalSaleDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setFormData({...formData, proposalSaleDate: e.target.value ? new Date(e.target.value) : null})}
                />
              </div>

              {/* Responsável */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-purple-500" /> Responsável
                </Label>
                <Select 
                  value={formData.technicalLeadId} 
                  onValueChange={(val) => setFormData({...formData, technicalLeadId: val})}
                >
                  <SelectTrigger className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-[#1A3C5E] bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    {options?.users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id} className="font-bold">{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Payment Section */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Condição de Pagamento */}
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 text-emerald-500" /> Condição de Pagamento
                    </Label>
                    <Select 
                      value={formData.paymentCondition} 
                      onValueChange={(val) => setFormData({...formData, paymentCondition: val})}
                    >
                      <SelectTrigger className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-emerald-500 bg-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        <SelectItem value="a_negociar" className="font-bold">A negociar</SelectItem>
                        <SelectItem value="medicao" className="font-bold">Medição</SelectItem>
                        <SelectItem value="parcelado" className="font-bold">Parcelado</SelectItem>
                        <SelectItem value="a_vista" className="font-bold">À vista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Field: Medição */}
                  {formData.paymentCondition === "medicao" && (
                    <div className="space-y-2.5 animate-in slide-in-from-left-2 duration-300">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-orange-500" /> Período da Medição
                      </Label>
                      <Select 
                        value={formData.measurementPeriod} 
                        onValueChange={(val) => setFormData({...formData, measurementPeriod: val})}
                      >
                        <SelectTrigger className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-orange-500 bg-white">
                          <SelectValue placeholder="Selecione período..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                          <SelectItem value="semanal" className="font-bold">Semanal</SelectItem>
                          <SelectItem value="quinzenal" className="font-bold">Quinzenal</SelectItem>
                          <SelectItem value="mensal" className="font-bold">Mensal</SelectItem>
                          <SelectItem value="a_definir" className="font-bold">A definir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Conditional Fields: Parcelado */}
                  {formData.paymentCondition === "parcelado" && (
                    <>
                      <div className="space-y-2.5 animate-in slide-in-from-left-2 duration-300">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <LayoutList className="w-3 h-3 text-blue-500" /> Qtd de Parcelas
                        </Label>
                        <Input 
                          type="number"
                          min={1}
                          className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-blue-500"
                          value={formData.installmentCount}
                          onChange={(e) => setFormData({...formData, installmentCount: parseInt(e.target.value) || 1})}
                        />
                      </div>
                      <div className="space-y-2.5 animate-in slide-in-from-left-2 duration-300">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Calculator className="w-3 h-3 text-emerald-500" /> Valor da Entrada
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-black">R$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-12 font-black border-2 border-slate-100 rounded-xl focus:ring-emerald-500 pl-10"
                            value={formData.downPaymentValue}
                            onChange={(e) => setFormData({...formData, downPaymentValue: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-slate-50 rounded-[2rem] p-8 flex flex-col justify-center gap-8 border-2 border-slate-100">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-center md:text-left">Preço total com desconto:</span>
                      <div className="h-16 px-8 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center md:justify-start shadow-sm">
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">
                          {formatCurrency(calculateDiscountedPrice())}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost"
                      className="h-16 px-8 rounded-2xl bg-white border-2 border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 flex items-center gap-3"
                      onClick={() => setIsDiscountModalOpen(true)}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Percent className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest">Aplicar Desconto</span>
                    </Button>
                  </div>
              </div>
            </div>
          </CardContent>

          <div className="bg-slate-50 border-t p-6 flex justify-end gap-3">
             <Button 
              className="h-12 px-10 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200/50 transition-all active:scale-95"
              onClick={handleSave}
              disabled={isSaving}
             >
                {isSaving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
             </Button>
          </div>
        </Card>

        {/* Modal do Desconto */}
        <ProposalDiscountModal 
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          currentValues={{
            discountType: formData.discountType as any,
            discountValue: formData.discountValue
          }}
          onSave={(data) => setFormData({...formData, ...data})}
        />
      </div>

      {/* Template do PDF - Visível apenas no Print */}
      <div className="hidden print:block bg-white min-h-screen">
        <ProposalPDF 
           project={{...project, ...formData}} 
           totals={totals}
        />
      </div>
    </>
  );
}
