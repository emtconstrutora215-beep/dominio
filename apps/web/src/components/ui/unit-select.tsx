"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Input } from "./input";

interface UnitSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function UnitSelect({ value, onChange, placeholder = "Selecione..." }: UnitSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [showAddPopup, setShowAddPopup] = React.useState(false);
  const [newUnit, setNewUnit] = React.useState("");
  const [search, setSearch] = React.useState("");

  const utils = trpc.useUtils();
  const { data: units, isLoading } = trpc.measurementUnit.list.useQuery();
  const createMutation = trpc.measurementUnit.create.useMutation({
    onSuccess: (unit) => {
      toast.success("Unidade cadastrada!");
      utils.measurementUnit.list.invalidate();
      onChange(unit.symbol);
      setShowAddPopup(false);
      setNewUnit("");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleSaveNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newUnit) return;
    createMutation.mutate({ symbol: newUnit });
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11 border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="truncate">
              {isLoading ? "Carregando..." : (value ? units?.find((u) => u.symbol === value)?.symbol || value : placeholder)}
            </span>
            {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 shadow-2xl border-slate-200" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar unidade..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="p-4 text-center">
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500 font-medium">Nenhuma unidade encontrada.</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                        setShowAddPopup(true);
                        setOpen(false);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Cadastrar "{search}"
                  </Button>
                </div>
              </CommandEmpty>
              
              <CommandGroup heading="Ações">
                 <CommandItem
                  onSelect={() => {
                      setShowAddPopup(true);
                      setOpen(false);
                  }}
                  className="text-blue-600 font-bold cursor-pointer hover:bg-blue-50"
                >
                  <Plus className="mr-2 h-4 w-4" /> Cadastrar Novo
                </CommandItem>
              </CommandGroup>

              <CommandGroup heading="Selecione abaixo">
                {units?.map((unit) => (
                  <CommandItem
                    key={unit.id}
                    value={unit.symbol}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === unit.symbol ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-semibold text-slate-900">{unit.symbol}</span>
                    {unit.description && <span className="text-slate-400 font-normal ml-2 text-xs truncate">- {unit.description}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Popup de Cadastro Rápido (Solicitado pelo Usuário) */}
      {showAddPopup && (
        <div className="absolute top-0 left-0 w-full z-[60] bg-white border border-slate-200 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
           <p className="text-sm font-semibold text-slate-900 mb-4">Digite o nome da nova unidade</p>
           <Input 
             autoFocus
             value={newUnit}
             onChange={(e) => setNewUnit(e.target.value)}
             placeholder="Ex: m³, kg, BTU/H..."
             className="mb-6 h-11 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-semibold uppercase"
             onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNew(e as any);
                if (e.key === 'Escape') setShowAddPopup(false);
             }}
           />
           <div className="flex items-center gap-3">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold shadow-lg shadow-blue-100"
                onClick={handleSaveNew}
                disabled={createMutation.isPending || !newUnit}
              >
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 h-11 font-semibold text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setShowAddPopup(false);
                  setNewUnit("");
                }}
              >
                Cancelar
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}
