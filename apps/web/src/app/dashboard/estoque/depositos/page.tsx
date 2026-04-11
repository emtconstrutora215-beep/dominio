"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Plus, 
  ArrowLeft, 
  Search, 
  MapPin, 
  Building2, 
  TrendingUp, 
  Package, 
  Wrench,
  Warehouse,
  ChevronRight,
  Loader2,
  Pencil
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DepotDialog } from "@/components/estoque/DepotDialog";

export default function StockDepotsPage() {
  const [search, setSearch] = useState("");
  const { data: depots, isLoading, isError, error } = trpc.stock.getDepots.useQuery();

  console.log("Depots Debug:", { isLoading, isError, error, depotsCount: depots?.length });

  const filteredDepots = depots?.filter(d => 
    (d.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (d.project?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.location || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = depots?.reduce((acc, d) => acc + d.totalValue, 0) || 0;
  
  // Grouping logic
  const groupedDepots = useMemo(() => {
    if (!filteredDepots) return [];
    
    const groups: Record<string, { name: string; depots: any[]; totalValue: number; isCentral: boolean }> = {};
    
    filteredDepots.forEach((depot: any) => {
      const groupKey = depot.projectId || "central";
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: depot.projectId ? (depot.project?.name || "Obra não Identificada") : "ALMOXARIFADOS CENTRAIS",
          depots: [],
          totalValue: 0,
          isCentral: !depot.projectId
        };
      }
      groups[groupKey].depots.push(depot);
      groups[groupKey].totalValue += (depot.totalValue || 0);
    });

    // Sort: Central first, then by project name
    return Object.entries(groups).sort(([ak, av], [bk, bv]) => {
      if (av.isCentral) return -1;
      if (bv.isCentral) return 1;
      const nameA = av.name || "";
      const nameB = bv.name || "";
      return nameA.localeCompare(nameB);
    });
  }, [filteredDepots]);
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Top Header & Global Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Warehouse className="h-48 w-48 text-[#1A3C5E]" />
        </div>
        
        <div className="flex items-center gap-5 relative z-10">
          <Link href="/dashboard/estoque">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-50 border border-slate-100">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#1A3C5E] tracking-tight">Depósitos & Almoxarifados</h1>
            <p className="text-slate-500 font-medium">Gestão centralizada de locais de estoque e distribuição.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Patrimonial Total</p>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-2xl font-black text-[#1A3C5E]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </p>
            </div>
          </div>
          <div className="bg-[#1A3C5E] px-6 py-3 rounded-2xl border border-[#1A3C5E] shadow-lg shadow-blue-900/10">
             <p className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-1">Total de Almoxarifados</p>
             <p className="text-2xl font-black text-white">{depots?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, local ou obra..." 
            className="pl-10 h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-[#F07B2B]/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DepotDialog />
      </div>

      {/* Grid Layout */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 text-[#F07B2B] animate-spin" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Carregando locais de estoque...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center">
          <p className="text-red-600 font-bold">Erro ao carregar depósitos:</p>
          <p className="text-red-500 text-sm mt-1">{error?.message || "Erro desconhecido"}</p>
          <Button 
            variant="outline" 
            className="mt-4 border-red-200 text-red-600 hover:bg-red-100"
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </Button>
        </div>
      ) : filteredDepots?.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-dotted border-slate-200 p-24 text-center">
          <Warehouse className="h-16 w-16 text-slate-200 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-900">Nenhum depósito encontrado</h2>
          <p className="text-slate-500 mt-2">Crie seu primeiro almoxarifado no botão acima para começar.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {groupedDepots.map(([groupKey, group]) => (
            <div key={groupKey} className="space-y-6">
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${group.isCentral ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-orange-600'}`}>
                    {group.isCentral ? <Warehouse className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#1A3C5E] uppercase tracking-tight">{group.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {group.depots.length} {group.depots.length === 1 ? 'Depósito Ativo' : 'Depósitos Ativos'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Imobilizado no Grupo</p>
                  <p className="text-lg font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.totalValue)}
                  </p>
                </div>
              </div>

              {/* Depots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {group.depots.map((depot) => (
                  <Card key={depot.id} className="group overflow-hidden rounded-[32px] border-slate-100 hover:border-[#F07B2B]/30 hover:shadow-2xl hover:shadow-orange-900/5 transition-all duration-300">
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#1A3C5E] group-hover:text-white transition-all duration-500">
                          <Warehouse className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-2">
                           <DepotDialog editDepot={depot}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400">
                                 <Pencil className="h-4 w-4" />
                              </Button>
                           </DepotDialog>
                           <Badge variant="outline" className="rounded-full bg-slate-50/50 text-slate-500 font-bold border-none px-3">
                              ID: #{depot.id.slice(-4).toUpperCase()}
                           </Badge>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-[#F07B2B] transition-colors">{depot.name}</h3>
                        <div className="flex items-center gap-2 mt-2 text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-[#F07B2B]" />
                          <span className="text-xs font-medium">{depot.location || "Sem localização registrada"}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-8 pb-8 space-y-6">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50 group-hover:bg-white transition-all">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                          <Building2 className="h-4 w-4 text-[#1A3C5E]" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Vinculado à Obra</p>
                          <p className="text-[11px] font-black text-slate-600 truncate">
                            {depot.project?.name || "DEPÓSITO CENTRAL / GERAL"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Bullk</p>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-emerald-500" />
                              <span className="text-lg font-black text-slate-800">{depot._count?.stockItems || 0} <span className="text-xs text-slate-400 font-normal">tipos</span></span>
                            </div>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos (TAG)</p>
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-[#F07B2B]" />
                              <span className="text-lg font-black text-slate-800">{depot._count?.stockAssets || 0} <span className="text-xs text-slate-400 font-normal">unid.</span></span>
                            </div>
                         </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-orange-50/30 transition-all">
                       <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Avaliação Atual</p>
                          <p className="text-lg font-black text-[#1A3C5E]">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(depot.totalValue)}
                          </p>
                       </div>
                       <Link href={`/dashboard/estoque/movimentacoes?depotId=${depot.id}`}>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white shadow-sm hover:bg-[#1A3C5E] hover:text-white transition-all border border-slate-200">
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                       </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
