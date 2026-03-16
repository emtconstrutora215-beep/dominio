"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, Send, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function MedicaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const measurementId = params.measurementId as string;
  const supabase = createClient();

  const { data: measurement, isLoading } = trpc.measurement.getMeasurementById.useQuery({ id: measurementId });
  const utils = trpc.useUtils();

  const submitMutation = trpc.measurement.submitMeasurement.useMutation({
     onSuccess: () => {
        toast.success("Medição enviada para aprovação.");
        utils.measurement.getMeasurementById.invalidate({ id: measurementId });
     }
  });

  const approveMutation = trpc.measurement.approveMeasurement.useMutation({
     onSuccess: () => {
        toast.success("Medição aprovada e Contas a Pagar gerado.");
        utils.measurement.getMeasurementById.invalidate({ id: measurementId });
     },
     onError: (err) => {
        toast.error("Erro: " + err.message);
     }
  });

  const rejectMutation = trpc.measurement.rejectMeasurement.useMutation({
     onSuccess: () => {
        toast.success("Medição rejeitada e devolvida.");
        utils.measurement.getMeasurementById.invalidate({ id: measurementId });
        setIsRejectOpen(false);
     }
  });

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading) return <div className="p-8">Carregando boletim de medição...</div>;
  if (!measurement) return <div className="p-8">Não encontrado.</div>;

  const renderStatusBadge = () => {
     switch (measurement.status) {
        case 'APPROVED': return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
        case 'REJECTED': return <Badge variant="destructive">Rejeitado</Badge>;
        case 'PENDING_APPROVAL': return <Badge variant="secondary" className="bg-yellow-500 text-white">Pend. Aprovação</Badge>;
        default: return <Badge variant="outline">Rascunho</Badge>;
     }
  };

  const getFileUrl = (path: string) => {
     const { data } = supabase.storage.from('reports').getPublicUrl(path);
     return data.publicUrl;
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto printable">
      <div className="flex justify-between items-center non-printable">
        <div className="flex items-center gap-4">
          <Button variant="ghost" type="button" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2"/> Voltar</Button>
          <h1 className="text-3xl font-bold text-primary">Boletim de Medição</h1>
          {renderStatusBadge()}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => window.print()}><Download className="h-4 w-4 mr-2"/> PDF / Imprimir</Button>
        </div>
      </div>

      {measurement.status === 'REJECTED' && measurement.rejectionReason && (
         <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
            <h4 className="font-semibold flex items-center gap-2"><XCircle className="w-4 h-4" /> Motivo da Rejeição:</h4>
            <p className="mt-1 text-sm">{measurement.rejectionReason}</p>
            <p className="mt-2 text-xs text-red-600">Rejeitado por {measurement.rejectedBy?.name || 'Sistema'} em {new Date(measurement.rejectedAt!).toLocaleDateString('pt-BR')}</p>
         </div>
      )}

      <Card>
        <CardHeader>
           <div className="flex justify-between">
              <div>
                 <CardTitle>Boletim: {measurement.contract.supplierName}</CardTitle>
                 <CardDescription>CNPJ: {measurement.contract.supplierCnpj || 'Não informado'}</CardDescription>
              </div>
              <div className="text-right">
                 <p className="text-sm font-medium">Data: {new Date(measurement.createdAt).toLocaleDateString('pt-BR')}</p>
                 <p className="text-sm text-muted-foreground">Criado por: {measurement.measuredBy.name}</p>
              </div>
           </div>
        </CardHeader>
        <CardContent className="space-y-6">
           {measurement.notes && (
             <div className="text-sm bg-slate-50 p-3 rounded border">
                <strong>Notas: </strong> {measurement.notes}
             </div>
           )}

           <div>
              <h3 className="font-semibold mb-3">Itens Medidos</h3>
              <div className="border rounded">
                 <table className="w-full text-sm">
                   <thead className="bg-slate-50 border-b">
                     <tr>
                       <th className="p-3 text-left">Descrição</th>
                       <th className="p-3 text-center">Unid.</th>
                       <th className="p-3 text-right">Qtd. Medida</th>
                       <th className="p-3 text-right">Valor Unit.</th>
                       <th className="p-3 text-right">Total Item</th>
                     </tr>
                   </thead>
                   <tbody>
                      {measurement.items.map((mItem: { id: string, quantity: number, contractItem: { description: string, unit: string, unitPrice: number } }) => (
                         <tr key={mItem.id} className="border-b last:border-0">
                           <td className="p-3">{mItem.contractItem.description}</td>
                           <td className="p-3 text-center">{mItem.contractItem.unit}</td>
                           <td className="p-3 text-right">{mItem.quantity}</td>
                           <td className="p-3 text-right">{formatCurrency(mItem.contractItem.unitPrice)}</td>
                           <td className="p-3 text-right font-medium">{formatCurrency(mItem.quantity * mItem.contractItem.unitPrice)}</td>
                         </tr>
                      ))}
                   </tbody>
                 </table>
              </div>
           </div>

           <div className="flex justify-end pt-4">
              <div className="w-72 space-y-2 text-sm">
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Bruto:</span>
                    <span className="font-medium">{formatCurrency(measurement.grossValue)}</span>
                 </div>
                 <div className="flex justify-between text-red-600">
                    <span>Retenção ({measurement.contract.retentionPercentage}%):</span>
                    <span>- {formatCurrency(measurement.retentionValue)}</span>
                 </div>
                 <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                    <span>Valor a Pagar:</span>
                    <span>{formatCurrency(measurement.netValue)}</span>
                 </div>
              </div>
           </div>

           {measurement.attachments.length > 0 && (
              <div className="pt-6 non-printable">
                 <h3 className="font-semibold mb-3">Anexos</h3>
                 <div className="flex flex-wrap gap-4">
                    {measurement.attachments.map((path: string, idx: number) => (
                       <a key={idx} href={getFileUrl(path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 border p-2 rounded text-sm hover:bg-slate-50 text-blue-600">
                          <FileText className="w-4 h-4" /> Anexo {idx + 1}
                       </a>
                    ))}
                 </div>
              </div>
           )}
        </CardContent>
        
        {/* Actions Toolbar */}
        <div className="bg-slate-50 border-t p-4 flex gap-4 justify-end rounded-b-lg non-printable">
           {measurement.status === 'DRAFT' && (
              <Button onClick={() => submitMutation.mutate({ id: measurementId })} disabled={submitMutation.isPending} className="w-full sm:w-auto">
                 <Send className="w-4 h-4 mr-2" /> Enviar para Aprovação
              </Button>
           )}

           {measurement.status === 'PENDING_APPROVAL' && (
              <>
                <Button variant="destructive" onClick={() => setIsRejectOpen(true)}>
                   <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate({ id: measurementId })} disabled={approveMutation.isPending}>
                   <CheckCircle className="w-4 h-4 mr-2" /> Aprovar e Gerar Pgto
                </Button>
              </>
           )}
        </div>
      </Card>

      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Rejeitar Medição</h2>
            <div>
              <label className="text-sm font-medium">Motivo da Rejeição (obrigatório)</label>
              <textarea placeholder="Indique o que precisa ser corrigido..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full mt-2 p-2 border rounded-md" rows={4} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>Cancelar</Button>
              <Button variant="destructive" disabled={rejectReason.length < 3 || rejectMutation.isPending} onClick={() => rejectMutation.mutate({ id: measurementId, reason: rejectReason })}>
                 Confirmar Rejeição
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
