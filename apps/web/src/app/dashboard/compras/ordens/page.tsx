"use client";

import { trpc } from "@/trpc/client";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ShoppingCart, 
  Truck, 
  Calendar, 
  UserCheck, 
  Building2,
  DollarSign,
  Loader2,
  Search,
  Filter,
  CreditCard,
  ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { data: orders, isLoading } = trpc.purchasing.getOrders.useQuery();

  // Calculate metrics
  const totalValue = orders?.reduce((acc, order) => {
    const winner = order.quote.suppliers[0];
    return acc + (winner ? (winner.totalPrice + winner.freight) : 0);
  }, 0) || 0;

  const pendingReceipt = orders?.filter(o => o.status === 'AWAITING_RECEIPT').length || 0;
  const receivedCount = orders?.filter(o => o.status === 'RECEIVED').length || 0;
  const totalOrders = orders?.length || 0;

  if (isLoading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-slate-400 font-bold animate-pulse">Sincronizando Ordens de Compra...</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f8fafc] min-h-screen font-sans antialiased">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Módulo ERP</span>
             <span className="text-slate-300">/</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suprimentos</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <ShoppingCart className="w-8 h-8 text-slate-800" />
             Hub de Gestão de Compras
          </h1>
          <p className="text-slate-500 font-medium mt-1">Visão consolidada de ordens emitidas, fluxo de caixa e recebimento físico.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-12 border-slate-200 bg-white font-bold text-slate-600 gap-2 px-6 rounded-xl hover:bg-slate-50 transition-all">
              <Calendar className="w-5 h-5 text-slate-400" />
              Relatórios
           </Button>
           <Link href="/dashboard/compras/ordens/nova">
            <Button className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-black h-12 px-8 rounded-xl gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all text-base border-0">
              <Plus className="w-6 h-6" />
              Nova Ordem Direta
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="border-0 shadow-sm bg-white overflow-hidden group">
            <div className="p-6 relative">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-300">
                     <DollarSign className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-0 font-black">+12%</Badge>
               </div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Movimentado</span>
               <div className="text-2xl font-black text-slate-900">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
               </div>
            </div>
         </Card>

         <Card className="border-0 shadow-sm bg-white overflow-hidden group">
            <div className="p-6 relative">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-500 transition-colors duration-300">
                     <ShoppingCart className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <span className="text-slate-300 text-[10px] font-bold">Total: {totalOrders}</span>
               </div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pedidos Emitidos</span>
               <div className="text-2xl font-black text-slate-900">
                  {totalOrders} <span className="text-sm text-slate-400 font-bold ml-1">Ordens</span>
               </div>
            </div>
         </Card>

         <Card className="border-0 shadow-sm bg-white overflow-hidden group">
            <div className="p-6 relative">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-300">
                     <Truck className="w-6 h-6 text-amber-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0 font-black">Atenção</Badge>
               </div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pendente Recebimento</span>
               <div className="text-2xl font-black text-slate-900">
                  {pendingReceipt} <span className="text-sm text-slate-400 font-bold ml-1">OCs</span>
               </div>
            </div>
         </Card>

         <Card className="border-0 shadow-sm bg-white overflow-hidden group">
            <div className="p-6 relative">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-300">
                     <UserCheck className="w-6 h-6 text-emerald-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <span className="text-slate-300 text-[10px] font-bold">Taxa: 98%</span>
               </div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pedidos Concluídos</span>
               <div className="text-2xl font-black text-slate-900">
                  {receivedCount} <span className="text-sm text-slate-400 font-bold ml-1">Ordens</span>
               </div>
            </div>
         </Card>
      </div>

      {/* 3. LIST HUB */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
           <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   placeholder="Buscar por número, fornecedor ou obra..." 
                   className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-sm"
                 />
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <Button variant="ghost" className="h-11 font-bold text-slate-500 hover:text-blue-500 hover:bg-blue-50 gap-2">
                 <Filter className="w-4 h-4" />
                 Filtros Avançados
              </Button>
              <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block" />
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                 <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-white shadow-sm text-slate-700 transition-all">Ativas</button>
                 <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md text-slate-400 hover:text-slate-600 transition-all">Histórico</button>
              </div>
           </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-b border-slate-100 h-14">
              <TableHead className="w-[110px] font-black text-[10px] text-slate-400 uppercase tracking-[0.15em] pl-8"># ID</TableHead>
              <TableHead className="w-[120px] font-black text-[10px] text-slate-400 uppercase tracking-[0.15em]">Data</TableHead>
              <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-[0.15em]">Fornecedor</TableHead>
              <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-[0.15em]">Centro de Custo</TableHead>
              <TableHead className="w-[180px] font-black text-[10px] text-slate-400 uppercase tracking-[0.15em]">Investimento</TableHead>
              <TableHead className="w-[150px] font-black text-[10px] text-slate-400 uppercase tracking-[0.15em]">Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-400 py-24">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                       <ShoppingCart className="w-10 h-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                       <p className="font-bold text-slate-600 tracking-tight">Nenhuma ordem encontrada</p>
                       <p className="text-sm">Inicie uma nova compra direta ou use o fluxo de cotações.</p>
                    </div>
                    <Link href="/dashboard/compras/ordens/nova">
                       <Button variant="outline" className="mt-4 border-dashed border-2 hover:border-blue-400 hover:text-blue-500 transition-all font-bold">
                          Criar primeira ordem
                       </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order: any) => {
                const winner = order.quote.suppliers[0];
                const total = winner ? (winner.totalPrice + winner.freight) : 0;
                
                return (
                  <TableRow 
                    key={order.id} 
                    onClick={() => router.push(`/dashboard/compras/ordens/${order.id}`)}
                    className="group hover:bg-blue-50/20 transition-all cursor-pointer border-b border-slate-50 last:border-0 h-[88px]"
                  >
                    <TableCell className="pl-8">
                       <div className="flex flex-col gap-1">
                          <span className="font-black text-xs text-slate-800 tracking-tight group-hover:text-blue-500 transition-colors">
                            {order.number || `#${order.id.slice(-6).toUpperCase()}`}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-500 tracking-tight">
                            {format(new Date(order.createdAt), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                            {format(new Date(order.createdAt), "yyyy")}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-slate-700 tracking-tight group-hover:underline decoration-blue-500/30 decoration-2 underline-offset-4">{winner?.supplierName || "---"}</span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                           <CreditCard className="w-3 h-3 text-slate-300" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{winner?.paymentTerms || 'Consulte financeiro'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                           <Building2 className="w-4 h-4 text-[#F07B2B]" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                             {order.quote.request.project?.name || "SEDE / ADMINISTRATIVO"}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">
                              {order.quote.request.approver?.name || "Responsável não definido"}
                           </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 w-fit group-hover:bg-white group-hover:border-blue-200 transition-all">
                        <div className="flex items-baseline gap-1.5">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">R$</span>
                           <span className="text-lg font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`
                          font-black text-[9px] uppercase tracking-[0.1em] px-3 py-1 rounded-lg border-0 shadow-sm
                          ${order.status === 'RECEIVED' ? 'bg-emerald-500 text-white' : 
                            order.status === 'PARTIALLY_RECEIVED' ? 'bg-blue-500 text-white' : 
                            order.status === 'AWAITING_RECEIPT' ? 'bg-amber-500 text-white shadow-amber-200/50' : 
                            'bg-slate-100 text-slate-500'}
                        `}
                      >
                        {order.status === 'RECEIVED' ? 'Concluído' : 
                         order.status === 'PARTIALLY_RECEIVED' ? 'Recebido Parcial' : 
                         order.status === 'AWAITING_RECEIPT' ? 'Pendente' : order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                             <ChevronRight className="w-5 h-5" />
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
           <div className="flex items-center gap-4">
              <span>Total de registros: {totalOrders}</span>
              <div className="h-3 w-[1px] bg-slate-200" />
              <span>Itens exibidos: {orders?.length}</span>
           </div>
           <div className="flex items-center gap-2">
              <Button disabled variant="outline" size="sm" className="h-8 rounded-lg bg-white opacity-50">Anterior</Button>
              <Button disabled variant="outline" size="sm" className="h-8 rounded-lg bg-white opacity-50">Próxima</Button>
           </div>
        </div>
      </div>
    </div>
  );
}
