"use client";
import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Plus, ArrowUpRight, ArrowDownRight, Landmark, FileUp, LineChart, 
  Trash2, ChevronDown, ChevronRight, Calculator, Loader2 
} from "lucide-react";
import Link from "next/link";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinanceiroList() {
  const utils = trpc.useUtils();
  const { data: dashboardData, isLoading } = trpc.financial.getDashboardData.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();
  
  const createEntry = trpc.financial.createEntry.useMutation({
    onSuccess: (newEntry) => {
      if (splits.length > 0) {
        saveSplits.mutate({ entryId: newEntry.id, splits: splits.map(s => ({ projectId: s.projectId, percentage: s.percentage, amount: (s.percentage / 100) * amount })) });
      } else {
        toast.success("Lançamento criado!");
        utils.financial.getDashboardData.invalidate();
        setOpen(false);
        resetForm();
      }
    },
    onError: (err) => toast.error(err.message)
  });

  const saveSplits = trpc.financial.addEntrySplit.useMutation({
    onSuccess: () => {
      toast.success("Lançamento e rateio salvos com sucesso!");
      utils.financial.getDashboardData.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message)
  });

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [category, setCategory] = useState("Materiais");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showSplits, setShowSplits] = useState(false);
  const [splits, setSplits] = useState<{projectId: string, percentage: number}[]>([]);

  const resetForm = () => {
    setDescription("");
    setAmount(0);
    setType("EXPENSE");
    setCategory("Materiais");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setShowSplits(false);
    setSplits([]);
  };

  const totalSplitPercent = useMemo(() => splits.reduce((acc, s) => acc + s.percentage, 0), [splits]);

  const handleSave = () => {
    if (showSplits && Math.abs(totalSplitPercent - 100) > 0.01) {
      toast.error("A soma das porcentagens do rateio deve ser 100%.");
      return;
    }
    createEntry.mutate({
      type,
      category,
      description,
      amount,
      dueDate,
    });
  };

  const addSplitRow = () => {
    if (projects && projects.length > 0) {
      setSplits([...splits, { projectId: projects[0].id, percentage: 0 }]);
    }
  };

  if (isLoading) return <div className="p-8">Carregando financeiro...</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Financeiro</h1>
          <p className="text-muted-foreground">Visão geral, lançamentos e relatórios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/financeiro/bancos">
            <Button variant="outline"><Landmark className="mr-2 h-4 w-4" /> Bancos & OFX</Button>
          </Link>
          <Link href="/dashboard/financeiro/importar">
            <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> NF-e (XML)</Button>
          </Link>
          <Link href="/dashboard/financeiro/relatorios">
            <Button variant="outline"><LineChart className="mr-2 h-4 w-4" /> Relatórios / DRE</Button>
          </Link>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={(v: "INCOME" | "EXPENSE") => setType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">Receita</SelectItem>
                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input value={category} onChange={e => setCategory(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Pagamento Fornecedor X" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* RATEIO SECTION */}
                <div className="border rounded-md p-4 bg-slate-50">
                  <button 
                    type="button"
                    onClick={() => setShowSplits(!showSplits)}
                    className="flex items-center justify-between w-full text-sm font-semibold text-primary"
                  >
                    <span className="flex items-center gap-2"><Calculator className="w-4 h-4" /> Ratear entre obras</span>
                    {showSplits ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  
                  {showSplits && (
                    <div className="mt-4 space-y-4">
                      {splits.map((split, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] uppercase">Obra</Label>
                            <Select value={split.projectId} onValueChange={(v) => {
                              const newSplits = [...splits];
                              newSplits[idx].projectId = v;
                              setSplits(newSplits);
                            }}>
                              <SelectTrigger className="h-8 shadow-none"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {projects?.filter(p => p && p.id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20 space-y-1">
                            <Label className="text-[10px] uppercase">%</Label>
                            <Input 
                              type="number" 
                              className="h-8 shadow-none" 
                              value={split.percentage} 
                              onChange={e => {
                                const newSplits = [...splits];
                                newSplits[idx].percentage = parseFloat(e.target.value) || 0;
                                setSplits(newSplits);
                              }}
                            />
                          </div>
                          <div className="w-32 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">Valor (R$)</Label>
                            <div className="h-8 flex font-medium items-center px-2 text-xs bg-white border rounded shadow-none text-slate-500">
                              {( (split.percentage / 100) * amount ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500" 
                            onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t text-sm">
                        <Button variant="outline" size="sm" onClick={addSplitRow}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar Obra
                        </Button>
                        <div className={totalSplitPercent === 100 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                          Total: {totalSplitPercent}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={createEntry.isPending || saveSplits.isPending || !description || amount <= 0}
                >
                  {(createEntry.isPending || saveSplits.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Lançamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Projetado</p>
            <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData?.summary.balance || 0)}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Receitas (Geral)</p>
            <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData?.summary.totalIncome || 0)}</p>
          </div>
          <ArrowUpRight className="text-green-600" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Despesas (Geral)</p>
            <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData?.summary.totalExpense || 0)}</p>
          </div>
          <ArrowDownRight className="text-red-600" />
        </Card>
      </div>

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dashboardData?.entries.map((item) => (
              <TableRow key={item.id} className="cursor-pointer hover:bg-slate-50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.type === 'INCOME' ? <ArrowUpRight className="text-green-600 h-4 w-4"/> : <ArrowDownRight className="text-red-600 h-4 w-4"/>}
                    {item.description}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                <TableCell>{format(new Date(item.dueDate), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                <TableCell className={item.type === 'INCOME' ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === 'PAID' ? "default" : "secondary"}>
                    {item.status === 'PAID' ? "Pago" : "Pendente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {dashboardData?.entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum lançamento encontrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
