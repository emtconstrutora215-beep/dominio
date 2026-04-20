"use client";

import { cn } from "@/lib/utils";

interface AbcCurveTableProps {
  data: any[];
}

export function AbcCurveTable({ data }: AbcCurveTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const getABCClass = (accPercentage: number) => {
    if (accPercentage <= 80) return { label: 'A', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (accPercentage <= 95) return { label: 'B', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'C', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1200px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 h-10">
            <th className="px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider w-16 text-center">Class</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Item</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Grupo</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Qtde</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Custo Unitário</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Custo Total</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">%</th>
            <th className="px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Acumulado</th>
            <th className="px-6 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">% Acumul.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, idx) => {
            const abc = getABCClass(item.accumulatedPercentage);
            
            return (
              <tr 
                key={item.id} 
                className="hover:bg-slate-50 transition-colors h-14 group"
              >
                <td className="px-6 text-center">
                   <div className={cn(
                     "w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-black mx-auto shadow-sm",
                     abc.color
                   )}>
                     {abc.label}
                   </div>
                </td>
                
                <td className="px-4 font-bold text-[#1A3C5E] text-[11px] uppercase tracking-tighter max-w-[300px] truncate">
                   {item.description}
                </td>

                <td className="px-4">
                   <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.type}
                   </span>
                </td>

                <td className="px-4">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {item.group}
                   </span>
                </td>

                <td className="px-4 text-right">
                   <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{item.quantity.toLocaleString('pt-BR')}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.unit}</span>
                   </div>
                </td>

                <td className="px-4 text-right text-xs font-bold text-slate-600">
                   {formatCurrency(item.unitPrice)}
                </td>

                <td className="px-4 text-right text-xs font-black text-slate-800">
                   {formatCurrency(item.total)}
                </td>

                <td className="px-4 text-center">
                   <span className="text-[10px] font-black text-slate-400">{item.percentage.toFixed(2)}%</span>
                </td>

                <td className="px-4 text-right text-xs font-bold text-slate-500 italic">
                   {formatCurrency(item.accumulatedAmount)}
                </td>

                <td className="px-6 text-center">
                   <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                         <div 
                           className={cn("h-full rounded-full transition-all duration-1000", abc.label === 'A' ? 'bg-rose-500' : abc.label === 'B' ? 'bg-amber-500' : 'bg-emerald-500')} 
                           style={{ width: `${item.accumulatedPercentage}%` }} 
                         />
                      </div>
                      <span className="text-[9px] font-black text-slate-800 tracking-tighter w-8">
                         {item.accumulatedPercentage.toFixed(1)}%
                      </span>
                   </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {data.length === 0 && (
        <div className="p-20 text-center flex flex-col items-center">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
              ?
           </div>
           <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Nenhum dado disponível para curva ABC</p>
        </div>
      )}
    </div>
  );
}
