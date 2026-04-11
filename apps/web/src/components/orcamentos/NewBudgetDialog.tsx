"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, Building2, User, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function NewBudgetDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Inputs
  const [code, setCode] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  // Queries
  const { data: options, isLoading } = trpc.projects.formOptions.useQuery(undefined, {
    enabled: open
  });
  
  const createBudget = trpc.budget.createBudget.useMutation({
    onSuccess: (data) => {
      toast.success("Orçamento iniciado!");
      setOpen(false);
      router.push(`/dashboard/obras/orcamentos/${data.projectId}/detalhes`);
    },
    onError: (err) => {
      toast.error(`Erro ao criar orçamento: ${err.message}`);
    }
  });

  // Derived
  const selectedProject = useMemo(() => {
    return options?.projects.find(p => p.id === selectedProjectId);
  }, [options, selectedProjectId]);

  const clientName = useMemo(() => {
    if (!selectedProject) return "";
    const client = options?.clients.find(c => c.id === selectedProject.clientId);
    return client?.name || "Cliente Particular";
  }, [selectedProject, options]);

  const handleStart = () => {
    if (!selectedProjectId) {
      toast.error("Selecione uma obra para começar.");
      return;
    }
    createBudget.mutate({ projectId: selectedProjectId, code: code || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 px-8 shadow-xl shadow-emerald-100 transition-all active:scale-95 rounded-xl uppercase text-[11px] tracking-widest">
            <Plus className="mr-2 h-5 w-5" /> NOVO ORÇAMENTO
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <DialogTitle className="text-2xl font-black uppercase tracking-tight relative z-10">Iniciar Orçamento</DialogTitle>
          <DialogDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest relative z-10">
            Configure as informações iniciais da proposta
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white">
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Código Identificador</Label>
            <Input 
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="EX: ORC-2024-001" 
              className="h-12 font-bold border-2 border-slate-100 bg-slate-50/50 focus-visible:ring-emerald-500 focus-visible:bg-white rounded-xl transition-all"
            />
          </div>

          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Selecionar Obra</Label>
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
              <SelectTrigger className="h-12 font-bold border-2 border-slate-100 bg-slate-50/50 rounded-xl focus:ring-emerald-500 text-slate-600">
                <SelectValue placeholder={isLoading ? "Carregando obras..." : "Selecione a obra no banco..."} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2 shadow-xl p-2">
                {isLoading && (
                   <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
                )}
                {options?.projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="font-bold py-3 rounded-lg focus:bg-emerald-50 focus:text-emerald-700">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 opacity-40" />
                      <div>
                         <p className="leading-none">{p.name}</p>
                         <p className="text-[9px] font-medium text-slate-400 uppercase mt-1">Cód: {p.code || 'S/N'}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Responsável / Cliente</Label>
            <div className="h-12 flex items-center px-4 bg-slate-50 border-2 border-dotted border-slate-200 rounded-xl">
              <User className="w-4 h-4 text-slate-300 mr-3" />
              <span className="text-sm font-black text-slate-400 overflow-hidden whitespace-nowrap overflow-ellipsis">
                {clientName || "Selecione uma obra primeiro..."}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50 flex flex-row justify-between gap-4 border-t border-slate-100">
          <Button 
            variant="ghost" 
            className="font-black uppercase text-[10px] tracking-widest h-12 flex-1 hover:bg-slate-200/50 text-slate-500" 
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest h-12 flex-1 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
            disabled={createBudget.isPending || !selectedProjectId}
            onClick={handleStart}
          >
            {createBudget.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Começar Orçamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
