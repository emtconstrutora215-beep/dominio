"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Users, Truck, HardHat, Loader2, ArrowRight } from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ContatosHub() {
  const { data: overview, isLoading } = trpc.contact.getOverview.useQuery();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Contatos</h1>
        <p className="text-muted-foreground">Hub de administração de clientes, fornecedores e profissionais.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card Clientes */}
        <Card className="shadow-sm border-t-4 border-t-primary hover:shadow-md transition-all flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">Clientes</CardTitle>
              <CardDescription>Gestão de carteira e parceiros</CardDescription>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-bold">{overview?.clients || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Clientes ativos na base</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/dashboard/contatos/clientes">
                Acessar Clientes <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Card Fornecedores */}
        <Card className="shadow-sm border-t-4 border-t-orange-500 hover:shadow-md transition-all flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">Fornecedores</CardTitle>
              <CardDescription>Cadeia de suprimentos</CardDescription>
            </div>
            <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center">
              <Truck className="h-6 w-6 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-bold">{overview?.suppliers || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Fornecedores homologados</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/dashboard/contatos/fornecedores">
                Acessar Fornecedores <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Card Profissionais */}
        <Card className="shadow-sm border-t-4 border-t-green-500 hover:shadow-md transition-all flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">Profissionais</CardTitle>
              <CardDescription>Equipe de engenharia e campo</CardDescription>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center">
              <HardHat className="h-6 w-6 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-bold">{overview?.professionals || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Colaboradores ativos</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/dashboard/contatos/profissionais">
                Acessar Profissionais <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Recentes */}
      <h2 className="text-xl font-semibold mt-8 mb-4 tracking-tight">Adicionados Recentemente</h2>
      <div className="bg-white rounded-md border shadow-sm">
        {overview?.recent?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum contato adicionado ainda.
          </div>
        ) : (
          <div className="divide-y">
            {overview?.recent?.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex-shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-medium">
                    {contact.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.email || "Sem e-mail"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {contact.roles.map((role: string) => (
                    <span key={role} className={`px-2 py-1 text-xs rounded-full font-medium ${
                      role === 'CLIENT' ? 'bg-blue-100 text-blue-800' :
                      role === 'SUPPLIER' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {role === 'CLIENT' ? 'Cliente' : role === 'SUPPLIER' ? 'Fornecedor' : 'Profissional'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
