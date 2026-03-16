"use client";

import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function QuotesPage() {
  const { data: requests, isLoading } = trpc.purchasing.getRequests.useQuery();

  // Show only approved requests
  const quoteRequests = (requests as any[] | undefined)?.filter((req: any) => req.status === 'APPROVED') || [];

  if (isLoading) return <div className="p-6">Carregando cotações...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mapa de Cotações</h1>
        <p className="text-slate-500 mt-1">Selecione uma Solicitação Aprovada para gerenciar cotações com fornecedores.</p>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Solicitação</TableHead>
              <TableHead>Data Aprovação</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quoteRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhuma solicitação aprovada aguardando cotação.
                </TableCell>
              </TableRow>
            ) : (
              quoteRequests.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs text-slate-500">{req.id.slice(0, 8)}</TableCell>
                  <TableCell>{format(new Date(req.updatedAt), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{req.project.name}</TableCell>
                  <TableCell>{req.requester.name}</TableCell>
                  <TableCell>{req.items.length} item(s)</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/compras/cotacoes/${req.id}`}>
                      <Button size="sm" variant="default">
                        Ver Mapa <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
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
