"use client";

import Link from "next/link";
import { FolderTree, Boxes, ArrowRight, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CatalogoHubPage() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <FolderTree className="h-8 w-8 text-indigo-600" />
          Catálogo Técnico
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o seu banco de Insumos (Mão de obra, materiais e equipamentos) e crie Composições de custo de serviços para facilitar orçamentos.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* INSUMOS */}
        <Card className="hover:border-indigo-300 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Boxes className="h-6 w-6 text-indigo-700" />
            </div>
            <CardTitle className="text-xl">Insumos e Materiais</CardTitle>
            <CardDescription>
              A menor fração de um orçamento. Cadastre areia, bloco, aluguel de betoneira ou até mesmo o salário do pedreiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/catalogo/insumos">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                Acessar Insumos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* COMPOSIÇÕES */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart className="h-6 w-6 text-blue-700" />
            </div>
            <CardTitle className="text-xl">Composições de Custo</CardTitle>
            <CardDescription>
              Serviços montados pelas frações de insumos. Ex: 1m² de Parede rebocada contendo índices de material e mão de obra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/catalogo/composicoes">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Acessar Composições <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
