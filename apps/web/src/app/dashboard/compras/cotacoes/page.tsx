"use client";

import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
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
import {
  Dialog as AlertDialog,
  DialogContent as AlertDialogContent,
  DialogDescription as AlertDialogDescription,
  DialogFooter as AlertDialogFooter,
  DialogHeader as AlertDialogHeader,
  DialogTitle as AlertDialogTitle,
  DialogTrigger as AlertDialogTrigger,
  DialogClose as AlertDialogCancel,
} from "@/components/ui/dialog";

// Define a placeholder for AlertDialogAction which is just a Button in Dialog
const AlertDialogAction = Button;

export default function QuotesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.purchasing.getRequests.useQuery();

  const deleteMutation = trpc.purchasing.deleteQuotation.useMutation({
    onSuccess: () => {
      toast.success("Cotação excluída com sucesso.");
      utils.purchasing.getRequests.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Show only approved requests
  const quoteRequests = (requests as any[] | undefined)?.filter((req: any) => req.status === 'APPROVED') || [];

  if (isLoading) return <div className="p-6">Carregando cotações...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cotações em Aberto</h1>
          <p className="text-slate-500 mt-1">Clique em uma cotação para ver detalhes, editar itens e fornecedores.</p>
        </div>
        <Link href="/dashboard/compras/cotacoes/nova">
          <Button className="h-11 rounded-xl px-6 bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-bold gap-2">
            <ArrowRight className="h-4 w-4" />
            Nova Cotação Avulsa
          </Button>
        </Link>
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
              <TableHead className="w-[100px] text-right">Ações</TableHead>
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
                <TableRow 
                  key={req.id} 
                  className="cursor-pointer hover:bg-slate-50 transition-colors group"
                  onClick={() => router.push(`/dashboard/compras/cotacoes/${req.id}`)}
                >
                  <TableCell className="font-mono text-xs text-slate-500">{req.id.slice(0, 8)}</TableCell>
                  <TableCell>{format(new Date(req.updatedAt), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{req.project?.name || "Sede / Central"}</TableCell>
                  <TableCell>{req.requester.name}</TableCell>
                  <TableCell>{req.items.length} item(s)</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Cotação Permanente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a solicitação e todas as cotações de fornecedores vinculadas a ela.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate({ requestId: req.id })}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
