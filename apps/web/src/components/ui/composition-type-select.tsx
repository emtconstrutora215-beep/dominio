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

interface CompositionTypeSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CompositionTypeSelect({ value, onChange, placeholder = "Selecione o tipo..." }: CompositionTypeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [showAddPopup, setShowAddPopup] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [search, setSearch] = React.useState("");

  const utils = trpc.useUtils();
  const { data: types, isLoading } = trpc.compositionType.list.useQuery();
  const createMutation = trpc.compositionType.create.useMutation({
    onSuccess: (type) => {
      toast.success("Tipo cadastrado!");
      utils.compositionType.list.invalidate();
      onChange(type.name);
      setShowAddPopup(false);
      setNewName("");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleSaveNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newName) return;
    createMutation.mutate({ name: newName });
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
              {isLoading ? "Carregando..." : (value ? types?.find((t) => t.name === value)?.name || value : placeholder)}
            </span>
            {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 shadow-2xl border-slate-200" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar tipo..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="p-4 text-center">
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500 font-medium">Nenhum tipo encontrado.</p>
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
                {types?.map((type) => (
                  <CommandItem
                    key={type.id}
                    value={type.name}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === type.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-semibold text-slate-900">{type.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Popup de Cadastro Rápido */}
      {showAddPopup && (
        <div className="absolute top-0 left-0 w-full z-[60] bg-white border border-slate-200 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
           <p className="text-sm font-semibold text-slate-900 mb-4">Digite o nome do novo tipo</p>
           <Input 
             autoFocus
             value={newName}
             onChange={(e) => setNewName(e.target.value)}
             placeholder="Ex: Alvenaria, Pintura..."
             className="mb-6 h-11 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-semibold"
             onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNew(e as any);
                if (e.key === 'Escape') setShowAddPopup(false);
             }}
           />
           <div className="flex items-center gap-3">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold shadow-lg shadow-blue-100"
                onClick={handleSaveNew}
                disabled={createMutation.isPending || !newName}
              >
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 h-11 font-semibold text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setShowAddPopup(false);
                  setNewName("");
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
