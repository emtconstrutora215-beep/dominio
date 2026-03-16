"use client";

import { trpc } from "@/trpc/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  UserCircle2,
  HardHat,
  Construction
} from "lucide-react";

export default function EquipePage() {
  const { data: users, isLoading } = trpc.company.getUsers.useQuery();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge className="bg-slate-900 border-none rounded-none flex gap-1 items-center px-2 py-0.5">
            <ShieldCheck className="w-3 h-3" /> Admin
          </Badge>
        );
      case 'ENGINEER':
        return (
          <Badge className="bg-secondary hover:bg-secondary border-none rounded-none flex gap-1 items-center px-2 py-0.5 text-white">
            <Construction className="w-3 h-3" /> Engenheiro
          </Badge>
        );
      case 'FIELD':
        return (
          <Badge variant="outline" className="border-slate-300 text-slate-600 rounded-none flex gap-1 items-center px-2 py-0.5">
            <HardHat className="w-3 h-3" /> Campo
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="rounded-none">{role}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tighter text-slate-900 uppercase">
          Minha Equipe
        </h1>
        <p className="text-slate-500 max-w-2xl border-l-2 border-primary pl-4">
          Visualização centralizada de todos os colaboradores vinculados à EMT Construtora Ltda. 
          Acesso e papéis são gerenciados via Supabase Auth.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users?.map((user) => (
          <Card 
            key={user.id} 
            className="group overflow-hidden border-2 border-slate-100 rounded-none hover:border-primary/40 transition-all duration-300"
          >
            <div className="h-1.5 w-full bg-slate-100 group-hover:bg-primary transition-colors" />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-50 p-2 rounded-none border border-slate-200 group-hover:border-primary/20 transition-colors">
                  <UserCircle2 className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                {getRoleBadge(user.role)}
              </div>
              <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                {user.name || "N/A"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 truncate">
                <Mail className="w-3 h-3" /> {user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              
              <div className="pt-2 border-t border-slate-50">
                <div className="h-1 w-full bg-slate-100 overflow-hidden">
                   <div className="h-full bg-primary/20 w-full" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-1">
                  Ativo no Sistema
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {users?.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 grayscale">
            <p className="text-slate-400 font-medium">Nenhum membro da equipe encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
