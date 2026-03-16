"use client";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function MedicaoDashboard() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: contracts, isLoading: isLoadingContracts } = trpc.contract.getContractsByProject.useQuery({ projectId });
  const { data: measurements, isLoading: isLoadingMeasurements } = trpc.measurement.getMeasurementsByProject.useQuery({ projectId });

  const StatusBadge = ({ status }: { status: string }) => {
     switch (status) {
        case 'APPROVED': return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
        case 'REJECTED': return <Badge variant="destructive">Rejeitado</Badge>;
        case 'PENDING_APPROVAL': return <Badge variant="secondary" className="bg-yellow-500 text-white">Pend. Aprovação</Badge>;
        default: return <Badge variant="outline">Rascunho</Badge>;
     }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2"/> Voltar</Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Gestão de Medições e Contratos</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/projetos/${projectId}/medicao/novo-contrato`}>
            <Button variant="outline"><FileText className="h-4 w-4 mr-2" /> Novo Contrato</Button>
          </Link>
          <Link href={`/dashboard/projetos/${projectId}/medicao/nova`}>
            <Button><PlusCircle className="h-4 w-4 mr-2" /> Nova Medição</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="contratos" className="w-full">
        <TabsList>
          <TabsTrigger value="contratos">Contratos ({contracts?.length || 0})</TabsTrigger>
          <TabsTrigger value="medicoes">Medições ({measurements?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contratos de Subempreiteiros</CardTitle>
              <CardDescription>Gerencie os contratos e os valores totais alocados.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContracts ? (
                 <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Retenção</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts?.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum contrato encontrado</TableCell>
                       </TableRow>
                    )}
                    {contracts?.map((c: { id: string, supplierName: string, supplierCnpj?: string | null, retentionPercentage: number, totalValue: number }) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.supplierName}</TableCell>
                        <TableCell>{c.supplierCnpj || '-'}</TableCell>
                        <TableCell>{c.retentionPercentage}%</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(c.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medicoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Medições</CardTitle>
              <CardDescription>Boletins de medição gerados e status de aprovação.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMeasurements ? (
                 <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor Bruto</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {measurements?.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma medição encontrada</TableCell>
                       </TableRow>
                    )}
                    {measurements?.map((m: { id: string, createdAt: string, status: string, grossValue: number, netValue: number, contract: { supplierName: string } }) => (
                      <TableRow key={m.id}>
                        <TableCell>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-medium">{m.contract.supplierName}</TableCell>
                        <TableCell><StatusBadge status={m.status} /></TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(m.grossValue)}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{formatCurrency(m.netValue)}</TableCell>
                        <TableCell className="text-right">
                           <Link href={`/dashboard/projetos/${projectId}/medicao/${m.id}`}>
                             <Button variant="ghost" size="sm">Ver Detalhes</Button>
                           </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
