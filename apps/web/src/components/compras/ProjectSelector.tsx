"use client";

import * as React from "react";
import { Check, Search, ChevronDown } from "lucide-react";

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

interface Project {
  id: string;
  name: string;
  code?: string | null;
}

interface ProjectSelectorProps {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProjectSelector({ projects, value, onChange, disabled }: ProjectSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedProject = projects.find((p) => p.id === value);
  const isCompanySelected = value === "EMPRESA";

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-11 justify-between bg-white border-slate-200 rounded-lg px-4 font-normal transition-all shadow-none hover:border-slate-300 outline-none",
            !value ? "text-slate-400" : "text-slate-600 border-slate-200",
            disabled && "bg-slate-50 cursor-not-allowed hover:border-slate-200 opacity-80"
          )}
        >
          <span className="truncate">
            {isCompanySelected 
              ? "Empresa" 
              : selectedProject 
                ? `${selectedProject.code ? selectedProject.code + ' - ' : ''}${selectedProject.name}`
                : "Todos os centros de custo"}
          </span>
          {!disabled && (
            <ChevronDown className={cn(
              "ml-2 h-4 w-4 shrink-0 transition-transform duration-200 text-[#58B391]",
              open ? "rotate-180" : ""
            )} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-lg border-slate-200 shadow-xl overflow-hidden" align="start">
        <Command className="bg-white">
          <div className="flex items-center px-4 py-3 border-b border-slate-100">
             <div className="relative w-full">
                <CommandInput 
                  placeholder="" 
                  className="h-9 w-full border border-slate-900 rounded-md px-3 py-2 text-sm focus:ring-0 shadow-none outline-none"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
             </div>
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center text-sm text-slate-500 font-medium">
              Nenhuma obra encontrada.
            </CommandEmpty>
            
            <CommandGroup className="p-0">
              {/* Opção Empresa Selecionável */}
              <CommandItem
                value="empresa"
                onSelect={() => {
                  onChange("EMPRESA");
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors border-b border-slate-100",
                  isCompanySelected 
                    ? "bg-[#4A72B2] text-white hover:bg-[#3d5d91]" 
                    : "bg-white text-[#4A72B2] hover:bg-slate-50"
                )}
              >
                <span>Empresa</span>
                {isCompanySelected && (
                  <Check className="ml-auto h-3 w-3 text-white" />
                )}
              </CommandItem>

              {/* Lista de Obras Selecionáveis */}
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name + (project.code || "")}
                  onSelect={() => {
                    onChange(project.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-none cursor-pointer aria-selected:bg-blue-50 aria-selected:text-slate-900 transition-colors text-slate-600 text-sm border-b border-slate-50 last:border-0"
                >
                  <span className="truncate">
                    {project.code ? `${project.code} - ` : ""}{project.name}
                  </span>
                  {value === project.id && (
                    <Check className="ml-auto h-4 w-4 text-[#4A72B2]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
