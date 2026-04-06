"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  FileText,
  Building2,
  User,
  Calculator
} from "lucide-react";
import Link from "next/link";

export default function OrcamentosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 10;

  const { data, isLoading } = trpc.projects.list.useQuery({
    page,
    perPage,
    search: search || undefined,
    status: 'BUDGETING'
  }, {
    placeholderData: (prev) => prev
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="border-l-4 border-emerald-500 pl-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Orçamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projetos em fase de cotação e viabilidade
          </p>
        </div>
        
        <Link href="/dashboard/novo?status=BUDGETING">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-5 shadow-lg shadow-emerald-100 transition-all active:scale-95">
            <Plus className="mr-2 h-5 w-5" /> NOVO ORÇAMENTO
          </Button>
        </Link>
      </div>

      {/* Filters/Actions */}
      <div className="flex items-center gap-4 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou código..." 
            className="pl-9 rounded-none border-2 focus:ring-emerald-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="border-2 border-slate-100 rounded-none bg-white shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Carregando Orçamentos...</span>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-b-2 border-slate-100 hover:bg-transparent">
                  <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px] w-24">Cód.</TableHead>
                  <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Obra / Descrição</TableHead>
                  <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Cliente</TableHead>
                  <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Valor Previsto</TableHead>
                  <TableHead className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Status</TableHead>
                  <TableHead className="text-right font-bold text-slate-800 uppercase tracking-wider text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items as any[])?.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                    <TableCell className="font-mono text-[10px] font-bold text-slate-500">
                      #{item.code || String(item.id).substring(0, 5).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{item.name}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {item.type || 'Construção Civil'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                           <User className="w-3 h-3 text-slate-500" />
                         </div>
                         <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                           {item.client?.name || 'Cliente Particular'}
                         </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{formatCurrency(item.budget)}</span>
                        {item.totalArea && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.totalArea} {item.areaUnit || 'm²'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 rounded-none uppercase text-[9px] font-black tracking-tighter">
                        Em Orçamento
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/projetos/${item.id}`}>
                           <Button variant="ghost" size="sm" className="h-8 rounded-none px-2 text-slate-400 hover:text-emerald-600 transition-all">
                              <Calculator className="w-4 h-4" />
                           </Button>
                        </Link>
                        <Link href={`/dashboard/projetos/${item.id}`}>
                          <Button variant="outline" size="sm" className="h-8 rounded-none border-2 font-black text-[10px] hover:bg-slate-900 hover:text-white transition-all">
                            DETALHES
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum orçamento encontrado</p>
                        <Link href="/dashboard/novo?status=BUDGETING">
                          <Button variant="link" className="text-emerald-600 font-black text-xs uppercase underline-offset-4">Criar meu primeiro orçamento</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {data && data.totalCount > perPage && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Página {data.page} de {data.totalPages} ({data.totalCount} itens)
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-none h-8 w-8 p-0 border-2"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-none h-8 w-8 p-0 border-2"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
