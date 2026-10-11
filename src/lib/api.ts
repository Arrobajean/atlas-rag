import type { ChatEvent, MensajeEntrada } from "@/lib/chat/types";
import type {
  Alerta, Cliente, Coincidencia, DatosSubida, Documento, EstadoLector, ExtraccionListada, FichaEdificio, FichaPropiedad,
  FiltrosPropiedades, FragmentoDocumento, HealthReport, ListaAlertas, ListaPropiedades, Resolucion, ResultadoBusqueda, Resumen,
  PanelCorredor, SolicitudCampo, CampoCatalogo, Valores, Hallazgo, Valoracion, ResumenValoraciones, RegistroAccion, RegistroBloqueo,
} from "@/lib/types";

// Cliente HTTP del frontend: única capa que conoce las rutas de /api.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined") {
    // Navegación completa a propósito: descarta el estado de la sesión caducada
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `Error ${res.status}`), { errores: data.errores as Record<string, string> | undefined });
  }
  return data as T;
}

function sendJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  return request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

const query = (params: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ── Sesión ──────────────────────────────────────────────────────────────────────────────────────
export const login = (password: string) => sendJson<{ rol: string }>("/api/auth/login", { password });
export const logout = () => sendJson<{ ok: boolean }>("/api/auth/logout", {});
export const getSesion = () => request<{ rol: "gestor" | "admin" | null; abierto: boolean }>("/api/auth/me");

// ── Chat (streaming NDJSON) ─────────────────────────────────────────────────────────────────────
export async function streamChat(messages: MensajeEntrada[], onEvent: (e: ChatEvent) => void, signal?: AbortSignal) {
  const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }), signal });
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let salto: number;
    while ((salto = buffer.indexOf("\n")) >= 0) {
      const linea = buffer.slice(0, salto).trim();
      buffer = buffer.slice(salto + 1);
      if (linea) onEvent(JSON.parse(linea) as ChatEvent);
    }
  }
}

// ── Acciones del asistente y valoraciones ───────────────────────────────────────────────────────
export const ejecutarAccionApi = (tipo: string, datos: Record<string, unknown>) =>
  sendJson<{ resumen: string; tabla?: string; registro_id?: number | null }>("/api/acciones", { tipo, datos });

export const enviarValoracion = (v: { voto: "up" | "down"; pregunta: string; respuesta: string; herramientas: { nombre: string; descripcion: string; resumen?: string }[]; fuentes: number; comentario?: string }) =>
  sendJson<{ id: number }>("/api/chat/valoraciones", v);

export const listarValoraciones = (f: { voto?: string; pagina?: number } = {}) =>
  request<{ resumen: ResumenValoraciones; items: Valoracion[]; total: number; acciones: RegistroAccion[]; bloqueos: RegistroBloqueo[] }>(`/api/chat/valoraciones${query(f)}`);

// ── Panel, propiedades, edificios ───────────────────────────────────────────────────────────────
export const getResumen = () => request<Resumen>("/api/resumen");
export const getPanelCorredor = () => request<PanelCorredor>("/api/panel/corredor");
export const listarPropiedades = (f: FiltrosPropiedades) => request<ListaPropiedades>(`/api/propiedades${query({ ...f, limite: 25 })}`);
export const getPropiedad = (ref: string) => request<FichaPropiedad>(`/api/propiedades/${encodeURIComponent(ref)}`);
export const getEdificio = (ref: string) => request<FichaEdificio>(`/api/edificios/${encodeURIComponent(ref)}`);

// ── Alertas y clientes ──────────────────────────────────────────────────────────────────────────
export const listarAlertas = (f: { tipo?: string; severidad?: string }) => request<ListaAlertas>(`/api/alertas${query({ ...f, limite: 100 })}`);
export const actualizarAlerta = (clave: string, accion: "resolver" | "posponer", dias?: number) => sendJson<{ success: boolean }>("/api/alertas", { clave, accion, dias });
export const listarClientes = (q?: string) => request<{ clientes: Cliente[] }>(`/api/clientes${query({ q })}`);
export const getCoincidenciasCliente = (id: number) => request<{ coincidencias: Coincidencia[] }>(`/api/clientes/${id}`);

// ── Documentos ──────────────────────────────────────────────────────────────────────────────────
export const listarDocumentos = (f: { tipo?: string; q?: string } = {}) =>
  request<{ documentos: Documento[]; total: number; fragmentos: number }>(`/api/documents${query(f)}`);

export const getDocumento = (id: number, conFragmentos = false) =>
  request<{ documento: Documento; archivo_url: string | null; chunks?: FragmentoDocumento[] }>(`/api/documents/${id}${conFragmentos ? "?chunks=1" : ""}`);

export const buscarDocumentos = (q: string, k = 8) => sendJson<{ matches: ResultadoBusqueda[] }>("/api/search", { query: q, k });
export const eliminarDocumento = (id: number) => request<{ success: boolean }>(`/api/documents/${id}`, { method: "DELETE" });
export const actualizarDocumento = (id: number, cambios: Partial<Pick<Documento, "titulo" | "tipo" | "vigente" | "edificio_id" | "unidad_id" | "contrato_id">>) =>
  sendJson<{ success: boolean }>(`/api/documents/${id}`, cambios, "PATCH");

interface ResultadoSubida { documento_id: number; fragmentos: number; paginas: number; ocr: boolean; duplicado?: boolean }

/** Sube un archivo. Con SUPABASE_ANON_KEY configurada va directo a Storage (sin el límite de 4,5 MB de la función). */
export async function subirDocumento(file: File, datos: DatosSubida): Promise<ResultadoSubida> {
  const tamanoDirecto = 4 * 1024 * 1024;
  if (file.size > tamanoDirecto) {
    const prep = await sendJson<{ documento_id: number; signedUrl: string; apikey: string | null }>("/api/documents", {
      accion: "preparar", nombre: file.name, mime: file.type || "application/pdf", tamano: file.size, ...datos,
    });
    if (!prep.apikey) {
      await eliminarDocumento(prep.documento_id).catch(() => undefined);
      throw new Error("El archivo supera 4 MB: configura SUPABASE_ANON_KEY para habilitar la subida directa a Storage");
    }
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);
    const put = await fetch(prep.signedUrl, { method: "PUT", body: form, headers: { apikey: prep.apikey, "x-upsert": "false" } });
    if (!put.ok) throw new Error(`No se pudo subir el archivo (${put.status})`);
    return request<ResultadoSubida>(`/api/documents/${prep.documento_id}/procesar`, { method: "POST" });
  }
  const form = new FormData();
  form.append("file", file);
  for (const [k, v] of Object.entries(datos)) if (v !== undefined && v !== null) form.append(k, String(v));
  return request<ResultadoSubida>("/api/documents", { method: "POST", body: form });
}

export const subirTexto = (titulo: string, contenido: string, datos: Omit<DatosSubida, "titulo">) =>
  sendJson<ResultadoSubida>("/api/documents", { titulo, contenido, ...datos });

// ── Lector ──────────────────────────────────────────────────────────────────────────────────────
export const listarExtracciones = () => request<{ extracciones: ExtraccionListada[] }>("/api/lector");
export const crearExtraccion = (documento_id: number) => sendJson<{ extraccion_id: number; avisos: string[] }>("/api/lector", { documento_id });
export const getExtraccion = (id: number, unidadId?: number | null) => request<EstadoLector>(`/api/lector/${id}${query({ unidad_id: unidadId })}`);
export const guardarExtraccion = (id: number, valores: Valores, resolucion: Resolucion) => sendJson<{ success: boolean }>(`/api/lector/${id}`, { valores, resolucion }, "PATCH");
export const confirmarExtraccion = (id: number, valores: Valores, resolucion: Resolucion) =>
  sendJson<{ contrato_id: number; referencia: string; hallazgos: Hallazgo[] }>(`/api/lector/${id}/confirmar`, { valores, resolucion });
export const descartarExtraccion = (id: number) => sendJson<{ success: boolean }>(`/api/lector/${id}/descartar`, {});

// ── Catálogo de campos ──────────────────────────────────────────────────────────────────────────
export const getCampos = () => request<{ campos: CampoCatalogo[]; solicitudes: SolicitudCampo[] }>("/api/campos");
export const proponerCampo = (c: { etiqueta: string; tipo_dato: string; descripcion?: string; ejemplo?: string }) => sendJson<{ id: number }>("/api/campos", c);
export const resolverSolicitud = (id: number, accion: "aprobar" | "rechazar", motivo?: string) => sendJson<{ campo_id: number | null }>(`/api/campos/solicitudes/${id}`, { accion, motivo });

// ── Sistema ─────────────────────────────────────────────────────────────────────────────────────
export const getHealth = () => request<HealthReport>("/api/health", { cache: "no-store" });

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export type { Alerta };
