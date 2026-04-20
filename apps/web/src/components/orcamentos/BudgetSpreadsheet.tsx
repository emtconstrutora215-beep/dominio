"use client";

import { useState, useRef, useEffect } from "react";
import { BudgetRow } from "./BudgetRow";
import { Layers, Calculator, Info, Check, X, Settings, Plus, Box, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddBudgetItemDialog } from "./AddBudgetItemDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BudgetSpreadsheetProps {
  data: any;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onAddBudgetItem: (payload: any) => Promise<any>;
  onAddStage: (name: string, bdi?: number) => void;
  onUpdateStage: (id: string, data: any) => void;
}

export function BudgetSpreadsheet({ 
  data, 
  onUpdate, 
  onDelete, 
  onAddBudgetItem,
  onAddStage,
  onUpdateStage
}: BudgetSpreadsheetProps) {
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageBdi, setNewStageBdi] = useState(0);
  
  // Estado para inserção de sub-etapa inline
  const [addingItemTo, setAddingItemTo] = useState<{ 
    stageId: string; 
    parentId?: string; 
    type: 'SUB_STAGE' | 'ITEM' 
  } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemBdi, setNewItemBdi] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const subStageInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isAddingStage && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingStage]);

  useEffect(() => {
    if (addingItemTo && subStageInputRef.current) {
      subStageInputRef.current.focus();
    }
  }, [addingItemTo]);

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
    
    const stage = data?.stages?.find((s: any) => s.id === stageId);
    
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
      bdi: modalState.parentId ? 0 : (stage?.bdi || data?.budget?.bdi || 0)
    });

    setModalState(prev => ({ ...prev, isOpen: false }));

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

  const handleSaveStage = () => {
    if (newStageName.trim()) {
      onAddStage(newStageName.toUpperCase(), newStageBdi);
      setNewStageName("");
      setNewStageBdi(0);
      setIsAddingStage(false);
    } else {
      toast.warning("Digite um nome para a etapa");
    }
  };

  const handleSaveSubStage = async () => {
    if (!addingItemTo || !newItemName.trim()) {
      toast.warning("Digite um nome para a sub-etapa");
      return;
    }

    try {
      await onAddBudgetItem({
        projectStageId: addingItemTo.stageId,
        parentId: addingItemTo.parentId,
        type: addingItemTo.type,
        description: newItemName.toUpperCase(),
        bdi: newItemBdi || 0,
        quantity: 1,
        unit: 'UN',
        unitPrice: 0
      });
      
      setAddingItemTo(null);
      setNewItemName("");
      setNewItemBdi(0);
      toast.success("Sub-etapa criada!");
    } catch (err) {
      toast.error("Erro ao criar sub-etapa");
    }
  };

  const handleCancelStage = () => {
    setNewStageName("");
    setNewStageBdi(0);
    setIsAddingStage(false);
  };

  const handleCancelSubStage = () => {
    setAddingItemTo(null);
    setNewItemName("");
    setNewItemBdi(0);
  };

  const handleStageBdiChange = (stageId: string, value: number, currentBdi: number) => {
    if (value === currentBdi) return;
    const propagate = confirm("Deseja aplicar este BDI a todos os itens desta etapa?");
    onUpdateStage(stageId, { bdi: value, propagateBdi: propagate });
    if (propagate) toast.info("Aplicando BDI em toda a etapa...");
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Spreadsheet Toolbar */}
      <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-md shadow-sm">
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 px-4 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 hover:text-[#1A3C5E] group rounded-md transition-all"
            onClick={() => setIsAddingStage(true)}
          >
            <Layers className="w-3.5 h-3.5 mr-2 text-[#1A3C5E]" /> 
            Inserir Etapa
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase text-slate-400 group rounded-md">
            <Calculator className="w-3.5 h-3.5 mr-2" /> Composição SINAPI
          </Button>
        </div>

        <div className="flex items-center gap-6 pr-4">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">BDI Global:</span>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md">
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

      {/* Spreadsheet Main View */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden overflow-x-auto">
        {/* Spreadsheet Header - Blue Style per Model */}
        <div className="flex items-center bg-[#1A3C5E] h-11 select-none min-w-[1300px]">
          <div className="w-[80px] shrink-0 flex items-center justify-center px-4">
            <Layers className="w-4 h-4 text-white opacity-80" />
          </div>
          <div className="flex-1 px-4 text-[11px] font-bold uppercase text-white tracking-wider">Item</div>
          <div className="w-24 text-right text-[11px] font-bold uppercase text-white tracking-wider px-2">Qtde</div>
          <div className="w-32 text-right text-[11px] font-bold uppercase text-white tracking-wider px-3 flex items-center justify-end gap-1.5">
             <Calculator className="w-3 h-3 opacity-70" /> Custo Unitário
          </div>
          <div className="w-36 text-right text-[11px] font-bold uppercase text-white tracking-wider px-4">Custo Total</div>
          <div className="w-24 text-center text-[11px] font-bold uppercase text-white tracking-wider px-2">BDI</div>
          <div className="w-32 text-right text-[11px] font-bold uppercase text-white tracking-wider px-3 flex items-center justify-end gap-1.5">
             <Plus className="w-3 h-3 opacity-70" /> Preço Unitário
          </div>
          <div className="w-40 text-right text-[11px] font-bold uppercase text-white tracking-wider px-4">Preço Total</div>
          <div className="w-16 h-full flex items-center justify-center border-l border-white/10">
             <Settings className="w-4 h-4 text-white opacity-70" />
          </div>
        </div>

        <div className="flex flex-col min-w-[1300px]">
          {/* Inline Addition Row (Draft Row) */}
          {isAddingStage && (
            <div className="flex items-center h-14 bg-slate-100/80 border-b border-slate-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="w-[80px] shrink-0 px-4 flex items-center justify-center">
                <div className="bg-white border border-slate-300 w-8 h-8 flex items-center justify-center rounded-sm shadow-sm text-xs font-bold text-blue-600">
                  {(data?.stages?.length || 0) + 1}
                </div>
              </div>
              <div className="flex-1 px-4">
                <Input 
                  ref={inputRef}
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveStage();
                    if (e.key === 'Escape') handleCancelStage();
                  }}
                  placeholder="Digite o nome da etapa"
                  className="h-9 bg-white border-slate-800 focus-visible:ring-1 focus-visible:ring-blue-500 font-medium text-sm"
                />
              </div>
              <div className="w-24 px-2"></div>
              <div className="w-32 px-3"></div>
              <div className="w-36 px-4 text-right flex items-center justify-end gap-1 px-4">
                <span className="text-[11px] font-bold text-blue-600">R$ 0,00</span>
                <Info className="w-3 h-3 text-blue-400" />
              </div>
              <div className="w-24 px-2 flex items-center justify-center">
                <div className="relative group/bdi">
                  <Input 
                    type="number"
                    value={newStageBdi}
                    onChange={e => setNewStageBdi(parseFloat(e.target.value) || 0)}
                    className="h-8 w-20 bg-white border-slate-300 text-center font-bold text-xs pr-5 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                </div>
              </div>
              <div className="w-32 px-3"></div>
              <div className="w-40 px-4 text-right flex items-center justify-end gap-1 px-4">
                <span className="text-[11px] font-bold text-blue-600">R$ 0,00</span>
                <Info className="w-3 h-3 text-blue-400" />
              </div>
              <div className="w-16 flex items-center justify-center p-1">
                <Button 
                  size="icon" 
                  disabled={!newStageName.trim()}
                  className={cn(
                    "w-full h-10 shadow-md rounded-md transition-all active:scale-95",
                    newStageName.trim() ? "bg-[#5cb85c] hover:bg-[#4cae4c] text-white" : "bg-slate-200 text-slate-400"
                  )}
                  onClick={handleSaveStage}
                >
                  <Check className="w-5 h-5 stroke-[3px]" />
                </Button>
              </div>
            </div>
          )}

          {data?.stages.map((stage: any, sIdx: number) => {
            // Cálculo de Preço Total da Etapa
            const stagePriceTotal = stage.budgetItems.reduce((acc: number, item: any) => {
               return acc + (item.total * (1 + (item.bdi || 0) / 100));
            }, 0);

            return (
              <div key={stage.id} className="flex flex-col">
                {/* Stage Header Row */}
                <div className="bg-slate-50/50 border-b border-slate-100 flex items-center group/stage border-l-4 border-l-[#1A3C5E] h-12">
                    <div className="w-[80px] shrink-0 flex items-center justify-center px-4">
                        <span className="text-[11px] font-bold text-slate-400">
                            {(sIdx + 1).toString().padStart(2, '0')}
                        </span>
                    </div>
                    
                    <div className="flex-1 px-4 flex items-center gap-3">
                        <Input 
                            defaultValue={stage.name}
                            className="bg-transparent border-none focus-visible:ring-0 text-xs font-black text-[#1A3C5E] uppercase tracking-wider h-8 p-0"
                            onBlur={(e) => onUpdateStage(stage.id, { name: e.target.value })}
                        />
                        <div className="flex items-center gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                                      onClick={() => {
                                        setAddingItemTo({ stageId: stage.id, type: 'SUB_STAGE' });
                                        setNewItemBdi(stage.bdi || 0);
                                      }}
                                  >
                                      <Layers className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px] font-bold uppercase">Adicionar Sub-etapa</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                                      onClick={() => handleOpenModal('INPUT', `Novo Insumo em: ${stage.name}`, stage.id)}
                                  >
                                      <Package className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px] font-bold uppercase">Adicionar Insumo</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-slate-300 hover:text-[#1A3C5E] hover:bg-slate-100"
                                      onClick={() => handleOpenModal('ITEM', `Novo Item em: ${stage.name}`, stage.id, undefined, true)}
                                  >
                                      <Plus className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-[10px] font-bold uppercase">Adicionar Item</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="w-24 px-2"></div>
                    <div className="w-32 px-3"></div>
                    <div className="w-36 px-4 text-right">
                       <span className="text-xs font-bold text-[#1A3C5E]">
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(stage.budgetItems.reduce((a:any, b:any) => a + b.total, 0))}
                       </span>
                    </div>
                    
                    {/* Editable BDI for Stage */}
                    <div className="w-24 px-2 flex justify-center">
                        <div className="relative group/bdi-stage">
                            <Input 
                                type="number"
                                defaultValue={stage.bdi || 0}
                                className="h-7 w-20 bg-white border-slate-200 text-center font-bold text-[11px] text-[#1A3C5E] pr-5 focus:ring-1 focus:ring-blue-500"
                                onBlur={(e) => handleStageBdiChange(stage.id, parseFloat(e.target.value) || 0, stage.bdi || 0)}
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">%</span>
                        </div>
                    </div>

                    <div className="w-32 px-3"></div>
                    
                    <div className="w-40 px-4 text-right bg-[#1A3C5E]/5 h-full flex items-center justify-end">
                       <span className="text-xs font-black text-[#1A3C5E]">
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(stagePriceTotal)}
                       </span>
                    </div>
                    <div className="w-16"></div>
                </div>
                
                <div className="flex flex-col">
                    {/* Draft Row for Sub-Etapa (inside Stage) */}
                    {addingItemTo?.stageId === stage.id && !addingItemTo?.parentId && (
                        <div className="flex items-center h-12 bg-slate-50/80 border-b border-slate-200 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="w-[80px] shrink-0 px-4 flex items-center justify-center">
                                <Box className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div className="flex-1 px-4">
                                <Input 
                                    ref={subStageInputRef}
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveSubStage();
                                        if (e.key === 'Escape') handleCancelSubStage();
                                    }}
                                    placeholder="NOME DA SUB-ETAPA"
                                    className="h-8 bg-white border-slate-300 focus:ring-1 focus:ring-blue-500 font-bold text-[10px] uppercase"
                                />
                            </div>
                            <div className="w-24 px-2"></div>
                            <div className="w-32 px-3"></div>
                            <div className="w-36 px-4 text-right">
                                <span className="text-[10px] font-bold text-slate-400">R$ 0,00</span>
                            </div>
                            <div className="w-24 px-2 flex justify-center">
                                <div className="relative">
                                    <Input 
                                        type="number"
                                        value={newItemBdi}
                                        onChange={e => setNewItemBdi(parseFloat(e.target.value) || 0)}
                                        className="h-7 w-20 bg-white border-slate-200 text-center font-bold text-[10px] text-slate-600 pr-5"
                                    />
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">%</span>
                                </div>
                            </div>
                            <div className="w-32 px-3"></div>
                            <div className="w-40 px-4 text-right flex items-center justify-end gap-1 px-4">
                                <span className="text-[10px] font-bold text-slate-400">R$ 0,00</span>
                            </div>
                            <div className="w-16 flex items-center justify-center px-1">
                                <Button size="icon" className="w-8 h-8 bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded-md" onClick={handleSaveSubStage}>
                                    <Check className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="w-8 h-8 text-slate-400" onClick={handleCancelSubStage}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {stage.budgetItems.map((item: any, iIdx: number) => (
                        <BudgetRow 
                          key={item.id} 
                          item={item} 
                          level={1} 
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                          onAddChild={(pId, type) => {
                            if (type === 'SUB_STAGE') {
                               setAddingItemTo({ stageId: stage.id, parentId: pId, type: 'SUB_STAGE' });
                               setNewItemBdi(item.bdi || 0);
                            } else {
                               handleOpenModal(type as any || 'ITEM', "Selecionar Item do Catálogo", stage.id, pId);
                            }
                          }}
                          addingItemTo={addingItemTo}
                          onSaveDraftItem={handleSaveSubStage}
                          onCancelDraftItem={handleCancelSubStage}
                          draftState={{
                            name: newItemName,
                            setName: setNewItemName,
                            bdi: newItemBdi,
                            setBdi: setNewItemBdi,
                            inputRef: subStageInputRef
                          }}
                          indexPrefix={`${sIdx + 1}.${iIdx + 1}`}
                        />
                    ))}
                </div>
              </div>
            );
          })}

          {data?.stages.length === 0 && !isAddingStage && (
             <div className="p-32 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6 font-bold text-3xl">
                   ?
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Sua Planilha está vazia</h4>
                <Button 
                  variant="outline" 
                  className="mt-6 border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-md hover:bg-[#1A3C5E] hover:text-white hover:border-[#1A3C5E] transition-all px-8 py-4 h-auto"
                  onClick={() => setIsAddingStage(true)}
                >
                  Criar Primeira Etapa
                </Button>
             </div>
           )}
        </div>
      </div>

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
