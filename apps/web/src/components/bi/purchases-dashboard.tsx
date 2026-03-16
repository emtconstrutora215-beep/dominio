"use client";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Truck, Timer, PiggyBank } from "lucide-react";

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PurchasesDashboard({ filters }: { filters: { projectId?: string; startDate?: string; endDate?: string } }) {
  const { data, isLoading } = trpc.bi.getPurchasesDashboard.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-32 w-full md:col-span-2" />
        <Skeleton className="h-[400px] w-full md:col-span-2" />
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      
      {/* KPIs de Compras */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Média por Cotação</CardTitle>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data?.avgSavings || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Diferença entre o maior preço e o vencedor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Ciclo (Lead Time)</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{(data?.avgCycleTime || 0).toFixed(1)} dias</div>
            <p className="text-xs text-muted-foreground mt-1">Média entre Solicitação e Ordem de Compra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores Ativos</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.spentPerSupplier.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Que ganharam pedidos no período</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Curva ABC de Fornecedores (BarChart) */}
        <Card className="col-span-1 border-slate-200">
          <CardHeader>
            <CardTitle>Top Fornecedores (Volume de Compras R$)</CardTitle>
            <CardDescription>Principais parceiros onde o orçamento é gasto.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {data?.spentPerSupplier && data.spentPerSupplier.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.spentPerSupplier} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(val) => `R$${val/1000}k`} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="value" name="Valor Comprado" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados suficientes</div>
            )}
          </CardContent>
        </Card>

        {/* Concentração (Pizza) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Concentração da Cadeia</CardTitle>
            <CardDescription>Distribuição do gasto entre os top fornecedores.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
             {data?.spentPerSupplier && data.spentPerSupplier.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={data.spentPerSupplier}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={100}
                     paddingAngle={2}
                     dataKey="value"
                     nameKey="name"
                     label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : null}
                     labelLine={false}
                   >
                     {data.spentPerSupplier.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value: number) => formatCurrency(value)} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados suficientes</div>
             )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
