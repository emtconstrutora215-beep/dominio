"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Plus, 
  Search, 
  Warehouse,
  Loader2,
  Pencil,
  Info,
  Users,
  Layers,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepotDialog } from "@/components/estoque/DepotDialog";
import { cn } from "@/lib/utils";

export default function StockDepotsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ativados");
  const { data: depots, isLoading, isError, error } = trpc.stock.getDepots.useQuery();

  const filteredDepots = depots?.filter(d => 
    (d.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (d.project?.name || "").toLowerCase().includes(search.toLowerCase())
  );
  
  // Grouping logic for the compact layout
  const groupedDepots = useMemo(() => {
    if (!filteredDepots) return [];
    
    const groups: Record<string, { name: string; depots: any[]; isCentral: boolean }> = {};
    
    filteredDepots.forEach((depot: any) => {
      const groupKey = depot.projectId || "central";
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: depot.projectId ? (depot.project?.name || "Obra não Identificada") : "Empresa",
          depots: [],
          isCentral: !depot.projectId
        };
      }
      groups[groupKey].depots.push(depot);
    });

    // Sort: Central first, then by project name
    return Object.entries(groups).sort(([ak, av], [bk, bv]) => {
      if (av.isCentral) return -1;
      if (bv.isCentral) return 1;
      return (av.name || "").localeCompare(bv.name || "");
    });
  }, [filteredDepots]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700">Meus depósitos</h1>
          <Info className="h-4 w-4 text-slate-400 cursor-help" />
        </div>
        <DepotDialog>
          <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white h-9 px-6 rounded font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
            <Plus className="h-4 w-4" />
            NOVO DEPÓSITO
          </Button>
        </DepotDialog>
      </div>

      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-300 h-10 p-1 flex justify-start gap-1 rounded-lg w-fit mb-8 shadow-sm">
            {["Ativados", "Desativados"].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab.toLowerCase()}
                className="data-[state=active]:bg-[#1A3C5E] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-1.5 px-6 font-black text-slate-600 text-[11px] transition-all"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="ativados" className="mt-0 space-y-6">
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <Input 
                placeholder="Busque um depósito" 
                className="h-10 bg-white border-slate-300 pl-4 pr-10 text-sm font-medium text-slate-900 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4CAF50]" />
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="h-10 w-10 text-[#4CAF50] animate-spin" />
                <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Carregando...</p>
              </div>
            ) : isError ? (
              <div className="bg-red-50 border border-red-100 p-8 rounded-xl text-center">
                <p className="text-red-700 font-bold">Erro ao carregar depósitos</p>
              </div>
            ) : filteredDepots?.length === 0 ? (
              <div className="bg-white rounded-xl border border-dotted border-slate-300 p-24 text-center">
                <Warehouse className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                <h2 className="text-xl font-black text-slate-900">Nenhum depósito encontrado</h2>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedDepots.map(([groupKey, group]) => (
                  <div key={groupKey} className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-md">
                    {/* Compact Table Header */}
                    <div className="bg-slate-100/80 px-6 py-2.5 border-b border-slate-300 flex items-center justify-between">
                      <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                        {group.isCentral ? "Empresa" : group.name}
                      </h3>
                      <div className="flex items-center gap-16 md:gap-32 mr-4 md:mr-12">
                        <span className="text-[10px] font-black text-slate-500 uppercase w-32 text-center">Permissões para visualizar</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase w-32 text-center">Disponíveis</span>
                        <span className="w-8"></span>
                      </div>
                    </div>

                    {/* Depot Rows */}
                    <div className="divide-y divide-slate-100">
                      {group.depots.map((depot: any) => (
                        <div key={depot.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-5">
                            <Circle className="h-3 w-3 fill-[#4CAF50] text-[#4CAF50]" />
                            <span className="text-sm font-black text-slate-800">Depósito: {depot.name}</span>
                          </div>

                          <div className="flex items-center gap-16 md:gap-32">
                            <div className="w-32 flex justify-center items-center text-slate-900">
                              <span className="text-[13px] font-bold">{depot.userCount} {depot.userCount === 1 ? 'usuário' : 'usuários'}</span>
                            </div>
                            <div className="w-32 flex justify-center items-center text-slate-900">
                              <span className="text-[13px] font-black">{depot.totalInsumos?.toLocaleString('pt-BR')} insumos</span>
                            </div>
                            <div className="w-8 flex justify-end">
                              <DepotDialog editDepot={depot}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-[#4CAF50] hover:bg-white transition-all shadow-sm">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DepotDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="desativados">
            <div className="bg-white rounded-xl border border-slate-200 p-24 text-center">
              <Warehouse className="h-16 w-16 text-slate-200 mx-auto mb-6 opacity-50" />
              <h2 className="text-xl font-bold text-slate-900 opacity-50">Nenhum depósito desativado</h2>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
