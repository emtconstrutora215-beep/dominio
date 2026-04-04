"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, HardHat, ChevronLeft, ChevronRight, Mail, Phone, MapPin, Briefcase, UserCircle, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type ProfissionalFormData = {
  personType: 'PHYSICAL' | 'LEGAL';
  name: string; 
  document?: string; 
  gender?: 'MALE' | 'FEMALE';
  rg?: string;
  rgUf?: string;
  birthDate?: string;
  childrenCount?: number;
  motherName?: string;
  fatherName?: string;

  workRegime?: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'CONTRACTOR';
  remunerationValue?: number;
  jobRoleId?: string;
  skillLevel?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  admissionDate?: string;
  dismissalDate?: string;

  email?: string;
  phone?: string;
  notes?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  state?: string;
  city?: string;
};

export default function ProfissionaisPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'GERAL' | 'ENDERECO' | 'RH'>('GERAL');

  const utils = trpc.useUtils();
  
  const { data, isLoading } = trpc.contact.list.useQuery({
    type: 'PROFESSIONAL',
    page,
    perPage: 10,
    search: search.length >= 2 ? search : undefined
  });

  const { data: jobRoles } = trpc.jobRole.list.useQuery();
  const createJobRole = trpc.jobRole.create.useMutation({
    onSuccess: () => utils.jobRole.list.invalidate()
  });

  const createMutation = trpc.contact.create.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate({ type: 'PROFESSIONAL' });
      utils.contact.getOverview.invalidate();
      setIsDialogOpen(false);
      reset();
      setActiveTab('GERAL');
      toast.success("Profissional contratado/cadastrado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProfissionalFormData>({
    defaultValues: { personType: 'PHYSICAL' }
  });

  const currentRegime = watch("workRegime");

  const onSubmit = (formData: ProfissionalFormData) => {
    createMutation.mutate({
      type: 'PROFESSIONAL',
      ...formData,
      childrenCount: formData.childrenCount ? Number(formData.childrenCount) : undefined,
      remunerationValue: formData.remunerationValue ? Number(formData.remunerationValue) : undefined,
    });
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setValue("street", data.logradouro);
        setValue("neighborhood", data.bairro);
        setValue("city", data.localidade);
        setValue("state", data.uf);
        document.getElementById("number-input")?.focus();
      }
    } catch (err) {
      console.error("Erro ao buscar CEP", err);
    }
  };

  const handleCreateNewRole = () => {
    const roleName = prompt("Digite o nome da nova função (Ex: Mestre de Obras):");
    if (roleName && roleName.trim()) {
      createJobRole.mutate({ name: roleName.trim() }, {
        onSuccess: (newRole) => {
          setValue("jobRoleId", newRole.id);
          toast.success("Função cadastrada e selecionada!");
        }
      });
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <HardHat className="h-7 w-7 text-green-600" /> Profissionais
          </h1>
          <p className="text-muted-foreground">Gerencie sua equipe, colaboradores e terceirizados.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Buscar profissionais..." 
              className="pl-9 w-full md:w-[320px]"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              reset();
              setActiveTab('GERAL');
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="h-4 w-4 mr-2" /> Contratar / Adicionar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>Ficha do Construtor / Profissional</DialogTitle>
                <DialogDescription>
                  Insira os dados cadastrais e de contratação do profissional.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex border-b px-6 bg-slate-50">
                <button 
                  type="button"
                  onClick={() => setActiveTab('GERAL')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'GERAL' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <UserCircle className="w-4 h-4" /> Dados Pessoais
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('RH')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'RH' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <Briefcase className="w-4 h-4" /> Contrato & Função
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('ENDERECO')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ENDERECO' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <MapPin className="w-4 h-4" /> Endereço
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto px-6 py-4 space-y-6 flex-1">
                <div className={activeTab === 'GERAL' ? 'block' : 'hidden'}>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="space-y-2 md:col-span-4">
                      <label className="text-sm font-medium">Nome Completo *</label>
                      <Input {...register("name", { required: true })} placeholder="Nome oficial na carteira" />
                      {errors.name && <span className="text-xs text-red-500">Obrigatório</span>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Sexo</label>
                      <select {...register("gender")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Selecione...</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Feminino</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <label className="text-sm font-medium">CPF</label>
                      <Input {...register("document")} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">RG</label>
                      <Input {...register("rg")} placeholder="00.000.000-0" />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-sm font-medium">UF RG</label>
                      <Input {...register("rgUf")} placeholder="SP" />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <label className="text-sm font-medium">Data de Nascimento</label>
                      <Input type="date" {...register("birthDate")} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-sm font-medium">Quantidade de Filhos</label>
                      <Input type="number" {...register("childrenCount")} placeholder="0" min="0" />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <label className="text-sm font-medium">Nome da Mãe</label>
                      <Input {...register("motherName")} placeholder="Afiliação Materna" />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-sm font-medium">Nome do Pai</label>
                      <Input {...register("fatherName")} placeholder="Afiliação Paterna" />
                    </div>

                    <div className="space-y-2 md:col-span-3 mt-4">
                      <label className="text-sm font-medium">Telefone Celular</label>
                      <Input {...register("phone")} placeholder="(11) 90000-0000" />
                    </div>
                    <div className="space-y-2 md:col-span-3 mt-4">
                      <label className="text-sm font-medium">E-mail</label>
                      <Input type="email" {...register("email")} placeholder="trabalhador@email.com" />
                    </div>
                  </div>
                </div>

                <div className={activeTab === 'RH' ? 'block' : 'hidden'}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Função (Cargo)</label>
                      <div className="flex gap-2">
                        <select {...register("jobRoleId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                          <option value="">Selecione uma função...</option>
                          {jobRoles?.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                        <Button type="button" variant="outline" size="icon" onClick={handleCreateNewRole} title="Cadastrar nova função">
                          {createJobRole.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nível Técnico</label>
                      <select {...register("skillLevel")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Selecione o nível...</option>
                        <option value="BASIC">Básico (Auxiliar/Inicial)</option>
                        <option value="INTERMEDIATE">Intermediário (Pleno)</option>
                        <option value="ADVANCED">Avançado (Sênior/Mestre)</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2 pt-4 border-t">
                      <label className="text-sm font-medium">Regime de Trabalho</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(['HOURLY', 'DAILY', 'MONTHLY', 'CONTRACTOR'] as const).map((regime) => (
                          <div key={regime} className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              id={`regime-${regime}`}
                              value={regime} 
                              {...register("workRegime")} 
                              className="text-green-600 focus:ring-green-500"
                            />
                            <label htmlFor={`regime-${regime}`} className="text-sm cursor-pointer">
                              {regime === 'HOURLY' ? 'Horista' : regime === 'DAILY' ? 'Diarista' : regime === 'MONTHLY' ? 'Mensalista' : 'Empreiteiro'}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentRegime && (
                      <div className="space-y-2 md:col-span-2 bg-green-50/50 p-4 rounded-md border border-green-100">
                        <label className="text-sm font-medium text-green-900">
                          {currentRegime === 'HOURLY' ? 'Valor Remuneração por Hora (R$)' : 
                           currentRegime === 'DAILY' ? 'Valor Remuneração por Dia (R$)' : 
                           currentRegime === 'MONTHLY' ? 'Valor Remuneração por Mês (R$)' : 
                           'Valor do Contrato de Empreitada (R$)'}
                        </label>
                        <Input type="number" step="0.01" {...register("remunerationValue")} placeholder="0.00" className="max-w-[200px]" />
                      </div>
                    )}

                    <div className="space-y-2 pt-4 border-t">
                      <label className="text-sm font-medium">Data de Admissão</label>
                      <Input type="date" {...register("admissionDate")} />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <label className="text-sm font-medium text-slate-500">Data de Demissão (se aplicável)</label>
                      <Input type="date" {...register("dismissalDate")} />
                    </div>
                  </div>
                </div>

                <div className={activeTab === 'ENDERECO' ? 'block' : 'hidden'}>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">CEP</label>
                      <Input {...register("cep")} placeholder="00000-000" onBlur={handleCepBlur} />
                    </div>
                    <div className="space-y-2 md:col-span-4">
                      <label className="text-xs font-medium text-slate-500">Rua / Logradouro</label>
                      <Input {...register("street")} placeholder="Endereço da moradia..." />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Número</label>
                      <Input id="number-input" {...register("number")} placeholder="Ex: 102" />
                    </div>
                    <div className="space-y-2 md:col-span-4">
                      <label className="text-xs font-medium text-slate-500">Complemento</label>
                      <Input {...register("complement")} placeholder="Apto, bloco..." />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Bairro</label>
                      <Input {...register("neighborhood")} placeholder="Bairro" />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-xs font-medium text-slate-500">Cidade</label>
                      <Input {...register("city")} placeholder="Cidade" />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-medium text-slate-500">UF</label>
                      <Input {...register("state")} placeholder="UF" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t pt-4 px-6 md:px-0 bg-white sticky bottom-0">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Profissional"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela de Profissionais */}
      <div className="bg-white rounded-md border shadow-sm flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato Central</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Admissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground">
                    Nenhum profissional encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((prof: any) => (
                  <TableRow key={prof.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="font-medium text-primary">{prof.name}</div>
                      {prof.jobRoleId && <div className="text-xs text-green-700 font-medium">{jobRoles?.find(r => r.id === prof.jobRoleId)?.name || "Função Associada"}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {prof.document || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {prof.email && <div className="flex items-center gap-1 text-slate-600"><Mail className="w-3 h-3"/> {prof.email}</div>}
                        {prof.phone && <div className="flex items-center gap-1 text-slate-600"><Phone className="w-3 h-3"/> {prof.phone}</div>}
                        {!prof.email && !prof.phone && <span className="text-muted-foreground">N/A</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">
                      {prof.city ? `${prof.city}${prof.state ? ` - ${prof.state}` : ''}` : "Não informado"}
                    </TableCell>
                    <TableCell className="text-right">
                      {prof.admissionDate ? new Date(prof.admissionDate).toLocaleDateString('pt-BR') : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Local/tRPC */}
        <div className="border-t p-4 flex items-center justify-between bg-slate-50/50 rounded-b-md">
          <div className="text-sm text-muted-foreground">
            Total de {data?.totalCount || 0} registros
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium px-4">
              Página {page} de {data?.totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))}
              disabled={page >= (data?.totalPages || 1) || isLoading}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
