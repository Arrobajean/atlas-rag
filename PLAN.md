# Plan de ejecución — rag-simple

Plan pensado para que lo ejecute otro modelo/agente sin contexto previo.
Sigue las fases en orden. Cada paso tiene una **verificación**: no avances si falla.

## Contexto

RAG mínimo de prueba en Python:

| Pieza | Tecnología | Archivo |
|---|---|---|
| Memoria (vectores) | Supabase + pgvector | `schema.sql` |
| Embeddings | Gemini `gemini-embedding-001` (768 dims) | `rag.py` |
| Generación | Gemini Flash (`GEMINI_CHAT_MODEL`) | `ask.py` |
| Indexado de documentos | `.txt`, `.md`, `.pdf` en `docs/` | `ingest.py` |

Restricciones del usuario:
- **No usar la API de Claude/Anthropic** en el proyecto; todo el LLM va por Gemini.
- Todo en español (código comentado, respuestas, README).
- Mantenerlo sencillo: nada de LangChain/LlamaIndex, sin frameworks extra.
- Entorno: Windows 11, Python 3.12, repo en `C:\Users\jeanc\OneDrive\Documentos\Workspace\rag-simple`.

## Estado actual (hecho)

- [x] Archivos creados: `rag.py`, `ingest.py`, `ask.py`, `schema.sql`, `requirements.txt`, `.env.example`, `.gitignore`, `docs/ejemplo.md`.
- [x] `git init` en rama `main`, archivos en staging, **sin commit todavía**.
- [x] Entorno virtual (`.venv`) creado y verificado.
- [x] Configurado en Supabase (pgvector, tabla `documents`, función `match_documents`).
- [x] Configurada API de Google Gemini (`gemini-embedding-001` y `gemini-flash-latest`).
- [x] Prueba de extremo a extremo completada con éxito (`ingest.py` y `ask.py`).
- [x] Repositorio desplegado en GitHub (`Arrobajean/rag-simple`).

---

## Fase 1 — Entorno local

1. Crear el entorno virtual e instalar dependencias:
   ```powershell
   python -m venv .venv
   .venv\Scripts\python -m pip install -r requirements.txt
   ```
   **Verificación:** `.venv\Scripts\python -c "import google.genai, supabase, pypdf, dotenv; print('OK')"` imprime `OK`.

2. Borrar la copia antigua en `C:\Users\jeanc\rag-simple` (fue una ubicación temporal). **Pide confirmación al usuario antes de borrar.**

> Nota: la carpeta está en OneDrive. `.venv` está en `.gitignore`, pero OneDrive la sincronizará igual. Si molesta, sugerir al usuario excluirla de la sincronización.

## Fase 2 — Credenciales (las hace el usuario)

El agente **no puede** crear estas cuentas; dale estas instrucciones al usuario y espera:

1. **Gemini API key:** https://aistudio.google.com/apikey → "Create API key". El plan gratuito basta para probar.
2. **Proyecto Supabase:** https://supabase.com/dashboard → New project.
   - `SUPABASE_URL`: Project Settings → API → Project URL.
   - `SUPABASE_KEY`: Project Settings → API → clave `service_role` (secreta).
3. Copiar `.env.example` a `.env` y rellenar los valores.

**Verificación:** existe `.env` con las 3 variables no vacías. **Nunca** imprimas ni hagas commit de `.env`.

## Fase 3 — Base de datos

1. El usuario pega el contenido de `schema.sql` en Supabase → SQL Editor → Run.
   (Alternativa si tiene Supabase CLI enlazado: `supabase db push`; no es necesario.)
2. **Verificación:**
   ```powershell
   .venv\Scripts\python -c "from rag import supabase; print(supabase.table('documents').select('id').limit(1).execute().data)"
   ```
   Debe imprimir `[]` sin errores.

## Fase 4 — Primera prueba de extremo a extremo

1. Comprobar el modelo de chat: la variable `GEMINI_CHAT_MODEL` vale `gemini-2.5-flash` por defecto. Si la API responde que el modelo no existe, lista los disponibles y usa el Flash más reciente:
   ```powershell
   .venv\Scripts\python -c "from rag import gemini; [print(m.name) for m in gemini.models.list() if 'flash' in m.name]"
   ```
2. Indexar: `.venv\Scripts\python ingest.py` → debe imprimir `ejemplo.md: N fragmentos`.
3. Preguntar: `.venv\Scripts\python ask.py "¿Cuántos días de vacaciones tengo?"`
   **Verificación:** la respuesta menciona **23 días** y cita `[ejemplo.md]`.
4. Prueba negativa: `.venv\Scripts\python ask.py "¿Cuál es la capital de Francia?"` → debe decir que no está en el contexto.

Errores típicos:
- `expected 768 dimensions` → no se pasó `output_dimensionality` o se cambió `EMBED_DIMS` sin actualizar `schema.sql`.
- `permission denied` / RLS → se usó la clave `anon` en lugar de `service_role`.
- `429` de Gemini → límite del plan gratuito; esperar o reducir el tamaño del lote en `embed()`.

## Fase 5 — README

Crear `README.md` en español con: qué es, diagrama simple del flujo (ingesta → pgvector → búsqueda → Gemini), requisitos, pasos de las Fases 1–4 resumidos y cómo añadir documentos propios (meterlos en `docs/` y relanzar `ingest.py`).

## Fase 6 — GitHub

1. Comprobar que `.env` **no** aparece en `git status` (debe estar ignorado).
2. Commit inicial:
   ```powershell
   git add .
   git commit -m "RAG sencillo con Supabase pgvector y Gemini"
   ```
3. Crear el repo remoto. **Pregunta al usuario** el nombre y si lo quiere público o privado (por defecto: privado, `rag-simple`):
   ```powershell
   gh auth status
   gh repo create rag-simple --private --source . --push
   ```
   Si `gh` no está instalado o no hay sesión, pide al usuario que ejecute `gh auth login`, o que cree el repo en github.com y luego haz `git remote add origin <url>` + `git push -u origin main`.

**Verificación:** `git log --oneline` muestra el commit y `gh repo view --web` abre el repo.

## Fase 7 — Mejoras opcionales (solo si el usuario las pide)

- Mostrar las fuentes y la similitud de cada fragmento en `ask.py` (flag `--debug`).
- Umbral mínimo de similitud en `match_documents` para descartar fragmentos irrelevantes.
- Troceado por párrafos/encabezados en vez de por caracteres.
- Interfaz web mínima (Streamlit, o Next.js + Vercel si se quiere desplegar).
- Ingesta desde Google Drive.

## Criterios de "terminado"

- `ingest.py` indexa `docs/` sin errores.
- `ask.py` responde correctamente la pregunta de prueba con cita de la fuente.
- Repo en GitHub con el código, sin secretos, con README.
