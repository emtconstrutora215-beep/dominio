"use client";

import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Search, Plus, ChevronLeft, Star, Loader2, Check, User, Building2
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

type SupplierSelectorDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: any[]) => void;
};

export function SupplierSelectorDialog({ 
  isOpen, 
  onOpenChange, 
  onSelect
}: SupplierSelectorDialogProps) {
  const [activeTab, setActiveTab] = useState<"SUPPLIER" | "PROFESSIONAL">("SUPPLIER");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = trpc.contact.list.useQuery({
    type: activeTab,
    search,
    perPage: 50
  }, { enabled: isOpen });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedItems = data?.items.filter(i => selectedIds.includes(i.id)) || [];
    onSelect(selectedItems);
    setSelectedIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[1200px] w-[95vw] h-[90vh] p-0 border-none shadow-2xl overflow-hidden flex flex-col rounded-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Selecionar Fornecedores e Profissionais</DialogTitle>
        </DialogHeader>

        {/* Header com Abas */}
        <div className="bg-white border-b flex items-center justify-between pr-4">
          <div className="flex">
            <button 
              onClick={() => { setActiveTab("SUPPLIER"); setSelectedIds([]); }}
              className={cn(
                "px-8 py-4 text-sm font-black uppercase tracking-wider transition-all border-r",
                activeTab === "SUPPLIER" 
                  ? "bg-[#337ab7] text-white" 
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Fornecedores
              </div>
            </button>
            <button 
              onClick={() => { setActiveTab("PROFESSIONAL"); setSelectedIds([]); }}
              className={cn(
                "px-8 py-4 text-sm font-black uppercase tracking-wider transition-all border-r",
                activeTab === "PROFESSIONAL" 
                  ? "bg-[#337ab7] text-white" 
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" /> Profissionais
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-[10px] font-black uppercase h-8 px-4 gap-1 shadow-sm">
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

        {/* Barra de Busca */}
        <div className="p-4 bg-white border-b flex items-center gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={activeTab === "SUPPLIER" ? "Buscar um fornecedor..." : "Buscar um profissional..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-2 border-[#337ab7]/20 focus:border-[#337ab7] font-medium"
            />
          </div>
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
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 px-4">Nome / Razão Social</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4">CPF / CNPJ</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4">Cidade / UF</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4">Telefone</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 py-4 text-right px-6">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center text-slate-400 italic">
                    Nenhum {activeTab === "SUPPLIER" ? "fornecedor" : "profissional"} encontrado.
                  </TableCell>
                </TableRow>
              ) : data?.items.map((item) => (
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
                  <TableCell className="text-sm font-bold text-slate-700 uppercase px-4">{item.name}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{item.document || "-"}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{item.city || "-"}{item.state ? ` / ${item.state}` : ""}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{item.phone || "-"}</TableCell>
                  <TableCell className="text-right text-xs font-medium text-[#2079D2] px-6">{item.email || "-"}</TableCell>
                </TableRow>
              ))}
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
                  {selectedIds.length} {selectedIds.length === 1 ? "selecionado" : "selecionados"}
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
