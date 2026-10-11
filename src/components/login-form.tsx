"use client";

import * as React from "react";
import { Building2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-login";

export function LoginForm() {
  const { loading, error, entrar } = useLogin();
  const [password, setPassword] = React.useState("");

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2Icon className="size-6" />
        </div>
        <CardTitle>Gestión inmobiliaria</CardTitle>
        <CardDescription>Introduce la contraseña de acceso</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) entrar(password);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!password || loading}>
            {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
