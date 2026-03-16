"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Landmark, Plus, FileUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BankAccountsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.bank.getAccounts.useQuery();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [ofxFile, setOfxFile] = useState<File | null>(null);

  const [newAcc, setNewAcc] = useState({ name: "", agency: "", accountNumber: "", initialBalance: 0 });

  const createAccountMutation = trpc.bank.createAccount.useMutation({
    onSuccess: () => {
      toast.success("Conta bancária criada com sucesso.");
      utils.bank.getAccounts.invalidate();
      setIsAccountOpen(false);
      setNewAcc({ name: "", agency: "", accountNumber: "", initialBalance: 0 });
    },
    onError: (err) => toast.error(err.message)
  });

  const uploadMutation = trpc.bank.uploadOfx.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} transações carregadas do OFX.`);
      setIsImportOpen(false);
      router.push(`/dashboard/financeiro/bancos/conciliacao?accountId=${selectedAccountId}`);
    },
    onError: (err) => toast.error(err.message)
  });

  const handleCreateAccount = () => {
    if (!newAcc.name) return toast.error("O nome da instituição é obrigatório.");
    createAccountMutation.mutate(newAcc);
  };

  const handleUploadOFX = async () => {
    if (!selectedAccountId || !ofxFile) return toast.error("Selecione a conta e o arquivo.");
    const content = await ofxFile.text();
    uploadMutation.mutate({
      bankAccountId: selectedAccountId,
      ofxContent: content
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contas Bancárias</h1>
          <p className="text-slate-500 mt-1">Gerencie saldos e realize conciliação de extratos OFX.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" /> Importar OFX
          </Button>
          <Button onClick={() => setIsAccountOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Conta
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Carregando contas...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(accounts as any[] | undefined)?.map((acc: any) => (
            <Card key={acc.id} className="hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Landmark className="w-5 h-5" />
                  </div>
                  {acc.name}
                </CardTitle>
                <CardDescription>
                  {acc.agency && acc.accountNumber ? `Ag: ${acc.agency} | CC: ${acc.accountNumber}` : 'Conta sem numeração'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-end border-t pt-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Saldo Atualizado</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.currentBalance)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/financeiro/bancos/conciliacao?accountId=${acc.id}`)}>
                    Conciliar <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {accounts?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg text-slate-500">
              Nenhuma conta bancária cadastrada.
            </div>
          )}
        </div>
      )}

      {/* CRIAR CONTA */}
      <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Instituição</Label>
              <Input placeholder="Ex: Itaú, Nubank PJ" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agência (Opcional)</Label>
                <Input placeholder="0000" value={newAcc.agency} onChange={e => setNewAcc({...newAcc, agency: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Conta (Opcional)</Label>
                <Input placeholder="00000-0" value={newAcc.accountNumber} onChange={e => setNewAcc({...newAcc, accountNumber: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Saldo Inicial R$</Label>
              <Input type="number" step="0.01" value={newAcc.initialBalance || ''} onChange={e => setNewAcc({...newAcc, initialBalance: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAccountOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAccount} disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending ? "Salvando..." : "Salvar Conta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* IMPORTAR OFX */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Extrato OFX</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Vincular à Conta Bancária</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
              >
                <option value="" disabled>Selecione a conta...</option>
                {(accounts as any[] | undefined)?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo .OFX</Label>
              <Input type="file" accept=".ofx" onChange={e => setOfxFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleUploadOFX} disabled={uploadMutation.isPending || !ofxFile}>
              {uploadMutation.isPending ? "Processando..." : "Importar e Conciliar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
