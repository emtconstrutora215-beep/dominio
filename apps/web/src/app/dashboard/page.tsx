"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, DollarSign, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { trpc } from "@/trpc/client";

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = trpc.bi.getOverviewKpis.useQuery({});
  const { data: orders, isLoading: ordersLoading } = trpc.purchasing.getOrders.useQuery();

  if (kpisLoading || ordersLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(2)}M`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da EMT Construtora Ltda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.projectStatusCounts.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground">Em execução no momento</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-secondary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento Global</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalBudget || 0)}</div>
            <p className="text-xs text-muted-foreground">Soma de todos os orçamentos</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Realizado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalSpent || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {kpis?.percentOverBudget ? `${kpis.percentOverBudget.toFixed(1)}% do previsto` : "Dentro do previsto"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis?.delayedCount ? 'text-red-600' : ''}`}>
              {kpis?.delayedCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Obras com alerta de prazo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Orçado vs Realizado (Por Obra)</CardTitle>
            <CardDescription>Comparativo financeiro das principais execuções.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={kpis?.projectSummaries}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value >= 1000 ? (value/1000)+'k' : value}`}
                />
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                <Bar dataKey="orcado" fill="#1A3C5E" name="Orçado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" fill="#F07B2B" name="Realizado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Últimas Ordens de Compra</CardTitle>
            <CardDescription>Atividades recentes do setor de suprimentos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {orders?.slice(0, 5).map((order) => {
                const winner = (order.quote.suppliers as any[]).find((s: any) => s.isWinner);
                const amount = (winner?.totalPrice || 0) + (winner?.freight || 0);
                
                return (
                  <div key={order.id} className="flex items-center hover:bg-slate-50 p-2 rounded-md transition-colors">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{winner?.supplierName || "Fornecedor N/A"}</p>
                      <p className="text-sm text-muted-foreground">{order.quote.request.project.name}</p>
                    </div>
                    <div className="ml-auto font-medium text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                    </div>
                  </div>
                );
              })}
              {(!orders || orders.length === 0) && (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  Nenhuma ordem de compra registrada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
