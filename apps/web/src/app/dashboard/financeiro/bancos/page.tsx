"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { 
  Landmark, 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Info,
  ArrowLeftRight,
  MoreHorizontal,
  Trash2,
  Calendar,
  ChevronLeft,
  X,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  DropdownMenuCheckboxItem,
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

export default function BankAccountsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  
  // State for filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [ownerFilter, setOwnerFilter] = useState("Todos os proprietários");
  const [showBalance, setShowBalance] = useState(true);

  // Load showBalance preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bank-balance-visible");
    if (saved !== null) setShowBalance(saved === "true");
  }, []);

  const toggleBalanceVisibility = () => {
    const newVal = !showBalance;
    setShowBalance(newVal);
    localStorage.setItem("bank-balance-visible", String(newVal));
  };

  // Queries
  const { data: accounts, isLoading } = trpc.bank.getAccounts.useQuery({
    search,
    isActive: activeTab === "active",
    ownerType: ownerFilter
  });

  const { data: users } = trpc.bank.getVisibleUsers.useQuery();

  // Mutations
  const toggleLockMutation = trpc.bank.toggleLock.useMutation({
    onSuccess: () => {
      utils.bank.getAccounts.invalidate();
      toast.success("Status de bloqueio atualizado.");
    },
    onError: (err) => toast.error(err.message)
  });

  const toggleActiveMutation = trpc.bank.toggleActive.useMutation({
    onSuccess: () => {
      utils.bank.getAccounts.invalidate();
      toast.success("Status da conta atualizado.");
    },
    onError: (err) => toast.error(err.message)
  });

  const createAccountMutation = trpc.bank.createAccount.useMutation({
    onSuccess: () => {
      toast.success("Conta bancária criada com sucesso.");
      utils.bank.getAccounts.invalidate();
      setIsCreateOpen(false);
      resetNewAcc();
    },
    onError: (err) => toast.error(err.message)
  });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({ 
    name: "", 
    ownerType: "EMPRESA",
    initialDate: new Date().toISOString().split('T')[0],
    initialBalance: 0,
    allowedUserIds: [] as string[]
  });

  const resetNewAcc = () => {
    setNewAcc({ 
      name: "", 
      ownerType: "EMPRESA",
      initialDate: new Date().toISOString().split('T')[0],
      initialBalance: 0,
      allowedUserIds: [] as string[]
    });
  };

  const handleCreateAccount = () => {
    if (!newAcc.name) return toast.error("O nome da conta é obrigatório.");
    createAccountMutation.mutate({
      ...newAcc,
      initialDate: newAcc.initialDate
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleUserSelection = (userId: string) => {
    setNewAcc(prev => ({
      ...prev,
      allowedUserIds: prev.allowedUserIds.includes(userId)
        ? prev.allowedUserIds.filter(id => id !== userId)
        : [...prev.allowedUserIds, userId]
    }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Section */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Contas Bancárias</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gerencie suas contas bancárias e conciliações.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="bg-[#4fb9c9] hover:bg-[#43a0ae] text-white border-none gap-2"
              onClick={() => router.push("/dashboard/financeiro/bancos/transferencias")}
            >
              <ArrowLeftRight className="w-4 h-4" /> Transferências
            </Button>
            <Button 
              className="bg-[#58b76e] hover:bg-[#4a9d5c] text-white gap-2"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" /> Novo
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Digite aqui sua busca..." 
              className="pl-10 h-10 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden p-0.5 shadow-sm">
            <button
              onClick={() => setActiveTab("active")}
              className={cn(
                "px-6 py-1.5 text-sm font-medium transition-all rounded-[4px]",
                activeTab === "active" 
                  ? "bg-[#4fb9c9] text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Ativo
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={cn(
                "px-6 py-1.5 text-sm font-medium transition-all rounded-[4px]",
                activeTab === "inactive" 
                  ? "bg-[#4fb9c9] text-white shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Inativo
            </button>
          </div>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[220px] h-10 border-slate-200 text-slate-600">
              <SelectValue placeholder="Proprietário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos os proprietários">Todos os proprietários</SelectItem>
              <SelectItem value="Empresa">Empresa</SelectItem>
              <SelectItem value="Cliente">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 font-semibold text-slate-700">Nome</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700">Proprietário</TableHead>
                <TableHead className="py-4 font-semibold text-slate-700 text-right pr-12">
                  <div className="flex items-center justify-end gap-2">
                    Valor Atual
                    <button onClick={toggleBalanceVisibility} className="text-slate-400 hover:text-slate-600">
                      {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </TableHead>
                <TableHead className="py-4 font-semibold text-slate-700 text-center w-[180px]">Bloqueio Financeiro</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#4fb9c9] border-t-transparent rounded-full animate-spin" />
                      Carregando contas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : accounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-slate-500">
                    Nenhuma conta bancária encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                accounts?.map((acc) => (
                  <TableRow key={acc.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-md">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 uppercase text-xs tracking-wide">
                            {acc.name} {acc.agency || acc.accountNumber ? `${acc.agency} ${acc.accountNumber}` : ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-slate-600 text-sm">
                      {acc.ownerType === "EMPRESA" ? "Empresa" : "Cliente"}
                    </TableCell>
                    <TableCell className="py-4 text-right pr-12 font-mono text-sm tracking-tighter">
                      {showBalance ? (
                        <span className={acc.currentBalance >= 0 ? "text-slate-700" : "text-red-500"}>
                          {formatCurrency(acc.currentBalance)}
                        </span>
                      ) : (
                        <span className="text-slate-300">******</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <button
                        onClick={() => toggleLockMutation.mutate({ id: acc.id, isLocked: !acc.isLocked })}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          acc.isLocked 
                            ? "bg-red-50 text-red-500 hover:bg-red-100" 
                            : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        )}
                      >
                        {acc.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/financeiro/bancos/conciliacao?accountId=${acc.id}`)}>
                            <Landmark className="w-4 h-4 mr-2" /> Conciliação
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: acc.id, isActive: !acc.isActive })}>
                            {acc.isActive ? <Trash2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {acc.isActive ? "Desativar" : "Reativar"}
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

      {/* New Account Dialog (FOLLOWING THE MODEL IMAGE) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none rounded-lg shadow-2xl">
          <div className="bg-white">
            {/* Custom Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <DialogTitle className="text-xl font-medium text-slate-600">Criar Conta Bancária</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-[#f2ac4e] hover:bg-[#e69b3d] text-white rounded-md"
                onClick={() => setIsCreateOpen(false)}
              >
                <ChevronLeft className="w-5 h-5 fill-current" />
              </Button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                {/* Nome da Conta */}
                <div className="space-y-1.5">
                  <Label className="text-slate-600 font-normal text-sm">
                    Nome da Conta <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    value={newAcc.name} 
                    onChange={e => setNewAcc({...newAcc, name: e.target.value})} 
                    className="h-10 border-sky-200 focus:border-sky-400 focus-visible:ring-0 rounded-[4px]"
                  />
                </div>

                {/* Proprietário */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label className="text-slate-600 font-normal text-sm">
                      Proprietário <span className="text-red-500">*</span>
                    </Label>
                    <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                  </div>
                  <Select 
                    value={newAcc.ownerType} 
                    onValueChange={(val) => setNewAcc({...newAcc, ownerType: val})}
                  >
                    <SelectTrigger className="h-10 border-slate-200 text-slate-500 font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPRESA">Empresa</SelectItem>
                      <SelectItem value="CLIENTE">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Inicial */}
                <div className="space-y-1.5">
                   <div className="flex items-center gap-1">
                    <Label className="text-slate-600 font-normal text-sm">
                      Data Inicial <span className="text-red-500">*</span>
                    </Label>
                    <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                  </div>
                  <div className="relative">
                    <Input 
                      type="date"
                      value={newAcc.initialDate} 
                      onChange={e => setNewAcc({...newAcc, initialDate: e.target.value})} 
                      className="h-10 border-slate-200 text-slate-500 font-normal rounded-[4px] pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Valor Inicial */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label className="text-slate-600 font-normal text-sm">
                      Valor Inicial
                    </Label>
                    <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                  </div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="R$"
                      value={newAcc.initialBalance || ""} 
                      onChange={e => setNewAcc({...newAcc, initialBalance: parseFloat(e.target.value) || 0})} 
                      className="h-10 border-slate-200 pl-10 text-slate-500 font-normal rounded-[4px]"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-4 pt-4">
                <p className="text-[#6c7b8b] text-[15px] font-normal">
                  Selecione os usuários que poderão visualizar esta conta nas rotinas de <strong>Fluxo de Caixa</strong> e <strong>Contas Bancárias</strong>
                </p>

                <div className="relative">
                  <div className="min-h-[42px] w-full bg-white border border-slate-200 rounded-[4px] px-2 py-1.5 flex flex-wrap gap-1.5 items-center">
                    {newAcc.allowedUserIds.map(userId => {
                      const user = users?.find(u => u.id === userId);
                      return (
                        <Badge key={userId} className="bg-[#1862a3] text-white hover:bg-[#1862a3] rounded-md px-2 py-0.5 font-medium flex gap-1 items-center">
                          {user?.name}
                          <button onClick={() => toggleUserSelection(userId)} className="hover:text-red-200 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {newAcc.allowedUserIds.length === 0 && <span className="text-slate-400 text-sm italic pr-4">Nenhum usuário selecionado</span>}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-auto p-1 text-slate-400 hover:text-slate-600">
                           <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[300px] max-h-[300px] overflow-y-auto">
                        {users?.map(user => (
                          <DropdownMenuCheckboxItem
                            key={user.id}
                            checked={newAcc.allowedUserIds.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            className="flex justify-between items-center"
                          >
                            {user.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-slate-400 text-xs italic">
                  Apenas os usuários acima, podem visualizar o extrato e o saldo dessa conta.
                </p>
              </div>

              {/* Create Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleCreateAccount} 
                  disabled={createAccountMutation.isPending}
                  className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-8 h-10 rounded-[4px] font-medium text-sm transition-all"
                >
                  {createAccountMutation.isPending ? "Criando..." : "Criar Conta"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
