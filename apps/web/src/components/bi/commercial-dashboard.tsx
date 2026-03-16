"use client";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Trophy, Handshake, Target } from "lucide-react";

export default function CommercialDashboard({ filters }: { filters: { projectId?: string; startDate?: string; endDate?: string } }) {
  const { data, isLoading } = trpc.bi.getCommercialDashboard.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-32 w-full md:col-span-2" />
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  // Custom label for the pie chart
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; index: number; name: string }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    ) : null;
  };

  return (
    <div className="space-y-6">
      
      {/* KPIs Comerciais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio (Contratos)</CardTitle>
            <Handshake className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(data?.avgContractValue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Média dos orçamentos de obras fechadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversão de Sucesso</CardTitle>
            <Trophy className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {(() => {
                const w = (data?.winLoss as any[] | undefined)?.find((x: any) => x.name === 'Ganhos')?.value || 0;
                const l = (data?.winLoss as any[] | undefined)?.find((x: any) => x.name === 'Perdidos')?.value || 0;
                const total = w + l;
                return total > 0 ? ((w/total)*100).toFixed(1) + "%" : "0%";
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ganhos vs Perdidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta de Faturamento</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">Acompanhar</div>
            <p className="text-xs text-muted-foreground mt-1">Consulte o gráfico de receita</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Win/Loss (Pizza) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Taxa de Conversão (Funil)</CardTitle>
            <CardDescription>Obras fechadas, perdidas ou em negociação.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {data?.winLoss && (data.winLoss as any[]).some((x: any) => x.value > 0) ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={data.winLoss}
                     cx="50%"
                     cy="50%"
                     innerRadius={0}
                     outerRadius={100}
                     dataKey="value"
                     nameKey="name"
                     labelLine={false}
                     label={renderCustomizedLabel}
                   >
                     {/* Ganhos = Verde, Perdidos = Vermelho, Negociação = Azul */}
                     <Cell fill="#10b981" />
                     <Cell fill="#ef4444" />
                     <Cell fill="#3b82f6" />
                   </Pie>
                   <Tooltip />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados no funil</div>
             )}
          </CardContent>
        </Card>

        {/* Evolução da Receita (Bar/Line) */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Evolução de Faturamentos (Receita)</CardTitle>
            <CardDescription>Entradas financeiras realizadas por mês (Cash-in).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data?.revenueByMonth && data.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" padding={{ left: 20, right: 20 }} />
                  <YAxis tickFormatter={(val) => `R$${val/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="revenue" name="Receita Realizada" stroke="#10b981" strokeWidth={4} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem histórico de faturamento neste período</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
