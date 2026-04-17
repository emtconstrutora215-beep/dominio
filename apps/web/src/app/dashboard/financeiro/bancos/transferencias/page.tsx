"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Plus, 
  Search, 
  Info,
  ArrowLeft,
  Printer,
  Calendar,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
  X,
  Check,
  UploadCloud,
  ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function BankTransfersPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  
  // State for filters
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "PAID" | "PENDING">("ALL");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Queries
  const { data: transfers, isLoading } = trpc.bank.getTransfers.useQuery({
    startDate,
    endDate,
    search,
    status: statusTab
  });

  const { data: accounts } = trpc.bank.getAccounts.useQuery({ isActive: true });

  // Mutations
  const confirmMutation = trpc.bank.confirmTransfer.useMutation({
    onSuccess: () => {
      utils.bank.getTransfers.invalidate();
      utils.bank.getAccounts.invalidate();
      toast.success("Transferência confirmada e saldo atualizado.");
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = trpc.bank.deleteTransfer.useMutation({
    onSuccess: () => {
      utils.bank.getTransfers.invalidate();
      utils.bank.getAccounts.invalidate();
      toast.success("Transferência removida.");
    },
    onError: (err) => toast.error(err.message)
  });

  const createMutation = trpc.bank.createTransfer.useMutation({
    onSuccess: () => {
      toast.success("Transferência registrada com sucesso.");
      utils.bank.getTransfers.invalidate();
      utils.bank.getAccounts.invalidate();
      setIsCreateOpen(false);
      resetNewTransfer();
    },
    onError: (err) => toast.error(err.message)
  });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({ 
    description: "", 
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    fromAccountId: "",
    toAccountId: "",
    status: "PAID" as "PAID" | "PENDING"
  });

  const resetNewTransfer = () => {
    setNewTransfer({ 
      description: "", 
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      fromAccountId: "",
      toAccountId: "",
      status: "PAID"
    });
  };

  const handleCreate = () => {
    if (!newTransfer.fromAccountId || !newTransfer.toAccountId || newTransfer.amount <= 0) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    createMutation.mutate(newTransfer);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Section */}
      <div className="p-6 border-b bg-white print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Transferências</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gerencie transferências internas entre suas contas bancárias.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              className="bg-[#58b76e] hover:bg-[#4a9d5c] text-white gap-2 font-medium"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" /> Novo
            </Button>
            <Button 
              variant="outline" 
              className="bg-[#4fb9c9] hover:bg-[#43a0ae] text-white border-none"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              className="bg-[#f2ac4e] hover:bg-[#e69b3d] text-white border-none"
              onClick={() => router.push("/dashboard/financeiro/bancos")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <Select defaultValue="acoes">
            <SelectTrigger className="w-[120px] h-10 border-slate-200 text-slate-600">
              <SelectValue placeholder="Ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acoes">Ações</SelectItem>
              <SelectItem value="export">Exportar Excel</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Digite aqui sua busca..." 
              className="pl-10 h-10 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Input 
                type="date" 
                className="h-10 w-[150px] border-slate-200 pr-10" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <span className="text-slate-400 text-sm italic">até</span>
            <div className="relative">
              <Input 
                type="date" 
                className="h-10 w-[150px] border-slate-200 pr-10" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 border border-slate-200 text-slate-500">
              <Filter className="w-4 h-4" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 border border-slate-200 text-slate-500"
                onClick={() => {
                   setSearch("");
                   setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                   setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                   setStatusTab("ALL");
                }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden p-0.5 shadow-sm ml-auto">
            <button
              onClick={() => setStatusTab("ALL")}
              className={cn(
                "px-6 py-1.5 text-sm font-medium transition-all rounded-[4px]",
                statusTab === "ALL" 
                  ? "bg-[#4fb9c9] text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusTab("PAID")}
              className={cn(
                "px-6 py-1.5 text-sm font-medium transition-all rounded-[4px]",
                statusTab === "PAID" 
                  ? "bg-[#4fb9c9] text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Pagas
            </button>
            <button
              onClick={() => setStatusTab("PENDING")}
              className={cn(
                "px-6 py-1.5 text-sm font-medium transition-all rounded-[4px]",
                statusTab === "PENDING" 
                  ? "bg-[#4fb9c9] text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Em Aberto
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-6 overflow-auto">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 font-semibold text-slate-700">Data</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700">Descrição</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700">Conta de Origem</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700">Conta de Destino</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700 text-right">Valor</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700 text-center">Pago</TableHead>
                <TableHead className="w-[50px] print:hidden"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#4fb9c9] border-t-transparent rounded-full animate-spin" />
                      Carregando transferências...
                    </div>
                  </TableCell>
                </TableRow>
              ) : transfers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center text-slate-500">
                    Nenhuma transferência encontrada para o filtro selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                transfers?.map((tx) => (
                  <TableRow key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 text-slate-600 text-sm">
                      {format(new Date(tx.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="py-4 font-medium text-slate-800 uppercase text-xs">
                      {tx.description || "TRANSFERÊNCIA BANCÁRIA"}
                    </TableCell>
                    <TableCell className="py-4 text-slate-600 text-xs uppercase font-medium">
                      {tx.fromAccount.name}
                    </TableCell>
                    <TableCell className="py-4 text-slate-600 text-xs uppercase font-medium">
                      {tx.toAccount.name}
                    </TableCell>
                    <TableCell className="py-4 text-right font-mono text-sm tracking-tighter text-slate-700">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      {tx.status === 'PAID' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1.5 px-2">
                           <CheckCircle2 className="w-3 h-3" /> Pago
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 gap-1.5 px-2">
                           <Clock className="w-3 h-3" /> Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="print:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {tx.status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => confirmMutation.mutate({ id: tx.id })}>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Confirmar Pagamento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => deleteMutation.mutate({ id: tx.id })} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t bg-white mt-auto flex items-center justify-end print:hidden">
         <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Exibir</span>
            <Select defaultValue="10">
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>por página</span>
         </div>
      </div>

      {/* New Transfer Dialog (MODEL DESIGN) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none rounded-lg shadow-24">
          <div className="bg-white">
            {/* Custom Header with Logo and Square Buttons */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                 <div className="bg-[#1862a3] p-1.5 rounded-md">
                    <ArrowRightLeft className="w-5 h-5 text-white" />
                 </div>
                 <DialogTitle className="font-bold text-slate-700 tracking-tight text-lg italic">mais controle</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded-md w-10 h-10"
                   onClick={handleCreate}
                   disabled={createMutation.isPending}
                >
                  <Check className="w-5 h-5" />
                </Button>
                <Button 
                   variant="ghost" 
                   size="icon" 
                   className="bg-[#f2ac4e] hover:bg-[#e69b3d] text-white rounded-md w-10 h-10"
                   onClick={() => setIsCreateOpen(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Row 1: Date, Value, Status */}
              <div className="grid grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="text-slate-500 font-medium text-sm">Data da Transferência: <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input 
                      type="date"
                      value={newTransfer.date} 
                      onChange={e => setNewTransfer({...newTransfer, date: e.target.value})} 
                      className="h-10 border-slate-200 rounded-[4px] pr-12 focus:border-sky-400 focus-visible:ring-0"
                    />
                    <div className="absolute right-0 top-0 h-full w-10 border-l border-slate-200 flex items-center justify-center bg-slate-50">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 font-medium text-sm">Valor: <span className="text-red-500">*</span></Label>
                  <div className="relative">
                     <Input 
                       type="number" 
                       step="0.01" 
                       placeholder="R$"
                       value={newTransfer.amount || ""} 
                       onChange={e => setNewTransfer({...newTransfer, amount: parseFloat(e.target.value) || 0})} 
                       className="h-10 border-slate-200 rounded-[4px] pl-4 focus:border-sky-400 focus-visible:ring-0"
                     />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 font-medium text-sm">Marcar como Pago:</Label>
                  <div className="flex items-center gap-6 h-10">
                     <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                           type="radio" 
                           name="status-modal" 
                           checked={newTransfer.status === "PAID"} 
                           onChange={() => setNewTransfer({...newTransfer, status: "PAID"})}
                           className="w-4 h-4 text-[#f2ac4e] border-slate-300 focus:ring-[#f2ac4e]"
                        />
                        <span className="text-sm text-slate-600 font-medium">Sim</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                           type="radio" 
                           name="status-modal" 
                           checked={newTransfer.status === "PENDING"} 
                           onChange={() => setNewTransfer({...newTransfer, status: "PENDING"})}
                           className="w-4 h-4 text-slate-300 border-slate-300 focus:ring-[#f2ac4e]"
                        />
                        <span className="text-sm text-slate-600 font-medium">Não</span>
                     </label>
                  </div>
                </div>
              </div>

              {/* Row 2: Accounts */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-slate-500 font-medium text-sm">Conta de Origem: <span className="text-red-500">*</span></Label>
                  <Select 
                    value={newTransfer.fromAccountId} 
                    onValueChange={(val) => setNewTransfer({...newTransfer, fromAccountId: val})}
                  >
                    <SelectTrigger className="h-10 border-slate-200 text-slate-500 font-normal focus:ring-0">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map(acc => (
                         <SelectItem key={acc.id} value={acc.id}>{acc.name} - {formatCurrency(acc.currentBalance)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 font-medium text-sm">Conta de Destino: <span className="text-red-500">*</span></Label>
                  <Select 
                    value={newTransfer.toAccountId} 
                    onValueChange={(val) => setNewTransfer({...newTransfer, toAccountId: val})}
                  >
                    <SelectTrigger className="h-10 border-slate-200 text-slate-500 font-normal focus:ring-0">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map(acc => (
                         <SelectItem key={acc.id} value={acc.id}>{acc.name} - {formatCurrency(acc.currentBalance)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="space-y-2">
                 <Label className="text-slate-500 font-medium text-sm">Descrição:</Label>
                 <Textarea 
                    value={newTransfer.description}
                    onChange={e => setNewTransfer({...newTransfer, description: e.target.value})}
                    className="min-h-[100px] border-slate-200 focus:border-sky-400 focus-visible:ring-0 rounded-[4px]"
                 />
              </div>

              {/* Row 4: File Upload Placeholder */}
              <div className="space-y-2">
                 <Label className="text-slate-500 font-medium text-sm">Arquivos:</Label>
                 <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-sky-500 transition-colors" />
                    <span className="text-slate-400 text-sm font-medium group-hover:text-slate-600 transition-colors">Clique ou arraste aqui</span>
                 </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSS for print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .p-6.overflow-auto, .p-6.overflow-auto * {
            visibility: visible;
          }
          .p-6.overflow-auto {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      ` }} />
    </div>
  );
}
