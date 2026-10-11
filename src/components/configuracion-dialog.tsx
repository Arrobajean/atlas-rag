"use client";

import * as React from "react";
import { LogOutIcon, MoonIcon, SunIcon, Trash2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChatAcciones, useChatCantidad } from "@/components/chat-provider";
import { etiquetaRol } from "@/lib/perfil";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombre: string;
  onNombre: (n: string) => void;
  rol: "gestor" | "admin" | null;
  abierto: boolean;
  onSalir: () => void;
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{titulo}</h3>
      {children}
    </section>
  );
}

export function ConfiguracionDialog({ open, onOpenChange, nombre, onNombre, rol, abierto, onSalir }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const { clear } = useChatAcciones();
  const total = useChatCantidad();
  const [borrador, setBorrador] = React.useState(nombre);
  const oscuro = resolvedTheme !== "light";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setBorrador(nombre);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription className="text-xs">Ajustes de este navegador. Aún no hay acceso por usuario: el perfil no se comparte.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-1">
          <Seccion titulo="Perfil">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onNombre(borrador);
                toast.success("Nombre actualizado");
              }}
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="cfg-nombre" className="text-xs">Nombre</Label>
                <Input id="cfg-nombre" value={borrador} onChange={(e) => setBorrador(e.target.value)} maxLength={60} />
              </div>
              <Button type="submit" size="sm" disabled={!borrador.trim() || borrador.trim() === nombre}>Guardar</Button>
            </form>
            <p className="text-xs text-muted-foreground">Rol: {etiquetaRol(rol, abierto)}{abierto ? " · acceso abierto (sin login)" : ""}</p>
          </Seccion>

          <Seccion titulo="Apariencia">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tema">
              {[
                { valor: "light", etiqueta: "Claro", icono: SunIcon, activo: !oscuro },
                { valor: "dark", etiqueta: "Oscuro", icono: MoonIcon, activo: oscuro },
              ].map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  role="radio"
                  aria-checked={t.activo}
                  onClick={() => setTheme(t.valor)}
                  className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted", t.activo && "border-primary bg-primary/5 font-medium")}
                >
                  <t.icono className="size-4" /> {t.etiqueta}
                </button>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Asistente">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="text-sm">
                <p className="font-medium">Conversación guardada</p>
                <p className="text-xs text-muted-foreground">{total ? `${total} mensajes en este navegador` : "No hay ninguna"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={total === 0}
                onClick={() => {
                  clear();
                  toast.success("Conversación borrada");
                }}
              >
                <Trash2Icon className="mr-1.5 size-3.5" /> Borrar
              </Button>
            </div>
          </Seccion>

          {!abierto && (
            <Button variant="outline" className="w-full" onClick={onSalir}>
              <LogOutIcon className="mr-2 size-4" /> Cerrar sesión
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
