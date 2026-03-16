"use client";

import { ArrowRight, PackageOpen, LayoutDashboard, Send, ScanLine } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const modules = [
  {
    title: "Almoxarifados",
    description: "Gerencie locações de armazéns centrais e de obras",
    href: "/dashboard/estoque/almoxarifados",
    icon: LayoutDashboard,
  },
  {
    title: "Recebimento Físico",
    description: "Dê entrada em Ordens de Compra aprovadas",
    href: "/dashboard/estoque/recebimentos",
    icon: ScanLine,
  },
  {
    title: "Saldos em Estoque",
    description: "Consulte posições e valores via Custo Médio",
    href: "/dashboard/estoque/saldos",
    icon: PackageOpen,
  },
  {
    title: "Consumo e Saídas",
    description: "Aproprie custos às Etapas do Projeto",
    href: "/dashboard/estoque/saidas",
    icon: Send,
  }
];

export default function StockDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Estoque & Almoxarifado</h1>
        <p className="text-slate-500 mt-1">
          Controle centralizado de materiais, recebimentos e rastreabilidade de custos nas obras.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod: any) => (
          <Link href={mod.href} key={mod.title} className="group">
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader>
                <mod.icon className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <CardTitle>{mod.title}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end text-slate-400 group-hover:text-primary transition-colors">
                <ArrowRight className="w-5 h-5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
