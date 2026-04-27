"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Info, 
  ChevronDown, 
  Search, 
  Download,
  Plus,
  MoreVertical,
  ArrowLeft,
  PackageOpen,
  Upload,
  Replace,
  Box,
  Wrench,
  Check
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { StockMovementDialog } from "@/components/estoque/StockMovementDialog";
import { cn } from "@/lib/utils";

export default function StockMovementsPage() {
  const [selectedDepots, setSelectedDepots] = useState<string[]>([]);
  const [tempSelectedDepots, setTempSelectedDepots] = useState<string[]>([]);
  const [depotSearch, setDepotSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("disponiveis");
  const [itemType, setItemType] = useState<"materials" | "equipment">("materials");
  const [availability, setAvailability] = useState("all");

  const utils = trpc.useUtils();
  const { data: depots } = trpc.stock.getDepots.useQuery();
  
  const { data: inventory, isLoading: isLoadingInv } = trpc.stock.getInventory.useQuery(
    { depotId: selectedDepots.length > 0 ? selectedDepots[0] : undefined },
    { enabled: activeTab === "disponiveis" }
  );

  const { data: assets, isLoading: isLoadingAssets } = trpc.stock.getAssets.useQuery(
    { depotId: selectedDepots.length > 0 ? selectedDepots[0] : undefined },
    { enabled: activeTab === "disponiveis" }
  );

  const { data: movements, isLoading: isLoadingMoves } = trpc.stock.getMovements.useQuery(
    { depotId: selectedDepots.length > 0 ? selectedDepots[0] : undefined },
    { enabled: activeTab !== "disponiveis" && activeTab !== "relatorios" }
  );

  const filteredDepots = depots?.filter(d => 
    d.name.toLowerCase().includes(depotSearch.toLowerCase())
  );

  const handleToggleDepot = (id: string) => {
    setTempSelectedDepots(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setTempSelectedDepots(depots?.map(d => d.id) || []);
    } else {
      setTempSelectedDepots([]);
    }
  };

  const applyFilter = () => {
    setSelectedDepots(tempSelectedDepots);
    setIsFilterOpen(false);
  };

  const getDepotLabel = () => {
    const active = selectedDepots;
    if (active.length === 0 || (depots && active.length === depots.length)) return "Todos";
    if (active.length === 1) return depots?.find(d => d.id === active[0])?.name;
    return `${active.length} Selecionados`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-700">Estoque</h1>
            <Info className="h-4 w-4 text-slate-400 cursor-help" />
          </div>

          {/* Custom Depot Filter */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <div className="flex items-center border border-slate-200 rounded overflow-hidden cursor-pointer hover:border-slate-300 transition-all group">
                <div className="bg-[#1A3C5E] px-4 py-2 text-white text-xs font-bold whitespace-nowrap border-r border-[#1A3C5E]">
                  Filtrado por Depósito:
                </div>
                <div className="bg-white px-4 py-2 flex items-center justify-between gap-8 min-w-[180px]">
                  <span className="text-slate-600 text-xs font-bold">{getDepotLabel()}</span>
                  <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", isFilterOpen && "rotate-180")} />
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 rounded-lg shadow-2xl border-slate-200 overflow-hidden" align="start">
              <div className="p-4 space-y-4">
                {/* Search in Dropdown */}
                <div className="relative">
                  <Input 
                    placeholder="Buscar" 
                    className="h-10 bg-white border-slate-200 pl-4 pr-10 text-sm rounded"
                    value={depotSearch}
                    onChange={(e) => setDepotSearch(e.target.value)}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>

                {/* Select All */}
                <div className="flex items-center gap-3 px-1 py-1">
                  <Checkbox 
                    id="all-depots" 
                    checked={depots && tempSelectedDepots.length === depots.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="all-depots" className="text-sm font-medium text-slate-600 cursor-pointer">
                    Todos os depósitos
                  </label>
                </div>

                {/* List of Deposits */}
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 py-2">Empresa</p>
                  {filteredDepots?.map((depot) => (
                    <div key={depot.id} className="flex items-center gap-3 px-1 py-2 hover:bg-slate-50 rounded transition-colors group">
                      <Checkbox 
                        id={`depot-${depot.id}`}
                        checked={tempSelectedDepots.includes(depot.id)}
                        onCheckedChange={() => handleToggleDepot(depot.id)}
                      />
                      <label htmlFor={`depot-${depot.id}`} className="text-sm text-slate-500 font-medium cursor-pointer group-hover:text-slate-700">
                        Depósito: {depot.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popover Footer */}
              <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between">
                <Button 
                  onClick={applyFilter}
                  className="bg-[#4CAF50] hover:bg-[#43A047] text-white h-10 px-8 rounded font-bold text-xs uppercase"
                >
                  FILTRAR
                </Button>
                <Button 
                  variant="outline"
                  className="h-10 bg-white border-slate-200 rounded text-slate-500 font-bold text-xs flex items-center gap-2 px-4"
                >
                  <Plus className="h-4 w-4" />
                  NOVO DEPÓSITO
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white h-10 px-6 rounded font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                + NOVA MOVIMENTAÇÃO
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
              <StockMovementDialog onSuccess={() => utils.stock.invalidate()} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex justify-start gap-8 rounded-none w-full mb-8">
            {["Disponíveis", "Entradas", "Saídas", "Transferências", "Relatórios"].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-[#1A3C5E] data-[state=active]:text-[#1A3C5E] data-[state=active]:shadow-none rounded-none py-3 px-1 font-medium text-slate-500 text-sm transition-all border-b-4 border-transparent"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="disponiveis" className="mt-0 space-y-6">
            {/* Sub-header Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center bg-white border border-slate-200 rounded p-1 shadow-sm">
                <Button 
                  onClick={() => setItemType("materials")}
                  className={cn(
                    "h-9 px-8 rounded text-sm font-bold transition-all",
                    itemType === "materials" 
                      ? "bg-[#1A3C5E] text-white shadow-md" 
                      : "bg-transparent text-slate-400 hover:text-slate-600 shadow-none hover:bg-slate-50"
                  )}
                >
                  Materiais
                </Button>
                <Button 
                  onClick={() => setItemType("equipment")}
                  className={cn(
                    "h-9 px-8 rounded text-sm font-bold transition-all",
                    itemType === "equipment" 
                      ? "bg-[#1A3C5E] text-white shadow-md" 
                      : "bg-transparent text-slate-400 hover:text-slate-600 shadow-none hover:bg-slate-50"
                  )}
                >
                  Equipamentos
                </Button>
              </div>

              <div className="flex flex-1 max-w-4xl gap-4">
                <div className="relative flex-1">
                  <Input 
                    placeholder="Busque um insumo" 
                    className="h-10 bg-white border-slate-200 pl-4 pr-10 text-sm rounded focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4CAF50]" />
                </div>

                <div className="w-64 space-y-1 relative">
                   <div className="absolute -top-5 left-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Disponibilidade de insumos</div>
                   <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger className="h-10 bg-white border-slate-200 rounded text-xs">
                      <SelectValue placeholder="Disponíveis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Disponíveis</SelectItem>
                      <SelectItem value="low">Estoque Baixo</SelectItem>
                      <SelectItem value="out">Esgotados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white h-10 px-4 rounded flex items-center gap-2 font-bold text-xs">
                  <Download className="h-4 w-4" />
                  BAIXAR
                </Button>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden mt-4">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="w-[15%] pl-6 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Código</TableHead>
                    <TableHead className="w-[35%] font-bold text-slate-500 uppercase text-[11px] tracking-wider">Insumo</TableHead>
                    <TableHead className="w-[10%] text-center font-bold text-slate-500 uppercase text-[11px] tracking-wider">Qtde</TableHead>
                    <TableHead className="w-[20%] font-bold text-slate-500 uppercase text-[11px] tracking-wider">Centro de custo</TableHead>
                    <TableHead className="w-[15%] font-bold text-slate-500 uppercase text-[11px] tracking-wider">Depósito</TableHead>
                    <TableHead className="w-[5%] text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingInv || isLoadingAssets ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 italic">Carregando estoque...</TableCell></TableRow>
                  ) : itemType === "materials" ? (
                    inventory?.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Nenhum material em estoque.</TableCell></TableRow>
                    ) : inventory?.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 border-slate-100 h-14">
                        <TableCell className="pl-6 font-medium text-slate-500 text-sm">{item.catalogItem?.code || '95'}</TableCell>
                        <TableCell className="font-bold text-slate-700 text-sm uppercase">
                          {item.catalogItem?.description || item.material}
                        </TableCell>
                        <TableCell className="text-center text-slate-600 font-medium text-sm">
                          {item.quantity.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm font-medium">Empresa</TableCell>
                        <TableCell className="text-slate-600 text-sm font-medium">{item.depot?.name}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4CAF50]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    assets?.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Nenhum equipamento encontrado.</TableCell></TableRow>
                    ) : assets?.map((asset) => (
                      <TableRow key={asset.id} className="hover:bg-slate-50/50 border-slate-100 h-14">
                        <TableCell className="pl-6 font-medium text-slate-500 text-sm">{asset.tag || asset.catalogItem?.code}</TableCell>
                        <TableCell className="font-bold text-slate-700 text-sm uppercase">
                          {asset.catalogItem?.description}
                        </TableCell>
                        <TableCell className="text-center text-slate-600 font-medium text-sm">
                          1
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm font-medium">Empresa</TableCell>
                        <TableCell className="text-slate-600 text-sm font-medium">{asset.currentDepot?.name}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4CAF50]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer Summary */}
            <div className="flex justify-end items-center gap-4 mt-6">
              <span className="text-slate-400 text-sm font-medium">Quantidade total de disponíveis</span>
              <div className="bg-white border border-slate-200 px-6 py-2 rounded shadow-sm">
                <span className="text-xl font-bold text-[#1A3C5E]">
                  {itemType === "materials" 
                    ? inventory?.reduce((acc, i) => acc + i.quantity, 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })
                    : assets?.length.toLocaleString('pt-BR')
                  }
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entradas" className="mt-0">
             <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <HistoryTable movements={movements?.filter(m => m.type === 'ENTRY') || []} isLoading={isLoadingMoves} />
             </div>
          </TabsContent>

          <TabsContent value="saidas" className="mt-0">
             <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <HistoryTable movements={movements?.filter(m => m.type === 'EXIT') || []} isLoading={isLoadingMoves} />
             </div>
          </TabsContent>

          <TabsContent value="transferencias" className="mt-0">
             <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <HistoryTable movements={movements?.filter(m => m.type.startsWith('TRANSFER')) || []} isLoading={isLoadingMoves} />
             </div>
          </TabsContent>

          <TabsContent value="relatorios" className="mt-0">
             <div className="bg-white border border-slate-200 rounded shadow-sm p-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                  <Info className="h-8 w-8 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Relatórios de Estoque</h3>
                  <p className="text-slate-400 max-w-sm mx-auto">Em breve: Módulo avançado de análise financeira e giro de estoque.</p>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function HistoryTable({ movements, isLoading }: { movements: any[], isLoading: boolean }) {
  return (
    <Table>
      <TableHeader className="bg-[#F8FAFC]">
        <TableRow className="hover:bg-transparent border-slate-200">
          <TableHead className="pl-6 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Data / Hora</TableHead>
          <TableHead className="font-bold text-slate-500 uppercase text-[11px] tracking-wider">Item / Ativo</TableHead>
          <TableHead className="text-center font-bold text-slate-500 uppercase text-[11px] tracking-wider">Qtd</TableHead>
          <TableHead className="font-bold text-slate-500 uppercase text-[11px] tracking-wider">Local</TableHead>
          <TableHead className="pr-6 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Usuário</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">Carregando histórico...</TableCell></TableRow>
        ) : movements?.length === 0 ? (
          <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Nenhuma movimentação encontrada.</TableCell></TableRow>
        ) : movements?.map((move) => (
          <TableRow key={move.id} className="hover:bg-slate-50/50 border-slate-100 h-14">
            <TableCell className="pl-6 text-xs font-bold text-slate-500">
              {new Date(move.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <p className="font-bold text-slate-700 text-sm uppercase">{move.stockItem?.catalogItem?.description || move.stockItem?.material}</p>
                {move.asset && (
                  <span className="text-[10px] font-bold text-orange-600">TAG: {move.asset.tag}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-center font-bold text-slate-700 text-sm">{move.quantity}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <p className="text-xs font-bold text-slate-800">{move.depot?.name}</p>
                {move.projectStage && <p className="text-[9px] text-slate-400 uppercase">Obra: {move.projectStage.project?.name}</p>}
              </div>
            </TableCell>
            <TableCell className="pr-6 font-medium text-slate-600 text-xs">
              {move.user?.name}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
