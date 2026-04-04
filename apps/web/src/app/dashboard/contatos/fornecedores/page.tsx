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
import { Loader2, Plus, Search, Truck, ChevronLeft, ChevronRight, Mail, Phone, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type ContactFormData = {
  personType: 'PHYSICAL' | 'LEGAL';
  name: string; 
  tradeName?: string; 
  document?: string; 
  stateRegistration?: string;
  municipalRegistration?: string;
  birthDate?: string;
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
  alsoClient?: boolean; // Integração dual-role
};

export default function FornecedoresPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  
  const { data, isLoading } = trpc.contact.list.useQuery({
    type: 'SUPPLIER',
    page,
    perPage: 10,
    search: search.length >= 2 ? search : undefined
  });

  const createMutation = trpc.contact.create.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate({ type: 'SUPPLIER' });
      utils.contact.getOverview.invalidate();
      setIsDialogOpen(false);
      reset();
      toast.success("Fornecedor cadastrado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ContactFormData>({
    defaultValues: { personType: 'LEGAL' }
  });

  const currentType = watch("personType");

  const onSubmit = (formData: ContactFormData) => {
    createMutation.mutate({
      type: 'SUPPLIER',
      ...formData
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

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Truck className="h-7 w-7 text-orange-500" /> Fornecedores
          </h1>
          <p className="text-muted-foreground">Gerencie a lista de fornecedores, fábricas e prestadores de serviço.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Buscar via nome ou documento..." 
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
            if (!open) reset();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Insira as informações comerciais e de matriz do fornecedor.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                {/* Toggle Tipo */}
                <div className="flex bg-slate-100 p-1 rounded-md w-max">
                  <button 
                    type="button" 
                    onClick={() => setValue("personType", "LEGAL")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${currentType === 'LEGAL' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Pessoa Jurídica
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setValue("personType", "PHYSICAL")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${currentType === 'PHYSICAL' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Pessoa Física
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentType === 'LEGAL' ? (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Razão Social *</label>
                        <Input {...register("name", { required: true })} placeholder="Razão social oficial" />
                        {errors.name && <span className="text-xs text-red-500">Obrigatório</span>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome Fantasia</label>
                        <Input {...register("tradeName")} placeholder="Apenas para referência" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CNPJ</label>
                        <Input {...register("document")} placeholder="00.000.000/0001-00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Inscrição Estadual</label>
                        <Input {...register("stateRegistration")} placeholder="Opcional" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Inscrição Municipal</label>
                        <Input {...register("municipalRegistration")} placeholder="Opcional" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Nome Completo *</label>
                        <Input {...register("name", { required: true })} placeholder="Nome oficial" />
                        {errors.name && <span className="text-xs text-red-500">Obrigatório</span>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CPF</label>
                        <Input {...register("document")} placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data de Nascimento</label>
                        <Input type="date" {...register("birthDate")} />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-mail</label>
                    <Input type="email" {...register("email")} placeholder="contato@fornecedor.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone com DDD</label>
                    <Input {...register("phone")} placeholder="(11) 90000-0000" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-orange-500" /> Endereço Comercial
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">CEP</label>
                      <Input {...register("cep")} placeholder="00000-000" onBlur={handleCepBlur} />
                    </div>
                    <div className="space-y-2 md:col-span-4">
                      <label className="text-xs font-medium text-slate-500">Rua / Logradouro</label>
                      <Input {...register("street")} placeholder="Avenida industrial..." />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Número</label>
                      <Input id="number-input" {...register("number")} placeholder="Ex: 1024" />
                    </div>
                    <div className="space-y-2 md:col-span-4">
                      <label className="text-xs font-medium text-slate-500">Complemento</label>
                      <Input {...register("complement")} placeholder="Galpão, lote..." />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Bairro</label>
                      <Input {...register("neighborhood")} placeholder="Polo Industrial" />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-xs font-medium text-slate-500">Cidade</label>
                      <Input {...register("city")} placeholder="São Paulo" />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-medium text-slate-500">UF</label>
                      <Input {...register("state")} placeholder="MG" />
                    </div>
                  </div>
                </div>

                {/* Opção Dual Role */}
                <div className="flex items-center space-x-3 mt-4 p-4 bg-blue-50/50 rounded-md border border-blue-100/50">
                  <input 
                    type="checkbox" 
                    id="alsoClient" 
                    {...register("alsoClient")}
                    className="w-4 h-4 text-blue-600 rounded border-blue-300"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="alsoClient" className="text-sm font-medium text-blue-900 cursor-pointer">
                      Atuar também como Cliente
                    </label>
                    <span className="text-xs text-blue-700/70">
                      Irá replicar esse prestador automaticamente para a aba de clientes.
                    </span>
                  </div>
                </div>

                <DialogFooter className="mt-8 border-t pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Cadastro"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-md border shadow-sm flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Endereço / Sede</TableHead>
                <TableHead className="text-right">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground">
                    Nenhum fornecedor retornado para sua busca.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((supplier: any) => (
                  <TableRow key={supplier.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="font-medium text-primary">{supplier.name}</div>
                      {supplier.tradeName && <div className="text-xs text-muted-foreground">{supplier.tradeName}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {supplier.document || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {supplier.email && <div className="flex items-center gap-1 text-slate-600"><Mail className="w-3 h-3"/> {supplier.email}</div>}
                        {supplier.phone && <div className="flex items-center gap-1 text-slate-600"><Phone className="w-3 h-3"/> {supplier.phone}</div>}
                        {!supplier.email && !supplier.phone && <span className="text-muted-foreground">N/A</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">
                      {supplier.city ? `${supplier.city}${supplier.state ? ` - ${supplier.state}` : ''}` : "Não informado"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={supplier.personType === 'LEGAL' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}>
                        {supplier.personType === 'LEGAL' ? 'PJ' : 'PF'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
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
