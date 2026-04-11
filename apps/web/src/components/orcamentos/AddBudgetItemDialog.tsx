"use client";

import { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Package, 
  Calculator, 
  Check, 
  Loader2,
  Box,
  Layers
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AddBudgetItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: any) => void;
  title: string;
  type?: 'ITEM' | 'INPUT' | 'SUB_STAGE' | 'STAGE';
}

export function AddBudgetItemDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  type = 'ITEM'
}: AddBudgetItemDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  // Queries para catálogo e composições
  const { data: catalogData, isLoading: loadingCatalog } = trpc.catalogItem.list.useQuery({ 
    search, 
    perPage: 20 
  }, { enabled: isOpen });
  
  const { data: compositionData, isLoading: loadingCompositions } = trpc.composition.list.useQuery({ 
    search, 
    perPage: 20 
  }, { enabled: isOpen });

  const handleConfirm = () => {
    if (!selectedItem) return;
    onConfirm({
      ...selectedItem,
      quantity,
      sourceType: selectedItem.items ? 'COMPOSITION' : 'CATALOG'
    });
    setSelectedItem(null);
    setQuantity(1);
    setSearch("");
  };

  const results = useMemo(() => {
    const list: any[] = [];
    
    if (compositionData?.items) {
      list.push(...compositionData.items.map(c => ({ ...c, isComposition: true })));
    }
    
    if (catalogData?.items) {
      list.push(...catalogData.items.map(i => ({ ...i, isComposition: false })));
    }
    
    return list;
  }, [compositionData, catalogData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-xl border-none shadow-2xl">
        <DialogHeader className="p-8 bg-[#1A3C5E] text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              {type === 'INPUT' ? <Package className="text-orange-400" /> : <Layers className="text-blue-300" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-blue-100/60 text-xs font-medium uppercase tracking-wider mt-1">
                Selecione um item da base técnica para continuar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white min-h-[500px] flex flex-col">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Pesquisar por descrição ou código..." 
              className="pl-12 h-14 border border-slate-200 rounded-lg font-semibold focus-visible:ring-[#1A3C5E] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-100 rounded-lg p-2 space-y-1 no-scrollbar">
            {(loadingCatalog || loadingCompositions) ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#1A3C5E]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Consultando Catálogo...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all border",
                    selectedItem?.id === item.id 
                      ? "border-[#1A3C5E] bg-slate-50 shadow-sm" 
                      : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center",
                      item.isComposition ? "bg-blue-50 text-[#1A3C5E]" : "bg-slate-100 text-slate-600"
                    )}>
                      {item.isComposition ? <Calculator className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.description}
                      </h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-slate-200 text-slate-400">
                          {item.code || 'S/ COD'}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.computedCost || item.unitCost || 0)}
                    </span>
                    {selectedItem?.id === item.id && (
                       <Check className="w-4 h-4 text-emerald-600 mt-1" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-widest">Nenhum item encontrado</p>
              </div>
            )}
          </div>

          {selectedItem && (
             <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-end gap-6">
                   <div className="flex-1 space-y-3">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Quantidade Necessária</Label>
                      <Input 
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="h-14 bg-white border border-slate-200 rounded-lg font-bold text-xl focus-visible:ring-[#1A3C5E]"
                      />
                   </div>
                   <div className="text-right pb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cálculo Estimado</p>
                      <p className="text-2xl font-bold text-[#F07B2B] tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedItem.computedCost || selectedItem.unitCost || 0) * quantity)}
                      </p>
                   </div>
                </div>
             </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t flex justify-between items-center sm:justify-between">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-400 uppercase text-[11px] tracking-widest hover:bg-slate-100 rounded-lg px-8 h-12">
            Cancelar
          </Button>
          <Button 
            disabled={!selectedItem || quantity <= 0}
            onClick={handleConfirm}
            className="bg-[#1A3C5E] hover:bg-[#1A3C5E]/90 text-white font-bold uppercase text-[11px] tracking-wider px-10 h-12 rounded-lg shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:grayscale"
          >
            Confirmar e Inserir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
