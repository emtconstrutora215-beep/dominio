"use client";
import { useState } from "react";
import { trpc } from "@/trpc/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, CalendarRange, Filter } from "lucide-react";
import OverviewDashboard from "@/components/bi/overview-dashboard";
import ProjectDashboard from "@/components/bi/project-dashboard";
import PurchasesDashboard from "@/components/bi/purchases-dashboard";
import CommercialDashboard from "@/components/bi/commercial-dashboard";

export default function BIPage() {
  const [projectId, setProjectId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all"); // "all", "last_30", "this_year"

  // Query to get list of projects for the filter
  const { data: projects } = trpc.projects.getAll.useQuery();

  const handlePrint = () => {
    window.print();
  };

  // Compute dates based on range
  let startDate: string | undefined = undefined;
  let endDate: string | undefined = undefined;

  if (dateRange === "last_30") {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (dateRange === "this_year") {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    startDate = start.toISOString();
    endDate = end.toISOString();
  }

  const queryFilters = {
    projectId: projectId === "all" ? undefined : projectId,
    startDate,
    endDate,
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto print:p-0 print:space-y-4">
      {/* HEADER - Hidden when printing */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">BI & Analytics</h1>
          <p className="text-muted-foreground">Visão estratégica e indicadores de performance da empresa.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border rounded-md p-1">
            <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[200px] border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Todos os Projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[1px] h-6 bg-border mx-1"></div>
            
            <CalendarRange className="w-4 h-4 ml-2 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px] border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Período</SelectItem>
                <SelectItem value="last_30">Últimos 30 Dias</SelectItem>
                <SelectItem value="this_year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* PRINT HEADER - Visible only when printing */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold">Relatório Gerencial - BI</h1>
        <p className="text-sm text-gray-500">
          Data: {new Date().toLocaleDateString('pt-BR')} | 
          Projeto: {projectId === "all" ? "Todos os Projetos" : projects?.find(p => p.id === projectId)?.name || projectId} | 
          Período: {dateRange === "all" ? "Todo" : dateRange === "last_30" ? "Últimos 30 Dias" : "Este Ano"}
        </p>
        <hr className="my-4" />
      </div>

      {/* TABS CONTENT */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border print:hidden">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="projects">Obras / Curva S</TabsTrigger>
          <TabsTrigger value="purchases">Compras & Fornecedores</TabsTrigger>
          <TabsTrigger value="commercial">Comercial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0 space-y-6 print:block">
          <OverviewDashboard filters={queryFilters} />
        </TabsContent>
        
        <TabsContent value="projects" className="m-0 space-y-6 print:block">
          <ProjectDashboard filters={queryFilters} />
        </TabsContent>

        <TabsContent value="purchases" className="m-0 space-y-6 print:block">
          <PurchasesDashboard filters={queryFilters} />
        </TabsContent>

        <TabsContent value="commercial" className="m-0 space-y-6 print:block">
          <CommercialDashboard filters={queryFilters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
