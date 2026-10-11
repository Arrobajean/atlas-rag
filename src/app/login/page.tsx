import { Suspense } from "react";
import { redirect } from "next/navigation";
import { accesoAbierto } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Acceso · Gestión inmobiliaria" };

export default function LoginPage() {
  if (accesoAbierto()) redirect("/dashboard");
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
