"use client";

import { trpc } from "@/trpc/client";
import { useState } from "react";
import { PackageOpen, Coins, BarChart3, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function StockBalancesPage() {
  const [depotId, setDepotId] = useState("");
  const [search, setSearch] = useState("");
  
  const { data: depots, isLoading: isLoadingDepots } = trpc.stock.getDepots.useQuery();
  const { data: balances, isLoading: isLoadingBalances } = trpc.stock.getBalancesByDepot.useQuery(
    { depotId }, 
    { enabled: !!depotId }
  );

  const filteredBalances = (balances as any[] | undefined)?.filter((b: any) => 
    b.material.toLowerCase().includes(search.toLowerCase())
  );

  const totalDepotValue = (balances as any[] | undefined)?.reduce((acc: number, item: any) => acc + (item.quantity * item.averageUnitCost), 0) || 0;
  const activeItemsCount = (balances as any[] | undefined)?.filter((i: any) => i.quantity > 0).length || 0;

  if (isLoadingDepots) return <div className="p-6">Carregando almoxarifados...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Saldos em Estoque</h1>
        <p className="text-slate-500 mt-1">Consulte quantidades e Custo Médio Ponderado por almoxarifado.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
         <div className="space-y-1">
           <label className="text-sm font-medium">Selecione o Almoxarifado</label>
           <select 
             className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
             value={depotId}
             onChange={e => setDepotId(e.target.value)}
           >
             <option value="" disabled>Escolha um almoxarifado para visualizar...</option>
             {(depots as any[] | undefined)?.map((d: any) => (
               <option key={d.id} value={d.id}>{d.name} {d.projectId ? `(Obra: ${d.project?.name})` : `(Central)`}</option>
             ))}
           </select>
         </div>
         {depotId && (
           <div className="space-y-1">
             <label className="text-sm font-medium">Buscador de Materiais</label>
             <Input 
               placeholder="Buscar por cimento, aço..." 
               value={search} 
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
         )}
      </div>

      {depotId && !isLoadingBalances && (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Quantidade de Itens</CardDescription>
                <CardTitle className="text-2xl">{balances?.length || 0} Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{activeItemsCount} possuem saldo positivo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><Coins className="w-4 h-4"/> Valor Total Imobilizado (Custo Médio)</CardDescription>
                <CardTitle className="text-2xl text-orange-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDepotValue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Estimativa baseada nos custos ponderados</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                   {depots?.find(d => d.id === depotId)?.projectId ? <Building2 className="w-5 h-5 text-orange-500" /> : <PackageOpen className="w-5 h-5 text-blue-600" />}
                   Almoxarifado {depots?.find(d => d.id === depotId)?.projectId ? 'de Obra' : 'Central'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  {(depots as any[] | undefined)?.find((d: any) => d.id === depotId)?.name}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg bg-white overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">Material</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-center">Unid.</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-center">Saldo Atual</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-right">Custo Médio Unit.</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-right">Valor em Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(filteredBalances as any[] | undefined)?.map((stock: any) => {
                  const valorTotalItem = stock.quantity * stock.averageUnitCost;
                  const isEmpty = stock.quantity <= 0;

                  return (
                    <tr key={stock.id} className={`${isEmpty ? 'bg-red-50/20' : ''} hover:bg-slate-50 transition-colors`}>
                      <td className="px-6 py-4 font-medium text-slate-900">{stock.material}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{stock.unit}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isEmpty ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {stock.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stock.averageUnitCost)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalItem)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {filteredBalances?.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Nenhum material encontrado neste almoxarifado.
              </div>
            )}
          </div>
        </>
      )}

      {!depotId && (
        <div className="text-center py-20 border-2 border-dashed rounded-lg text-slate-400">
          <PackageOpen className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-1">Selecione um almoxarifado acima</h3>
          <p>Você precisa escolher a localização para visualizar os saldos de materiais.</p>
        </div>
      )}
    </div>
  );
}
