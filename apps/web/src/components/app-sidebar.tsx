import { Home, Settings, DollarSign, HardHat, Building2, ClipboardList, ShoppingCart, ListPlus, FileCheck, Package, BarChart3 } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "BI / Analytics",
    url: "/dashboard/bi",
    icon: BarChart3,
  },
  {
    title: "Projetos (Obras)",
    url: "/dashboard/projetos",
    icon: Building2,
  },
  {
    title: "Diário de Obras",
    url: "/dashboard/diario",
    icon: ClipboardList,
  },
  {
    title: "Solicitações",
    url: "/dashboard/compras/solicitacoes",
    icon: ListPlus,
  },
  {
    title: "Cotações",
    url: "/dashboard/compras/cotacoes",
    icon: FileCheck,
  },
  {
    title: "Ordens de Compra",
    url: "/dashboard/compras/ordens",
    icon: ShoppingCart,
  },
  {
    title: "Estoque",
    url: "/dashboard/estoque",
    icon: Package,
  },
  {
    title: "Financeiro",
    url: "/dashboard/financeiro",
    icon: DollarSign,
  },
  {
    title: "Equipe",
    url: "/dashboard/equipe",
    icon: HardHat,
  },
  {
    title: "Configurações",
    url: "/dashboard/config",
    icon: Settings,
  },
]

import { type User } from "@supabase/supabase-js"
import { LogoutButton } from "./logout-button"

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>EMT Construtora ERP</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarGroup className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 px-2 py-4">
              <span className="text-sm font-medium">{user.email}</span>
              <LogoutButton />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </Sidebar>
  )
}
