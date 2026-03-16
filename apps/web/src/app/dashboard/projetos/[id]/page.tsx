"use client";
import { useParams, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import ProjectDashboard from "@/components/bi/project-dashboard";

export default function ProjetoDetalhes() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialTab = searchParams.get("tab") || "visualizacao";
  
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id });
  
  if (isLoading) return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!project) return <div className="p-8">Projeto não encontrado</div>;

  const totalPlanned = project.stages.reduce((acc, stage) => 
    acc + stage.budgetItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), 0);
  
  const totalActual = project.stages.reduce((acc, stage) => acc + stage.actualCost, 0);
  const physicalProgress = project.stages.length > 0 
    ? (project.stages.reduce((acc, s) => acc + s.percentageComplete, 0) / project.stages.length).toFixed(0)
    : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">{project.name}</h1>
          <p className="text-muted-foreground">{project.address || "Sem endereço cadastrado"}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/projetos/${id}/medicao`}>
            <Button variant="outline"><FileCheck className="h-4 w-4 mr-2" /> Medições</Button>
          </Link>
          <Link href={`/dashboard/projetos/${id}/cronograma`}>
            <Button><Calendar className="h-4 w-4 mr-2" /> Cronograma (Gantt)</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Orçamento Total</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPlanned)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Custo Realizado</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalActual > totalPlanned ? 'text-red-600' : 'text-slate-900'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalActual)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Progresso Físico Médio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{physicalProgress}%</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList>
          <TabsTrigger value="visualizacao">Dashboard BI (Curva S)</TabsTrigger>
          <TabsTrigger value="orcamento">Etapas do Orçamento</TabsTrigger>
          <TabsTrigger value="diario">Diário de Obras</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizacao" className="mt-4">
          <ProjectDashboard filters={{ projectId: id }} />
        </TabsContent>

        <TabsContent value="orcamento" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Etapas e Custos</CardTitle></CardHeader>
            <CardContent>
               <div className="space-y-4">
                 {(project.stages as any[]).map((stage: any) => (
                   <div key={stage.id} className="border rounded-md p-4 bg-slate-50">
                     <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-primary">{stage.name} ({stage.percentageComplete}% Concluído)</h3>
                        <span className="text-xs font-bold px-2 py-1 bg-white rounded border">
                          Real: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stage.actualCost)}
                        </span>
                     </div>
                     <div className="mt-2 text-sm text-slate-500">
                       {stage.budgetItems.length} itens orçados.
                     </div>
                   </div>
                 ))}
                 {project.stages.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhuma etapa cadastrada.</p>}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diario" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Relatórios Recentes</CardTitle></CardHeader>
            <CardContent>
               <div className="border-l-2 border-l-secondary pl-4 space-y-6">
                 {(project.dailyReports as any[]).map((report: any) => (
                   <div key={report.id}>
                     <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleDateString('pt-BR')}</p>
                     <p className="font-medium">{report.description || "Sem observações detalhadas."}</p>
                     <p className="text-sm text-slate-500">Clima: {report.weather || "N/A"}</p>
                   </div>
                 ))}
                 {project.dailyReports.length === 0 && <p className="text-muted-foreground">Nenhum diário de obra registrado ainda.</p>}
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
