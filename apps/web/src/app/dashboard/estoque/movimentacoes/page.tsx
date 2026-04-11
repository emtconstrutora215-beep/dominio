"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  PackageOpen, 
  ArrowLeft, 
  History, 
  LayoutDashboard, 
  Search, 
  Filter,
  Download,
  Upload,
  Replace,
  Box,
  Truck,
  Wrench,
  CircleCheck,
  CircleAlert,
  BarChart3
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { StockMovementDialog } from "@/components/estoque/StockMovementDialog";

export default function StockMovementsPage() {
  const [depotId, setDepotId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("saldos");

  const utils = trpc.useUtils();
  const { data: depots } = trpc.stock.getDepots.useQuery();
  
  const { data: inventory, isLoading: isLoadingInv } = trpc.stock.getInventory.useQuery(
    { depotId: depotId === "all" ? undefined : depotId },
    { enabled: activeTab === "saldos" }
  );

  const { data: assets, isLoading: isLoadingAssets } = trpc.stock.getAssets.useQuery(
    { depotId: depotId === "all" ? undefined : depotId },
    { enabled: activeTab === "equipamentos" }
  );

  const { data: movements, isLoading: isLoadingMoves } = trpc.stock.getMovements.useQuery(
    { depotId: depotId === "all" ? undefined : depotId },
    { enabled: activeTab === "historico" }
  );

  // Financial Summary Calculations
  const totalInStock = inventory?.reduce((acc, item) => acc + (item.totalValue || 0), 0) || 0;
  const equipmentCount = assets?.length || 0;
  const availableAssets = assets?.filter((a: any) => a.status === 'AVAILABLE').length || 0;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Disponível</Badge>;
      case 'IN_USE': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">Em Uso</Badge>;
      case 'MAINTENANCE': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">Manutenção</Badge>;
      case 'RETIRED': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">Baixado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderMovementIcon = (type: string) => {
    switch (type) {
      case 'ENTRY': return <Download className="h-4 w-4 text-emerald-500" />;
      case 'EXIT': return <Upload className="h-4 w-4 text-red-500" />;
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT': return <Replace className="h-4 w-4 text-blue-500" />;
      default: return <PackageOpen className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Top Header & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <Link href="/dashboard/estoque">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-50 border border-slate-100">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#1A3C5E] tracking-tight">Movimentações</h1>
            <p className="text-slate-500 font-medium">Controle físico e financeiro de materiais e equipamentos.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Total Imobilizado</p>
            <p className="text-2xl font-black text-[#1A3C5E]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInStock)}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-emerald-600">Disponíveis</span>
              <span className="text-lg font-bold text-emerald-700">{availableAssets}</span>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-blue-600">Em Uso</span>
              <span className="text-lg font-bold text-blue-700">{equipmentCount - availableAssets}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Persistence Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-72 space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Localização</label>
          <Select value={depotId} onValueChange={setDepotId}>
            <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white">
              <SelectValue placeholder="Todos os Depósitos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Depósitos</SelectItem>
              {depots?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-2 relative">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Filtro Rápido</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome, tag ou número de série..." 
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <StockMovementDialog onSuccess={() => utils.stock.invalidate()} />
      </div>

      {/* Main Content Areas */}
      <Tabs defaultValue="disponiveis" className="w-full space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200 h-auto flex flex-wrap md:flex-nowrap gap-1 w-full md:w-fit shadow-sm">
          <TabsTrigger 
            value="disponiveis" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#1A3C5E] data-[state=active]:shadow-sm py-2.5 px-6 font-bold text-slate-500 transition-all flex items-center gap-2.5 text-[10px] uppercase tracking-widest"
          >
            <Box className="w-4 h-4 text-slate-400 group-data-[state=active]:text-[#F07B2B]" /> 
            Disponíveis
          </TabsTrigger>
          <TabsTrigger 
            value="entradas" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#1A3C5E] data-[state=active]:shadow-sm py-2.5 px-6 font-bold text-slate-500 transition-all flex items-center gap-2.5 text-[10px] uppercase tracking-widest"
          >
            <Download className="w-4 h-4 text-slate-400" /> 
            Entradas
          </TabsTrigger>
          <TabsTrigger 
            value="saidas" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#1A3C5E] data-[state=active]:shadow-sm py-2.5 px-6 font-bold text-slate-500 transition-all flex items-center gap-2.5 text-[10px] uppercase tracking-widest"
          >
            <Upload className="w-4 h-4 text-slate-400" /> 
            Saídas
          </TabsTrigger>
          <TabsTrigger 
            value="transferencias" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#1A3C5E] data-[state=active]:shadow-sm py-2.5 px-6 font-bold text-slate-500 transition-all flex items-center gap-2.5 text-[10px] uppercase tracking-widest"
          >
            <Replace className="w-4 h-4 text-slate-400" /> 
            Transferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disponiveis" className="mt-0 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Box className="h-4 w-4 text-slate-400" /> Materiais e Bulk
              </h3>
              <Badge variant="outline" className="bg-white">Total: {inventory?.length || 0} Itens</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[40%] pl-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Material</TableHead>
                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">UN</TableHead>
                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Saldo</TableHead>
                    <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Custo Médio</TableHead>
                    <TableHead className="text-right pr-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingInv ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 italic">Carregando...</TableCell></TableRow>
                  ) : inventory?.filter(i => i.catalogItem?.type !== 'EQUIPMENT').map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 border-slate-50 group">
                      <TableCell className="pl-8 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 leading-tight">{item.catalogItem?.description || item.material}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{item.catalogItem?.code || 'S/ CODE'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-slate-500 font-bold text-xs">{item.unit}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2.5rem] py-1 rounded-lg font-bold ${item.quantity > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-slate-600 font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.averageUnitCost)}
                      </TableCell>
                      <TableCell className="text-right pr-8 font-black text-[#1A3C5E]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#F07B2B]" /> Equipamentos Disponíveis
              </h3>
              <Badge variant="outline" className="bg-white">Total: {assets?.filter(a => a.status === 'AVAILABLE').length || 0} Ativos</Badge>
            </div>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="pl-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Patrimônio / TAG</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Descrição</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Local</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAssets ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">Carregando...</TableCell></TableRow>
                ) : assets?.filter(a => a.status === 'AVAILABLE').map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-slate-50/50 border-slate-50 group">
                    <TableCell className="pl-8 py-4">
                      <span className="font-mono font-bold text-[#F07B2B] bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{asset.tag || 'S/ TAG'}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900">{asset.catalogItem?.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Truck className="h-3.5 w-3.5 text-slate-400" />
                        {asset.currentDepot?.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       {renderStatusBadge(asset.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="entradas" className="mt-0">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <HistoryTable movements={movements?.filter(m => m.type === 'ENTRY') || []} isLoading={isLoadingMoves} />
          </Card>
        </TabsContent>

        <TabsContent value="saidas" className="mt-0">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <HistoryTable movements={movements?.filter(m => m.type === 'EXIT') || []} isLoading={isLoadingMoves} />
          </Card>
        </TabsContent>

        <TabsContent value="transferencias" className="mt-0">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <HistoryTable movements={movements?.filter(m => m.type.startsWith('TRANSFER')) || []} isLoading={isLoadingMoves} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryTable({ movements, isLoading }: { movements: any[], isLoading: boolean }) {
  const renderMovementIcon = (type: string) => {
    switch (type) {
      case 'ENTRY': return <Download className="h-4 w-4 text-emerald-500" />;
      case 'EXIT': return <Upload className="h-4 w-4 text-red-500" />;
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT': return <Replace className="h-4 w-4 text-blue-500" />;
      default: return <PackageOpen className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Table>
      <TableHeader className="bg-slate-50/50">
        <TableRow className="hover:bg-transparent border-slate-100">
          <TableHead className="pl-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Data / Hora</TableHead>
          <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Tipo</TableHead>
          <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Item / Ativo</TableHead>
          <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Qtd</TableHead>
          <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Local</TableHead>
          <TableHead className="pr-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Usuário</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Carregando histórico...</TableCell></TableRow>
        ) : movements?.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400">Nenhuma movimentação encontrada.</TableCell></TableRow>
        ) : movements?.map((move) => (
          <TableRow key={move.id} className="hover:bg-slate-50/50 border-slate-50">
            <TableCell className="pl-8 py-4 text-xs font-bold text-slate-500">
              {new Date(move.createdAt).toLocaleString()}
            </TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                  {renderMovementIcon(move.type)}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <p className="font-bold text-slate-900">{move.stockItem?.catalogItem?.description || move.stockItem?.material}</p>
              {move.asset && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 rounded">TAG: {move.asset.tag}</span>
              )}
            </TableCell>
            <TableCell className="text-center font-bold text-slate-700">{move.quantity}</TableCell>
            <TableCell>
              <p className="text-xs font-bold text-slate-800">{move.depot?.name}</p>
              {move.projectStage && <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Etapa: {move.projectStage.name}</p>}
            </TableCell>
            <TableCell className="pr-8 font-medium text-slate-600">
              {move.user?.name}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
