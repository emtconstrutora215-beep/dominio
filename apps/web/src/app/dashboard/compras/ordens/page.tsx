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
  DollarSign
} from "lucide-react";
import Link from "next/link";

export default function PurchaseOrdersPage() {
  const { data: orders, isLoading } = trpc.purchasing.getOrders.useQuery();

  if (isLoading) return <div className="p-6">Carregando ordens de compra...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ordens de Compra</h1>
          <p className="text-slate-500 mt-1">Gestão de pedidos emitidos, fornecedores e integração financeira.</p>
        </div>
        <Link href="/dashboard/compras/ordens/nova">
          <Button className="bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            Nova Ordem Direta
          </Button>
        </Link>
      </div>

      <div className="border rounded-2xl bg-white overflow-hidden shadow-sm border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[140px] font-bold text-slate-600">Número / Data</TableHead>
              <TableHead className="font-bold text-slate-600">Fornecedor</TableHead>
              <TableHead className="font-bold text-slate-600">Valor Total</TableHead>
              <TableHead className="font-bold text-slate-600">Centro de Custo</TableHead>
              <TableHead className="font-bold text-slate-600">Aprovação</TableHead>
              <TableHead className="font-bold text-slate-600">Prev. Entrega</TableHead>
              <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-400 py-16">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="w-12 h-12 text-slate-200" />
                    <p>Nenhuma ordem de compra encontrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (orders as any[] | undefined)?.map((order: any) => {
                const winner = order.quote.suppliers[0];
                const total = winner ? winner.totalPrice + winner.freight : 0;
                const deliveryForecast = winner ? addDays(new Date(order.createdAt), winner.deliveryDays) : null;

                return (
                  <TableRow key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-[#1e293b] bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{winner?.supplierName || "---"}</span>
                        <span className="text-[11px] text-slate-400 mt-0.5">{winner?.paymentTerms}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span className="text-slate-400 text-xs font-medium">R$</span>
                        {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {order.quote.request.project?.name || "Sede / Central"}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        {order.quote.request.approver?.name || "Auto / Admin"}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-medium text-slate-700">
                      {deliveryForecast ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Truck className="w-3.5 h-3.5 text-orange-500" />
                          {format(deliveryForecast, 'dd/MM/yyyy')}
                        </div>
                      ) : "---"}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge 
                        variant="secondary"
                        className={`
                          font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full
                          ${order.status === 'RECEIVED' ? 'bg-green-100 text-green-700 border-green-200' : 
                            order.status === 'AWAITING_RECEIPT' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                            'bg-slate-100 text-slate-600'}
                        `}
                      >
                        {order.status === 'RECEIVED' ? 'Recebido' : 
                         order.status === 'AWAITING_RECEIPT' ? 'Pendente' : order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
