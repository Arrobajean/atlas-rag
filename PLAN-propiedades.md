# Plan — RAG de gestión de propiedades

Plan para convertir `rag-simple` en un asistente inmobiliario: chat que combina **consultas SQL** (contar, sumar, filtrar)
con **búsqueda semántica** (contratos, normas de comunidad, actas…), más un **lector de PDFs con verificación humana**.

> Estado: **implementado** (ver README). Desviaciones: alertas calculadas en vivo (sin cron); acceso por contraseña con roles gestor/admin en lugar de Supabase Auth con RLS por propietario.

## Restricciones

- LLM y embeddings solo con **Gemini** (sin API de Claude/Anthropic).
- Todo en español (código comentado, UI, respuestas).
- Sin LangChain/LlamaIndex.
- Next.js 16: leer `node_modules/next/dist/docs/` antes de escribir rutas (ver `AGENTS.md`).
- Separación estricta lógica/UI: lógica en `src/lib` y `src/hooks`, componentes solo presentacionales.

## Punto de partida

- Tabla plana `documents (source, content, embedding vector(768))` + RPC `match_documents`.
- `/api/chat`: una sola búsqueda vectorial, sin historial, sin herramientas; reintento solo en 503.
- `/api/documents`: subida vía request (límite 4,5 MB en Vercel), troceado fijo de 500 caracteres, sin página ni vínculos.
- Sin autenticación; se usa la clave `service_role`.
- Scripts Python antiguos (`rag.py`, `ingest.py`, `ask.py`) sobre la tabla antigua.

---

## 0. Decisiones (cerradas)

| # | Decisión | Resolución |
|---|---|---|
| 1 | Ámbito geográfico | **Toda la Comunidad de Madrid**: capital (21 distritos) + municipios. Zonas propias en tabla `zonas` (§6.1) |
| 2 | Negocio | **Alquiler, compraventa, temporada y habitaciones** |
| 3 | Tipos de alquiler | Vivienda habitual, temporada, habitación y local comercial |
| 4 | Datos de inquilinos | **Datos mock**: hay que alimentar la BD con inquilinos/propietarios ficticios (sin datos reales por ahora) |
| 5 | Lenguaje del seed | **TypeScript** (scripts en `scripts/`, ejecutados con `tsx`); se retiran los scripts Python |
| 6 | Volumen del seed | **≥ 1.000 unidades** y ~1.000 inquilinos (ver §3) |
| 7 | Campos nuevos propuestos por agentes | Aprobación por admin (catálogo cerrado + `solicitudes_campo`) |
| 8 | Tipos de documento en el lector v1 | Contratos primero; normas, actas e inventarios en v2 |
| 9 | Funciones extra en el plan | 1 (cruce demanda-oferta), 2 (alertas), 3 (revisor de cláusulas) |
| 10 | Aplicar migraciones | Sin acceso DDL desde el código: las migraciones se generan como archivos y se ejecutan en el SQL Editor de Supabase; el seed se carga por REST |

---

## 1. Arquitectura del chat: herramientas, no SQL libre

Los embeddings no saben contar. Gemini decide en cada pregunta qué herramienta usar (*function calling*).

| Herramienta | Qué hace | Ejemplo |
|---|---|---|
| `contar_agrupar_propiedades` | SQL parametrizado: filtros (zona, distrito, tipo, estado, precio, m², habitaciones) + agrupación | "¿Cuántos pisos libres hay en el centro y en el sur?" |
| `listar_propiedades` | Lista con filtros, orden y límite | "Los 5 pisos más baratos de Chamberí con terraza" |
| `ficha_propiedad` | Unidad completa: edificio, contrato vigente, inquilino, incidencias | "¿Quién vive en Toledo 45, 3ºB y cuándo vence?" |
| `indicadores_cartera` | Ocupación, morosidad, renta media, vencimientos | "¿Qué contratos vencen en los próximos 90 días?" |
| `buscar_en_documentos` | Semántica + full-text, filtrada por unidad/edificio/tipo | "¿Se permiten mascotas en el edificio de Lavapiés?" |
| `buscar_propiedades_por_descripcion` | Semántica sobre descripciones + filtros SQL | "Luminoso, tranquilo, cerca del Retiro, < 1.400 €" |

Reglas:
- Las herramientas llaman a **RPC/vistas de Supabase** con parámetros validados con **zod**. El LLM nunca escribe SQL.
- Texto-a-SQL solo en el futuro, solo contra vistas, con rol de Postgres de solo lectura y `statement_timeout`.
- Preguntas mixtas encadenan herramientas (SQL → edificios de Chamberí → semántica en sus normas).
- Instrucción de sistema: *"Los números solo pueden salir de las herramientas; nunca estimes."*

---

## 2. Modelo de datos (Supabase / Postgres)

```
zonas ─< distritos ─< barrios ─< edificios ─< unidades ─< contratos ─< pagos
                                     │            │           └── inquilinos
                                     │            └─< incidencias >── proveedores
                                     └── comunidad (administrador, cuota, seguro)
propietarios ─< unidades (tabla puente si hay copropiedad)
documentos ─< document_chunks   (documento → edificio | unidad | contrato | general)
```

### Tablas de negocio
- **zonas / municipios / distritos / barrios**: toda la Comunidad de Madrid. La capital se divide en 21 distritos y sus barrios; el resto en municipios (Getafe, Alcalá de Henares, Móstoles, Alcobendas…). `zonas` es una agrupación propia (Madrid Centro/Norte/Sur/Este/Oeste + Corredor del Henares, Sur metropolitano, Noroeste…).
- **edificios**: dirección, CP, barrio, lat/lng, año, ascensor, plantas, administrador de fincas, comunidad gestionada sí/no.
- **unidades**: edificio, planta, puerta, tipo (`piso`, `atico`, `estudio`, `local`, `garaje`, `trastero`), m², habitaciones, baños,
  operación (`alquiler`, `venta`, `temporada`, `habitaciones`), estado (`alquilada`, `disponible`, `reforma`, `reservada`, `vendida`, `en_venta`), precio alquiler/venta, precio por noche o mes en temporada, amueblado, mascotas, terraza,
  certificado energético (letra + caducidad), referencia catastral, descripción + embedding de la descripción.
- **propietarios**, **inquilinos**: datos ficticios; DNI/CIF con letra de control válida pero inventado.
- **contratos**: tipo (`vivienda_habitual`, `temporada`, `habitacion`, `local`, `compraventa`), inicio, fin, renta, fianza, garantías adicionales,
  índice de actualización (IPC / índice de referencia), estado, `documento_id`.
- **pagos**: una fila por mes y contrato (importe, fecha de pago, días de retraso).
- **incidencias**: unidad o edificio, categoría, prioridad, estado, coste, proveedor.
- **gastos**: IBI, comunidad, seguros, derramas.

### Tablas de documentos
- **documentos**: título, tipo (`contrato`, `normas_comunidad`, `acta_junta`, `estatutos`, `inventario`, `certificado_energetico`,
  `factura`, `legal`, `procedimiento_interno`), vínculos (`edificio_id`, `unidad_id`, `contrato_id`), ruta en Storage, hash SHA-256,
  páginas, `vigente`, `fecha_documento`, `sustituye_a`, estado de indexado (`pendiente → procesando → indexado | error`), `embedding_model`.
- **document_chunks**: `documento_id`, orden, página, sección ("Cláusula SÉPTIMA"), contenido, `embedding vector(768)`,
  `fts tsvector('spanish')`.

### Vistas y funciones
- Vistas: `v_unidades`, `v_contratos_vigentes`, `v_morosidad`, `v_ocupacion_por_distrito`.
- `match_chunks(query_embedding, unidad_id, edificio_id, tipos[])` con **herencia**: documentos de la unidad + su contrato
  + su edificio + generales (LAU, procedimientos).
- Búsqueda **híbrida** (pgvector + full-text español) combinada con RRF.

### Migración
- Migraciones numeradas en `supabase/migrations/`.
- Migrar el contenido de la tabla `documents` antigua a `documentos` + `document_chunks` (como tipo `general`) y luego retirarla.

---

## 3. Seed de datos (TypeScript, determinista, semilla fija, coherente)

| Entidad | Volumen | Notas |
|---|---|---|
| Municipios / distritos / barrios | ~60 / 21 / ~130 | Capital + principales municipios de la Comunidad |
| Edificios | ~150 | Desigual: más en Centro, Salamanca, Chamberí y grandes municipios |
| Unidades | **~1.200** | Pisos, áticos, chalés, estudios, habitaciones, locales (~8 %), garajes/trasteros (~10 %) |
| Operaciones | alquiler ~55 %, venta ~20 %, temporada ~10 %, habitaciones ~15 % | |
| Propietarios | ~350 | Multipropietarios y ~15 sociedades |
| Inquilinos | **~1.000** | Mock: nombres, DNI/NIE válidos inventados, teléfonos, emails ficticios |
| Contratos | ~1.300 | Vigentes + históricos de 3 años + compraventas |
| Pagos | ~25.000 | 24 meses, 5-8 % retrasos, ~15 morosos crónicos |
| Incidencias | ~1.500 | Estacionales |
| Proveedores | ~50 | |
| Clientes / demandas | ~200 | Para el cruce demanda-oferta (§8.1) |

- €/m² alquiler por zona: Salamanca ~25, Centro ~24, Chamberí ~23, Retiro ~21, Carabanchel ~15, Villaverde ~13, Getafe ~13, Alcobendas ~16, Móstoles ~11, Alcalá ~11 (+ ruido). Venta: 3.000–7.500 €/m² según zona.
- Ocupación objetivo ≈ 88 %, variable por distrito.
- Coherencia: `alquilada` ⇔ contrato vigente; pagos dentro de las fechas del contrato.
- **PDFs sintéticos** (generados con TS) que coinciden con la BD: ~30 contratos (LAU, temporada, local), normas de ~15 edificios, 4 actas
  (una modifica una norma anterior), 3 inventarios, 1 procedimiento interno, texto de la LAU (BOE), **1 PDF escaneado** sin texto (OCR).
- Casos difíciles a propósito: dos edificios en la misma calle, ático registrado como planta 7, normas contradictorias entre
  edificios, contrato con cláusula de mascotas distinta a la norma del edificio, inquilino con dos contratos,
  **1-2 contratos con cláusulas ilegales** (para probar el revisor, §8.3), **1 contrato cuyo PDF no coincide con la BD** (para probar el diff, §5).

---

## 4. Flujo de ingesta de PDFs

1. **Subida directa a Supabase Storage** (bucket privado) con URL firmada — evita el límite de 4,5 MB de Vercel.
2. **Texto por página** con `unpdf`; si una página tiene poco o ningún texto → **OCR con Gemini** (lectura nativa de PDF).
3. **Troceado por estructura** (cláusulas, artículos, página) guardando `pagina` y `seccion` →
   citas tipo `[Contrato C-0142, pág. 3, Cláusula Séptima]`.
4. **Deduplicación por hash**, **versionado** (`vigente`, `sustituye_a`), **borrado en cascada** (Storage + documento + chunks).
5. Estado de procesamiento visible en la UI; ingesta pesada en segundo plano.
6. Si el tipo de documento tiene campos en el catálogo → pasa al **lector con verificación** (§5).

---

## 5. Lector de documentos con verificación humana

### Pantalla dividida

```
┌──────────────────────────┬─────────────────────────────┐
│  PDF (pdf.js)            │  Datos extraídos            │
│                          │  Renta  [1.250,00 €] ● alta │
│  ...la renta mensual     │    ↳ pág. 2, cláusula 3ª    │
│  será de ███1.250 €███   │  Fianza [1.250,00 €] ● alta │
│  ...                     │  Inicio [01/03/2025] ● media│
│                          │  Inquilino: Ana Ruiz        │
│                          │    ⚠ ya existe (DNI) → vincular│
│                          │  [+ Añadir campo ▾]         │
│                          │  [Descartar]  [Confirmar]   │
└──────────────────────────┴─────────────────────────────┘
```

- **Izquierda:** visor PDF (pdf.js / react-pdf) con capa de texto para resaltar.
- **Derecha:** formulario generado desde el catálogo de campos del tipo de documento.

### Flujo
1. Al subir, Gemini lee el PDF con **salida estructurada (JSON Schema) generada desde `catalogo_campos`**: solo puede
   devolver campos existentes.
2. Cada campo trae **valor, confianza y procedencia** (página + texto literal). Clic en el campo → el PDF salta a esa
   página y resalta el texto.
3. Confianza baja → marcado en amarillo. No encontrado → vacío, **nunca inventado**.
4. El agente corrige y pulsa **Confirmar**. Solo entonces se escribe en las tablas reales, en una transacción (RPC).

### Protección de la base de datos (requisito crítico)

| Medida | Cómo |
|---|---|
| **Borrador aislado** | `extracciones` (JSON, estado `borrador/confirmado/descartado`, documento, usuario). Nada toca `contratos` hasta confirmar. |
| **Catálogo cerrado** | `catalogo_campos`: clave, etiqueta, tipo de documento, tabla y columna destino, tipo de dato, validación, obligatorio, valores permitidos. "Añadir campo" es un desplegable de este catálogo, nunca texto libre. |
| **Atributos extra controlados** | Datos sin columna propia (p. ej. "permite fumar") van a `atributos_contrato` / `atributos_unidad`, **solo con definiciones del catálogo** (tipadas, con opciones). |
| **Campos nuevos = solicitud** | `solicitudes_campo`: el agente propone; queda pendiente hasta aprobación de admin. Nunca se crea desde la pantalla. |
| **Validación doble** | zod en cliente y servidor + restricciones Postgres (`CHECK`, enums, FK, fin > inicio, importes ≥ 0). |
| **Resolución de entidades** | DNI/CIF existente → **vincular**, no duplicar. Dirección/unidad → se elige de la lista, no se escribe. |
| **Diff con lo existente** | Si el contrato ya existe: "BD: 1.200 € · PDF: 1.250 €"; el agente elige qué vale. |
| **Auditoría** | `auditoria`: usuario, fecha, tabla, registro, valor antiguo/nuevo, origen (`ia` / `humano`). |

### Tipos de documento
- **v1:** contratos de alquiler.
- **v2:** normas de comunidad, actas de junta, inventarios, certificados energéticos (cada uno con su grupo de campos en el catálogo).

---

## 6. Riesgos que se suelen escapar

1. **"Madrid Sur" no es oficial.** Definir la zona en tabla; diccionario de sinónimos ("libres" → `disponible`, "pisos" → vivienda); decidir si garajes y trasteros cuentan como propiedades.
2. **Privacidad y RGPD:** la capa gratuita de Gemini puede usar los datos para entrenar. Con datos reales → capa de pago o enmascarar DNI/IBAN antes de enviar.
3. **Sin autenticación + `service_role`:** hace falta Supabase Auth, roles (`admin`, `gestor`, `propietario`) y RLS.
4. **Fechas:** "alquilada" (estado) frente a "contrato vigente hoy"; "este trimestre"; actualizaciones anuales; prórrogas tácitas.
5. **Fuente de verdad PDF vs BD:** definida en el lector (§5), con aviso cuando no coinciden.
6. **Documentos sustituidos:** priorizar `vigente` y mencionar el cambio en la respuesta.
7. **HNSW + filtros estrictos:** puede devolver menos resultados → `hnsw.iterative_scan` (pgvector ≥ 0.8) o búsqueda exacta.
8. **Cambiar de modelo de embeddings = reindexar:** guardar `embedding_model` por fragmento.
9. **Cuotas de Gemini:** 2-4 llamadas por pregunta con herramientas → reintento también en 429, con backoff.
10. **Aviso legal** en respuestas sobre LAU / Ley de Vivienda, con la fecha del texto usado.
11. **Formato español:** `1.250,00 €`, `dd/mm/aaaa`, "3º B", "Bajo A".
12. **Scripts Python antiguos:** retirar o migrar.
13. **Evaluación:** ~40 preguntas con respuesta esperada y herramienta esperada.

---

## 7. Cambios en el chat y la interfaz

- Historial de conversación (seguimientos como "¿y en el sur?").
- Streaming de respuestas.
- Transparencia: mostrar herramientas usadas y filtros aplicados, además de las citas de documentos.
- Respuestas SQL con tabla o gráfico (recharts).
- Nuevas pantallas: explorador de propiedades con filtros, ficha de edificio con sus documentos, contratos que vencen,
  KPIs reales en `section-cards` (ocupación, morosidad, renta media).
- Subida de documentos eligiendo tipo y vínculo (edificio / unidad / contrato).
- Lector con verificación (§5).

---

## 8. Funciones para agentes inmobiliarios

Ordenadas por utilidad. **En plan:** 1, 2 y 3. **Backlog:** 4-10.

### 8.1 Cruce demanda-oferta *(en plan)*
- Tablas `clientes` y `demandas` (zonas, presupuesto mín./máx., habitaciones, mascotas, fecha de entrada, notas).
- Al pasar una unidad a `disponible` (o crear una demanda) → lista de coincidencias con puntuación.
- Herramienta de chat `buscar_clientes_para_unidad` / `buscar_unidades_para_cliente`.
- Coincidencia: filtros SQL estrictos + similitud semántica sobre las notas del cliente y la descripción de la unidad.

### 8.2 Alertas automáticas *(en plan)*
- Vencimientos de contrato con los plazos de preaviso de la LAU.
- Actualización anual de renta.
- Certificados energéticos caducados.
- Fianzas pendientes de depositar.
- Impagos (N días de retraso).
- Implementación: vista `v_alertas` + cron diario (Vercel Cron o `pg_cron`) + panel de alertas + herramienta de chat `alertas_pendientes`.

### 8.3 Revisor de cláusulas *(en plan)*
- Compara un contrato con la LAU y las políticas internas (ingeridas como documentos `legal` y `procedimiento_interno`).
- Marca, por ejemplo: fianza > 1 mensualidad en vivienda, garantías adicionales por encima del máximo legal,
  gastos de gestión repercutidos al inquilino, zona tensionada.
- Reglas numéricas deterministas en código (a partir de los campos confirmados) + revisión semántica con Gemini para
  el resto, siempre con cita de cláusula y artículo.
- Integrado en el lector (§5) como panel de avisos tras confirmar los datos.

### 8.4-8.10 Backlog
4. **Generador de anuncios** desde ficha y fotos (ES/EN).
5. **Precio sugerido** por comparables de la propia cartera (€/m² por barrio y tipo, con rango).
6. **Agenda de visitas y CRM ligero** ("¿qué visitas tengo mañana?").
7. **Informe mensual al propietario** (cobros, incidencias, ocupación) en PDF o borrador de email.
8. **Borradores de respuesta** a emails de inquilinos + creación de incidencia.
9. **Entrada y salida del inquilino:** checklist con fotos y comparación de inventarios para justificar descuentos de fianza.
10. **Generación de contratos** desde plantilla con datos validados (BD → PDF).

---

## 9. Fases

| Fase | Entregable | Verificación |
|---|---|---|
| 0. Decisiones | Tabla §0 respondida | — |
| 1. Esquema | Migraciones: tablas de negocio y documentos, `catalogo_campos`, `extracciones`, `atributos_*`, `solicitudes_campo`, `auditoria`, `clientes`/`demandas`, vistas, RPC, índices, RLS; migración de `documents` | Migraciones aplican en limpio; vistas devuelven filas |
| 2. Seed | Generador TS + PDFs sintéticos + carga | Control: unidades por zona, ocupación ≈ 88 %, pagos coherentes |
| 3. Ingesta de documentos | Storage, texto por página, OCR, troceado por cláusulas, búsqueda híbrida, vínculos, herencia | Se sube un contrato y el chat lo cita con página |
| 4. Chat con herramientas | Function calling, 6 herramientas, historial, streaming, reintentos 429/503 | Conjunto de evaluación ≥ 85 % |
| 5. Lector con verificación | Pantalla dividida, extracción desde catálogo, procedencia y resaltado, diff, resolución de entidades, confirmación transaccional, auditoría | Contrato con dato erróneo → se corrige y solo el valor confirmado llega a `contratos`; ningún campo fuera del catálogo llega a la BD |
| 6. Funciones de agente | Cruce demanda-oferta, alertas + cron, revisor de cláusulas | Los contratos "trampa" del seed se detectan; las demandas del seed encuentran sus unidades |
| 7. Interfaz | Explorador, fichas, KPIs, panel de alertas, subida con vínculo | Revisión visual |
| 8. Seguridad | Auth, roles, RLS, enmascarado de datos personales, aprobación de campos por admin | Un propietario no ve datos ajenos; un gestor no puede aprobar campos |
