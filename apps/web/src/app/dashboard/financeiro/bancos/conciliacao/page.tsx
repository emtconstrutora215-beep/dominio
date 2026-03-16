"use client";

import { useState, useEffect, Suspense } from "react";
import { trpc } from "@/trpc/client";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, ArrowRightLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ReconciliationDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountId = searchParams.get("accountId") || "";

  const { data: suggestions, isLoading } = trpc.bank.getReconciliationSuggestions.useQuery(
    { bankAccountId: accountId },
    { enabled: !!accountId }
  );

  const confirmMutation = trpc.bank.confirmReconciliation.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} conciliações processadas com sucesso.`);
      router.push("/dashboard/financeiro/bancos");
    },
    onError: (err) => toast.error(err.message)
  });

  const [mappings, setMappings] = useState<Record<string, { action: "LINK"|"CREATE"|"IGNORE", targetId: string }>>({});

  useEffect(() => {
    if (suggestions) {
      const initial: typeof mappings = {};
      (suggestions as any[]).forEach((s: any) => {
        if (s.confidence === 'HIGH' || s.confidence === 'MEDIUM') {
          initial[s.transaction.id] = { action: "LINK", targetId: s.suggestion?.id || "" };
        } else {
          // LOW or UNRECONCILED start unselected. We default them to CREATE (create new payable entry)
          initial[s.transaction.id] = { action: "CREATE", targetId: "" };
        }
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMappings(initial);
    }
  }, [suggestions]);

  const handleConfirm = () => {
    const payload = Object.entries(mappings).map(([bankTxId, map]) => ({
      bankTransactionId: bankTxId,
      action: map.action,
      financialEntryId: map.targetId || undefined
    }));
    if (payload.length === 0) return toast.error("Nenhuma transação para conciliar.");
    confirmMutation.mutate({ mappings: payload });
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'HIGH': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1"/> Alta (Mapeado)</Badge>;
      case 'MEDIUM': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertTriangle className="w-3 h-3 mr-1"/> Média (Mapeado)</Badge>;
      case 'LOW': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100"><AlertCircle className="w-3 h-3 mr-1"/> Baixa (Revise)</Badge>;
      default: return <Badge variant="secondary" className="text-slate-500"><XCircle className="w-3 h-3 mr-1"/> Sem Correspondência</Badge>;
    }
  };

  if (!accountId) return <div className="p-6">Conta inválida selecionada.</div>;
  if (isLoading) return <div className="p-6">Calculando combinações (Matching Engine)...</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Conciliação Bancária</h1>
          <p className="text-slate-500 mt-1">
            Revise as sugestões automáticas baseadas em Valor e Data. As linhas processadas sumirão desta lista (Filtro Inteligente).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/financeiro/bancos')}>Voltar</Button>
          <Button onClick={handleConfirm} disabled={confirmMutation.isPending || !suggestions?.length}>
            {confirmMutation.isPending ? "Conciliando..." : "Confirmar Conciliação em Lote"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {suggestions?.map(({ transaction, suggestion, confidence }) => {
          const isIncome = transaction.type === "INCOME";
          const currentMap = mappings[transaction.id] || { action: 'CREATE' };

          return (
             <Card key={transaction.id} className={`overflow-hidden transition-all ${currentMap.action === 'CREATE' ? 'border-blue-200' : currentMap.action === 'LINK' ? 'border-green-300' : 'border-slate-200 opacity-60'}`}>
               <div className="flex flex-col md:flex-row items-center p-0">
                  {/* Left: Extrato do Banco */}
                  <div className={`p-4 md:w-5/12 ${isIncome ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Extrato Bancário</span>
                      <span className={`text-sm font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                         {isIncome ? '+ ' : '- '}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 line-clamp-1">{transaction.description}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Middle: Match Info */}
                  <div className="p-4 md:w-2/12 flex flex-col items-center justify-center border-x bg-white relative">
                     <ArrowRightLeft className="w-5 h-5 text-slate-300 absolute -left-2.5 top-1/2 -translate-y-1/2 bg-white rounded-full hidden md:block" />
                     <div className="mb-2">{getConfidenceBadge(confidence)}</div>
                     <select 
                       className="text-xs border rounded p-1 max-w-[120px]"
                       value={currentMap.action}
                       onChange={e => setMappings(m => ({ ...m, [transaction.id]: { ...m[transaction.id], action: e.target.value as "LINK" | "CREATE" | "IGNORE" } }))}
                     >
                       <option value="LINK">Vincular a Conta</option>
                       <option value="CREATE">Novo Lançamento</option>
                       <option value="IGNORE">Ignorar Transação</option>
                     </select>
                  </div>

                  {/* Right: Sistema ERP */}
                  <div className={`p-4 md:w-5/12 bg-white ${currentMap.action === 'IGNORE' ? 'grayscale opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                         {currentMap.action === 'LINK' ? 'Sugerido no ERP' : currentMap.action === 'CREATE' ? 'Ação Automática' : 'Nenhuma Ação'}
                       </span>
                    </div>
                    {currentMap.action === 'LINK' && suggestion ? (
                      <div>
                        <p className="font-medium text-slate-900 line-clamp-1 flex justify-between">
                           {suggestion.description}
                           <span className="text-sm border rounded px-1">{suggestion.category}</span>
                        </p>
                        <div className="text-sm text-slate-500 mt-1 flex justify-between">
                           Vencimento: {format(new Date(suggestion.dueDate), "dd/MM/yyyy")}
                           <span className="font-medium text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(suggestion.amount)}</span>
                        </div>
                      </div>
                    ) : currentMap.action === 'CREATE' ? (
                      <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                         Uma nova conta em aberto será criada no ERP e baixada automaticamente usando os dados do banco ({transaction.description}).
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 p-2 text-center">
                         Será marcada como processada e será ignorada para fins contábeis do ERP.
                      </div>
                    )}
                  </div>
               </div>
             </Card>
          );
        })}

        {suggestions?.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed rounded-lg text-slate-500 flex flex-col items-center">
             <CheckCircle2 className="w-12 h-12 text-slate-200 mb-3" />
             <p className="text-lg font-medium text-slate-600">Tudo em dia!</p>
             <p>Nenhuma transação pendente de conciliação neste extrato.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default function Page() {
   return (
      <Suspense fallback={<div>Loading mapping engine...</div>}>
         <ReconciliationDashboard />
      </Suspense>
   );
}
