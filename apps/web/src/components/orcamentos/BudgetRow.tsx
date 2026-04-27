"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Box, 
  Plus, 
  Trash2, 
  Package,
  Wrench,
  Calculator,
  Check,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface BudgetRowProps {
  item: any;
  level: number;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type?: string) => void;
  indexPrefix: string;
  addingItemTo?: any;
  onSaveDraftItem?: () => void;
  onCancelDraftItem?: () => void;
  draftState?: any;
}

export function BudgetRow({ 
  item, 
  level, 
  onUpdate, 
  onDelete, 
  onAddChild,
  indexPrefix,
  addingItemTo,
  onSaveDraftItem,
  onCancelDraftItem,
  draftState
}: BudgetRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(val);
  };

  const hasChildren = item.children && item.children.length > 0;
  const isGroupingRow = item.type === 'STAGE' || item.type === 'SUB_STAGE';

  const handleBdiChange = (value: number) => {
    if (value === item.bdi) return;

    let propagate = false;
    if (item.type === 'SUB_STAGE' || hasChildren) {
      propagate = confirm("Deseja aplicar este BDI a todos os itens abaixo desta sub-etapa?");
      if (propagate) toast.info("Propagando BDI para sub-itens...");
    }

    onUpdate(item.id, { bdi: value, propagateBdi: propagate });
  };

  return (
    <>
      <div 
        className={cn(
          "group flex items-center border-b border-slate-100 min-h-[48px] transition-colors",
          item.type === 'STAGE' && "bg-slate-50/80 border-t border-slate-200 border-l-4 border-l-[#1A3C5E]",
          item.type === 'SUB_STAGE' && "bg-slate-100/40 border-l-4 border-l-slate-400 font-bold",
          (item.type !== 'STAGE' && item.type !== 'SUB_STAGE') && "hover:bg-slate-50/50"
        )}
      >
        {/* Item # & Collapse */}
        <div 
          className="flex items-center gap-2 px-4 shrink-0 h-full border-r border-slate-100" 
          style={{ width: '80px', paddingLeft: `${level * 16 + 16}px` }}
        >
          {hasChildren ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-slate-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-4" />
          )}
          <span className="text-[10px] font-bold text-slate-400 tracking-tight">
            {indexPrefix}
          </span>
        </div>

        {/* Item (Description) */}
        <div className="flex-1 flex items-center px-4 overflow-hidden gap-3 group/desc">
          <div className="shrink-0">
             {item.type === 'STAGE' && <Layers className="w-4 h-4 text-[#1A3C5E]" />}
             {item.type === 'SUB_STAGE' && <Box className="w-3.5 h-3.5 text-slate-500" />}
             {item.type === 'ITEM' && <Wrench className="w-3.5 h-3.5 text-slate-400" />}
             {item.type === 'COMPOSITION' && <Calculator className="w-3.5 h-3.5 text-emerald-400" />}
             {item.type === 'INPUT' && <Package className="w-3.5 h-3.5 text-orange-400" />}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input 
              className={cn(
                "w-full bg-transparent border-none focus:ring-0 text-xs py-1",
                item.type === 'STAGE' ? "font-black text-[#1A3C5E] uppercase tracking-wider" :
                item.type === 'SUB_STAGE' ? "font-bold text-slate-700 uppercase tracking-tight" :
                "font-medium text-slate-600"
              )}
              defaultValue={item.description}
              onBlur={(e) => onUpdate(item.id, { description: e.target.value })}
            />

            {(item.type === 'SUB_STAGE' || item.type === 'STAGE') && (
              <div className="flex items-center gap-1 opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => onAddChild(item.id, 'SUB_STAGE')}
                      >
                        <Layers className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold uppercase">Sub-etapa</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-[#1A3C5E] hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => onAddChild(item.id, 'COMPOSITION')}
                      >
                        <Calculator className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold uppercase">Composição</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                        onClick={() => onAddChild(item.id, 'INPUT')}
                      >
                        <Package className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold uppercase">Insumo</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-slate-400 hover:text-[#1A3C5E] hover:bg-slate-100"
                        onClick={() => onAddChild(item.id, 'ITEM')}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold uppercase">Adicionar Item</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>

        {/* Quantidade */}
        <div className="w-24 px-2 border-l border-slate-100">
          {!isGroupingRow && (
            <input 
              type="number"
              className="w-full bg-transparent border-none text-right font-semibold text-xs text-slate-500 focus:ring-0"
              defaultValue={item.quantity}
              onBlur={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) })}
            />
          )}
        </div>

        {/* Unidade */}
        <div className="w-16 px-2 border-l border-slate-100 flex justify-center">
          {!isGroupingRow && (
            <input 
              className="w-full bg-transparent border-none text-center font-bold text-[10px] uppercase text-slate-400 focus:ring-0"
              defaultValue={item.unit}
              onBlur={(e) => onUpdate(item.id, { unit: e.target.value })}
            />
          )}
        </div>

        {/* Custo Unitário */}
        <div className="w-32 px-3 border-l border-slate-100">
          {!isGroupingRow && (
            <input 
              type="number"
              className="w-full bg-transparent border-none text-right font-bold text-xs text-slate-900 focus:ring-0"
              defaultValue={item.unitPrice}
              onBlur={(e) => onUpdate(item.id, { unitPrice: parseFloat(e.target.value) })}
              disabled={hasChildren}
            />
          )}
        </div>

        {/* Custo Total */}
        <div className="w-36 px-4 border-l border-slate-100 text-right">
          <span className={cn(
            "text-xs font-bold",
            isGroupingRow ? "text-[#1A3C5E]" : "text-slate-400"
          )}>
            {formatCurrency(item.total)}
          </span>
        </div>

        {/* BDI */}
        <div className="w-24 px-2 border-l border-slate-100">
          <div className="relative">
            <input 
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded text-center font-bold text-[11px] text-slate-600 focus:ring-[#1A3C5E]/20 pr-4 h-7"
              defaultValue={item.bdi || 0}
              onBlur={(e) => handleBdiChange(parseFloat(e.target.value) || 0)}
            />
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">%</span>
          </div>
        </div>

        {/* Preço Unitário */}
        <div className="w-32 px-3 border-l border-slate-100 text-right">
          {!isGroupingRow && (
            <span className="text-xs font-bold text-slate-900">
              {formatCurrency(item.unitPrice * (1 + (item.bdi || 0) / 100))}
            </span>
          )}
        </div>

        {/* Preço Total */}
        <div className={cn(
          "w-40 px-4 border-l border-slate-100 text-right",
          item.type === 'STAGE' ? "bg-slate-50" : "bg-slate-50/30"
        )}>
          <span className={cn(
            "text-xs font-bold",
            item.type === 'STAGE' ? "text-[#1A3C5E]" : "text-slate-900"
          )}>
            {formatCurrency(item.total * (1 + (item.bdi || 0) / 100))}
          </span>
        </div>

        {/* Actions */}
        <div className="w-16 px-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col">
          {/* Draft Row for Sub-Etapa (inside another Sub-Etapa / Item) */}
          {addingItemTo?.parentId === item.id && (
            <div className="flex items-center h-12 bg-slate-50/80 border-b border-slate-200 animate-in fade-in slide-in-from-top-1 duration-200" style={{ paddingLeft: `${(level + 1) * 16}px` }}>
              <div className="w-[80px] shrink-0 px-4 flex items-center justify-center">
                  <Box className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1 px-4">
                  <Input 
                      ref={draftState.inputRef}
                      value={draftState.name}
                      onChange={e => draftState.setName(e.target.value)}
                      onKeyDown={e => {
                          if (e.key === 'Enter') onSaveDraftItem?.();
                          if (e.key === 'Escape') onCancelDraftItem?.();
                      }}
                      placeholder="NOME DA SUB-ETAPA"
                      className="h-8 bg-white border-slate-300 focus:ring-1 focus:ring-blue-500 font-bold text-[10px] uppercase"
                  />
              </div>
              <div className="w-24 px-2"></div>
              <div className="w-16 px-2"></div>
              <div className="w-32 px-3"></div>
              <div className="w-36 px-4 text-right">
                  <span className="text-[10px] font-bold text-slate-400">R$ 0,00</span>
              </div>
              <div className="w-24 px-2 flex justify-center">
                  <div className="relative">
                      <Input 
                          type="number"
                          value={draftState.bdi}
                          onChange={e => draftState.setBdi(parseFloat(e.target.value) || 0)}
                          className="h-7 w-20 bg-white border-slate-200 text-center font-bold text-[10px] text-slate-600 pr-5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">%</span>
                  </div>
              </div>
              <div className="w-32 px-3"></div>
              <div className="w-40 px-4 text-right flex items-center justify-end gap-1">
                  <span className="text-[10px] font-bold text-slate-400">R$ 0,00</span>
              </div>
              <div className="w-16 flex items-center justify-center px-1">
                  <Button size="icon" className="w-8 h-8 bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded-md" onClick={onSaveDraftItem}>
                      <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8 text-slate-400" onClick={onCancelDraftItem}>
                      <X className="w-4 h-4" />
                  </Button>
              </div>
            </div>
          )}

          {item.children?.map((child: any, idx: number) => (
            <BudgetRow 
              key={child.id} 
              item={child} 
              level={level + 1} 
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              addingItemTo={addingItemTo}
              onSaveDraftItem={onSaveDraftItem}
              onCancelDraftItem={onCancelDraftItem}
              draftState={draftState}
              indexPrefix={`${indexPrefix}.${idx + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
