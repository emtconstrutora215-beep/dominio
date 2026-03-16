"use client";

import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  PENDING_APPROVAL: { label: "Pendente", variant: "outline" },
  APPROVED: { label: "Aprovado", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
};

export default function PurchaseRequestsPage() {
  const { data: requests, isLoading } = trpc.purchasing.getRequests.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.purchasing.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso");
      utils.purchasing.getRequests.invalidate();
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) return <div className="p-6">Carregando solicitações...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Solicitações de Compra</h1>
          <p className="text-slate-500 mt-1">Gerencie os pedidos de materiais das obras.</p>
        </div>
        <Link href="/dashboard/compras/solicitacoes/new">
          <Button><Plus className="w-4 h-4 mr-2" /> Nova Solicitação</Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhuma solicitação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              requests?.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{req.project.name}</TableCell>
                  <TableCell>{req.requester.name}</TableCell>
                  <TableCell>{req.items.length} item(s)</TableCell>
                  <TableCell>
                    <Badge variant={statusMap[req.status].variant}>
                      {statusMap[req.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {req.status === 'PENDING_APPROVAL' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 bg-green-50 hover:bg-green-100"
                          onClick={() => approveMutation.mutate({ requestId: req.id, status: 'APPROVED' })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 bg-red-50 hover:bg-red-100"
                          onClick={() => {
                            const reason = window.prompt("Motivo da rejeição?");
                            if (reason) {
                              approveMutation.mutate({ requestId: req.id, status: 'REJECTED', reason });
                            }
                          }}
                          disabled={approveMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
