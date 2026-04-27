"use client";

import * as React from "react";
import { 
  Search, 
  Star, 
  Plus, 
  ChevronLeft, 
  Check, 
  ChevronDown,
  Info,
  MoreVertical
} from "lucide-react";
import { trpc } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ApropriacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSelect: (item: { description: string; unit: string; stageId?: string; budgetItemId?: string }) => void;
}

export function ApropriacaoModal({ isOpen, onClose, projectId, onSelect }: ApropriacaoModalProps) {
  const [search, setSearch] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  
  // Mocking data for Insumos to match the mockup
  const insumos = [
    { id: "1", code: "0001", description: "0001 Caterpillar 320C", type: "Escavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "2", code: "0002", description: "0002 Caterpillar 320C", type: "Escavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "3", code: "0003", description: "0003 Caterpillar 320C", type: "Escavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "4", code: "0004", description: "0004 Caterpillar 315CL", type: "Escavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "5", code: "0005", description: "0005 Volvo EC55BPRO", type: "Escavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "6", code: "0006", description: "0006 Caterpillar 416E", type: "Retroescavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "7", code: "0007", description: "0007 Caterpillar 416E", type: "Retroescavadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "8", code: "0008", description: "0008 Caterpillar 924k", type: "Pá Carregadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "9", code: "0009", description: "0009 Case W20", type: "Pá Carregadeira", unit: "H", group: "Equipamento", base: "Própria" },
    { id: "10", code: "0010", description: "0010 Caterpillar 12H", type: "Motoniveladora", unit: "H", group: "Equipamento", base: "Própria" },
  ];

  const handleToggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleInclude = () => {
    const itemsToInclude = insumos.filter(i => selectedItems.includes(i.id));
    itemsToInclude.forEach(item => {
      onSelect({
        description: item.description,
        unit: item.unit,
      });
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[1200px] w-[95vw] h-[90vh] p-0 border-none shadow-2xl bg-white flex flex-col rounded-xl overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Selecionar Insumos</DialogTitle>
          <DialogDescription>Selecione os insumos para adicionar à solicitação.</DialogDescription>
        </DialogHeader>
        
        {/* Header Tabs Area */}
        <div className="bg-white border-b flex items-center justify-between pr-4">
          <div className="flex">
            <button className="px-10 py-4 text-sm font-black uppercase tracking-wider transition-all bg-[#2079D2] text-white">
              Insumos
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white h-8 px-4 text-[10px] font-black uppercase rounded-sm gap-1 shadow-sm">
              <Plus className="w-3 h-3" /> Novo
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 bg-[#F3A04C] hover:bg-[#e6923d] text-white border-none rounded-sm shadow-sm"
              onClick={onClose}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 flex items-center gap-6 border-b border-slate-200 bg-white">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar um insumo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-2 border-[#2079D2]/20 focus:border-[#2079D2] font-medium rounded-sm text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Base:</label>
              <Select defaultValue="propria">
                <SelectTrigger className="w-48 h-10 border-2 border-slate-50 text-xs font-bold uppercase rounded-sm focus:ring-0">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="propria">Própria</SelectItem>
                  <SelectItem value="sinapi">SINAPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Grupo:</label>
              <Select>
                <SelectTrigger className="w-48 h-10 border-2 border-slate-50 text-xs font-bold uppercase rounded-sm focus:ring-0">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Tipo:</label>
              <Select>
                <SelectTrigger className="w-48 h-10 border-2 border-slate-50 text-xs font-bold uppercase rounded-sm focus:ring-0">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escavadeira">Escavadeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-slate-50">
          <table className="w-full border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-slate-200">
                <th className="w-12 py-3 px-4 text-center">
                  <Checkbox 
                    className="border-slate-300 rounded-[2px]" 
                    checked={selectedItems.length === insumos.length}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedItems(insumos.map(i => i.id));
                      else setSelectedItems([]);
                    }}
                  />
                </th>
                <th className="w-10 text-center"><Star className="w-3 h-3 text-slate-300" /></th>
                <th className="text-[11px] font-black uppercase text-slate-400 py-3 px-4 text-left">Código</th>
                <th className="text-[11px] font-black uppercase text-slate-400 py-3 text-left">Descrição</th>
                <th className="text-[11px] font-black uppercase text-slate-400 py-3 text-center">Tipo</th>
                <th className="text-[11px] font-black uppercase text-slate-400 py-3 text-center">Unidade</th>
                <th className="text-[11px] font-black uppercase text-slate-400 py-3 text-center">Grupo</th>
                <th className="text-[11px] font-black uppercase text-slate-400 py-3 text-center">Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insumos.map((item) => (
                <tr 
                  key={item.id} 
                  className={cn(
                    "hover:bg-slate-50 transition-colors cursor-pointer group",
                    selectedItems.includes(item.id) ? "bg-blue-50/50" : "bg-white"
                  )}
                  onClick={() => handleToggleItem(item.id)}
                >
                  <td className="py-2 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      className="border-slate-300 rounded-[2px]" 
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleToggleItem(item.id)}
                    />
                  </td>
                  <td className="py-2 text-center"><Star className="w-3 h-3 text-slate-200" /></td>
                  <td className="py-2 px-4 text-xs font-bold text-slate-500">{item.code}</td>
                  <td className="py-2 text-sm font-bold text-slate-700 uppercase">{item.description}</td>
                  <td className="py-2 text-[10px] font-black uppercase text-slate-400 text-center italic">{item.type}</td>
                  <td className="py-2 text-xs font-bold text-slate-500 text-center">{item.unit}</td>
                  <td className="py-2 text-[10px] font-black uppercase text-slate-400 text-center">{item.group}</td>
                  <td className="py-2 text-xs font-bold text-slate-500 text-center">{item.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Area */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white h-10 px-8 text-[11px] font-black uppercase rounded-sm gap-2 shadow-lg"
              onClick={handleInclude}
              disabled={selectedItems.length === 0}
            >
              <Check className="w-4 h-4" /> Incluir
            </Button>
            {selectedItems.length > 0 && (
              <span className="text-[10px] font-black uppercase text-[#2079D2]">
                {selectedItems.length} {selectedItems.length === 1 ? "item selecionado" : "itens selecionados"}
              </span>
            )}
          </div>

          <Button variant="outline" className="h-10 text-[10px] font-black uppercase border-2 border-slate-100 hover:bg-slate-50 px-6">
            Carregar mais...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
