"use client";

import { cn } from "@/lib/utils";

interface BudgetByStageTableProps {
  data: any[];
  totalArea: number;
  viewType: "COST" | "PRICE";
}

export function BudgetByStageTable({ data, totalArea, viewType }: BudgetByStageTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const totalValue = data.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 h-10">
            <th className="px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Etapa</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Mão de Obra</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Material</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Equipamento</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Outros</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Custo Total</th>
            <th className="px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">% Obra</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const percentage = totalValue > 0 ? (row.totalCost / totalValue) * 100 : 0;
            
            return (
              <tr 
                key={row.id} 
                className={cn(
                  "border-b border-slate-100 hover:bg-slate-50 transition-colors h-14",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                )}
              >
                <td className="px-6">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-[#1A3C5E] uppercase tracking-wide">Etapa {idx + 1}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{row.name}</span>
                  </div>
                </td>
                
                <td className="px-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">{formatCurrency(row.labor)}</span>
                    <span className="text-[9px] font-black text-slate-400">{formatCurrency(row.labor / totalArea)} / m²</span>
                  </div>
                </td>

                <td className="px-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">{formatCurrency(row.material)}</span>
                    <span className="text-[9px] font-black text-slate-400">{formatCurrency(row.material / totalArea)} / m²</span>
                  </div>
                </td>

                <td className="px-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">{formatCurrency(row.equipment)}</span>
                    <span className="text-[9px] font-black text-slate-400">{formatCurrency(row.equipment / totalArea)} / m²</span>
                  </div>
                </td>

                <td className="px-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">{formatCurrency(row.others)}</span>
                    <span className="text-[9px] font-black text-slate-400">{formatCurrency(row.others / totalArea)} / m²</span>
                  </div>
                </td>

                <td className="px-4 text-right bg-[#1A3C5E]/5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-[#1A3C5E]">{formatCurrency(row.totalCost)}</span>
                    <span className="text-[9px] font-black text-[#1A3C5E]/60">{formatCurrency(row.totalCost / totalArea)} / m²</span>
                  </div>
                </td>

                <td className="px-6 text-right">
                  <span className="text-xs font-black text-slate-800">{percentage.toFixed(0)}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-900 text-white h-16 border-t-2 border-slate-800">
            <td className="px-6 text-xs font-black uppercase tracking-widest">Total Geral</td>
            <td className="px-4 text-right">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{formatCurrency(data.reduce((a, b) => a + b.labor, 0))}</span>
                    <span className="text-[9px] font-bold opacity-60">{formatCurrency(data.reduce((a, b) => a + b.labor, 0) / totalArea)} / m²</span>
                </div>
            </td>
            <td className="px-4 text-right">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{formatCurrency(data.reduce((a, b) => a + b.material, 0))}</span>
                    <span className="text-[9px] font-bold opacity-60">{formatCurrency(data.reduce((a, b) => a + b.material, 0) / totalArea)} / m²</span>
                </div>
            </td>
            <td className="px-4 text-right">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{formatCurrency(data.reduce((a, b) => a + b.equipment, 0))}</span>
                    <span className="text-[9px] font-bold opacity-60">{formatCurrency(data.reduce((a, b) => a + b.equipment, 0) / totalArea)} / m²</span>
                </div>
            </td>
            <td className="px-4 text-right">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{formatCurrency(data.reduce((a, b) => a + b.others, 0))}</span>
                    <span className="text-[9px] font-bold opacity-60">{formatCurrency(data.reduce((a, b) => a + b.others, 0) / totalArea)} / m²</span>
                </div>
            </td>
            <td className="px-4 text-right bg-white/5">
                <div className="flex flex-col text-emerald-400">
                    <span className="text-xs font-black">{formatCurrency(totalValue)}</span>
                    <span className="text-[10px] font-bold opacity-60">{formatCurrency(totalValue / totalArea)} / m²</span>
                </div>
            </td>
            <td className="px-6 text-right">
              <span className="text-xs font-black text-emerald-400">100%</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
