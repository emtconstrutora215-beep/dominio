"use client";

import { trpc } from "@/trpc/client";
import { OrderForm } from "@/components/compras/OrderForm";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: order, isLoading, error } = trpc.purchasing.getOrderById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#F07B2B]" />
        <p className="text-slate-500 font-medium">Carregando detalhes da ordem...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-6 text-center">
        <div className="bg-red-50 p-4 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Erro ao carregar ordem</h2>
          <p className="text-slate-500 max-w-md">
            {error?.message || "Não foi possível encontrar a ordem de compra solicitada ou você não tem permissão para acessá-la."}
          </p>
        </div>
        <Link href="/dashboard/compras/ordens">
          <Button variant="outline" className="rounded-xl px-8 h-12">
            Voltar para a Listagem
          </Button>
        </Link>
      </div>
    );
  }

  return <OrderForm mode="edit" initialData={order} />;
}
