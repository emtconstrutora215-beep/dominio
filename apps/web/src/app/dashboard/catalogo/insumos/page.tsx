"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Loader2, Plus, Search, Star, Printer, RotateCw, AlertCircle, History, 
  ChevronLeft, ChevronRight, CheckCircle2, XCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InsumoFormData = {
  code?: string;
  description: string;
  unit: string;
  type: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'SERVICE';
  typeCategory?: string;
  base?: string;
  unitCost: number;
};

import { InsumoDialog } from "@/components/catalogo/InsumoDialog";

export default function InsumosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  
  // Filtros
  const [baseFilter, setBaseFilter] = useState("Todas");
  const [groupFilter, setGroupFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState("Todas");

  const utils = trpc.useUtils();
  
  const { data, isLoading, error } = trpc.catalogItem.list.useQuery({
    page,
    perPage: 20,
    search: search.length >= 2 ? search : undefined,
    base: baseFilter,
    type: groupFilter !== 'Todas' ? groupFilter as any : undefined,
    typeCategory: typeFilter,
    isActive: activeTab === "ACTIVE"
  });

  const { data: filterOptions } = trpc.catalogItem.getFilterOptions.useQuery();

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <InsumoDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        item={selectedItem}
        filterOptions={filterOptions}
        onSuccess={() => {
            utils.catalogItem.list.invalidate();
            utils.catalogItem.getFilterOptions.invalidate();
        }}
      />

      {/* Header Profissional */}
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
           <h1 className="text-2xl font-black text-[#1A3C5E] tracking-tight uppercase">Insumos</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={handleOpenCreate}
                className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-bold h-9 px-4 rounded shadow-sm gap-2"
            >
                <Plus className="w-4 h-4" /> Novo
            </Button>

          <Button variant="outline" size="icon" className="h-9 w-9 bg-[#33b5e5] hover:bg-[#2bbbad] text-white border-none shadow-sm">
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 border-2 border-slate-200 text-slate-400 hover:bg-slate-100">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Control Bar - Filtros */}
      <div className="bg-white border-b px-8 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shrink-0">
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Busca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input 
              placeholder="Digite aqui sua busca..." 
              className="pl-10 h-10 border-2 border-slate-100 bg-slate-50 rounded-md font-bold text-xs placeholder:text-slate-300 focus-visible:ring-blue-400/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Base:</label>
          <Select value={baseFilter} onValueChange={setBaseFilter}>
            <SelectTrigger className="h-10 border-2 border-slate-100 bg-slate-50 font-bold text-xs text-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {filterOptions?.bases.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Grupo:</label>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-10 border-2 border-slate-100 bg-slate-50 font-bold text-xs text-slate-600 uppercase">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="MATERIAL">Material</SelectItem>
              <SelectItem value="LABOR">Mão de Obra</SelectItem>
              <SelectItem value="EQUIPMENT">Equipamento</SelectItem>
              <SelectItem value="SERVICE">Serviço/Taxa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Tipo:</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 border-2 border-slate-100 bg-slate-50 font-bold text-xs text-slate-600">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {filterOptions?.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Insumos:</label>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
            <TabsList className="w-full h-10 bg-slate-100 p-1 border-2 border-slate-100">
              <TabsTrigger value="ACTIVE" className="flex-1 text-[10px] font-black uppercase rounded-sm data-[state=active]:bg-[#33b5e5] data-[state=active]:text-white">Ativo</TabsTrigger>
              <TabsTrigger value="INACTIVE" className="flex-1 text-[10px] font-black uppercase rounded-sm data-[state=active]:bg-[#33b5e5] data-[state=active]:text-white">Inativo</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tabela de Alta Densidade */}
      <main className="flex-1 overflow-hidden p-8">
        <div className="bg-white border-2 border-slate-100 rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Table className="relative min-w-[1200px]">
              <TableHeader className="sticky top-0 bg-white shadow-sm z-20">
                <TableRow className="bg-[#f2f4f8] hover:bg-[#f2f4f8] border-b-2 border-slate-200">
                  <TableHead className="w-12 px-2 text-center border-r border-slate-200"><Input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" /></TableHead>
                  <TableHead className="w-12 px-2 text-center border-r border-slate-200"><Star className="w-3.5 h-3.5 text-slate-300 mx-auto" /></TableHead>
                  <TableHead className="w-32 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Código</TableHead>
                  <TableHead className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Descrição</TableHead>
                  <TableHead className="w-48 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo</TableHead>
                  <TableHead className="w-24 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Unidade</TableHead>
                  <TableHead className="w-40 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Grupo</TableHead>
                  <TableHead className="w-32 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Base</TableHead>
                  <TableHead className="w-40 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Custo Unitário</TableHead>
                  <TableHead className="w-16 h-10 px-2 text-center border-l border-slate-200"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="h-[400px] text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1A3C5E]" /></TableCell></TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-[400px] text-center">
                      <div className="flex flex-col items-center gap-2 text-red-500">
                        <AlertCircle className="w-8 h-8" />
                        <p className="font-black uppercase text-xs">Erro ao carregar insumos</p>
                        <p className="text-[10px] font-bold text-slate-400">{error.message}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data || data.items.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-[400px] text-center text-slate-300 uppercase font-black tracking-widest italic">Nenhum registro encontrado</TableCell></TableRow>
                ) : (
                  data.items.map((item: any, idx: number) => (
                    <TableRow 
                      key={item.id} 
                      className={cn("hover:bg-blue-50/30 transition-colors h-11 border-b border-slate-100 cursor-pointer", idx % 2 === 1 && "bg-slate-50/30")}
                      onClick={() => handleOpenEdit(item)}
                    >
                      <TableCell className="text-center px-2" onClick={(e) => e.stopPropagation()}><Input type="checkbox" className="w-3.5 h-3.5" /></TableCell>
                      <TableCell className="text-center px-2 text-slate-300"><Star className="w-3.5 h-3.5 hover:text-amber-400 cursor-pointer" /></TableCell>
                      <TableCell className="px-4 font-mono text-[11px] font-black text-slate-600 tracking-tighter">{item.code || '----'}</TableCell>
                      <TableCell className="px-4 text-[11px] font-bold text-[#1A3C5E] uppercase tracking-tight truncate max-w-[400px]">{item.description}</TableCell>
                      <TableCell className="px-4 text-[11px] font-bold text-slate-500 uppercase">{item.typeCategory || '---'}</TableCell>
                      <TableCell className="px-4 text-[11px] font-black text-slate-400 text-center uppercase">{item.unit}</TableCell>
                      <TableCell className="px-4 font-bold text-[10px] text-slate-500 uppercase">
                        {item.type === 'MATERIAL' ? 'Material' : item.type === 'LABOR' ? 'Mão de Obra' : item.type === 'EQUIPMENT' ? 'Equipamento' : 'Serviço'}
                      </TableCell>
                      <TableCell className="px-4">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">{item.base || 'Própria'}</span>
                      </TableCell>
                      <TableCell className="px-4 text-right font-black text-[11px] text-slate-700">
                        {formatCurrency(item.unitCost)}
                      </TableCell>
                      <TableCell className="px-2 text-center text-slate-300 border-l border-slate-50">
                        <TooltipProvider>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                <History className="w-3.5 h-3.5 hover:text-blue-500 cursor-pointer mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent><p className="text-[10px] font-bold uppercase">Histórico / Detalhes</p></TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer - Paginação Slim */}
          <footer className="border-t px-8 py-3 bg-[#f8fafc] flex items-center justify-between shrink-0">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Total de <span className="text-slate-700">{data?.totalCount || 0}</span> registros
             </div>
             <div className="flex items-center gap-4">
               <button 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 className="flex items-center text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 disabled:opacity-30" 
                 disabled={page === 1}
               >
                 <ChevronLeft className="w-4 h-4" /> Anterior
               </button>
               <div className="px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-blue-600">
                 PÁGINA {page} DE {data?.totalPages || 1}
               </div>
               <button 
                 onClick={() => setPage(p => Math.min(data?.totalPages || 1, p + 1))}
                 className="flex items-center text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 disabled:opacity-30" 
                 disabled={page >= (data?.totalPages || 1)}
               >
                 Próxima <ChevronRight className="w-4 h-4" />
               </button>
             </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
