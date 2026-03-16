"use client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { NewProjectDialog } from "@/components/projetos/new-project-dialog";

export default function ProjetosList() {
  const { data: projects, isLoading } = trpc.projects.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge className="bg-primary/10 text-primary border-primary/20 rounded-none uppercase text-[10px]">Em Andamento</Badge>;
      case 'PLANNING':
        return <Badge variant="secondary" className="rounded-none uppercase text-[10px]">Planejamento</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200 rounded-none uppercase text-[10px]">Concluído</Badge>;
      case 'PAUSED':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200 rounded-none uppercase text-[10px]">Pausado</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 rounded-none uppercase text-[10px]">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="rounded-none uppercase text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="border-l-4 border-primary pl-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">Projetos</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">Gestão de Portfólio de Obras</p>
        </div>
        <NewProjectDialog />
      </div>

      <div className="border-2 border-slate-100 rounded-none bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="border-b-2 border-slate-100 hover:bg-transparent">
              <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Nome da Obra</TableHead>
              <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Status</TableHead>
              <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Orçamento</TableHead>
              <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Progresso Físico</TableHead>
              <TableHead className="text-right font-bold text-slate-800 uppercase tracking-wider text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(projects as any[] | undefined)?.map((proj: any) => {
              const progress = proj.stages.length > 0 
                ? ((proj.stages as any[]).reduce((acc: number, s: any) => acc + s.percentageComplete, 0) / proj.stages.length).toFixed(0)
                : 0;
              
              const formattedBudget = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.budget);

              return (
                <TableRow key={proj.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <TableCell className="font-bold text-slate-900 truncate max-w-[200px]">{proj.name}</TableCell>
                  <TableCell>
                    {getStatusBadge(proj.status)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-600">{formattedBudget}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-slate-100 rounded-none h-1.5 max-w-[120px] overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 tracking-tighter">{progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/projetos/${proj.id}`}>
                      <Button variant="outline" size="sm" className="rounded-none border-2 font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all text-[10px] h-8">
                        EXPLORAR
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {projects?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium uppercase text-xs tracking-widest">
                  Nenhuma obra cadastrada no sistema.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
