import { NextResponse, type NextRequest } from "next/server";
import { accesoAbierto, accesoConfigurado, COOKIE, verificarSesion } from "@/lib/auth";

// Todo el sitio (páginas y API) exige sesión, salvo el login. Sin contraseñas configuradas en producción
// nada es accesible: mejor cerrado que expuesto (la base contiene datos personales de inquilinos).
export async function proxy(req: NextRequest) {
  if (accesoAbierto()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const esApi = pathname.startsWith("/api/");
  const publica = pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/logout";

  const sesion = await verificarSesion(req.cookies.get(COOKIE)?.value);
  if (sesion || publica) {
    // Un usuario con sesión no necesita ver el login
    if (sesion && pathname === "/login") return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (esApi) {
    return NextResponse.json(
      { error: accesoConfigurado() ? "Sesión no válida o caducada" : "Acceso no configurado (define APP_PASSWORD)" },
      { status: 401 }
    );
  }
  const destino = new URL("/login", req.url);
  if (pathname !== "/") destino.searchParams.set("next", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  // Excluye estáticos de Next y ficheros de public/
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map)$).*)"],
};
