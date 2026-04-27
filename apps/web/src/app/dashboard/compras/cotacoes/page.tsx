"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Printer, 
  Share2, 
  Search, 
  Calendar, 
  Filter, 
  Paperclip, 
  ChevronDown, 
  Eye,
  ArrowUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function QuotesPage() {
  const router = useRouter();
  const { data: requests, isLoading } = trpc.purchasing.getRequests.useQuery();

  // Mocking status counts for the footer
  const statusCounts = {
    open: 0,
    requested: 0,
    sent: 0,
    responded: 0,
    partial: 0,
    finalized: 0
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* Header */}
      <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200">
        <h1 className="text-xl font-black text-[#1E3A5F]">Cotação</h1>
        
        <div className="flex items-center gap-2">
          <Button 
            className="bg-[#5CB85C] hover:bg-[#4cae4c] text-white h-7 px-3 text-[11px] font-bold rounded-sm gap-1.5 shadow-none"
            onClick={() => router.push("/dashboard/compras/cotacoes/nova")}
          >
            <Plus className="w-3.5 h-3.5" /> Novo
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#5BC0DE] hover:bg-[#46b8da] text-white border-none rounded-sm">
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#2E3E4E] hover:bg-[#1a252f] text-white border-none rounded-sm">
            <Share2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4">
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Digite aqui sua busca..." 
            className="pl-10 h-9 bg-white border-slate-200 rounded-sm text-sm focus-visible:ring-1 focus-visible:ring-blue-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input defaultValue="01/02/2026" className="w-32 h-9 bg-white border-slate-200 rounded-sm text-xs font-medium pr-8" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase italic">até</span>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input defaultValue="30/04/2026" className="w-32 h-9 bg-white border-slate-200 rounded-sm text-xs font-medium pr-8" />
          </div>
        </div>

        <Select defaultValue="all">
          <SelectTrigger className="w-48 h-9 bg-white border-slate-200 rounded-sm text-xs font-medium focus:ring-0">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="open">Em Aberto</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-slate-200 rounded-sm">
          <Filter className="w-4 h-4 text-slate-600" />
        </Button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-white mx-4 mt-4 border border-slate-200 rounded-sm">
        <table className="w-full border-collapse">
          <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="w-8 py-2 px-3 text-center">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              </th>
              <th className="py-2 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-tight gap-1">
                <div className="flex items-center gap-1">Número <ChevronDown className="w-3 h-3" /></div>
              </th>
              <th className="py-2 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-tight">Descrição</th>
              <th className="py-2 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-tight">Centro de Custo</th>
              <th className="py-2 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-tight">Qtde. Itens</th>
              <th className="py-2 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-tight">Fornecedores</th>
              <th className="py-2 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                 <div className="flex items-center gap-1">Criação <ChevronDown className="w-3 h-3 rotate-180" /></div>
              </th>
              <th className="py-2 px-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                <div className="flex items-center gap-1">Necessidade <ChevronDown className="w-3 h-3 rotate-180" /></div>
              </th>
              <th className="py-2 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-tight">Solicitação</th>
              <th className="py-2 px-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-tight">Ordem de Compra</th>
              <th className="py-2 px-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-tight">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-20 text-center text-xs font-bold text-slate-400">Carregando cotações...</td>
              </tr>
            ) : requests?.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-20 text-center text-xs font-bold text-slate-400">Nenhuma cotação cadastrada até o momento.</td>
              </tr>
            ) : (
              // This is where actual data rows would go
              <tr>
                <td colSpan={11} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma cotação cadastrada até o momento.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Stats Bar */}
      <div className="bg-white border-t border-slate-200 p-4 mt-auto flex items-center justify-between mx-4 mb-4 rounded-sm border shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Exibir</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          
          <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Em Aberto:</span>
              <div className="w-6 h-5 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">0</div>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Solicitado:</span>
              <div className="w-6 h-5 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">0</div>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Enviado ao fornec.:</span>
              <div className="w-6 h-5 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">0</div>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Respondido:</span>
              <div className="w-6 h-5 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">0</div>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Resp. Parcialmente:</span>
              <div className="w-6 h-5 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">0</div>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Finalizado:</span>
              <div className="w-6 h-5 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">0</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select defaultValue="10">
            <SelectTrigger className="w-16 h-8 bg-white border-slate-200 rounded-sm text-[10px] font-black focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[10px] font-bold text-slate-400 uppercase">por página</span>
        </div>
      </div>
    </div>
  );
}
