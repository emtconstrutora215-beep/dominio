"use client";

import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calculator } from "lucide-react";

interface ProposalPDFProps {
  project: any;
  totals: { subtotal: number; total: number };
}

export const ProposalPDF = React.forwardRef<HTMLDivElement, ProposalPDFProps>(({ project, totals }, ref) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const calculateDiscountedPrice = () => {
    const baseTotal = totals.total;
    if (project.discountType === "PERCENTAGE") {
      return baseTotal * (1 - (project.discountValue || 0) / 100);
    }
    return Math.max(0, baseTotal - (project.discountValue || 0));
  };

  const getPaymentConditionText = () => {
    switch (project.paymentCondition) {
      case "medicao": 
        return `Medição (${project.measurementPeriod || 'A definir'})`;
      case "parcelado": 
        return `Parcelado em ${project.installmentCount || 1}x (Entrada de ${formatCurrency(project.downPaymentValue || 0)})`;
      case "a_vista": 
        return "À vista";
      case "a_negociar": 
        return "A negociar";
      default: 
        return "A negociar";
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-block, .print-block * {
            visibility: visible;
          }
          .print-block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}} />
      <div 
        className="p-16 flex flex-col font-sans leading-relaxed print-block"
      style={{ 
        boxSizing: 'border-box', 
        minHeight: '297mm', 
        width: '210mm', 
        backgroundColor: '#ffffff', 
        color: '#1e293b' 
      }}
    >
      {/* Header */}
      <div 
        className="flex justify-between items-start pb-8 mb-10"
        style={{ borderBottom: '4px solid #1A3C5E' }}
      >
        <div>
           <h1 className="text-4xl font-black tracking-tighter uppercase mb-1" style={{ color: '#1A3C5E' }}>PROPOSTA COMERCIAL</h1>
           <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Controle de Obra & Engenharia</p>
        </div>
        <div className="text-right">
           <div className="text-xl font-black mb-1" style={{ color: '#1e293b' }}>{project.code || 'PRP-000'}</div>
           <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
              Emitido em: {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
           </div>
        </div>
      </div>

      {/* Identificação Section */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-4">
           <h3 className="text-[11px] font-black uppercase tracking-widest pb-2" style={{ color: '#2563eb', borderBottom: '1px solid #dbeafe' }}>DADOS DO CLIENTE</h3>
           <div className="space-y-1">
              <p className="text-lg font-black" style={{ color: '#1e293b' }}>{project.client?.name || 'Cliente Final'}</p>
              <p className="text-xs font-bold" style={{ color: '#64748b' }}>{project.client?.document || 'Documento não informado'}</p>
              <p className="text-xs font-medium" style={{ color: '#64748b' }}>{project.client?.email || ''}</p>
           </div>
        </div>
        <div className="space-y-4">
           <h3 className="text-[11px] font-black uppercase tracking-widest pb-2" style={{ color: '#2563eb', borderBottom: '1px solid #dbeafe' }}>DADOS DO PROJETO</h3>
           <div className="space-y-1">
              <p className="text-sm font-black" style={{ color: '#1e293b' }}>{project.name}</p>
              <p className="text-xs font-medium leading-snug" style={{ color: '#64748b' }}>
                {project.address || `${project.street}, ${project.number} - ${project.city}/${project.state}`}
              </p>
              <p className="text-xs font-bold mt-1" style={{ color: '#94a3b8' }}>Área Estimada: {project.totalArea || 0} {project.areaUnit || 'm²'}</p>
           </div>
        </div>
      </div>

      {/* Resumo do Orçamento */}
      <div className="mb-12 flex-1">
         <h3 className="text-[11px] font-black uppercase tracking-widest pb-4 mb-6" style={{ color: '#2563eb', borderBottom: '1px solid #dbeafe' }}>RESUMO DO ORÇAMENTO</h3>
         <table className="w-full text-left border-collapse">
            <thead>
               <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Item / Etapa</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-right" style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Valor Total (BDI Inc.)</th>
               </tr>
            </thead>
            <tbody>
               {project.stages?.map((stage: any, idx: number) => {
                  const stageTotal = stage.budgetItems.reduce((acc: number, item: any) => acc + (item.total * (1 + (item.bdi || 0) / 100)), 0);
                  return (
                    <tr key={stage.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                       <td className="py-4 px-4">
                          <span className="text-xs font-bold mr-2" style={{ color: '#94a3b8' }}>{(idx + 1).toString().padStart(2, '0')}</span>
                          <span className="text-xs font-black uppercase tracking-tight" style={{ color: '#334155' }}>{stage.name}</span>
                       </td>
                       <td className="py-4 px-4 text-right text-xs font-bold" style={{ color: '#0f172a' }}>{formatCurrency(stageTotal)}</td>
                    </tr>
                  );
               })}
            </tbody>
         </table>
      </div>

      {/* Condições e Fechamento */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8"
        style={{ borderTop: '2px solid #f1f5f9' }}
      >
         <div className="space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#2563eb' }}>CONDIÇÕES COMERCIAIS</h3>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>Condição de Pagamento</p>
                  <p className="text-sm font-black" style={{ color: '#1e293b' }}>{getPaymentConditionText()}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#94a3b8' }}>Prazo de Entrega</p>
                  <p className="text-sm font-black" style={{ color: '#1e293b' }}>
                    {project.proposalDeliveryDate ? format(new Date(project.proposalDeliveryDate), "dd/MM/yyyy") : 'A combinar'}
                  </p>
               </div>
            </div>
            <div className="p-6 rounded-2xl" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb' }}>
               <p className="text-[10px] font-bold leading-relaxed italic" style={{ color: '#64748b' }}>
                 "Proposta válida por 15 dias a partir da data de emissão. Valores sujeitos a alteração conforme disponibilidade de insumos no mercado no ato da contratação."
               </p>
            </div>
         </div>

         <div 
           className="p-8 rounded-3xl space-y-6"
           style={{ backgroundColor: '#1A3C5E', color: '#ffffff', boxShadow: '0 25px 50px -12px rgba(26, 60, 94, 0.25)' }}
         >
            <div className="flex justify-between items-center" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
               <span className="text-[10px] font-black uppercase tracking-widest">Valor Bruto</span>
               <span className="text-sm font-bold line-through" style={{ textDecorationColor: 'rgba(255, 255, 255, 0.3)' }}>{formatCurrency(totals.total)}</span>
            </div>
            {project.discountValue > 0 && (
              <div className="flex justify-between items-center" style={{ color: '#34d399' }}>
                 <span className="text-[10px] font-black uppercase tracking-widest">Desconto Aplicado</span>
                 <span className="text-sm font-bold">
                    -{project.discountType === 'PERCENTAGE' ? `${project.discountValue}%` : formatCurrency(project.discountValue)}
                 </span>
              </div>
            )}
            <div className="flex justify-between items-end pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#5caeef' }}>Investimento Total</span>
                  <span className="text-3xl font-black tracking-tighter leading-none mt-2">{formatCurrency(calculateDiscountedPrice())}</span>
               </div>
               <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Calculator className="w-6 h-6" style={{ color: '#5caeef' }} />
               </div>
            </div>
         </div>
      </div>

      {/* Footer Signatures */}
      <div 
        className="mt-16 grid grid-cols-2 gap-16 pt-16"
        style={{ borderTop: '1px dashed #cbd5e1' }}
      >
         <div className="text-center space-y-2">
            <div className="h-px w-full mb-2" style={{ backgroundColor: '#cbd5e1' }}></div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#1e293b' }}>{project.clientId ? project.client?.name : 'ACEITE DO CLIENTE'}</p>
            <p className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: '#94a3b8' }}>CLIENTE / CONTRATANTE</p>
         </div>
         <div className="text-center space-y-2">
            <div className="h-px w-full mb-2" style={{ backgroundColor: '#cbd5e1' }}></div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#1e293b' }}>CONSTRUTORA ERP</p>
            <p className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: '#94a3b8' }}>CONTRATADA / EMPRESA</p>
         </div>
      </div>
    </div>
  </>
);
});

ProposalPDF.displayName = "ProposalPDF";
