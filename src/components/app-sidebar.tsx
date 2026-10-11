"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon, Building2Icon, FileTextIcon, LayoutDashboardIcon, MessageSquareIcon, ScanTextIcon, SlidersHorizontalIcon, StarIcon, UsersIcon,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { SidebarUsuario } from "@/components/sidebar-usuario";

const GRUPOS = [
  {
    etiqueta: "Gestión",
    items: [
      { titulo: "Panel", href: "/dashboard", icono: LayoutDashboardIcon, exacto: true },
      { titulo: "Asistente", href: "/dashboard/chat", icono: MessageSquareIcon, badge: "IA" },
      { titulo: "Propiedades", href: "/dashboard/propiedades", icono: Building2Icon },
      { titulo: "Alertas", href: "/dashboard/alertas", icono: BellIcon },
      { titulo: "Clientes", href: "/dashboard/clientes", icono: UsersIcon },
    ],
  },
  {
    etiqueta: "Documentos",
    items: [
      { titulo: "Documentos", href: "/dashboard/documentos", icono: FileTextIcon },
      { titulo: "Lector de contratos", href: "/dashboard/lector", icono: ScanTextIcon },
    ],
  },
  {
    etiqueta: "Administración",
    items: [
      { titulo: "Campos del catálogo", href: "/dashboard/campos", icono: SlidersHorizontalIcon },
      { titulo: "Valoraciones", href: "/dashboard/valoraciones", icono: StarIcon },
    ],
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const activo = (href: string, exacto?: boolean) => (exacto ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Building2Icon className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">Gestión inmobiliaria</span>
            <span className="text-[11px] text-muted-foreground">Comunidad de Madrid</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {GRUPOS.map((g) => (
          <SidebarGroup key={g.etiqueta}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{g.etiqueta}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.href}>
                    <SidebarMenuButton isActive={activo(it.href, it.exacto)} render={<Link href={it.href} />} className="font-medium">
                      <it.icono className="size-4" />
                      <span>{it.titulo}</span>
                      {it.badge && (
                        <Badge variant="outline" className="ml-auto h-4 border-primary/30 px-1 text-[10px] text-primary">
                          {it.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t p-3">
        <SidebarUsuario />
        <p className="px-1 text-[10px] leading-snug text-muted-foreground">Datos de demostración sintéticos. Respuestas legales orientativas.</p>
      </SidebarFooter>
    </Sidebar>
  );
}
