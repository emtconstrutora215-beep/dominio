"use client";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function ProjectDashboard({ filters }: { filters: { projectId?: string; startDate?: string; endDate?: string } }) {
  const { data, isLoading } = trpc.bi.getProjectDashboards.useQuery(filters, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full md:col-span-2" />
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Gráfico de Barras: Previsto vs Realizado por Etapa */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Orçamento vs Custo Físico (Por Etapa)</CardTitle>
            <CardDescription>O quanto foi planejado contra o custo real apropriado nas etapas da obra.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {data?.budgetVsActual && data.budgetVsActual.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.budgetVsActual} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => `R$${val/1000}k`} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Legend />
                  <Bar dataKey="planned" name="Previsto (Planejado)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Custo Real (Apropriado)" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados suficientes</div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza: Categorias de Custo */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Composição de Custos</CardTitle>
            <CardDescription>Quais centros de custo ou categorias mais consomem o orçamento.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
             {data?.categoryExpenses && data.categoryExpenses.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={data.categoryExpenses}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={100}
                     paddingAngle={2}
                     dataKey="value"
                     nameKey="name"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     labelLine={false}
                   >
                     {data.categoryExpenses.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value: number) => formatCurrency(value)} />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">Sem despesas no período</div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha: Curva S */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Curva S Físico-Financeira</CardTitle>
          <CardDescription>Avanço cumulativo planejado contra avanço cumulativo realizado ao longo do tempo.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {data?.sCurve && data.sCurve.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={data.sCurve} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="month" padding={{ left: 30, right: 30 }} />
                 <YAxis tickFormatter={(val) => `R$${val/1000}k`} />
                 <Tooltip formatter={(value: number) => formatCurrency(value)} />
                 <Legend />
                 <Line type="monotone" dataKey="planned" name="Planejado (Curva Teórica)" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" activeDot={{ r: 8 }} />
                 <Line type="monotone" dataKey="actual" name="Realizado (Curva Real)" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} />
               </LineChart>
             </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
              <LineChart className="w-8 h-8 opacity-20" />
              <p>Adicione etapas com datas ao cronograma para visualizar a Curva S</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
