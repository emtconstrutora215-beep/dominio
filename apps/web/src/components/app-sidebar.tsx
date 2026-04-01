import {
  Plus,
  LayoutGrid,
  Users,
  BookOpen,
  HardHat,
  Package,
  ShoppingCart,
  DollarSign,
  Download,
  PieChart,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

import { type User } from "@supabase/supabase-js"
import { LogoutButton } from "./logout-button"
import Link from "next/link"

const items = [
  {
    title: "Novo",
    url: "/dashboard/novo",
    icon: Plus,
    featured: true,
  },
  {
    title: "Painel",
    url: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Contatos",
    url: "/dashboard/contatos",
    icon: Users,
    children: [
      { title: "Clientes", url: "/dashboard/contatos/clientes" },
      { title: "Fornecedores", url: "/dashboard/contatos/fornecedores" },
      { title: "Profissionais", url: "/dashboard/contatos/profissionais" },
    ],
  },
  {
    title: "Catálogo",
    url: "/dashboard/catalogo",
    icon: BookOpen,
    children: [
      { title: "Insumos", url: "/dashboard/catalogo/insumos" },
      { title: "Composições", url: "/dashboard/catalogo/composicoes" },
    ],
  },
  {
    title: "Obras",
    url: "/dashboard/obras",
    icon: HardHat,
    children: [
      { title: "Minhas Obras", url: "/dashboard/obras/minhas" },
      { title: "Orçamento", url: "/dashboard/obras/orcamento" },
      { title: "Medição de Obras", url: "/dashboard/obras/medicao" },
      { title: "Diário de Obras", url: "/dashboard/obras/diario" },
      { title: "Medição de Contratos", url: "/dashboard/obras/medicao-contratos" },
      { title: "Gestão", url: "/dashboard/obras/gestao" },
    ],
  },
  {
    title: "Estoque",
    url: "/dashboard/estoque",
    icon: Package,
    children: [
      { title: "Movimentações", url: "/dashboard/estoque/movimentacoes" },
      { title: "Depósitos", url: "/dashboard/estoque/depositos" },
    ],
  },
  {
    title: "Compras",
    url: "/dashboard/compras",
    icon: ShoppingCart,
    children: [
      { title: "Solicitação", url: "/dashboard/compras/solicitacoes" },
      { title: "Cotação", url: "/dashboard/compras/cotacoes" },
      { title: "Ordem de Compras", url: "/dashboard/compras/ordens" },
    ],
  },
  {
    title: "Financeiro",
    url: "/dashboard/financeiro",
    icon: DollarSign,
    children: [
      { title: "Recebimentos", url: "/dashboard/financeiro/recebimentos" },
      { title: "Pagamentos", url: "/dashboard/financeiro/pagamentos" },
      { title: "Cobrança Fácil", url: "/dashboard/financeiro/cobranca" },
      { title: "Contas Bancárias", url: "/dashboard/financeiro/contas" },
      { title: "Fluxo de Caixa", url: "/dashboard/financeiro/fluxo" },
      { title: "Resultados", url: "/dashboard/financeiro/resultados" },
    ],
  },
  {
    title: "Exportar",
    url: "/dashboard/exportar",
    icon: Download,
  },
  {
    title: "BI",
    url: "/dashboard/bi",
    icon: PieChart,
    children: [
      { title: "Comercial", url: "/dashboard/bi/comercial" },
      { title: "Compras", url: "/dashboard/bi/compras" },
      { title: "Financeiros", url: "/dashboard/bi/financeiros" },
      { title: "Multiobras", url: "/dashboard/bi/multiobras" },
      { title: "Visão por Obras", url: "/dashboard/bi/visao-obras" },
    ],
  },
]

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar 
      collapsible="none"
      className="bg-[#1862a3] border-none text-white relative min-h-screen h-full py-2 select-none z-40 overflow-visible shadow-lg"
      style={{ "--sidebar-width": "85px" } as React.CSSProperties}
    >
      <SidebarContent className="bg-transparent hide-scrollbar overflow-visible pb-16 pt-2">
        <SidebarGroup className="p-0 border-none overflow-visible">
          <SidebarGroupContent className="overflow-visible">
            <SidebarMenu className="gap-2 px-0 overflow-visible">
              {items.map((item) => {
                const isFeatured = item.featured;
                
                const ButtonContent = (
                  <SidebarMenuButton 
                    asChild 
                    className={`
                      flex flex-col items-center justify-center p-2 h-auto gap-1 rounded-none
                      font-medium transition-colors cursor-pointer group hover:bg-[#2072bd]
                      w-full active:bg-[#247ccc] hover:text-white !text-white border-0 ring-0
                      ${isFeatured ? "text-white" : "text-white/90"}
                    `}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-6 w-6 mb-0.5 drop-shadow-sm" strokeWidth={isFeatured ? 2.5 : 2} />
                      <span className="text-[10px] leading-tight text-center drop-shadow-sm w-full break-words">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                );

                if (item.children && item.children.length > 0) {
                  return (
                    <SidebarMenuItem key={item.title} className="overflow-visible">
                      <HoverCard openDelay={0} closeDelay={150}>
                        <HoverCardTrigger asChild>
                          <div className="w-full">{ButtonContent}</div>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          side="right" 
                          align="start" 
                          sideOffset={2}
                          className="w-48 p-1.5 bg-white border border-slate-200 shadow-xl rounded-md z-50 animate-in zoom-in-95"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold uppercase text-slate-500 mb-1 px-2 pt-1">{item.title}</span>
                            {item.children.map((child) => (
                              <Link 
                                key={child.title} 
                                href={child.url}
                                className="text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#1862a3] px-2 py-1.5 rounded transition-colors"
                              >
                                {child.title}
                              </Link>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </SidebarMenuItem>
                  )
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    {ButtonContent}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Bottom Profile/Logout Section */}
      <div className="mt-auto absolute bottom-0 left-0 w-full bg-[#124d80] py-3 px-1">
        <HoverCard openDelay={100} closeDelay={150}>
          <HoverCardTrigger asChild>
            <div className="flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 p-1 rounded transition">
               <LogOut className="h-5 w-5 text-white/90" />
               <span className="text-[9px] text-white/80 mt-1">Sair</span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="end" sideOffset={14} className="w-56 p-3 z-50 bg-white shadow-xl">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-800 break-all">{user.email}</span>
              <LogoutButton />
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </Sidebar>
  )
}
