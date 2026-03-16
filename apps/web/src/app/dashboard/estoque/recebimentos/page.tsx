"use client";

import { trpc } from "@/trpc/client";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ScanLine, Box, ArrowRightCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function GoodsReceiptsPage() {
  const [selectedOrder, setSelectedOrder] = useState<{ id: string, quote: { request: { project: { name: string }, items: { id: string, description: string, quantity: number, unit: string }[] }, suppliers: { supplierName: string }[] }, goodsReceipts?: { items: { materialName: string, receivedQuantity: number }[] }[] } | null>(null);
  const [depotId, setDepotId] = useState("");
  const [receivedItems, setReceivedItems] = useState<Record<string, number>>({});
  
  const utils = trpc.useUtils();
  const { data: orders, isLoading: isLoadingOrders } = trpc.purchasing.getOrders.useQuery();
  const { data: depots } = trpc.stock.getDepots.useQuery();

  const receiptMutation = trpc.purchasing.registerReceipt.useMutation({
    onSuccess: () => {
      toast.success("Recebimento registrado com sucesso!");
      utils.purchasing.getOrders.invalidate();
      utils.stock.getBalancesByDepot.invalidate();
      setSelectedOrder(null);
      setReceivedItems({});
      setDepotId("");
    },
    onError: (err) => toast.error(err.message)
  });

  const handleReceive = () => {
    if (!depotId) return toast.error("Selecione um almoxarifado destino.");
    
    const payloadItems = Object.entries(receivedItems).map(([material, qty]) => {
       const originalItem = selectedOrder?.quote.request.items.find((i: { description: string, quantity: number }) => i.description === material);
       return {
         material,
         orderedQuantity: originalItem?.quantity || 0,
         receivedQuantity: qty
       };
    }).filter(i => i.receivedQuantity > 0);

    if (!selectedOrder) return;

    receiptMutation.mutate({
      orderId: selectedOrder.id,
      depotId,
      items: payloadItems
    });
  };

  const pendingOrders = orders?.filter(o => ['AWAITING_RECEIPT', 'PARTIALLY_RECEIVED'].includes(o.status)) || [];

  if (isLoadingOrders) return <div className="p-6">Carregando ordens de compra...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Recebimento Físico</h1>
        <p className="text-slate-500 mt-1">
          Confira as Ordens de Compra aguardando entrega e dê entrada no estoque.
        </p>
      </div>

      <div className="grid gap-4">
        {pendingOrders.map(order => {
          const supplier = order.quote.suppliers[0]; // Winning supplier
          const totalOrdered = order.quote.request.items.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0);

          return (
            <Card key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 px-6 hover:border-orange-500/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800">
                    OC #{order.id.slice(-6).toUpperCase()} - {supplier?.supplierName}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {order.quote.request.project.name} • {order.quote.request.items.length} itens ({totalOrdered} unidades)
                  </p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex items-center gap-4">
                <div className="text-right">
                  <Badge variant={order.status === 'PARTIALLY_RECEIVED' ? "secondary" : "default"} className="mb-1">
                     {order.status === 'PARTIALLY_RECEIVED' ? "Recebimento Parcial" : "Aguardando Recebimento"}
                  </Badge>
                  <p className="text-xs text-slate-400">
                    Emitida em {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Button onClick={() => setSelectedOrder(order)} variant="secondary">
                  Registrar Entrada <ArrowRightCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          );
        })}

        {pendingOrders.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-500">
            <Box className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            Nenhuma Ordem de Compra aguardando recebimento no momento.
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(val) => !val && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento Físico</DialogTitle>
            <DialogDescription>OC #{selectedOrder?.id.slice(-6).toUpperCase()}</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Almoxarifado Destino</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={depotId}
                  onChange={e => setDepotId(e.target.value)}
                >
                  <option value="" disabled>Selecione um almoxarifado...</option>
                  {depots?.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.projectId ? `(Obra)` : `(Central)`}</option>
                  ))}
                </select>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 text-slate-500 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Material / Descrição</th>
                      <th className="px-4 py-3 font-medium text-center">Unid.</th>
                      <th className="px-4 py-3 font-medium text-center">Qtd. Pedida</th>
                      <th className="px-4 py-3 font-medium text-center">Já Entregue</th>
                      <th className="px-4 py-3 font-medium text-right">Recebendo Agora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedOrder.quote.request.items.map((item: { id: string, description: string, unit: string, quantity: number }) => {
                       // Sum previously received for this item.
                       const alreadyReceived = selectedOrder.goodsReceipts?.flatMap((gr: { items: { materialName: string, receivedQuantity: number }[] }) => gr.items)
                          .filter((i: { materialName: string }) => i.materialName === item.description)
                          .reduce((acc: number, i: { receivedQuantity: number }) => acc + i.receivedQuantity, 0) || 0;
                       
                       const remaining = item.quantity - alreadyReceived;

                       return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{item.unit}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-center text-blue-600 font-medium">{alreadyReceived}</td>
                          <td className="px-4 py-3 flex justify-end">
                             <Input 
                               type="number" 
                               min="0"
                               max={remaining}
                               className="w-24 text-right"
                               placeholder={remaining.toString()}
                               value={receivedItems[item.description] ?? ''}
                               onChange={e => setReceivedItems(prev => ({
                                 ...prev,
                                 [item.description]: parseFloat(e.target.value) || 0
                               }))}
                             />
                          </td>
                        </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setSelectedOrder(null)}>Cancelar</Button>
                <Button onClick={handleReceive} disabled={receiptMutation.isPending}>
                  {receiptMutation.isPending ? "Confirmando..." : "Confirmar Recebimento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
