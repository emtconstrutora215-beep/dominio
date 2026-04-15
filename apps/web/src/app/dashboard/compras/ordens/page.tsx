"use client";

import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ShoppingCart, 
  Printer,
  Share2,
  Search,
  Filter,
  Info,
  ChevronDown,
  Calendar,
  DollarSign,
  Sitemap,
  History,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Trash2,
  ChevronRight
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
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

// Placeholder for AlertDialogAction
const AlertDialogAction = Button;

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: orders, isLoading } = trpc.purchasing.getOrders.useQuery();

  const toggleApproval = trpc.purchasing.toggleOrderApproval.useMutation({
    onSuccess: () => {
      utils.purchasing.getOrders.invalidate();
      toast.success("Status de aprovação atualizado.");
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = trpc.purchasing.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success("Ordem de Compra excluída com sucesso.");
      utils.purchasing.getOrders.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const billingLabels: Record<string, string> = {
    COMPANY: "Faturamento: Empresa",
    CLIENT: "Faturamento: Cliente",
    DIRECT: "Faturamento: Direto",
    MANUAL: "Faturamento: Manual"
  };

  if (isLoading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-slate-400 font-bold animate-pulse">Carregando ordens...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F1F3F4] overflow-hidden font-sans">
      {/* 1. TOP HEADER (Dense ERP Style) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm flex-none">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-700 tracking-tight">Ordem de Compra</h1>
          <Info className="w-4 h-4 text-slate-300 cursor-help" />
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard/compras/ordens/nova">
            <Button className="bg-[#28A745] hover:bg-[#218838] text-white font-bold h-8 px-4 rounded gap-1 text-xs">
              <Plus className="w-3 h-3" />
              Novo
            </Button>
          </Link>
          <Button className="bg-[#17A2B8] hover:bg-[#138496] text-white font-bold h-8 px-4 rounded gap-1 text-xs">
            <Plus className="w-3 h-3" />
            Orçado x Comprado
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0 border-slate-200 bg-[#17A2B8] text-white hover:bg-[#138496]">
             <Printer className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0 border-slate-200 bg-[#17A2B8] text-white hover:bg-[#138496]">
             <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. FILTER BAR (Horizontal Layout) */}
      <div className="bg-[#F8F9FA] border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-none">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Busque pelo número ou valor..." 
            className="h-8 pl-9 bg-white border-slate-300 rounded text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          <Input type="text" defaultValue="15/04/2026" className="h-8 w-28 bg-white border-slate-300 rounded text-xs text-center" />
          <span className="text-xs text-slate-400 px-1">até</span>
          <Input type="text" defaultValue="15/05/2026" className="h-8 w-28 bg-white border-slate-300 rounded text-xs text-center" />
          <div className="cursor-pointer bg-white border border-slate-300 h-8 px-2 flex items-center">
             <Calendar className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="w-48">
          <Select defaultValue="all">
            <SelectTrigger className="h-8 bg-white border-slate-300 rounded text-xs">
              <SelectValue placeholder="Todas as Aprovações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Aprovações</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" className="h-8 w-8 p-0 border-slate-300 bg-white shadow-sm">
           <Filter className="w-4 h-4 text-slate-500" />
        </Button>
      </div>

      {/* 3. SCROLLABLE TABLE AREA */}
      <div className="flex-1 overflow-auto bg-white">
        <Table className="border-collapse">
          <TableHeader className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200">
            <TableRow className="h-10 hover:bg-transparent">
              <TableHead className="w-[80px] text-zinc-700 font-bold text-[11px] border-r border-slate-100">Número ▲</TableHead>
              <TableHead className="text-zinc-700 font-bold text-[11px] border-r border-slate-100">Fornecedor</TableHead>
              <TableHead className="w-[200px] text-zinc-700 font-bold text-[11px] border-r border-slate-100">Valor ▲</TableHead>
              <TableHead className="text-zinc-700 font-bold text-[11px] border-r border-slate-100">Centro de Custo</TableHead>
              <TableHead className="w-[180px] text-zinc-700 font-bold text-[11px] border-r border-slate-100">Criação ▲</TableHead>
              <TableHead className="w-[100px] text-zinc-700 font-bold text-[11px] border-r border-slate-100">Solicitação</TableHead>
              <TableHead className="w-[100px] text-zinc-700 font-bold text-[11px] border-r border-slate-100">Cotação</TableHead>
              <TableHead className="w-[80px] text-center text-zinc-700 font-bold text-[11px] border-r border-slate-100">Aprovação</TableHead>
              <TableHead className="w-[120px] text-zinc-700 font-bold text-[11px] border-r border-slate-100">Prev. Entrega ▲</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order: any) => {
              const winner = order.quote?.suppliers?.[0];
              const total = winner ? (winner.totalPrice + winner.freight) : 0;
              const isApproved = order.status !== 'PENDING_APPROVAL' && order.status !== 'REJECTED';

              return (
                <TableRow 
                  key={order.id} 
                  className="h-14 border-b border-slate-100 group hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="text-xs text-slate-500 font-medium py-2">
                    {order.number || order.id.slice(-4)}
                  </TableCell>
                  <TableCell className="text-[11px] font-semibold text-slate-600 uppercase">
                    {winner?.supplierName || "FORNECEDOR DIRETO"}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 tracking-tight">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {order.billingManualName || billingLabels[order.billingType] || "Faturamento: Empresa"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Cond. Pgto: {winner?.paymentTerms || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 opacity-40">
                         <History className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">
                        {order.quote?.request?.project?.name || "Administrativo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-500">
                        {format(new Date(order.createdAt), "dd/MM/yyyy")}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium italic">
                        Por: {order.quote?.request?.approver?.name || "Administrador"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-400">-</TableCell>
                  <TableCell className="text-center text-xs text-slate-400">-</TableCell>
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={isApproved} 
                      onCheckedChange={() => toggleApproval.mutate({ orderId: order.id })}
                      className="border-slate-300"
                    />
                  </TableCell>
                  <TableCell className="text-center text-[11px] text-slate-500">
                    {format(new Date(), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="py-1">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all pr-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-blue-500">
                         <History className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-emerald-500">
                         <DollarSign className="w-4 h-4" />
                      </Button>
                      
                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-300 hover:text-red-500"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Ordem de Compra?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é irreversível e removerá todos os lançamentos financeiros vinculados.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ orderId: order.id })}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-slate-300 hover:text-blue-600"
                        onClick={() => router.push(`/dashboard/compras/ordens/${order.id}`)}
                      >
                         <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 4. FOOTER STATS */}
      <div className="bg-[#EEE] border-t border-slate-300 px-4 py-1 flex items-center justify-between text-[10px] font-bold text-slate-500 flex-none">
        <div className="flex gap-4">
           <span>Total de Pedidos: {orders?.length || 0}</span>
           <span>Pendente Recebimento: {orders?.filter((o:any) => o.status === 'AWAITING_RECEIPT').length || 0}</span>
        </div>
        <div className="flex gap-4">
           <span className="text-emerald-600">Total Valor: R$ {orders?.reduce((acc: number, o: any) => acc + (o.quote?.suppliers?.[0]?.totalPrice || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}
