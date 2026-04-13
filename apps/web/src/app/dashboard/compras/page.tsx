"use client";

import { 
  ArrowRight, 
  ClipboardList, 
  SearchCheck, 
  ShoppingBag,
  TrendingDown,
  Clock,
  CheckCircle2,
  FileText
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const navigationModules = [
  {
    title: "Solicitações de Compra",
    description: "Crie e aprove requisições de materiais e serviços vindas das obras ou do escritório.",
    href: "/dashboard/compras/solicitacoes",
    icon: ClipboardList,
    color: "bg-[#1A3C5E]",
    lightColor: "bg-[#1A3C5E]/5",
    textColor: "text-[#1A3C5E]",
    countKey: "pendingRequests",
  },
  {
    title: "Cotações de Preço",
    description: "Gerencie orçamentos com múltiplos fornecedores e utilize o motor de análise para escolher a melhor proposta.",
    href: "/dashboard/compras/cotacoes",
    icon: SearchCheck,
    color: "bg-[#F07B2B]",
    lightColor: "bg-[#F07B2B]/5",
    textColor: "text-[#F07B2B]",
    countKey: "activeQuotes",
  },
  {
    title: "Ordens de Compra",
    description: "Converta cotações em pedidos formais, gere parcelas no financeiro e controle o recebimento.",
    href: "/dashboard/compras/ordens",
    icon: ShoppingBag,
    color: "bg-emerald-600",
    lightColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    countKey: "awaitingOrders",
  }
];

export default function PurchasingHub() {
  const { data: requests, isLoading: isLoadingRequests } = trpc.purchasing.getRequests.useQuery();
  const { data: orders, isLoading: isLoadingOrders } = trpc.purchasing.getOrders.useQuery();

  const stats = {
    pendingRequests: requests?.filter(r => r.status === 'PENDING_APPROVAL').length ?? 0,
    activeQuotes: requests?.filter(r => r.status === 'APPROVED').length ?? 0, // Requests that are approved but might not have orders yet
    awaitingOrders: orders?.filter(o => o.status === 'AWAITING_RECEIPT').length ?? 0,
  };

  const dashboardStats = [
    {
      label: "Solicitações Pendentes",
      value: stats.pendingRequests,
      trend: "Aguardando aprovação",
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      label: "Cotações em Andamento",
      value: stats.activeQuotes,
      trend: "Em fase de orçamento",
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Ordens de Compra Ativas",
      value: stats.awaitingOrders,
      trend: "Aguardando entrega",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    }
  ];

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="text-[#F07B2B] border-[#F07B2B]/20 bg-[#F07B2B]/5 mb-2 px-3 py-1">
            Gestão de Suprimentos
          </Badge>
          <h1 className="text-4xl font-extrabold text-[#1A3C5E] tracking-tight">Compras Hub</h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            Centralize o ciclo de aquisição: desde a requisição na obra até a formalização da Ordem de Compra.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardStats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  {isLoadingRequests || isLoadingOrders ? (
                    <Skeleton className="h-9 w-12" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  )}
                  <p className={`text-xs font-semibold ${stat.color}`}>
                    {stat.trend}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Navigation Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[#1A3C5E]">Processos de Compra</h2>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {navigationModules.map((mod) => (
            <Link href={mod.href} key={mod.title} className="group no-underline outline-none rounded-3xl">
              <Card className="h-full border-2 border-slate-100/80 shadow-none group-hover:border-[#F07B2B]/30 group-hover:shadow-2xl group-hover:shadow-[#1A3C5E]/5 transition-all duration-500 rounded-3xl overflow-hidden cursor-pointer relative bg-white">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:bg-[#F07B2B]/5 transition-colors duration-500" />
                
                <CardHeader className="p-8 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${mod.lightColor} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-500`}>
                    <mod.icon className={`h-7 w-7 ${mod.textColor}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-[#1A3C5E] transition-colors leading-tight">
                    {mod.title}
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-sm leading-relaxed mt-3">
                    {mod.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="px-8 pb-8 flex items-center gap-2 font-semibold text-xs text-slate-400 group-hover:text-[#F07B2B] transition-colors relative z-10">
                  <span>Acessar módulo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Info / Productivity Tips */}
      <div className="bg-[#1A3C5E] rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
                <TrendingDown className="h-6 w-6 text-[#F07B2B]" />
            </div>
            <h3 className="text-2xl font-bold">Otimização de Custos</h3>
          </div>
          <p className="text-blue-100 max-w-xl text-lg leading-relaxed">
            Utilize o módulo de cotações para comparar fornecedores e economizar em média <span className="text-[#F07B2B] font-bold">15%</span> nos insumos da obra através da concorrência saudável.
          </p>
        </div>

        <div className="flex flex-col gap-3 min-w-[200px] relative z-10">
            <Link href="/dashboard/compras/solicitacoes">
                <Button className="w-full bg-[#F07B2B] hover:bg-[#F07B2B]/90 text-white font-bold h-12 rounded-xl">
                    Nova Solicitação
                </Button>
            </Link>
            <p className="text-center text-[10px] text-blue-200/60 uppercase tracking-widest font-bold">Inicie um ciclo de compra</p>
        </div>
      </div>
    </div>
  );
}
