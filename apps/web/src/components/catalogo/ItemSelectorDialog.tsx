"use client";

import { useState, useMemo } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Search, X, Plus, ChevronLeft, Star, Loader2, Check
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

type ItemSelectorDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: any[]) => void;
  onAddNewInsumo?: () => void;
  onAddNewComposition?: () => void;
};

export function ItemSelectorDialog({ 
  isOpen, 
  onOpenChange, 
  onSelect,
  onAddNewInsumo,
  onAddNewComposition
}: ItemSelectorDialogProps) {
  const [activeTab, setActiveTab] = useState<"INSUMO" | "COMPOSICAO">("INSUMO");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filtros
  const [filterBase, setFilterBase] = useState("Todas");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [filterGroup, setFilterGroup] = useState("Todas");

  const { data: insumoData, isLoading: isLoadingInsumos } = trpc.catalogItem.list.useQuery({
    search,
    base: filterBase === "Todas" ? undefined : filterBase,
    type: filterGroup === "Todas" ? undefined : filterGroup as any,
    typeCategory: filterCategory === "Todas" ? undefined : filterCategory,
    perPage: 50
  }, { enabled: activeTab === "INSUMO" && isOpen });

  const { data: compData, isLoading: isLoadingComps } = trpc.composition.list.useQuery({
    search,
    base: filterBase === "Todas" ? undefined : filterBase,
    perPage: 50
  }, { enabled: activeTab === "COMPOSICAO" && isOpen });

  const { data: filterOptions } = trpc.catalogItem.getFilterOptions.useQuery();

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (activeTab === "INSUMO") {
      const selectedItems = insumoData?.items.filter(i => selectedIds.includes(i.id)) || [];
      onSelect(selectedItems.map(i => ({ ...i, _source: 'INSUMO' })));
    } else {
      const selectedItems = compData?.items.filter(i => selectedIds.includes(i.id)) || [];
      onSelect(selectedItems.map(i => ({ ...i, _source: 'COMPOSICAO' })));
    }
    setSelectedIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[1200px] w-[95vw] h-[90vh] p-0 border-none shadow-2xl overflow-hidden flex flex-col rounded-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Selecionar Itens do Catálogo</DialogTitle>
        </DialogHeader>

        {/* Header com Abas */}
        <div className="bg-white border-b flex items-center justify-between pr-4">
          <div className="flex">
            <button 
              onClick={() => { setActiveTab("INSUMO"); setSelectedIds([]); }}
              className={cn(
                "px-8 py-4 text-sm font-black uppercase tracking-wider transition-all border-r",
                activeTab === "INSUMO" 
                  ? "bg-[#337ab7] text-white" 
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
            >
              Insumos
            </button>
            <button 
              onClick={() => { setActiveTab("COMPOSICAO"); setSelectedIds([]); }}
              className={cn(
                "px-8 py-4 text-sm font-black uppercase tracking-wider transition-all border-r",
                activeTab === "COMPOSICAO" 
                  ? "bg-[#337ab7] text-white" 
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
            >
              Composições
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => activeTab === "INSUMO" ? onAddNewInsumo?.() : onAddNewComposition?.()}
              className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-[10px] font-black uppercase h-8 px-4 gap-1 shadow-sm"
            >
              <Plus className="w-3 h-3" /> Novo
            </Button>
            <Button 
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="bg-[#f0ad4e] hover:bg-[#ed9c28] text-white border-none h-8 w-8 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="p-4 bg-white border-b grid grid-cols-12 gap-4 items-end">
          <div className="col-span-4 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={activeTab === "INSUMO" ? "Buscar um insumo..." : "Buscar uma composição..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-2 border-[#337ab7]/20 focus:border-[#337ab7] font-medium"
              />
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Base:</label>
            <Select value={filterBase} onValueChange={setFilterBase}>
              <SelectTrigger className="h-10 border-2 border-slate-100 text-xs font-bold uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                {filterOptions?.bases.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {activeTab === "INSUMO" && (
            <>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Grupo:</label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="h-10 border-2 border-slate-100 text-xs font-bold uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="MATERIAL">Material</SelectItem>
                    <SelectItem value="LABOR">Mão de Obra</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipamento</SelectItem>
                    <SelectItem value="SERVICE">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo:</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-10 border-2 border-slate-100 text-xs font-bold uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    {filterOptions?.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Tabela de Resultados */}
        <div className="flex-1 overflow-auto bg-slate-50">
          <Table>
            <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">
                   <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-slate-200 rounded" />
                   </div>
                </TableHead>
                <TableHead className="w-10 text-center"><Star className="w-3 h-3 text-slate-300" /></TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 px-4">Código</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4">Descrição</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 text-center">Unidade</TableHead>
                {activeTab === "INSUMO" && <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 text-center">Grupo</TableHead>}
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 text-center">Base</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 text-right px-6">Custo Unitário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTab === "INSUMO" ? (
                isLoadingInsumos ? (
                  <TableRow><TableCell colSpan={8} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
                ) : insumoData?.items.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className={cn(
                      "group cursor-pointer transition-colors border-b last:border-none",
                      selectedIds.includes(item.id) ? "bg-blue-50/50" : "bg-white hover:bg-slate-50"
                    )}
                    onClick={() => handleToggleSelect(item.id)}
                  >
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center">
                          <div className={cn(
                            "w-4 h-4 border-2 rounded transition-all flex items-center justify-center",
                            selectedIds.includes(item.id) ? "bg-[#5cb85c] border-[#5cb85c]" : "border-slate-200 bg-white"
                          )}>
                            {selectedIds.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-center"><Star className="w-3 h-3 text-slate-200" /></TableCell>
                    <TableCell className="text-xs font-bold text-slate-500 px-4">{item.code || "-"}</TableCell>
                    <TableCell className="text-sm font-bold text-slate-700 uppercase">{item.description}</TableCell>
                    <TableCell className="text-center text-xs font-bold text-slate-500">{item.unit}</TableCell>
                    <TableCell className="text-center text-[10px] font-black uppercase text-slate-400">{item.type}</TableCell>
                    <TableCell className="text-center text-xs font-bold text-slate-500">{item.base || "-"}</TableCell>
                    <TableCell className="text-right text-xs font-black text-slate-900 px-6 font-mono">{formatCurrency(item.unitCost)}</TableCell>
                  </TableRow>
                ))
              ) : (
                isLoadingComps ? (
                  <TableRow><TableCell colSpan={8} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
                ) : compData?.items.map((comp) => (
                  <TableRow 
                    key={comp.id} 
                    className={cn(
                      "group cursor-pointer transition-colors border-b last:border-none",
                      selectedIds.includes(comp.id) ? "bg-blue-50/50" : "bg-white hover:bg-slate-50"
                    )}
                    onClick={() => handleToggleSelect(comp.id)}
                  >
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center">
                          <div className={cn(
                            "w-4 h-4 border-2 rounded transition-all flex items-center justify-center",
                            selectedIds.includes(comp.id) ? "bg-[#5cb85c] border-[#5cb85c]" : "border-slate-200 bg-white"
                          )}>
                            {selectedIds.includes(comp.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-center"><Star className="w-3 h-3 text-slate-200" /></TableCell>
                    <TableCell className="text-xs font-bold text-slate-500 px-4">{comp.code || "-"}</TableCell>
                    <TableCell className="text-sm font-bold text-slate-700 uppercase">{comp.description}</TableCell>
                    <TableCell className="text-center text-xs font-bold text-slate-500">{comp.unit}</TableCell>
                    <TableCell className="text-center text-xs font-bold text-slate-500">{comp.base || "-"}</TableCell>
                    <TableCell className="text-right text-xs font-black text-slate-900 px-6 font-mono">{formatCurrency(comp.computedCost)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t flex items-center justify-between">
           <div className="flex items-center gap-4">
              <Button 
                onClick={handleConfirm}
                disabled={selectedIds.length === 0}
                className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-[11px] font-black uppercase h-10 px-8 gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" /> Incluir
              </Button>
              {selectedIds.length > 0 && (
                <span className="text-[10px] font-black uppercase text-[#337ab7]">
                  {selectedIds.length} {selectedIds.length === 1 ? "item selecionado" : "itens selecionados"}
                </span>
              )}
           </div>
           
           <Button variant="outline" className="h-10 text-[10px] font-black uppercase border-2 border-slate-100 hover:bg-slate-50">
              Carregar mais...
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
