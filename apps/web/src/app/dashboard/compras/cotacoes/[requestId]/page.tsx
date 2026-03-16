"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileCheck, Plus, ShoppingCart, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function QuoteMapPage({ params }: { params: { requestId: string } }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const requestId = params.requestId;

  const { data: quote, isLoading } = trpc.purchasing.getQuoteByRequest.useQuery({ requestId });
  
  const addSupplier = trpc.purchasing.createSupplierQuote.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor adicionado à cotação!");
      utils.purchasing.getQuoteByRequest.invalidate({ requestId });
      setNewSupplier({});
    },
    onError: (err) => toast.error(err.message)
  });

  const markWinner = trpc.purchasing.markWinningSupplier.useMutation({
    onSuccess: () => {
      toast.success("Vencedor selecionado!");
      utils.purchasing.getQuoteByRequest.invalidate({ requestId });
    }
  });

  const generateOrderMutation = trpc.purchasing.generateOrder.useMutation({
    onSuccess: () => {
      toast.success("Ordem de Compra gerada e lançamentos financeiros criados!");
      router.push("/dashboard/compras/ordens");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const [newSupplier, setNewSupplier] = useState<Partial<{supplierName: string, unitPrice: number, totalPrice: number, freight: number, deliveryDays: number, paymentTerms: string}>>({});
  const [installments, setInstallments] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState("");

  if (isLoading) return <div className="p-6">Carregando mapa...</div>;

  const suppliers = quote?.suppliers || [];
  const hasWinner = (suppliers as any[]).some((s: any) => s.isWinner);

  // Calculate winners for highlighting
  const minTotalPrice = suppliers.length > 0 ? Math.min(...(suppliers as any[]).map((s: any) => s.totalPrice + s.freight)) : 0;
  const minDeliveryDays = suppliers.length > 0 ? Math.min(...(suppliers as any[]).map((s: any) => s.deliveryDays)) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/compras/cotacoes">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mapa Comparativo de Cotações</h1>
          <p className="text-slate-500 mt-1">Solicitação #{requestId.slice(0,8)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* ADD SUPPLIER FORM */}
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Cotação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Fornecedor</label>
              <Input value={newSupplier.supplierName || ''} onChange={e => setNewSupplier({...newSupplier, supplierName: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Valor Unitário Médio (Opcional)</label>
              <Input type="number" step="0.01" value={newSupplier.unitPrice || ''} onChange={e => setNewSupplier({...newSupplier, unitPrice: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm font-medium">Valor Total dos Itens</label>
              <Input type="number" step="0.01" value={newSupplier.totalPrice || ''} onChange={e => setNewSupplier({...newSupplier, totalPrice: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm font-medium">Frete (R$)</label>
              <Input type="number" step="0.01" value={newSupplier.freight || ''} onChange={e => setNewSupplier({...newSupplier, freight: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm font-medium">Prazo de Entrega (Dias)</label>
              <Input type="number" value={newSupplier.deliveryDays || ''} onChange={e => setNewSupplier({...newSupplier, deliveryDays: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm font-medium">Condição Pagamento</label>
              <Input placeholder="Ex: 30/60/90 dias" value={newSupplier.paymentTerms || ''} onChange={e => setNewSupplier({...newSupplier, paymentTerms: e.target.value})} />
            </div>
            <Button 
              className="w-full" 
              disabled={addSupplier.isPending || !newSupplier.supplierName || !newSupplier.totalPrice}
              onClick={() => addSupplier.mutate({
                requestId,
                quoteId: quote?.id,
                supplierName: newSupplier.supplierName || "",
                unitPrice: newSupplier.unitPrice || 0,
                totalPrice: newSupplier.totalPrice || 0,
                deliveryDays: newSupplier.deliveryDays || 0,
                paymentTerms: newSupplier.paymentTerms || "À vista",
                freight: newSupplier.freight || 0
              })}
            >
              <Plus className="w-4 h-4 mr-2" /> {addSupplier.isPending ? "Adicionando..." : "Salvar Fornecedor"}
            </Button>
          </CardContent>
        </Card>

        {/* COMPARATIVE MAP */}
        <div className="md:col-span-3 space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map(sup => {
              const isPriceWinner = (sup.totalPrice + sup.freight) === minTotalPrice;
              const isDeliveryWinner = sup.deliveryDays === minDeliveryDays;

              return (
                <Card key={sup.id} className={`relative overflow-hidden ${sup.isWinner ? 'border-primary shadow-md ring-2 ring-primary bg-slate-50' : ''}`}>
                  {sup.isWinner && (
                    <div className="absolute top-0 right-0 p-2">
                      <Badge className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" /> Vencedor</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{sup.supplierName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Valor Itens:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sup.totalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Frete:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sup.freight)}
                        </span>
                      </div>
                      <div className={`flex justify-between text-sm pt-2 border-t px-2 -mx-2 ${isPriceWinner ? 'bg-green-50 text-green-700 font-semibold' : 'font-bold'}`}>
                        <span>Total Geral:</span>
                        <span>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sup.totalPrice + sup.freight)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-100 p-3 rounded-md text-sm space-y-2">
                      <div className={`flex justify-between px-2 -mx-2 py-1 rounded-sm ${isDeliveryWinner ? 'bg-green-50 text-green-700 font-semibold' : ''}`}>
                        <span className="text-slate-500">Entrega:</span>
                        <span>{sup.deliveryDays} dias</span>
                      </div>
                      <div className="flex justify-between px-2 -mx-2">
                        <span className="text-slate-500">Pagamento:</span>
                        <span className="font-semibold">{sup.paymentTerms}</span>
                      </div>
                    </div>

                    {!sup.isWinner && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => markWinner.mutate({ quoteId: sup.quoteId, supplierId: sup.id })}
                        disabled={markWinner.isPending}
                      >
                        <FileCheck className="w-4 h-4 mr-2 text-slate-500" /> Escolher este
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {suppliers.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed rounded-lg">
                Adicione fornecedores ao lado para montar seu Mapa Comparativo.
              </div>
            )}
          </div>

          {/* GENERATE ORDER SECTION */}
          {hasWinner && (
            <Card className="border-primary/50 shadow-sm bg-primary/5 mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Gerar Ordem de Compra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="text-sm font-medium">Quantidade de Parcelas</label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={installments} 
                      onChange={e => setInstallments(parseInt(e.target.value))} 
                      className="w-48 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data do Primeiro Vencimento</label>
                    <Input 
                      type="date" 
                      value={firstDueDate} 
                      onChange={e => setFirstDueDate(e.target.value)} 
                      className="w-48 bg-white"
                    />
                  </div>
                  <Button 
                    onClick={() => generateOrderMutation.mutate({ quoteId: quote!.id, installments, firstDueDate })}
                    disabled={generateOrderMutation.isPending || !firstDueDate || installments < 1}
                    className="flex-1 min-w-[200px]"
                  >
                    {generateOrderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                    Confirmar e Emitir Ordem de Compra
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Isso irá bloquear o mapa de cotações, emitir a Ordem e provisionar os {installments} lançamento(s) correspondentes no módulo Financeiro de Contas a Pagar. A alçada de aprovação será avaliada agora.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
