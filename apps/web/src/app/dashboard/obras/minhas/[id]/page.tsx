"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  MoreVertical, 
  Pencil, 
  MapPin, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Plus, 
  Image as ImageIcon,
  HardHat,
  Ruler,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PLANNING':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Planejamento</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Em andamento</Badge>;
    case 'PAUSED':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Paralisada</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Concluída</Badge>;
    case 'CANCELLED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function ObraDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();

  const { data: project, isLoading, error } = trpc.projects.getById.useQuery({ id }, {
    enabled: !!id
  });

  if (error) {
    console.error('tRPC error fetching project:', error);
  }
  
  const addCommentMutation = trpc.projects.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.projects.getById.invalidate({ id });
      toast.success("Comentário adicionado!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao adicionar comentário.");
    }
  });

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({
      projectId: id,
      text: commentText
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Obra não encontrada</h2>
        <Button variant="link" onClick={() => router.back()}>Voltar</Button>
      </div>
    );
  }

  const fullAddress = [
    project.street,
    project.number,
    project.neighborhood,
    project.city,
    project.state,
    project.cep
  ].filter(Boolean).join(", ");

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard/obras/minhas" className="hover:text-primary transition-colors">Minhas Obras</Link>
          <span>&gt;</span>
          <span className="font-medium text-slate-600 truncate max-w-[300px]">
            {project.code ? `${project.code} - ` : ""}{project.name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Minhas Obras</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              className="bg-[#1e5bb0] hover:bg-[#16498e] gap-2"
              onClick={() => router.push(`/dashboard/novo?type=project&id=${id}`)}
            >
              <Pencil className="h-4 w-4" /> Editar Obra
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400">
              <MoreVertical className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => router.back()}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image Placeholder */}
            <div className="w-full md:w-48 h-48 bg-slate-100 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors group">
              <div className="bg-slate-200 p-3 rounded-full group-hover:bg-slate-300 transition-colors">
                <ImageIcon className="h-8 w-8 text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Clique na imagem para alterar</span>
            </div>

            {/* Project Quick Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {project.code && <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">Código: {project.code}</Badge>}
                {getStatusBadge(project.status)}
              </div>
              <h2 className="text-2xl font-bold text-slate-700">
                {project.code ? `${project.code} - ` : ""}{project.name}
              </h2>
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  <span>{project.type || "Não definido"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Ruler className="h-4 w-4" />
                  <span>{project.totalArea || "0"} {project.areaUnit || "m²"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{project.city || "N/A"} - {project.state || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Visibility / Avatars */}
            <div className="flex flex-col items-end gap-2 min-w-[150px]">
              <span className="text-xs text-slate-400 font-medium">Obra visível para:</span>
              <div className="flex -space-x-2 overflow-hidden">
                {project.users?.map((u: any, i: number) => (
                  <div 
                    key={u.id} 
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-[#1e5bb0] text-white text-[10px] font-bold"
                    title={u.name}
                  >
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                ))}
                {(project.users?.length || 0) > 4 && (
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 text-slate-500 text-[10px] font-bold">
                    +{(project.users?.length || 0) - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações da Obra */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Informações da obra</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Responsável da obra:</span>
                <span className="text-sm text-slate-600 font-medium">{project.projectManager?.name || "-"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">ART:</span>
                <span className="text-sm text-slate-600 font-medium">{project.art || "-"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Quem paga:</span>
                <span className="text-sm text-slate-600 font-medium">
                  {project.paymentResponsibility === 'COMPANY' ? 'Empresa' : 
                   project.paymentResponsibility === 'CLIENT' ? 'Cliente' : 
                   project.paymentResponsibility === 'CLIENT_REIMBURSEMENT' ? 'Reembolso Cliente' : '-'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Responsável Técnico:</span>
                <span className="text-sm text-slate-600 font-medium">{project.technicalLead?.name || "-"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">CEI/CNO:</span>
                <span className="text-sm text-slate-600 font-medium">{project.ceiCno || "-"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Conta:</span>
                <span className="text-sm text-slate-600 font-medium">{project.defaultBankAccount?.name || "-"}</span>
              </div>
              <div className="col-span-full pt-4 border-t">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-medium">Endereço da obra:</span>
                  <span className="text-sm text-slate-600 font-medium">{fullAddress || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comentários */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Comentários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50/50 rounded-lg p-6 min-h-[100px] border border-slate-100">
                {project.comments && project.comments.length > 0 ? (
                  <div className="space-y-6">
                    {project.comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                          {comment.user?.name?.substring(0, 2).toUpperCase() || "??"}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">{comment.user?.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(comment.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">Nenhum comentário...</span>
                )}
              </div>
              
              <div className="space-y-3 pt-2">
                <Textarea 
                  placeholder="Escreva um comentário..." 
                  className="bg-white border-slate-200 min-h-[80px] focus-visible:ring-[#1e5bb0]"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button 
                  variant="ghost" 
                  className="text-[#2eb85c] hover:text-[#25914a] hover:bg-emerald-50 px-0 h-auto font-bold gap-1 text-xs"
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending || !commentText.trim()}
                >
                  <Plus className="h-3 w-3" /> + Comentário
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.client ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 uppercase">{project.client.name}</span>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-500 border-blue-100 font-medium">Cliente</Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">CNPJ: {project.client.document || "-"}</span>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="bg-blue-500 p-1.5 rounded-md text-white">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-blue-500 font-medium">{project.client.email || "Sem email"}</span>
                      {project.client.phone && <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Nenhum cliente vinculado.</span>
              )}
            </CardContent>
          </Card>

          {/* Exibir obra para */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Exibir obra para</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Lançamento</span>
                  <Badge className={`text-[10px] font-bold ${project.showInFinancial ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    {project.showInFinancial ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Faturamento</span>
                  <Badge className={`text-[10px] font-bold ${project.showInInvoicing ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    {project.showInInvoicing ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Compras</span>
                  <Badge className={`text-[10px] font-bold ${project.showInPurchasing ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    {project.showInPurchasing ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
