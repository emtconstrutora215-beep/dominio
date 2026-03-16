"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function NovaMedicaoPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const supabase = createClient();

  const { data: contracts } = trpc.contract.getContractsByProject.useQuery({ projectId });

  const utils = trpc.useUtils();
  const createMutation = trpc.measurement.createMeasurement.useMutation({
     onSuccess: (data) => {
        toast.success("O boletim de medição foi salvo como rascunho.");
        utils.measurement.getMeasurementsByProject.invalidate({ projectId });
        router.push(`/dashboard/projetos/${projectId}/medicao/${data.id}`);
     },
     onError: (err) => {
        toast.error("Erro: " + err.message);
     }
  });

  const [contractId, setContractId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{contractItemId: string, quantity: number}[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedContract = contracts?.find((c: { id: string, items: any[] }) => c.id === contractId);

  const handleContractChange = (id: string) => {
     setContractId(id);
     const contract = contracts?.find((c: { id: string, items: { id: string }[] }) => c.id === id);
     if (contract) {
        setItems(contract.items.map((i: { id: string }) => ({ contractItemId: i.id, quantity: 0 })));
     }
  };

  const handleQuantityChange = (contractItemId: string, quantity: number) => {
     setItems(prev => prev.map((i: any) => i.contractItemId === contractItemId ? { ...i, quantity } : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!contractId) return;

     setIsUploading(true);
     const uploadedPaths: string[] = [];

     try {
       for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${projectId}/measurements/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('reports')
            .upload(filePath, file);

          if (uploadError) throw uploadError;
          uploadedPaths.push(data.path);
       }

       createMutation.mutate({
          contractId,
          notes,
          attachments: uploadedPaths,
          items: items.filter(i => i.quantity > 0)
       });
     } catch (err: unknown) {
        const error = err as Error;
        toast.error("Erro de Upload: " + error.message);
        setIsUploading(false);
     }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" type="button" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2"/> Voltar</Button>
        <h1 className="text-3xl font-bold text-primary">Novo Boletim de Medição</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
             <CardTitle>Selecionar Contrato</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label>Contrato / Fornecedor</Label>
                 <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={contractId} onChange={e => handleContractChange(e.target.value)}>
                    <option value="" disabled>Selecione um contrato...</option>
                    {contracts?.map((c: { id: string, supplierName: string, retentionPercentage: number, totalValue: number }) => (
                       <option key={c.id} value={c.id}>{c.supplierName} - {c.retentionPercentage}% / Total: R$ {c.totalValue}</option>
                    ))}
                 </select>
               </div>
               <div className="space-y-2">
                 <Label>Observações / Notas</Label>
                 <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Período de referência, notas sobre qualidade, etc." />
               </div>
               <div className="space-y-2 pt-4">
                 <Label>Anexos (Opcional - Fotos, PDFs assinados)</Label>
                 <div className="flex items-center gap-4 mt-2">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                       <UploadCloud className="w-4 h-4 mr-2" /> Escolher Arquivos
                    </Button>
                    <input id="file-upload" type="file" multiple className="hidden" onChange={(e) => {
                       if (e.target.files) setFiles(Array.from(e.target.files));
                    }} />
                    <span className="text-sm text-muted-foreground">{files.length} arquivo(s) selecionado(s)</span>
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>

        {selectedContract && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Itens a Medir</CardTitle>
              <CardDescription>Insira a quantidade executada neste período.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {selectedContract.items.map((item: { id: string, description: string, projectStage?: { name: string }, quantity: number, unit: string, unitPrice: number }) => {
                  const currentValue = items.find((i: any) => i.contractItemId === item.id)?.quantity || 0;
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-center border p-4 rounded-md bg-slate-50">
                      <div className="col-span-5">
                        <p className="font-medium text-sm">{item.description}</p>
                        <p className="text-xs text-muted-foreground">Etapa: {item.projectStage?.name || 'Geral'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm text-muted-foreground">Contratado: {item.quantity} {item.unit}</p>
                        <p className="text-sm text-muted-foreground">Preço Unit: R$ {item.unitPrice}</p>
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Qtd. Medida ({item.unit})</Label>
                        <Input type="number" step="0.01" min="0" max={item.quantity} value={currentValue} onChange={e => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)} className="mt-1" />
                      </div>
                    </div>
                  );
               })}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
               <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
               <Button type="submit" disabled={isUploading || createMutation.isPending}>
                  {isUploading ? "Enviando..." : "Criar Rascunho"}
               </Button>
            </CardFooter>
          </Card>
        )}
      </form>
    </div>
  )
}
