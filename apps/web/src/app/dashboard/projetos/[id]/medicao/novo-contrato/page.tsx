"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function NovoContratoPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });

  const utils = trpc.useUtils();
  const createMutation = trpc.contract.createContract.useMutation({
     onSuccess: () => {
        toast.success("O contrato foi salvo com sucesso.");
        utils.contract.getContractsByProject.invalidate({ projectId });
        router.push(`/dashboard/projetos/${projectId}/medicao`);
     },
     onError: (err) => {
        toast.error("Erro: " + err.message);
     }
  });

  const [formData, setFormData] = useState({
     supplierName: "",
     supplierCnpj: "",
     retentionPercentage: 0
  });

  const [items, setItems] = useState([
     { projectStageId: "", description: "", unit: "UN", quantity: 1, unitPrice: 0 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { projectStageId: "", description: "", unit: "UN", quantity: 1, unitPrice: 0 }]);
  }
  
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (typeof formData.retentionPercentage !== 'number') return;
     createMutation.mutate({
        projectId,
        ...formData,
        items
     });
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2"/> Voltar</Button>
        <h1 className="text-3xl font-bold text-primary">Novo Contrato (Fornecedor)</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados Gerais do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Nome do Fornecedor / Subempreiteiro</Label>
                 <Input required value={formData.supplierName} onChange={e => setFormData({...formData, supplierName: e.target.value})} placeholder="Ex: Empreiteira Silva Ltda" />
               </div>
               <div className="space-y-2">
                 <Label>CNPJ (Opcional)</Label>
                 <Input value={formData.supplierCnpj} onChange={e => setFormData({...formData, supplierCnpj: e.target.value})} placeholder="00.000.000/0000-00" />
               </div>
             </div>
             <div className="space-y-2 max-w-xs">
                 <Label>Retenção Contratual (ISS/INSS) %</Label>
                 <Input type="number" step="0.1" min="0" max="100" required value={formData.retentionPercentage} onChange={e => setFormData({...formData, retentionPercentage: parseFloat(e.target.value) || 0})} />
             </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Itens do Contrato</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-2"/> Adicionar Item</Button>
          </CardHeader>
          <CardContent className="space-y-4">
             {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end border p-4 rounded-md relative bg-slate-50">
                  <div className="col-span-3 space-y-2">
                    <Label>Etapa da Obra</Label>
                    <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={item.projectStageId} onChange={e => { const newItems = [...items]; newItems[index].projectStageId = e.target.value; setItems(newItems); }}>
                       <option value="" disabled>Selecione uma etapa</option>
                       {project?.stages?.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                       ))}
                    </select>
                  </div>
                  <div className="col-span-4 space-y-2">
                    <Label>Descrição do Serviço</Label>
                    <Input required value={item.description} onChange={e => { const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems); }} />
                  </div>
                  <div className="col-span-1 space-y-2">
                    <Label>Unidade</Label>
                    <Input required value={item.unit} onChange={e => { const newItems = [...items]; newItems[index].unit = e.target.value; setItems(newItems); }} />
                  </div>
                  <div className="col-span-1 space-y-2">
                    <Label>Qtd</Label>
                    <Input type="number" required min="0.01" step="0.01" value={item.quantity} onChange={e => { const newItems = [...items]; newItems[index].quantity = parseFloat(e.target.value) || 0; setItems(newItems); }} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Preço Unit.</Label>
                    <Input type="number" required min="0.01" step="0.01" value={item.unitPrice} onChange={e => { const newItems = [...items]; newItems[index].unitPrice = parseFloat(e.target.value) || 0; setItems(newItems); }} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                     <Button type="button" variant="ghost" className="text-red-500" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
             ))}
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
             <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
             <Button type="submit" disabled={createMutation.isPending}>Salvar Contrato</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
