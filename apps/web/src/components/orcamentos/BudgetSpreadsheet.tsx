"use client";

import { useState } from "react";
import { BudgetRow } from "./BudgetRow";
import { Layers, Plus, Calculator, Info, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddBudgetItemDialog } from "./AddBudgetItemDialog";

interface BudgetSpreadsheetProps {
  data: any;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onAddBudgetItem: (payload: any) => Promise<any>;
  onAddStage: (name: string) => void;
}

export function BudgetSpreadsheet({ 
  data, 
  onUpdate, 
  onDelete, 
  onAddBudgetItem,
  onAddStage 
}: BudgetSpreadsheetProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    type: 'ITEM' | 'INPUT' | 'SUB_STAGE' | 'STAGE';
    parentId?: string;
    stageId?: string;
    isSequential?: boolean;
  }>({
    isOpen: false,
    title: "",
    type: 'ITEM'
  });

  const handleOpenModal = (type: any, title: string, stageId?: string, parentId?: string, isSequential = false) => {
    setModalState({
      isOpen: true,
      title,
      type,
      stageId,
      parentId,
      isSequential
    });
  };

  const handleConfirmSelection = async (selection: any) => {
    const isSequential = modalState.isSequential;
    const stageId = modalState.stageId;
    
    // 1. Criar o item no orçamento
    const newItem = await onAddBudgetItem({
      projectStageId: stageId,
      parentId: modalState.parentId,
      type: modalState.type,
      catalogItemId: selection.sourceType === 'CATALOG' ? selection.id : undefined,
      compositionId: selection.sourceType === 'COMPOSITION' ? selection.id : undefined,
      description: selection.description,
      unit: selection.unit,
      unitPrice: selection.computedCost || selection.unitCost || 0,
      quantity: selection.quantity,
      bdi: data?.budget?.bdi || 0
    });

    setModalState(prev => ({ ...prev, isOpen: false }));

    // 2. Fluxo Sequencial: Se foi um "Incluir Item", abrir imediatamente para Insumo
    if (isSequential && newItem) {
      setTimeout(() => {
        handleOpenModal(
          'INPUT', 
          `Adicionar Insumo em: ${newItem.description}`, 
          stageId, 
          newItem.id, 
          false
        );
      }, 300);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Spreadsheet Toolbar */}
      <div className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 px-5 text-[11px] font-bold uppercase text-slate-600 hover:bg-slate-50 hover:text-[#1A3C5E] group rounded-lg transition-all"
            onClick={() => {
              const name = prompt("Nome da Etapa:");
              if (name) onAddStage(name.toUpperCase());
            }}
          >
            <Layers className="w-4 h-4 mr-2 text-[#1A3C5E] group-hover:rotate-90 transition-transform" /> 
            + Inserir Nova Etapa
          </Button>
          <Button variant="ghost" size="sm" className="h-10 px-5 text-[10px] font-black uppercase text-slate-400 group rounded-xl">
            <Calculator className="w-4 h-4 mr-2" /> Composição SINAPI
          </Button>
        </div>

        <div className="flex items-center gap-6 pr-4">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">BDI Global:</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-xs font-bold text-slate-600">{data?.budget?.bdi || 0}%</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-400" /></TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-semibold">BDI aplicado como padrão para novos itens.</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
           </div>
        </div>
      </div>

      {/* Spreadsheet Header */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <div className="flex items-center bg-slate-50/80 border-b border-slate-200 h-12 select-none min-w-[1200px]">
          <div className="w-[80px] shrink-0 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wider px-4">#</div>
          <div className="flex-1 px-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Descrição do Item</div>
          <div className="w-24 text-right text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2">Qtd</div>
          <div className="w-16 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2">Unid</div>
          <div className="w-32 text-right text-[10px] font-bold uppercase text-slate-400 tracking-wider px-3">Custo Unit</div>
          <div className="w-36 text-right text-[10px] font-bold uppercase text-slate-400 tracking-wider px-4">Custo Total</div>
          <div className="w-24 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2">BDI%</div>
          <div className="w-32 text-right text-[10px] font-bold uppercase text-slate-400 tracking-wider px-3">Preço Unit</div>
          <div className="w-40 text-right text-[10px] font-bold uppercase text-[#1A3C5E] tracking-wider px-4 bg-[#1A3C5E]/5 shadow-inner">Preço Total</div>
          <div className="w-16"></div>
        </div>

        <div className="flex flex-col min-w-[1200px]">
          {data?.stages.map((stage: any, sIdx: number) => (
            <div key={stage.id} className="flex flex-col">
               {/* Stage Header Row */}
               <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-2.5 flex justify-between items-center group/stage border-l-4 border-l-[#1A3C5E]">
                  <div className="flex items-center gap-4">
                     <span className="text-[11px] font-bold text-slate-400 w-6">
                        {(sIdx + 1).toString().padStart(2, '0')}
                     </span>
                     <h3 className="text-xs font-bold text-[#1A3C5E] uppercase tracking-wide">{stage.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-3 text-[10px] font-bold text-slate-500 hover:text-[#1A3C5E] hover:bg-slate-100"
                        onClick={() => handleOpenModal('SUB_STAGE', `Nova Sub-Etapa em: ${stage.name}`, stage.id)}
                     >
                        <Plus className="w-3 h-3 mr-1.5" /> Sub-Etapa
                     </Button>
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-3 text-[10px] font-bold text-slate-500 hover:text-[#1A3C5E] hover:bg-slate-100"
                        onClick={() => handleOpenModal('ITEM', `Novo Item em: ${stage.name}`, stage.id, undefined, true)}
                     >
                        <Plus className="w-3 h-3 mr-1.5" /> Item
                     </Button>
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-3 text-[10px] font-bold text-[#F07B2B] hover:bg-orange-50"
                        onClick={() => handleOpenModal('INPUT', `Novo Insumo em: ${stage.name}`, stage.id)}
                     >
                        <Package className="w-3 h-3 mr-1.5" /> Insumo
                     </Button>
                  </div>
               </div>
               
               {/* Children BudgetItems */}
               <div className="flex flex-col">
                  {stage.budgetItems.map((item: any, iIdx: number) => (
                    <BudgetRow 
                      key={item.id} 
                      item={item} 
                      level={1} 
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onAddChild={(pId, type) => handleOpenModal(type as any || 'ITEM', "Selecionar Item do Catálogo", stage.id, pId)}
                      indexPrefix={`${sIdx + 1}.${iIdx + 1}`}
                    />
                  ))}
                  
                  {stage.budgetItems.length === 0 && (
                    <div className="p-8 text-center bg-slate-50/50 border-b border-dashed border-slate-200">
                       <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Nenhum item nesta etapa</p>
                    </div>
                  )}
               </div>
            </div>
          ))}

          {data?.stages.length === 0 && (
             <div className="p-32 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                   <Layers className="w-10 h-10" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Sua Planilha está vazia</h4>
                <Button 
                  variant="outline" 
                  className="mt-6 border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all px-8 py-5 h-auto shadow-lg shadow-slate-100"
                  onClick={() => {
                    const name = prompt("Nome da Etapa:");
                    if (name) onAddStage(name.toUpperCase());
                  }}
                >
                  Criar Primeira Etapa da Obra
                </Button>
             </div>
          )}
        </div>
      </div>
      {/* Modal de Seleção Global */}
      <AddBudgetItemDialog 
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmSelection}
        title={modalState.title}
        type={modalState.type}
      />
    </div>
  );
}
