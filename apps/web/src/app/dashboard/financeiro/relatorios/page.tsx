"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Scale } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinancialReportsPage() {
  const [regime, setRegime] = useState<"CASH" | "ACCRUAL">("CASH");
  
  // Default: last 30 days
  const [dateRange, setDateRange] = useState({ 
    start: startOfMonth(new Date()).toISOString(), 
    end: endOfMonth(new Date()).toISOString() 
  });

  const { data: cashFlow, isLoading: isFlowLoading } = trpc.financial.getCashFlow.useQuery();
  
  const { data: dre, isLoading: isDreLoading } = trpc.financial.getDRE.useQuery({
    regime,
    startDate: dateRange.start,
    endDate: dateRange.end
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Relatórios Financeiros</h1>
        <p className="text-slate-500 mt-1">Fluxo de Caixa projetado e Demonstrativo de Resultado (DRE).</p>
      </div>

      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="dre">DRE (P&L)</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600"/> Total Entradas</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">
                   {formatCurrency(cashFlow?.reduce((acc, curr) => acc + curr.income, 0) || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600"/> Total Saídas</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(cashFlow?.reduce((acc, curr) => acc + curr.expense, 0) || 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600"/> Saldo Atual</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${cashFlow && cashFlow[cashFlow.length - 1]?.balance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                  {formatCurrency(cashFlow?.length ? cashFlow[cashFlow.length - 1].balance : 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="pt-6 pb-2 px-2">
            <CardContent>
              {isFlowLoading ? <div className="h-[400px] flex items-center justify-center">Carregando gráfico...</div> : (
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlow || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(new Date(val), "dd/MM", { locale: ptBR })} 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickMargin={10}
                      />
                      <YAxis 
                        tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} 
                        stroke="#94a3b8" 
                        fontSize={12}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => format(new Date(label), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#2563eb" fillOpacity={1} fill="url(#colorBalance)" name="Saldo Acumulado" strokeWidth={3} />
                      <Area type="monotone" dataKey="income" stroke="#16a34a" fillOpacity={1} fill="url(#colorIncome)" name="Entradas (Dia)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" stroke="#dc2626" fillOpacity={1} fill="url(#colorExpense)" name="Saídas (Dia)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
               <Scale className="w-5 h-5 text-slate-400" />
               <select 
                 className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 value={regime}
                 onChange={e => setRegime(e.target.value as "CASH" | "ACCRUAL")}
               >
                 <option value="CASH">Regime de Caixa</option>
                 <option value="ACCRUAL">Regime de Competência</option>
               </select>
            </div>
            <div className="flex items-center gap-2">
               <Calendar className="w-5 h-5 text-slate-400" />
               <input type="date" className="h-10 rounded-md border text-sm px-3" value={dateRange.start.split('T')[0]} onChange={e => setDateRange({...dateRange, start: new Date(e.target.value).toISOString()})} />
               <span className="text-slate-400">até</span>
               <input type="date" className="h-10 rounded-md border text-sm px-3" value={dateRange.end.split('T')[0]} onChange={e => setDateRange({...dateRange, end: new Date(e.target.value).toISOString()})} />
            </div>
          </div>

          <Card>
            <CardHeader className="border-b bg-slate-50/50">
               <CardTitle>Demonstrativo de Resultado do Exercício</CardTitle>
               <CardDescription>
                 Visão P&L ({regime === 'CASH' ? 'Contas efetivamente pagas no período selecionado' : 'Gastos/Ganhos incorridos independentemente do pagamento'})
               </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
               {isDreLoading ? <div className="py-12 text-center">Calculando DRE...</div> : (
                  <div className="space-y-6">
                    {/* Sumário */}
                    <div className="grid grid-cols-3 gap-4 border-b pb-6">
                       <div>
                         <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Receita Bruta</p>
                         <p className="text-xl font-bold text-green-700">{formatCurrency(dre?.summary.grossRevenue || 0)}</p>
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Custos Operacionais</p>
                         <p className="text-xl font-bold text-red-700">{formatCurrency(dre?.summary.operatingExpenses || 0)}</p>
                       </div>
                       <div className="pl-4 border-l-2">
                         <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Resultado Líquido</p>
                         <p className={`text-xl font-bold ${(dre?.summary.netResult || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                           {formatCurrency(dre?.summary.netResult || 0)}
                         </p>
                       </div>
                    </div>

                    {/* Detalhamento por Categoria */}
                    <div>
                       <h3 className="font-semibold text-lg mb-4 text-slate-800">Detalhamento por Categoria</h3>
                       <div className="border rounded-lg overflow-hidden">
                         <table className="w-full text-sm text-left">
                           <thead className="bg-slate-100/50 border-b">
                             <tr>
                               <th className="px-4 py-3 font-medium text-slate-600">Categoria Contábil</th>
                               <th className="px-4 py-3 font-medium text-slate-600 text-center">Tipo</th>
                               <th className="px-4 py-3 font-medium text-slate-600 text-right">Valor Consolidado</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y">
                              {dre?.categories.map((cat: { name: string, type: 'INCOME' | 'EXPENSE', amount: number }, i: number) => (
                                 <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                                    <td className="px-4 py-3 text-center">
                                       <Badge variant={cat.type === 'INCOME' ? 'outline' : 'secondary'} className={cat.type === 'INCOME' ? 'text-green-700 border-green-200' : 'text-red-700'}>
                                          {cat.type === 'INCOME' ? 'Receita' : 'Despesa'}
                                       </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                       {formatCurrency(cat.amount)}
                                    </td>
                                 </tr>
                              ))}
                              {dre?.categories.length === 0 && (
                                 <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                                       Nenhuma movimentação encontrada para o período e regime selecionados.
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                         </table>
                       </div>
                    </div>
                  </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
