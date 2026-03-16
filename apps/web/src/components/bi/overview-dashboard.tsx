"use client";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewDashboard({ filters }: { filters: { projectId?: string; startDate?: string; endDate?: string } }) {
  const { data: kpis, isLoading } = trpc.bi.getOverviewKpis.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i: number) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Primeiros 4 Cards Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalBudget || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Previsto de todos os projetos na seleção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Realizado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalSpent || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Despesas pagas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extrapolação (Over Budget)</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(kpis?.overBudgetAmount || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(kpis?.overBudgetAmount || 0) > 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(kpis?.overBudgetAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis?.percentOverBudget?.toFixed(1) || 0}% acima do orçamento original
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Atrasados</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis?.delayedCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {kpis?.onTimeCount || 0} projetos no prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visão de Status das Obras */}
      <h3 className="text-lg font-semibold mt-8 mb-4">Status da Carteira de Obras</h3>
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Em Planejamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{kpis?.projectStatusCounts.planning || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">{kpis?.projectStatusCounts.inProgress || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pausadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{kpis?.projectStatusCounts.paused || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-green-800">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{kpis?.projectStatusCounts.completed || 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
