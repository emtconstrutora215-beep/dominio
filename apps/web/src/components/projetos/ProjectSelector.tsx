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

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-14 justify-between bg-white border-slate-200 rounded-xl px-4 font-medium transition-all shadow-sm hover:border-slate-300 outline-none",
            !value ? "text-slate-400" : "text-slate-600 border-slate-200",
            disabled && "bg-slate-50 cursor-not-allowed hover:border-slate-200 opacity-80"
          )}
        >
          <span className="truncate">
            {selectedProject 
                ? `${selectedProject.code ? selectedProject.code + ' - ' : ''}${selectedProject.name}`
                : "Selecione uma obra..."}
          </span>
          {!disabled && (
            <ChevronDown className={cn(
              "ml-2 h-5 w-5 shrink-0 transition-transform duration-200 text-[#1A73E8]",
              open ? "rotate-180" : ""
            )} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-slate-200 shadow-xl overflow-hidden" align="start">
        <Command className="bg-white">
          <div className="flex items-center px-4 py-3 border-b border-slate-100">
             <div className="relative w-full">
                <CommandInput 
                  placeholder="Pesquisar obra..." 
                  className="h-10 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A73E8]/20 shadow-none outline-none"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
             </div>
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center text-sm text-slate-500 font-medium">
              Nenhuma obra encontrada.
            </CommandEmpty>
            
            <CommandGroup className="p-0">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name + (project.code || "")}
                  onSelect={() => {
                    onChange(project.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-none cursor-pointer aria-selected:bg-blue-50 aria-selected:text-[#1A73E8] transition-colors text-slate-600 text-sm border-b border-slate-50 last:border-0"
                >
                  <span className="truncate font-medium">
                    {project.code ? `${project.code} - ` : ""}{project.name}
                  </span>
                  {value === project.id && (
                    <Check className="ml-auto h-4 w-4 text-[#1A73E8]" />
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
