import type { AdjuntoVista } from "@/lib/chat/adjuntos-tipos";
import type { AccionUI, EjecucionHerramienta, FuenteDocumento } from "@/lib/chat/types";
import type { CampoCatalogo, DatosExtraidos } from "@/lib/lector/catalogo";
import type { Comparacion, ContextoLector, CandidatoInquilino, CandidatoUnidad } from "@/lib/lector/resolver";
import type { Hallazgo, Valores } from "@/lib/lector/revisor";
import type { Resolucion } from "@/lib/lector/servicio";

export type { DatoExtraido } from "@/lib/lector/catalogo";
export type { CampoCatalogo, DatosExtraidos, Comparacion, ContextoLector, CandidatoInquilino, CandidatoUnidad, Hallazgo, Valores, Resolucion };

// ── Chat ────────────────────────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  herramientas?: EjecucionHerramienta[];
  fuentes?: FuenteDocumento[];
  acciones?: AccionUI[];
  /** Archivos que adjuntó la persona (solo nombre y tipo; los bytes no se guardan). */
  adjuntos?: AdjuntoVista[];
  /** El mensaje se está recibiendo por streaming. */
  enCurso?: boolean;
  error?: boolean;
}

// ── Propiedades ─────────────────────────────────────────────────────────────────────────────────
export interface PropiedadResumen {
  id: number;
  referencia: string;
  edificio_id: number;
  edificio_referencia: string;
  ubicacion: string;
  municipio: string;
  distrito: string | null;
  barrio: string | null;
  zona: string;
  tipo: string;
  operacion: string;
  estado: string;
  precio: number | null;
  precio_m2: number | null;
  superficie_m2: number | null;
  habitaciones: number | null;
  banos: number | null;
  terraza: boolean;
  admite_mascotas: boolean;
  amueblado: boolean;
  certificado_energetico: string | null;
  fecha_disponible: string | null;
}

export interface ListaPropiedades {
  total: number;
  items: PropiedadResumen[];
}

export interface FiltrosPropiedades {
  zona?: string;
  tipo?: string;
  operacion?: string;
  estado?: string;
  calle?: string;
  precio_max?: number;
  habitaciones_min?: number;
  orden?: string;
  direccion?: "asc" | "desc";
  pagina?: number;
}

export type Json = Record<string, unknown>;

export interface FichaPropiedad {
  unidad: Json & { id: number; referencia: string; ubicacion: string; edificio_referencia: string };
  edificio: Json | null;
  propietario: Json | null;
  contrato_vigente: (Json & { referencia: string; inquilino: Json | null }) | null;
  contratos_anteriores: Json[];
  pagos_recientes: Json[];
  incidencias: Json[];
  documentos: { id: number; titulo: string; tipo: string; vigente: boolean }[];
  atributos: Record<string, unknown>;
  clientes_interesados: { cliente_id: number; cliente: string; telefono: string; puntuacion: number; motivos: string[]; presupuesto_max: number | null }[];
}

export interface FichaEdificio {
  edificio: Json & { referencia: string; direccion: string };
  ubicacion: Json;
  resumen_unidades: { total: number; alquiladas: number; disponibles: number; por_tipo: Record<string, number> };
  unidades: Json[];
  documentos: { id: number; titulo: string; tipo: string; vigente: boolean; fecha: string | null }[];
  incidencias_abiertas: number;
}

// ── Resumen, alertas y clientes ─────────────────────────────────────────────────────────────────
export interface Resumen {
  indicadores: {
    unidades_total: number; alquiladas: number; disponibles_alquiler: number; en_reforma: number; reservadas: number; en_venta: number;
    ocupacion_pct: number | null; renta_media: number | null; facturado_12m: number; impagado: number; morosidad_pct: number | null;
    contratos_vencen_30d: number; contratos_vencen_60d: number; contratos_vencen_90d: number; ventas_12m: number; importe_ventas_12m: number;
  };
  porZona: { grupo: string; total: number; disponibles: number; alquiladas: number }[];
  porTipo: { grupo: string; total: number }[];
  ocupacionPorZona: { zona: string; unidades: number; alquiladas: number; disponibles: number; ocupacion_pct: number | null }[];
  alertas: { total: number; porTipo: Record<string, number> };
  documentos: number;
  /** Cobros por mes de vencimiento (el último, el mes en curso, es parcial). Null si la migración 0013 aún no está aplicada. */
  serieCobros: PuntoCobro[] | null;
}

export interface PuntoCobro {
  /** "2026-09" */
  mes: string;
  emitido: number;
  impagado: number;
}

export interface Alerta {
  clave: string;
  tipo: string;
  severidad: "alta" | "media" | "baja";
  titulo: string;
  detalle: string;
  fecha_evento: string;
  dias: number;
  unidad_id: number | null;
  contrato_id: number | null;
  unidad_referencia: string | null;
  ubicacion: string | null;
}

export interface ListaAlertas {
  total: number;
  por_tipo: Record<string, number>;
  items: Alerta[];
}

export interface Cliente {
  id: number;
  nombre: string;
  tipo: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  demandas: { id: number; operacion: string; presupuesto_max: number | null; activa: boolean }[];
}

export interface Coincidencia {
  demanda_id: number;
  unidad_id: number;
  referencia: string;
  ubicacion: string;
  municipio: string;
  distrito: string | null;
  tipo: string;
  operacion: string;
  precio: number | null;
  superficie_m2: number | null;
  habitaciones: number | null;
  puntuacion: number;
  motivos: string[];
}

// ── Documentos ──────────────────────────────────────────────────────────────────────────────────
export interface Documento {
  id: number;
  titulo: string;
  tipo: string;
  edificio_id: number | null;
  unidad_id: number | null;
  contrato_id: number | null;
  mime: string | null;
  paginas: number | null;
  vigente: boolean;
  fecha_documento: string | null;
  estado_indexado: "pendiente" | "procesando" | "indexado" | "error";
  error: string | null;
  sustituye_a: number | null;
  created_at: string;
  fragmentos: number;
  edificio: { referencia: string; direccion: string } | null;
  unidad_ref: string | null;
  contrato_ref: string | null;
  tiene_archivo: boolean;
  extraccion: { id: number; estado: string } | null;
}

export interface FragmentoDocumento {
  id: number;
  orden: number;
  pagina: number | null;
  seccion: string | null;
  contenido: string;
}

export interface ResultadoBusqueda {
  chunk_id: number;
  documento_id: number;
  titulo: string;
  tipo: string;
  pagina: number | null;
  seccion: string | null;
  contenido: string;
  vigente: boolean;
  score: number;
  similitud: number | null;
  ambito: string;
}

export interface DatosSubida {
  titulo?: string;
  tipo: string;
  edificio_id?: number | null;
  unidad_id?: number | null;
  contrato_id?: number | null;
  fecha_documento?: string | null;
  sustituye_a?: number | null;
}

// ── Lector ──────────────────────────────────────────────────────────────────────────────────────
export interface EstadoLector {
  extraccion: { id: number; estado: string; documento_id: number; contrato_id: number | null; modelo: string | null; error: string | null; creada: string };
  documento: { id: number; titulo: string } | null;
  campos: CampoCatalogo[];
  datos: DatosExtraidos;
  valores: Valores;
  resolucion: Resolucion;
  sugerencias: { unidades: CandidatoUnidad[]; inquilinos: CandidatoInquilino[]; unidadSugerida: number | null; inquilinoSugerido: number | null } | null;
  contexto: ContextoLector | null;
  comparaciones: Comparacion[];
  hallazgos: Hallazgo[];
  archivo_url: string | null;
}

export interface ExtraccionListada {
  id: number;
  documento_id: number;
  titulo: string;
  estado: string;
  created_at: string;
  error: string | null;
}

export interface SolicitudCampo {
  id: number;
  etiqueta: string;
  tipo_dato: string;
  descripcion: string | null;
  ejemplo: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  propuesto_por: string | null;
  motivo_revision: string | null;
  created_at: string;
}

// ── Estado del sistema ──────────────────────────────────────────────────────────────────────────
export interface ServiceHealth {
  id: string;
  name: string;
  detail: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  services: ServiceHealth[];
  model: string;
  checkedAt: string;
}

// ── Valoraciones de respuestas (vista de administración) ────────────────────────────────────────
export interface Valoracion {
  id: number;
  voto: "up" | "down";
  pregunta: string;
  respuesta: string;
  herramientas: { nombre: string; descripcion: string; resumen?: string }[];
  fuentes: number;
  modelo: string | null;
  comentario: string | null;
  usuario: string | null;
  created_at: string;
}

export interface ResumenValoraciones {
  total: number;
  utiles: number;
  mejorables: number;
  con_comentario: number;
}

export interface RegistroAccion {
  id: number;
  usuario: string | null;
  tabla: string;
  registro_id: number | null;
  valor_nuevo: { tipo?: string; resumen?: string } | null;
  created_at: string;
}

export interface RegistroBloqueo {
  id: number;
  motivo: "manipulacion" | "formato" | "fuera_de_alcance" | "demasiado_largo" | "adjunto_sospechoso" | "adjunto_invalido";
  mensaje: string;
  usuario: string | null;
  created_at: string;
}

// ── Panel del corredor ──────────────────────────────────────────────────────────────────────────────
export interface ItemAgenda {
  tipo: string;
  clave: string;
  titulo: string;
  /** Días de retraso, para vencer (negativo si ya caducó) o abierta, según el tipo */
  dias: number;
  /** 1 = hoy, 2 = esta semana, 3 = cuando se pueda */
  nivel: 1 | 2 | 3;
  importe: number | null;
  ubicacion: string | null;
  unidad_referencia: string | null;
  contrato_referencia: string | null;
}

export interface AgendaHoy {
  total: number;
  por_nivel: { hoy: number; semana: number; luego: number };
  importe_en_juego: number;
  items: ItemAgenda[];
}

export interface Oportunidades {
  unidades_con_interesados: number;
  demandas_activas: number;
  demandas_sin_oferta: number;
  sin_oferta: { id: number; cliente: string; tipo: string; operacion: string; presupuesto_max: number | null }[];
  items: {
    unidad_id: number; referencia: string; ubicacion: string; operacion: string; precio: number | null; habitaciones: number | null;
    clientes: number; mejor_puntuacion: number; mejor_cliente: string;
  }[];
}

export interface IngresosRiesgo {
  renta_en_riesgo: Record<"d30" | "d60" | "d90", { contratos: number; renta: number }>;
  vacios: {
    unidades: number;
    renta_mensual: number;
    dias_medios: number | null;
    items: { id: number; referencia: string; ubicacion: string; precio: number; dias_vacio: number | null }[];
  };
}

export interface Embudo {
  dias: number;
  disponibles: number;
  reservadas: number;
  alquileres: { actual: number; anterior: number };
  ventas: { actual: number; anterior: number };
}

export interface PanelDocumentos {
  por_confirmar: number;
  con_dudas: number;
  borradores: { id: number; documento_id: number; titulo: string; campos_dudosos: number; created_at: string }[];
  clausulas_alta: number;
  clausulas: { contrato: string; titulo: string; clausula: string | null }[];
  indexado_error: number;
  indexado_pendiente: number;
  documentos: number;
}

export interface SaludAsistente {
  dias: number;
  positivas: number;
  negativas: number;
  fallos: { pregunta: string; comentario: string | null; created_at: string }[];
}

/** Cada bloque es null si su función SQL aún no está en la base (migración 0014) o falló. */
export interface PanelCorredor {
  agenda: AgendaHoy | null;
  oportunidades: Oportunidades | null;
  riesgo: IngresosRiesgo | null;
  embudo: Embudo | null;
  documentos: PanelDocumentos | null;
  /** Solo administración */
  salud: SaludAsistente | null;
}
