"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { UploadCloud, AlertTriangle, FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NfeImportPage() {
  const [file, setFile] = useState<File | null>(null);
  
  const parseMutation = trpc.nfe.parseAndSuggest.useMutation({
    onError: (err) => toast.error(err.message)
  });

  const confirmMutation = trpc.nfe.confirmNfe.useMutation({
    onSuccess: () => {
      toast.success("Nota Fiscal processada e Contas a Pagar gerado com sucesso!");
      setFile(null);
      parseMutation.reset();
    },
    onError: (err) => toast.error(err.message)
  });

  const handleUpload = async () => {
    if (!file) return;
    const xmlContent = await file.text();
    parseMutation.mutate({ xmlContent });
  };

  const { data } = parseMutation;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Importação de NF-e (XML)</h1>
        <p className="text-slate-500 mt-1">Transforme notas fiscais automaticamente em Contas a Pagar e vincule a Ordens de Compra.</p>
      </div>

      {!data && (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
             <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold text-slate-900">Selecione o arquivo XML da NF-e</h3>
             <p className="text-sm text-slate-500 mb-6 max-w-sm">
               O sistema irá ler o CNPJ do fornecedor e varrer suas Ordens de Compra pendentes buscando valores correspondentes.
             </p>
             <div className="flex flex-col items-center gap-4">
               <input 
                 type="file" 
                 accept=".xml" 
                 onChange={e => setFile(e.target.files?.[0] || null)} 
                 className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
               />
               <Button onClick={handleUpload} disabled={!file || parseMutation.isPending} size="lg">
                 {parseMutation.isPending ? "Processando XML..." : "Analisar Arquivo"}
               </Button>
             </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
             <Card>
               <CardHeader className="pb-3 border-b bg-slate-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Dados da NF-e Extraídos
                  </CardTitle>
               </CardHeader>
               <CardContent className="pt-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Fornecedor</p>
                    <p className="font-medium">{data.parsedData.supplierName} <span className="text-slate-500 text-sm ml-2">CNPJ: {data.parsedData.cnpj || 'N/A'}</span></p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Emissão (Competência)</p>
                       <p className="font-medium">{format(new Date(data.parsedData.issueDate), "dd/MM/yyyy")}</p>
                     </div>
                     <div>
                       <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Valor Total</p>
                       <p className="font-medium text-lg text-blue-700">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.parsedData.totalValue)}
                       </p>
                     </div>
                  </div>
                  <div className="pt-3 border-t">
                     <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Itens Detectados ({data.parsedData.items.length})</p>
                     <ul className="text-sm space-y-1">
                        {data.parsedData.items.slice(0, 3).map((it: { description: string, quantity: number, unit: string }, idx: number) => (
                           <li key={idx} className="flex justify-between text-slate-700">
                             <span className="truncate pr-4">- {it.description}</span>
                             <span>{it.quantity} {it.unit}</span>
                           </li>
                        ))}
                        {data.parsedData.items.length > 3 && (
                           <li className="text-slate-400 italic">...e mais {data.parsedData.items.length - 3} itens</li>
                        )}
                     </ul>
                  </div>
               </CardContent>
             </Card>

             <Card className="border-blue-200">
               <CardHeader className="pb-3 border-b bg-blue-50/50">
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                    <ShoppingCart className="w-5 h-5" />
                    Buscador de Ordem de Compra
                  </CardTitle>
               </CardHeader>
               <CardContent className="pt-4 flex flex-col justify-between">
                  {data.suggestions.length > 0 ? (
                    <div className="space-y-4">
                       <p className="text-sm text-slate-600">Encontramos correspondências nos seus pedidos em aberto:</p>
                       {data.suggestions.map((sug: { orderInfo: { id: string, project: string, totalPrice: number }, discrepancy: { hasPriceDiscrepancy: boolean } }, idx: number) => (
                          <div key={idx} className={`p-3 rounded-lg border ${sug.discrepancy.hasPriceDiscrepancy ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="font-semibold text-sm">Pedido #{sug.orderInfo.id.slice(-6).toUpperCase()}</p>
                                   <p className="text-xs text-slate-500">Obra: {sug.orderInfo.project}</p>
                                </div>
                                <div className="text-right">
                                   <p className="font-semibold text-sm">
                                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sug.orderInfo.totalPrice)}
                                   </p>
                                   {sug.discrepancy.hasPriceDiscrepancy && (
                                     <Badge variant="destructive" className="mt-1 flex gap-1 items-center text-[10px] w-fit ml-auto">
                                       <AlertTriangle className="w-3 h-3"/> Divergência
                                     </Badge>
                                   )}
                                </div>
                             </div>
                             
                             <div className="mt-3 text-right">
                               <Button size="sm" onClick={() => confirmMutation.mutate({
                                  supplierName: data.parsedData.supplierName,
                                  issueDate: new Date(data.parsedData.issueDate).toISOString(),
                                  totalValue: data.parsedData.totalValue,
                                  dueDate: new Date(data.parsedData.issueDate).toISOString(), // Should prompt for due date theoretically
                                  linkedPurchaseOrderId: sug.orderInfo.id
                               })} disabled={confirmMutation.isPending}>
                                  Processar e Dar Baixa neste Pedido
                               </Button>
                             </div>
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 space-y-3">
                       <p>Nenhum pedido de compra pendente encontrado com tolerância de ±10% do valor da nota para este fornecedor.</p>
                       <p className="text-sm">Trata-se de uma compra de balcão sem pedido prévio?</p>
                       
                       <Button variant="outline" className="mt-2" onClick={() => confirmMutation.mutate({
                          supplierName: data.parsedData.supplierName,
                          issueDate: new Date(data.parsedData.issueDate).toISOString(),
                          totalValue: data.parsedData.totalValue,
                          dueDate: new Date(data.parsedData.issueDate).toISOString()
                       })} disabled={confirmMutation.isPending}>
                          Gerar Contas a Pagar Avulso (Sem Pedido)
                       </Button>
                    </div>
                  )}
               </CardContent>
             </Card>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
             <Button variant="ghost" className="text-slate-500" onClick={() => { setFile(null); parseMutation.reset(); }}>
               Cancelar e tentar outro XML
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}
