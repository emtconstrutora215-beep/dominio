"use client";

import { trpc } from "@/trpc/client";
import { format } from "date-fns";
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

export default function PurchaseOrdersPage() {
  const { data: orders, isLoading } = trpc.purchasing.getOrders.useQuery();

  if (isLoading) return <div className="p-6">Carregando ordens de compra...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ordens de Compra (Pedidos)</h1>
        <p className="text-slate-500 mt-1">Histórico completo de Cotações vencedoras e seus lançamentos no Contas a Pagar.</p>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número / Data</TableHead>
              <TableHead>Obra (Projeto)</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Financeiro (Parcelas)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhuma ordem de compra gerada ainda. Vá ao Mapa de Cotações para aprovar um fornecedor.
                </TableCell>
              </TableRow>
            ) : (
              (orders as any[] | undefined)?.map((order: any) => {
                const winner = order.quote.suppliers[0];
                const total = winner ? winner.totalPrice + winner.freight : 0;

                return (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-mono text-sm text-primary font-bold">#{order.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-slate-500">{format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</div>
                  </TableCell>
                  <TableCell className="font-medium">{order.quote.request.project.name}</TableCell>
                  <TableCell>
                    {winner ? (
                      <div>
                        <div>{winner.supplierName}</div>
                        <div className="text-xs text-slate-500">Entrega: {winner.deliveryDays}d | Frete: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(winner.freight)}</div>
                      </div>
                    ) : "Desconhecido"}
                  </TableCell>
                  <TableCell className="font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {(order.financialEntries as any[]).map((entry: any) => (
                        <div key={entry.id} title={`Vence: ${format(new Date(entry.dueDate), 'dd/MM')}`} className="text-xs bg-slate-100 border text-slate-600 px-2 py-0.5 rounded">
                          {format(new Date(entry.dueDate), 'dd/MM')} (R$ {entry.amount.toFixed(2)})
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'ISSUED' ? 'default' : 'secondary'}>
                      {order.status === 'ISSUED' ? 'Emitido (Provisão)' : order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
