// Perfil local del usuario (aún no hay acceso por usuario: se guarda solo en este navegador).
export const NOMBRE_POR_DEFECTO = "Jean Castañeda";
const CLAVE = "perfil:nombre:v1";

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function etiquetaRol(rol: "gestor" | "admin" | null, abierto: boolean): string {
  if (abierto) return "Administrador";
  return rol === "admin" ? "Administrador" : rol === "gestor" ? "Gestor" : "Invitado";
}

export function leerNombre(): string {
  try {
    return localStorage.getItem(CLAVE)?.trim() || NOMBRE_POR_DEFECTO;
  } catch {
    return NOMBRE_POR_DEFECTO;
  }
}

export function guardarNombre(nombre: string): void {
  try {
    localStorage.setItem(CLAVE, nombre.trim().slice(0, 60));
  } catch {
    // sin almacenamiento
  }
}
