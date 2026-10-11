import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatProvider } from "@/components/chat-provider";
import { DashboardContenido } from "@/components/dashboard-contenido";
import { SesionProvider } from "@/components/sesion-provider";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SesionProvider>
    <ChatProvider>
    <SidebarProvider
      className="h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SiteHeader />
        <DashboardContenido>{children}</DashboardContenido>
      </SidebarInset>
    </SidebarProvider>
    </ChatProvider>
    </SesionProvider>
  );
}
