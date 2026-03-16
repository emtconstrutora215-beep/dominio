"use client";

import { trpc } from "@/trpc/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Loader2, 
  Calendar, 
  ClipboardList, 
  ArrowRight,
  CloudSun,
  MapPin
} from "lucide-react";
import Link from "next/link";

export default function DiarioGlobalPage() {
  const { data: projects, isLoading } = trpc.projects.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tighter text-slate-900 uppercase">
          Diário de Obras Global
        </h1>
        <p className="text-slate-500 max-w-2xl border-l-2 border-secondary pl-4">
          Acompanhamento centralizado dos diários de todas as obras em andamento. 
          Selecione um projeto para ver o histórico completo ou registrar novos eventos.
        </p>
      </div>

      <div className="grid gap-6">
        {projects?.map((project) => (
          <Card 
            key={project.id} 
            className="group overflow-hidden border-2 border-slate-100 rounded-none hover:border-secondary/40 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Info Projeto */}
              <div className="p-6 md:w-1/3 bg-slate-50/50">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <Badge className="bg-secondary rounded-none mb-3">CONSTRUÇÃO</Badge>
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-secondary transition-colors mb-2">
                      {project.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/dashboard/projetos/${project.id}?tab=diario`}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-secondary hover:translate-x-1 transition-transform"
                  >
                    Ver Histórico Completo <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Últimos Relatórios */}
              <div className="p-6 md:flex-1 bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    Últimas Atualizações
                  </span>
                </div>

                <div className="space-y-6">
                  {project.dailyReports.length > 0 ? (
                    project.dailyReports.slice(0, 2).map((report) => (
                      <div key={report.id} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-slate-200 before:content-[''] group-hover:before:bg-secondary/40 before:transition-colors">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 border border-slate-100 italic">
                            <CloudSun className="w-3 h-3" /> {report.weather || "N/A"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {report.description || "Sem descrição registrada."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Nenhum registro encontrado para este projeto.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {projects?.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500">Nenhum projeto cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal Badge for local use if UI component is not enough
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold text-white ${className}`}>
      {children}
    </span>
  );
}
