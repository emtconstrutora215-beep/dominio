"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Search, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Info,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function GestaoPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Mapping status filter to tRPC input
  const getStatusInput = () => {
    if (statusFilter === "all") return undefined;
    if (statusFilter === "em-andamento") return "IN_PROGRESS";
    if (statusFilter === "a-iniciar") return "PLANNING";
    if (statusFilter === "paralizada") return "PAUSED";
    if (statusFilter === "finalizada") return "COMPLETED";
    return undefined;
  };

  // Queries
  const { data, isLoading } = trpc.projects.list.useQuery({
    page,
    perPage,
    search: search || undefined,
    status: getStatusInput() as any,
  }, {
    placeholderData: (prev) => prev
  });

  const handlePrint = () => {
    window.print();
  };

  const statusMap: Record<string, string> = {
    "BUDGETING": "Orçamento",
    "PLANNING": "A Iniciar",
    "IN_PROGRESS": "Em Andamento",
    "PAUSED": "Paralizada",
    "COMPLETED": "Finalizada",
    "CANCELLED": "Cancelada",
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 print:bg-white print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            Gestão 
            <Info className="w-4 h-4 text-slate-300 cursor-help" />
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-white bg-cyan-500 border-cyan-500 hover:bg-cyan-600 rounded-sm shadow-sm"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 bg-[#f1f5f9] border-b border-slate-200 flex flex-wrap items-center gap-4 shadow-inner print:hidden">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Digite aqui sua busca..." 
            className="pl-9 h-10 bg-white text-sm border-slate-300 rounded-sm shadow-sm" 
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-48">
          <Select value={statusFilter} onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}>
            <SelectTrigger className="h-10 bg-white border-slate-300 text-sm font-medium rounded-sm shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="em-andamento">Em Andamento</SelectItem>
              <SelectItem value="a-iniciar">A Iniciar</SelectItem>
              <SelectItem value="paralizada">Paralizada</SelectItem>
              <SelectItem value="finalizada">Finalizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto scrollbar-hide print:overflow-visible">
            <Table className="border-collapse">
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-sm border-b">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="py-3 px-6 h-auto text-xs font-semibold uppercase text-slate-500 border-r border-slate-100 w-1/2">Obra</TableHead>
                  <TableHead className="py-3 px-6 h-auto text-xs font-semibold uppercase text-slate-500 border-r border-slate-100">Cliente</TableHead>
                  <TableHead className="py-3 px-6 h-auto text-xs font-semibold uppercase text-slate-500 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-50">
                      <TableCell className="py-4 px-6 border-r border-slate-50">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-64" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 border-r border-slate-50">
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <Skeleton className="h-4 w-24 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.items.map((project) => (
                  <TableRow 
                    key={project.id} 
                    className="group hover:bg-slate-50/50 transition-colors border-slate-100 cursor-pointer"
                    onClick={() => router.push(`/dashboard/obras/gestao/${project.id}`)}
                  >
                    <TableCell className="py-4 px-6 border-r border-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          {project.code ? `${project.code} - ` : ""}{project.name}
                        </span>
                        <FileText className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors cursor-pointer" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 border-r border-slate-50 text-sm text-slate-500 uppercase tracking-tight">
                      {project.client?.name || "-"}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right text-sm font-medium text-slate-600">
                      {statusMap[project.status as string] || project.status}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-30 grayscale">
                        <Search className="w-12 h-12 text-slate-400" />
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Nenhuma obra encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer / Pagination */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-end gap-6 text-xs font-medium text-slate-500 uppercase tracking-tight print:hidden">
            <div className="flex items-center gap-2">
              <span>Exibir</span>
              <Select value={perPage.toString()} onValueChange={(v) => {
                setPerPage(parseInt(v));
                setPage(1);
              }}>
                <SelectTrigger className="h-8 w-16 bg-white border-slate-300 text-xs font-medium rounded-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>

            <div className="flex items-center gap-4">
              <span>Página {page} de {data?.totalPages || 1}</span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-sm bg-white border-slate-300 disabled:opacity-30 shadow-sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-sm bg-white border-slate-300 disabled:opacity-30 shadow-sm"
                  disabled={page === (data?.totalPages || 1)}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print\:hidden { display: none !important; }
          body { background: white !important; }
          .overflow-hidden { overflow: visible !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; padding: 8px 12px !important; }
          th { background-color: #f8fafc !important; color: black !important; font-weight: bold !important; }
          .sticky { position: static !important; }
          .flex-1 { flex: none !important; }
          .p-6 { padding: 0 !important; }
          .rounded-md { border-radius: 0 !important; border: none !important; }
        }
      ` }} />
    </div>
  );
}
