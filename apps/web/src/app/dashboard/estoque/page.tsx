"use client";

import { 
  ArrowRight, 
  PackageOpen, 
  LayoutDashboard, 
  ScanLine, 
  History,
  Boxes,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navigationModules = [
  {
    title: "Movimentações",
    description: "Gerencie registros de entrada, saída e transferências entre almoxarifados com rastreabilidade total.",
    href: "/dashboard/estoque/movimentacoes",
    icon: History,
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    title: "Depósitos",
    description: "Configure e monitore seus almoxarifados centrais e depósitos específicos de cada obra.",
    href: "/dashboard/estoque/depositos",
    icon: LayoutDashboard,
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    textColor: "text-orange-600",
  }
];

const dashboardStats = [
  {
    label: "Itens em Estoque",
    value: "1,284",
    trend: "+12% este mês",
    icon: Boxes,
  },
  {
    label: "Movimentações Hoje",
    value: "24",
    trend: "Fluxo estável",
    icon: TrendingUp,
  },
  {
    label: "Alertas de Reposição",
    value: "08",
    trend: "Ação necessária",
    icon: AlertTriangle,
    alert: true,
  }
];

export default function StockHub() {
  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="text-[#F07B2B] border-[#F07B2B]/20 bg-[#F07B2B]/5 mb-2 px-3 py-1">
            Gestão de Materiais
          </Badge>
          <h1 className="text-4xl font-extrabold text-[#1A3C5E] tracking-tight">Estoque Hub</h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            Centro de controle inteligente para suprimentos, logística e rastreabilidade de insumos na obra.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardStats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.alert ? 'text-red-500' : 'text-emerald-500'}`}>
                    {stat.trend}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.alert ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Navigation */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[#1A3C5E]">Acesso aos Módulos</h2>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {navigationModules.map((mod) => (
            <Link href={mod.href} key={mod.title} className="group no-underline outline-none focus:ring-2 focus:ring-[#F07B2B] rounded-3xl">
              <Card className="h-full border-2 border-slate-100/80 shadow-none group-hover:border-[#F07B2B]/30 group-hover:shadow-xl group-hover:shadow-[#1A3C5E]/5 transition-all duration-500 rounded-3xl overflow-hidden cursor-pointer relative bg-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-[#F07B2B]/5 transition-colors duration-500" />
                
                <CardHeader className="p-8 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${mod.lightColor} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-500`}>
                    <mod.icon className={`h-7 w-7 ${mod.textColor}`} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900 group-hover:text-[#1A3C5E] transition-colors">
                    {mod.title}
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-base leading-relaxed mt-3">
                    {mod.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="px-8 pb-8 flex items-center gap-2 font-semibold text-sm text-slate-400 group-hover:text-[#F07B2B] transition-colors relative z-10">
                  <span>Acessar módulo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom info section */}
      <div className="bg-slate-50/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
            <ScanLine className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Configurações Avançadas</p>
            <p className="text-sm text-slate-500">Acesse parâmetros globais de estoque e unidades de medida.</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-full px-6 hover:bg-white">
          Configurar
        </Button>
      </div>
    </div>
  );
}
