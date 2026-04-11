"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Box, 
  Plus, 
  Trash2, 
  GripVertical,
  Package,
  Wrench,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetRowProps {
  item: any;
  level: number;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type?: string) => void;
  indexPrefix: string;
}

export function BudgetRow({ 
  item, 
  level, 
  onUpdate, 
  onDelete, 
  onAddChild,
  indexPrefix 
}: BudgetRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'STAGE': return "bg-slate-50 text-[#1A3C5E] font-bold border-l-4 border-l-[#1A3C5E]";
      case 'SUB_STAGE': return "bg-slate-50/50 text-slate-700 font-semibold";
      case 'ITEM': return "bg-white text-slate-800 font-semibold";
      case 'COMPOSITION': return "bg-white text-blue-700 font-medium italic";
      default: return "bg-white text-slate-600 font-normal";
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(val);
  };

  const hasChildren = item.children && item.children.length > 0;

  return (
    <>
      <div 
        className={cn(
          "group flex items-center border-b border-slate-100 min-h-[50px] transition-colors hover:bg-slate-50/50",
          level === 0 && "border-t border-slate-200"
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
        <div className="flex-1 flex items-center px-4 overflow-hidden gap-3">
          <div className="shrink-0">
             {item.type === 'STAGE' && <Layers className="w-3.5 h-3.5 text-emerald-500" />}
             {item.type === 'SUB_STAGE' && <Box className="w-3.5 h-3.5 text-blue-400" />}
             {item.type === 'ITEM' && <Wrench className="w-3.5 h-3.5 text-slate-400" />}
             {item.type === 'COMPOSITION' && <Calculator className="w-3.5 h-3.5 text-emerald-400" />}
             {item.type === 'INPUT' && <Package className="w-3.5 h-3.5 text-orange-400" />}
          </div>
          <input 
            className={cn(
              "w-full bg-transparent border-none focus:ring-0 text-xs py-1",
              item.type === 'STAGE' ? "font-bold text-[#1A3C5E]" :
              item.type === 'SUB_STAGE' ? "font-semibold text-slate-700 uppercase tracking-tight" :
              "font-medium text-slate-600"
            )}
            defaultValue={item.description}
            onBlur={(e) => onUpdate(item.id, { description: e.target.value })}
          />
        </div>

        <div className="w-24 px-2 border-l border-slate-100">
          <input 
            type="number"
            className="w-full bg-transparent border-none text-right font-semibold text-xs text-slate-500 focus:ring-0"
            defaultValue={item.quantity}
            onBlur={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) })}
            disabled={item.type === 'STAGE' || item.type === 'SUB_STAGE'}
          />
        </div>

        <div className="w-16 px-2 border-l border-slate-100 flex justify-center">
          <input 
            className="w-full bg-transparent border-none text-center font-bold text-[10px] uppercase text-slate-400 focus:ring-0"
            defaultValue={item.unit}
            onBlur={(e) => onUpdate(item.id, { unit: e.target.value })}
            disabled={item.type === 'STAGE' || item.type === 'SUB_STAGE'}
          />
        </div>

        <div className="w-32 px-3 border-l border-slate-100">
          <input 
            type="number"
            className="w-full bg-transparent border-none text-right font-bold text-xs text-slate-900 focus:ring-0"
            defaultValue={item.unitPrice}
            onBlur={(e) => onUpdate(item.id, { unitPrice: parseFloat(e.target.value) })}
            disabled={hasChildren}
          />
        </div>

        {/* Custo Total */}
        <div className="w-36 px-4 border-l border-slate-100 text-right">
          <span className="text-xs font-bold text-slate-400">
            {formatCurrency(item.total)}
          </span>
        </div>

        <div className="w-24 px-2 border-l border-slate-100">
          <div className="relative">
            <input 
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded text-center font-bold text-[11px] text-slate-600 focus:ring-[#1A3C5E]/20 pr-4 h-7"
              defaultValue={item.bdi || 0}
              onBlur={(e) => onUpdate(item.id, { bdi: parseFloat(e.target.value) })}
            />
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">%</span>
          </div>
        </div>

        <div className="w-32 px-3 border-l border-slate-100 text-right">
          <span className="text-xs font-bold text-slate-900">
            {formatCurrency(item.unitPrice * (1 + (item.bdi || 0) / 100))}
          </span>
        </div>

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
          {item.type === 'ITEM' || item.type === 'SUB_STAGE' || item.type === 'STAGE' ? (
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                      onClick={() => onAddChild(item.id, 'INPUT')}
                    >
                      <Package className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold uppercase">Adicionar Insumo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-300 hover:text-[#1A3C5E] hover:bg-slate-100"
                      onClick={() => onAddChild(item.id, 'ITEM')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold uppercase">
                      {item.type === 'ITEM' ? 'Adicionar Sub-item' : 'Adicionar Item'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : null}
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

      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {item.children.map((child: any, idx: number) => (
            <BudgetRow 
              key={child.id} 
              item={child} 
              level={level + 1} 
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              indexPrefix={`${indexPrefix}.${idx + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
