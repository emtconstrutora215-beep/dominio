"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, Plus, ChevronLeft, ChevronRight, Info, Star, Copy, MoreVertical, 
  ArrowUpDown, CheckSquare, Square
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function ComposicoesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [base, setBase] = useState("Todas");
  const [type, setType] = useState("Todas");
  const [isActive, setIsActive] = useState<boolean>(true);

  const { data: types } = trpc.compositionType.list.useQuery();
  
  const { data, isLoading } = trpc.composition.list.useQuery({
    page,
    perPage: 12,
    search: search.length >= 2 ? search : undefined,
    base,
    type,
    isActive
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] overflow-hidden text-slate-700">
      {/* Header Estilo ERP */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700">Composições</h1>
          <div className="h-5 w-5 bg-slate-200 rounded flex items-center justify-center text-[10px] text-slate-500 font-bold">i</div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => router.push("/dashboard/catalogo/composicoes/nova")}
            className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white h-9 px-4 text-sm font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-[#33b5e5] text-white hover:bg-[#28a1cc] border-none shadow-sm">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 text-slate-400">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <div className="bg-white border-b px-6 py-3 flex items-end gap-6 shadow-sm z-10">
        <div className="flex-1 space-y-1.5">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <Input 
              placeholder="Digite aqui sua busca..." 
              className="pl-10 h-10 border-slate-200 text-sm bg-white focus-visible:ring-blue-400 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="w-[200px] space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Base:</label>
          <Select value={base} onValueChange={setBase}>
            <SelectTrigger className="h-10 border-slate-200 text-sm bg-white font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="Própria">Própria</SelectItem>
              <SelectItem value="SINAPI">SINAPI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[200px] space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo:</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 border-slate-200 text-sm bg-white font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {types?.map(t => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Composições:</label>
          <div className="flex bg-slate-100 rounded border border-slate-200 p-0.5 h-10">
            <button 
              onClick={() => setIsActive(true)}
              className={`flex-1 px-6 text-[11px] font-bold rounded transition-all flex items-center justify-center ${isActive ? 'bg-[#33b5e5] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >ATIVO</button>
            <button 
              onClick={() => setIsActive(false)}
              className={`flex-1 px-6 text-[11px] font-bold rounded transition-all flex items-center justify-center ${!isActive ? 'bg-[#33b5e5] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >INATIVO</button>
          </div>
        </div>
      </div>

      {/* Tabela Principal */}
      <main className="flex-1 overflow-hidden flex flex-col p-6">
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 border-b sticky top-0 z-20">
                <TableRow className="hover:bg-transparent border-none h-11">
                  <TableHead className="w-10 px-4"><Checkbox className="border-slate-300" /></TableHead>
                  <TableHead className="w-10"><Star className="h-4 w-4 text-slate-300" /></TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-blue-500 transition-colors">
                      Código <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-blue-500 transition-colors">
                      Descrição <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Tipo</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-tight text-center">Unidade</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-tight text-center">Base</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-tight text-right px-6">Custo Unitário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center text-slate-400 font-medium">
                      Nenhuma composição encontrada com estes filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="group hover:bg-blue-50/50 cursor-pointer border-b last:border-none transition-colors h-10"
                      onClick={() => router.push(`/dashboard/catalogo/composicoes/${item.id}`)}
                    >
                      <TableCell className="px-4" onClick={(e) => e.stopPropagation()}><Checkbox className="border-slate-300" /></TableCell>
                      <TableCell className="px-1"><Star className="h-4 w-4 text-slate-200 group-hover:text-amber-400 transition-colors" /></TableCell>
                      <TableCell className="text-[13px] font-medium text-slate-500 font-mono">{item.code || "-"}</TableCell>
                      <TableCell className="text-[13px] font-bold text-slate-700 uppercase max-w-[500px] truncate">{item.description}</TableCell>
                      <TableCell className="text-[12px] text-slate-500 font-medium uppercase">{item.type || "-"}</TableCell>
                      <TableCell className="text-[12px] text-slate-500 font-bold uppercase text-center">{item.unit}</TableCell>
                      <TableCell className="text-[12px] text-slate-500 font-medium text-center italic">{item.base || "Própria"}</TableCell>
                      <TableCell className="text-[14px] font-bold text-slate-800 text-right px-6 font-mono">
                        {formatCurrency(item.computedCost || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação Estilo ERP */}
          <div className="bg-slate-50 border-t px-6 py-3 flex items-center justify-between text-[13px]">
            <div className="font-medium text-slate-500">
              Total de <span className="text-slate-700 font-bold">{data?.totalCount || 0}</span> registros
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" size="sm" 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                disabled={page === 1 || isLoading}
                className="h-8 border-slate-200 text-slate-600 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-4">
                <span className="text-slate-400">Página</span>
                <span className="font-bold text-slate-700">{page}</span>
                <span className="text-slate-400">de {data?.totalPages || 1}</span>
              </div>
              <Button 
                variant="outline" size="sm" 
                onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))} 
                disabled={page >= (data?.totalPages || 1) || isLoading}
                className="h-8 border-slate-200 text-slate-600 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
