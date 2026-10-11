import { NextResponse } from "next/server";
import { accesoConfigurado, COOKIE, DURACION_SEG, firmarSesion, rolPorContrasena } from "@/lib/auth";

export async function POST(req: Request) {
  if (!accesoConfigurado()) {
    return NextResponse.json({ error: "El acceso no está configurado: define APP_PASSWORD en las variables de entorno" }, { status: 503 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const rol = typeof password === "string" ? rolPorContrasena(password) : null;
  if (!rol) {
    // Frena la fuerza bruta sin necesidad de estado compartido
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ rol });
  res.cookies.set(COOKIE, await firmarSesion(rol), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEG,
  });
  return res;
}
