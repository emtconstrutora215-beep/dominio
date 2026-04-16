"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, ChevronLeft, ChevronRight, HardHat, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PLANNING':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Planejamento</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Em Andamento</Badge>;
    case 'PAUSED':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700">Paralisada</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700">Concluída</Badge>;
    case 'CANCELLED':
      return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function MinhasObrasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.projects.list.useQuery({
    page,
    perPage: 10,
    search: search.length >= 2 ? search : undefined
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Obra excluída com sucesso!");
      utils.projects.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao excluir obra.");
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir a obra "${name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <HardHat className="h-7 w-7" /> Minhas Obras
          </h1>
          <p className="text-muted-foreground">Gerencie todos os projetos e obras em andamento.</p>
        </div>
        <div className="flex items-center gap-4 border-b md:border-b-0 pb-4 md:pb-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Buscar obra, código ou cliente..." 
              className="pl-9 w-full md:w-[320px]"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button asChild>
            <Link href="/dashboard/novo?type=project">
              <Plus className="h-4 w-4 mr-2" /> Nova Obra
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visível Para</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                    Nenhuma obra encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((project: any) => {
                  const usersCount = project.users?.length || 0;
                  const visibilityText = usersCount === 0 ? "Toda a empresa" : `${usersCount} usuário(s)`;

                  return (
                    <TableRow key={project.id} className="hover:bg-slate-50 cursor-pointer">
                      <TableCell className="font-mono text-xs text-slate-500">
                        {project.code || project.id.split('-')[0].toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {project.name}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {project.client?.name || <span className="text-muted-foreground italic">Sem cliente formal</span>}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {project.type || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(project.status)}
                      </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Eye className="w-3.5 h-3.5" />
                          {visibilityText}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          onClick={(e) => handleDelete(e, project.id, project.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Setup */}
        <div className="border-t p-4 flex items-center justify-between bg-slate-50/50 rounded-b-md">
          <div className="text-sm text-muted-foreground">
            Total de {data?.totalCount || 0} registros
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium px-4">
              Página {page} de {data?.totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))}
              disabled={page >= (data?.totalPages || 1) || isLoading || data?.totalPages === 0}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
