"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
import { Plus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProjectStatus = 'PLANNING' | 'BUDGETING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export function NewBudgetDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Inputs
  const [code, setCode] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("BUDGETING");
  
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

  // Sync initial status when project changes
  useEffect(() => {
    if (selectedProject) {
      setStatus(selectedProject.status as ProjectStatus || 'BUDGETING');
    }
  }, [selectedProject]);

  const handleStart = () => {
    if (!selectedProjectId) {
      toast.error("Selecione uma obra para começar.");
      return;
    }
    createBudget.mutate({ 
      projectId: selectedProjectId, 
      code: code || undefined,
      status: status
    });
  };

  const selectTriggerClass = "h-11 border-slate-200 bg-white rounded-md focus:ring-1 focus:ring-blue-500 transition-all text-slate-600 font-medium";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 shadow-sm transition-all active:scale-95 rounded-md text-sm">
            <Plus className="mr-2 h-4 w-4" /> Novo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border border-slate-200 rounded-lg shadow-2xl">
        <DialogHeader className="px-10 pt-10 pb-6 bg-white">
          <DialogTitle className="text-[26px] font-bold text-[#0066cc] leading-tight">
            Primeiros passos para <br /> criar um orçamento
          </DialogTitle>
        </DialogHeader>

        <div className="px-10 pb-10 space-y-6 bg-white">
          {/* Código */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-500">Código do orçamento</Label>
            <Input 
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="0.5" 
              className="h-11 border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-blue-500 rounded-md transition-all text-slate-600 font-medium"
            />
          </div>

          {/* Obra */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-500">Obra</Label>
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
              <SelectTrigger className={selectTriggerClass}>
                <div className="flex items-center justify-between w-full pr-2">
                  <SelectValue placeholder={isLoading ? "Carregando obras..." : "Selecione a obra..."} />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-md border border-slate-200 shadow-xl">
                {options?.projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="py-2.5 font-medium text-slate-600">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-500">Cliente</Label>
            <div className={cn(selectTriggerClass, "flex items-center px-3 justify-between bg-slate-50 border-slate-100 cursor-not-allowed")}>
              <span className={cn("text-sm", clientName ? "text-slate-600" : "text-slate-400")}>
                {clientName || "Aguardando seleção de obra..."}
              </span>
              {clientName && (
                <div className="flex items-center gap-2">
                   <X className="w-3.5 h-3.5 text-slate-400" />
                   <div className="w-px h-4 bg-slate-200" />
                   <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-500">Status da obra</Label>
            <Select onValueChange={(v) => setStatus(v as ProjectStatus)} value={status}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Selecione o status..." />
              </SelectTrigger>
              <SelectContent className="rounded-md border border-slate-200 shadow-xl">
                <SelectItem value="PLANNING">A Iniciar</SelectItem>
                <SelectItem value="BUDGETING">Em Orçamento</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="PAUSED">Pausado</SelectItem>
                <SelectItem value="COMPLETED">Finalizado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="px-10 py-8 bg-white flex flex-row justify-between items-center sm:justify-between border-t border-slate-50">
          <Button 
            variant="outline" 
            className="h-11 px-8 rounded-md border-slate-200 text-slate-500 font-medium hover:bg-slate-50" 
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-bold h-11 px-10 rounded-md shadow-sm transition-all active:scale-95"
            disabled={createBudget.isPending || !selectedProjectId}
            onClick={handleStart}
          >
            {createBudget.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Começar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChevronDownIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
