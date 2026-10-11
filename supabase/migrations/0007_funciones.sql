-- 0007 · Funciones RPC: son el único acceso que tiene el chat a los datos (nunca SQL libre).
-- Todas reciben parámetros tipados/validados; la construcción dinámica usa listas blancas.

-- ── Filtros ─────────────────────────────────────────────────────────────────────────────────────────
-- Direcciones comparables: sin tildes, sin puntuación y con espacios simples ("Calle de Toledo, 45" = "calle de toledo 45").
create or replace function norm_calle(t text) returns text
language sql immutable parallel safe
as $$ select btrim(regexp_replace(regexp_replace(norm(t), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) $$;

-- Lee f->k como array de textos normalizados; NULL si no viene o está vacío.
create or replace function fn_arr(f jsonb, k text) returns text[]
language sql immutable as $$
  select case
    when f is null or f -> k is null or f -> k = 'null'::jsonb then null
    when jsonb_typeof(f -> k) = 'array' then (select array_agg(norm(x)) from jsonb_array_elements_text(f -> k) x)
    else array[norm(f ->> k)]
  end
$$;

-- Filtro común de unidades. Por defecto excluye anexos (garajes/trasteros) y habitaciones sueltas,
-- salvo que se pida su tipo explícitamente o se activen incluir_anexos / incluir_subunidades.
create or replace function fn_filtrar_unidades(f jsonb default '{}'::jsonb)
returns setof v_unidades
language sql stable as $$
  select v.*
  from v_unidades v
  where (fn_arr(f, 'zona') is null or v.zona_norm = any (fn_arr(f, 'zona')))
    and (fn_arr(f, 'municipio') is null or v.municipio_norm = any (fn_arr(f, 'municipio')))
    and (fn_arr(f, 'distrito') is null or v.distrito_norm = any (fn_arr(f, 'distrito')))
    and (fn_arr(f, 'barrio') is null or v.barrio_norm = any (fn_arr(f, 'barrio')))
    and (fn_arr(f, 'tipo') is null or v.tipo::text = any (fn_arr(f, 'tipo')))
    and (fn_arr(f, 'operacion') is null or v.operacion::text = any (fn_arr(f, 'operacion')))
    and (fn_arr(f, 'estado') is null or v.estado::text = any (fn_arr(f, 'estado')))
    and (f ->> 'precio_min' is null or v.precio >= (f ->> 'precio_min')::numeric)
    and (f ->> 'precio_max' is null or v.precio <= (f ->> 'precio_max')::numeric)
    and (f ->> 'superficie_min' is null or v.superficie_m2 >= (f ->> 'superficie_min')::numeric)
    and (f ->> 'superficie_max' is null or v.superficie_m2 <= (f ->> 'superficie_max')::numeric)
    and (f ->> 'habitaciones_min' is null or v.habitaciones >= (f ->> 'habitaciones_min')::int)
    and (f ->> 'habitaciones_max' is null or v.habitaciones <= (f ->> 'habitaciones_max')::int)
    and (f ->> 'banos_min' is null or v.banos >= (f ->> 'banos_min')::int)
    and (f ->> 'terraza' is null or v.terraza = (f ->> 'terraza')::boolean)
    and (f ->> 'admite_mascotas' is null or v.admite_mascotas = (f ->> 'admite_mascotas')::boolean)
    and (f ->> 'amueblado' is null or v.amueblado = (f ->> 'amueblado')::boolean)
    and (f ->> 'ascensor' is null or v.ascensor = (f ->> 'ascensor')::boolean)
    and (f ->> 'edificio_id' is null or v.edificio_id = (f ->> 'edificio_id')::bigint)
    and (f ->> 'propietario_id' is null or v.propietario_id = (f ->> 'propietario_id')::bigint)
    and (f ->> 'calle' is null or norm_calle(v.direccion) like '%' || norm_calle(f ->> 'calle') || '%')
    and (f ->> 'planta' is null
         or norm(v.planta) = norm(f ->> 'planta')
         or (regexp_replace(coalesce(v.planta, ''), '\D', '', 'g') <> ''
             and regexp_replace(coalesce(v.planta, ''), '\D', '', 'g') = regexp_replace(f ->> 'planta', '\D', '', 'g')))
    and (f ->> 'puerta' is null or norm(v.puerta) = norm(f ->> 'puerta'))
    and (fn_arr(f, 'tipo') is not null
         or ((coalesce((f ->> 'incluir_anexos')::boolean, false) or not v.es_anexo)
             and (coalesce((f ->> 'incluir_subunidades')::boolean, false) or not v.es_subunidad)))
$$;

-- ── Resolver lugares ("el sur", "Vallecas", "Alcalá") a entidades reales ────────────────────────────
create or replace function rpc_resolver_lugar(p_texto text) returns jsonb
language plpgsql stable as $$
declare
  n text := norm(trim(p_texto));
  res jsonb;
begin
  with c as (
    select 'zona' as entidad, z.id::int as id, z.nombre, null::text as detalle, 1 as rk
      from zonas z where norm(z.nombre) = n
    union all select 'municipio', m.id, m.nombre, null, 1 from municipios m where norm(m.nombre) = n
    union all select 'distrito', d.id, d.nombre, m.nombre, 1
      from distritos d join municipios m on m.id = d.municipio_id where norm(d.nombre) = n
    union all select 'barrio', b.id, b.nombre, d.nombre, 1
      from barrios b join distritos d on d.id = b.distrito_id where norm(b.nombre) = n
    union all
    select s.entidad,
           s.entidad_id,
           case s.entidad
             when 'zona' then (select nombre from zonas where id = s.entidad_id)
             when 'municipio' then (select nombre from municipios where id = s.entidad_id)
             when 'distrito' then (select nombre from distritos where id = s.entidad_id)
             else (select nombre from barrios where id = s.entidad_id)
           end,
           'sinónimo de "' || s.termino || '"',
           2
      from sinonimos_lugar s where norm(s.termino) = n
    union all select 'zona', z.id::int, z.nombre, null, 3 from zonas z
      where length(n) >= 4 and norm(z.nombre) like '%' || n || '%'
    union all select 'municipio', m.id, m.nombre, null, 3 from municipios m
      where length(n) >= 4 and norm(m.nombre) like '%' || n || '%'
    union all select 'distrito', d.id, d.nombre, m.nombre, 3
      from distritos d join municipios m on m.id = d.municipio_id
      where length(n) >= 4 and norm(d.nombre) like '%' || n || '%'
    union all select 'barrio', b.id, b.nombre, d.nombre, 3
      from barrios b join distritos d on d.id = b.distrito_id
      where length(n) >= 4 and norm(b.nombre) like '%' || n || '%'
  ),
  mejor as (select min(rk) as rk from c),
  uniq as (select distinct on (entidad, id) entidad, id, nombre, detalle, rk from c order by entidad, id, rk)
  select coalesce(jsonb_agg(jsonb_build_object('entidad', entidad, 'id', id, 'nombre', nombre, 'detalle', detalle)
                            order by entidad, nombre), '[]'::jsonb)
    into res
    from uniq where rk = (select rk from mejor);
  return res;
end $$;

-- ── Conteo y agrupación ─────────────────────────────────────────────────────────────────────────────
create or replace function rpc_contar_agrupar(f jsonb default '{}'::jsonb, agrupar text default null)
returns table (
  grupo text, total bigint, disponibles bigint, alquiladas bigint,
  alquiler_medio numeric, alquiler_m2_medio numeric, venta_media numeric, venta_m2_medio numeric,
  superficie_media numeric
)
language plpgsql stable as $$
declare
  expr text;
begin
  if agrupar is null or agrupar = '' then
    expr := quote_literal('Total');
  else
    expr := case agrupar
      when 'zona' then 'zona'
      when 'municipio' then 'municipio'
      when 'distrito' then 'distrito'
      when 'barrio' then 'barrio'
      when 'tipo' then 'tipo::text'
      when 'operacion' then 'operacion::text'
      when 'estado' then 'estado::text'
      when 'habitaciones' then 'habitaciones::text'
      when 'certificado' then 'certificado_energetico::text'
      when 'edificio' then 'edificio_referencia || '' · '' || direccion'
      else null
    end;
    if expr is null then
      raise exception 'Agrupación no válida: %. Usa zona, municipio, distrito, barrio, tipo, operacion, estado, habitaciones, certificado o edificio.', agrupar;
    end if;
  end if;

  return query execute format($q$
    select coalesce((%s)::text, '(sin dato)') as grupo,
           count(*)::bigint,
           (count(*) filter (where estado = 'disponible'))::bigint,
           (count(*) filter (where estado = 'alquilada'))::bigint,
           round(avg(precio) filter (where operacion <> 'venta'), 2),
           round(avg(precio_m2) filter (where operacion <> 'venta'), 2),
           round(avg(precio) filter (where operacion = 'venta'), 2),
           round(avg(precio_m2) filter (where operacion = 'venta'), 2),
           round(avg(superficie_m2), 2)
    from fn_filtrar_unidades($1)
    group by 1
    order by 2 desc, 1
  $q$, expr) using f;
end $$;

-- ── Listado con orden y paginación ──────────────────────────────────────────────────────────────────
create or replace function rpc_listar_unidades(
  f jsonb default '{}'::jsonb,
  orden text default 'precio',
  direccion text default 'asc',
  limite int default 20,
  desplazamiento int default 0
) returns jsonb
language plpgsql stable as $$
declare
  ord text;
  dir text;
  res jsonb;
begin
  ord := case orden
    when 'precio' then 'precio'
    when 'superficie' then 'superficie_m2'
    when 'precio_m2' then 'precio_m2'
    when 'habitaciones' then 'habitaciones'
    when 'fecha_disponible' then 'fecha_disponible'
    when 'referencia' then 'referencia'
    else 'precio'
  end;
  dir := case when lower(direccion) = 'desc' then 'desc' else 'asc' end;

  execute format($q$
    with base as (select * from fn_filtrar_unidades($1)),
    pag as (select * from base order by %1$I %2$s nulls last, id limit $2 offset $3)
    select jsonb_build_object(
      'total', (select count(*) from base),
      'items', coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'referencia', referencia, 'edificio_id', edificio_id, 'edificio_referencia', edificio_referencia,
        'ubicacion', ubicacion, 'municipio', municipio,
        'distrito', distrito, 'barrio', barrio, 'zona', zona, 'tipo', tipo, 'operacion', operacion,
        'estado', estado, 'precio', precio, 'precio_m2', precio_m2, 'superficie_m2', superficie_m2,
        'habitaciones', habitaciones, 'banos', banos, 'terraza', terraza,
        'admite_mascotas', admite_mascotas, 'amueblado', amueblado,
        'certificado_energetico', certificado_energetico, 'fecha_disponible', fecha_disponible
      ) order by %1$I %2$s nulls last, id), '[]'::jsonb)
    ) from pag
  $q$, ord, dir) into res using f, least(greatest(limite, 1), 50), greatest(desplazamiento, 0);
  return res;
end $$;

-- ── Ficha completa de una unidad ────────────────────────────────────────────────────────────────────
create or replace function rpc_ficha_unidad(p_ref text) returns jsonb
language plpgsql stable as $$
declare
  u v_unidades%rowtype;
  cv contratos%rowtype;
begin
  select * into u from v_unidades
   where upper(referencia) = upper(trim(p_ref)) or id::text = trim(p_ref) or referencia_catastral = trim(p_ref)
   limit 1;
  if not found then
    return null;
  end if;

  select * into cv from contratos where id = u.contrato_vigente_id;

  return jsonb_build_object(
    'unidad', to_jsonb(u) - array['zona_norm', 'municipio_norm', 'distrito_norm', 'barrio_norm', 'direccion_norm'],
    'edificio', (select to_jsonb(e) from edificios e where e.id = u.edificio_id),
    'propietario', (select jsonb_build_object('id', p.id, 'nombre', p.nombre, 'tipo', p.tipo_persona,
                                              'telefono', p.telefono, 'email', p.email)
                    from propietarios p where p.id = u.propietario_id),
    'contrato_vigente', case when cv.id is null then null else jsonb_build_object(
      'id', cv.id, 'referencia', cv.referencia, 'tipo', cv.tipo, 'inicio', cv.fecha_inicio, 'fin', cv.fecha_fin,
      'renta_mensual', cv.renta_mensual, 'fianza', cv.fianza, 'fianza_depositada', cv.fianza_depositada,
      'indice_actualizacion', cv.indice_actualizacion,
      'inquilino', (select jsonb_build_object('id', i.id, 'nombre', i.nombre || ' ' || i.apellidos,
                                              'documento', '****' || right(i.documento, 4),
                                              'telefono', i.telefono, 'email', i.email)
                    from inquilinos i where i.id = cv.inquilino_id)
    ) end,
    'contratos_anteriores', (select coalesce(jsonb_agg(jsonb_build_object(
        'referencia', c.referencia, 'tipo', c.tipo, 'estado', c.estado, 'inicio', c.fecha_inicio,
        'fin', c.fecha_fin, 'renta_mensual', c.renta_mensual) order by c.fecha_inicio desc), '[]'::jsonb)
      from (select * from contratos where unidad_id = u.id and id is distinct from cv.id
            order by fecha_inicio desc limit 5) c),
    'pagos_recientes', (select coalesce(jsonb_agg(jsonb_build_object(
        'periodo', p.periodo, 'importe', p.importe, 'estado', p.estado, 'fecha_pago', p.fecha_pago,
        'dias_retraso', p.dias_retraso) order by p.periodo desc), '[]'::jsonb)
      from (select * from pagos where contrato_id = cv.id order by periodo desc limit 6) p),
    'incidencias', (select coalesce(jsonb_agg(jsonb_build_object(
        'categoria', x.categoria, 'prioridad', x.prioridad, 'estado', x.estado,
        'descripcion', x.descripcion, 'apertura', x.fecha_apertura) order by x.fecha_apertura desc), '[]'::jsonb)
      from (select * from incidencias where unidad_id = u.id order by fecha_apertura desc limit 5) x),
    'documentos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'titulo', d.titulo, 'tipo', d.tipo, 'vigente', d.vigente)), '[]'::jsonb)
      from documentos d
      where d.unidad_id = u.id or d.contrato_id = cv.id
         or (d.edificio_id = u.edificio_id and d.unidad_id is null)),
    'atributos', (select coalesce(jsonb_object_agg(k.clave, a.valor), '{}'::jsonb)
      from atributos_valores a join catalogo_campos k on k.id = a.campo_id
      where (a.entidad = 'unidad' and a.registro_id = u.id)
         or (a.entidad = 'contrato' and a.registro_id = cv.id))
  );
end $$;

-- ── Ficha de edificio (por referencia E-00012 o por dirección) ──────────────────────────────────────
create or replace function rpc_ficha_edificio(p_ref text) returns jsonb
language plpgsql stable as $$
declare
  e edificios%rowtype;
  v_n int;
begin
  select count(*) into v_n from edificios
   where upper(referencia) = upper(trim(p_ref)) or id::text = trim(p_ref)
      or norm_calle(direccion) like '%' || norm_calle(p_ref) || '%';
  if v_n = 0 then
    return null;
  end if;
  if v_n > 1 and not exists (select 1 from edificios where upper(referencia) = upper(trim(p_ref))) then
    return jsonb_build_object('candidatos', (
      select jsonb_agg(jsonb_build_object('id', x.id, 'referencia', x.referencia, 'direccion', x.direccion,
                                          'municipio', m.nombre) order by x.direccion)
      from edificios x join municipios m on m.id = x.municipio_id
      where norm_calle(x.direccion) like '%' || norm_calle(p_ref) || '%'
    ));
  end if;

  select * into e from edificios
   where upper(referencia) = upper(trim(p_ref)) or id::text = trim(p_ref)
      or norm_calle(direccion) like '%' || norm_calle(p_ref) || '%'
   limit 1;

  return jsonb_build_object(
    'edificio', to_jsonb(e) - array['lat', 'lng'],
    'ubicacion', (select jsonb_build_object('municipio', m.nombre, 'distrito', d.nombre, 'barrio', b.nombre,
                                            'zona', z.nombre)
                  from municipios m
                  left join distritos d on d.id = e.distrito_id
                  left join barrios b on b.id = e.barrio_id
                  join zonas z on z.id = coalesce(d.zona_id, m.zona_id)
                  where m.id = e.municipio_id),
    'resumen_unidades', (select jsonb_build_object(
        'total', count(*),
        'alquiladas', count(*) filter (where estado = 'alquilada'),
        'disponibles', count(*) filter (where estado = 'disponible'),
        'por_tipo', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb)
                     from (select tipo, count(*) n from unidades where edificio_id = e.id and unidad_padre_id is null group by tipo) t))
      from unidades where edificio_id = e.id and unidad_padre_id is null),
    'unidades', (select coalesce(jsonb_agg(jsonb_build_object(
        'referencia', u.referencia, 'planta', u.planta, 'puerta', u.puerta, 'tipo', u.tipo,
        'operacion', u.operacion, 'estado', u.estado, 'superficie_m2', u.superficie_m2) order by u.planta, u.puerta), '[]'::jsonb)
      from (select * from unidades where edificio_id = e.id and unidad_padre_id is null order by planta, puerta limit 60) u),
    'documentos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'titulo', d.titulo, 'tipo', d.tipo, 'vigente', d.vigente, 'fecha', d.fecha_documento)
        order by d.fecha_documento desc nulls last), '[]'::jsonb)
      from documentos d where d.edificio_id = e.id and d.unidad_id is null and d.contrato_id is null),
    'incidencias_abiertas', (select count(*) from incidencias i
        where i.estado <> 'cerrada' and (i.edificio_id = e.id or i.unidad_id in (select id from unidades where edificio_id = e.id)))
  );
end $$;

-- ── Indicadores de cartera ──────────────────────────────────────────────────────────────────────────
create or replace function rpc_indicadores(f jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable as $$
declare
  ff jsonb := f || jsonb_build_object('incluir_subunidades', true);
  res jsonb;
begin
  with us as (select * from fn_filtrar_unidades(ff)),
  ocup as (
    select count(*) filter (where estado = 'alquilada') as alquiladas,
           count(*) filter (where estado = 'disponible') as disponibles,
           count(*) filter (where estado = 'reforma') as reforma,
           count(*) filter (where estado = 'reservada') as reservadas,
           round(avg(renta_actual) filter (where estado = 'alquilada'), 2) as renta_media
    from us where cuenta_ocupacion
  ),
  pg as (
    select coalesce(sum(p.importe), 0) as emitido,
           coalesce(sum(p.importe) filter (where p.fecha_pago is null and p.fecha_vencimiento < current_date - 5), 0) as impagado
    from pagos p join contratos c on c.id = p.contrato_id join us on us.id = c.unidad_id
    where p.fecha_vencimiento between current_date - 365 and current_date
  ),
  venc as (
    select count(*) filter (where c.fecha_fin <= current_date + 30) as d30,
           count(*) filter (where c.fecha_fin <= current_date + 60) as d60,
           count(*) filter (where c.fecha_fin <= current_date + 90) as d90
    from contratos c join us on us.id = c.unidad_id
    where c.estado = 'vigente' and c.tipo <> 'compraventa' and c.fecha_fin >= current_date
  ),
  ven as (
    select count(*) as n, coalesce(sum(c.precio_venta), 0) as importe
    from contratos c join us on us.id = c.unidad_id
    where c.tipo = 'compraventa' and c.fecha_firma >= current_date - 365
  ),
  tot as (select count(*) as unidades, count(*) filter (where operacion = 'venta' and estado = 'disponible') as en_venta from us)
  select jsonb_build_object(
    'unidades_total', tot.unidades,
    'alquiladas', ocup.alquiladas,
    'disponibles_alquiler', ocup.disponibles,
    'en_reforma', ocup.reforma,
    'reservadas', ocup.reservadas,
    'en_venta', tot.en_venta,
    'ocupacion_pct', round(100.0 * ocup.alquiladas / nullif(ocup.alquiladas + ocup.disponibles, 0), 1),
    'renta_media', ocup.renta_media,
    'facturado_12m', pg.emitido,
    'impagado', pg.impagado,
    'morosidad_pct', round(100.0 * pg.impagado / nullif(pg.emitido, 0), 2),
    'contratos_vencen_30d', venc.d30,
    'contratos_vencen_60d', venc.d60,
    'contratos_vencen_90d', venc.d90,
    'ventas_12m', ven.n,
    'importe_ventas_12m', ven.importe
  ) into res
  from tot, ocup, pg, venc, ven;
  return res;
end $$;

create or replace function rpc_contratos_vencen(p_dias int default 90, f jsonb default '{}'::jsonb, p_limite int default 50)
returns jsonb
language plpgsql stable as $$
declare
  ff jsonb := f || jsonb_build_object('incluir_subunidades', true);
  res jsonb;
begin
  select jsonb_build_object(
    'total', count(*),
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'referencia', cv.referencia, 'unidad', cv.unidad_referencia, 'ubicacion', cv.ubicacion,
      'municipio', cv.municipio, 'zona', cv.zona, 'tipo', cv.tipo, 'inquilino', cv.inquilino,
      'fin', cv.fecha_fin, 'dias', cv.dias_para_fin, 'renta_mensual', cv.renta_mensual
    ) order by cv.fecha_fin) filter (where rn <= least(greatest(p_limite, 1), 100)), '[]'::jsonb)
  ) into res
  from (
    select cv.*, row_number() over (order by cv.fecha_fin) as rn
    from v_contratos_vigentes cv
    join fn_filtrar_unidades(ff) u on u.id = cv.unidad_id
    where cv.fecha_fin between current_date and current_date + greatest(p_dias, 1)
  ) cv;
  return res;
end $$;

-- ── Búsqueda híbrida en documentos (vectorial + full-text español, fusionadas con RRF) ─────────────
-- Ámbito: con p_unidad se buscan los documentos de esa unidad, los de su contrato, los de su edificio
-- y los generales; con solo p_edificio, los del edificio (incluidos sus contratos) y los generales.
create or replace function rpc_buscar_documentos(
  query_embedding vector(768),
  query_text text default null,
  p_unidad bigint default null,
  p_edificio bigint default null,
  p_tipos text[] default null,
  p_count int default 8,
  p_incluir_no_vigentes boolean default false
) returns table (
  chunk_id bigint, documento_id bigint, titulo text, tipo text, pagina int, seccion text,
  contenido text, vigente boolean, score double precision, similitud double precision, ambito text
)
language plpgsql stable as $$
declare
  v_edificio bigint := p_edificio;
  v_tsq tsquery;
begin
  if p_unidad is not null and v_edificio is null then
    select edificio_id into v_edificio from unidades where id = p_unidad;
  end if;

  -- pgvector >= 0.8: sigue recorriendo el índice HNSW si los filtros descartan resultados.
  begin
    perform set_config('hnsw.iterative_scan', 'relaxed_order', true);
  exception when others then null;
  end;

  if query_text is not null and length(trim(query_text)) > 0 then
    v_tsq := nullif(replace(plainto_tsquery('spanish', query_text)::text, '&', '|'), '')::tsquery;
  end if;

  return query
  with ambito as (
    select ch.id as chunk_id, ch.documento_id, d.titulo, d.tipo::text as tipo, ch.pagina, ch.seccion,
           ch.contenido, d.vigente, ch.embedding, ch.fts,
           case
             when coalesce(d.unidad_id, k.unidad_id) is not null then 'unidad'
             when coalesce(d.edificio_id, ud.edificio_id) is not null then 'edificio'
             else 'general'
           end as ambito
    from document_chunks ch
    join documentos d on d.id = ch.documento_id
    left join contratos k on k.id = d.contrato_id
    left join unidades ud on ud.id = coalesce(d.unidad_id, k.unidad_id)
    where d.estado_indexado = 'indexado'
      and (p_incluir_no_vigentes or d.vigente)
      and (p_tipos is null or d.tipo::text = any (p_tipos))
      and (
        (p_unidad is null and p_edificio is null)
        or (p_unidad is not null and coalesce(d.unidad_id, k.unidad_id) = p_unidad)
        or (p_unidad is not null and coalesce(d.unidad_id, k.unidad_id) is null
            and coalesce(d.edificio_id, ud.edificio_id) = v_edificio)
        or (p_unidad is null and coalesce(d.edificio_id, ud.edificio_id) = v_edificio)
        or (coalesce(d.edificio_id, ud.edificio_id) is null and coalesce(d.unidad_id, k.unidad_id) is null)
      )
  ),
  sem as (
    select a.chunk_id, row_number() over (order by a.embedding <=> query_embedding) as rk,
           1 - (a.embedding <=> query_embedding) as sim
    from ambito a
    where a.embedding is not null
    order by a.embedding <=> query_embedding
    limit 40
  ),
  lex as (
    select a.chunk_id, row_number() over (order by ts_rank_cd(a.fts, v_tsq) desc) as rk
    from ambito a
    where v_tsq is not null and a.fts @@ v_tsq
    order by ts_rank_cd(a.fts, v_tsq) desc
    limit 40
  ),
  fusion as (
    select coalesce(s.chunk_id, l.chunk_id) as chunk_id,
           coalesce(1.0 / (60 + s.rk), 0) + coalesce(1.0 / (60 + l.rk), 0) as score,
           s.sim
    from sem s full outer join lex l on l.chunk_id = s.chunk_id
  )
  select a.chunk_id, a.documento_id, a.titulo, a.tipo, a.pagina, a.seccion, a.contenido, a.vigente,
         (f.score + case when a.vigente then 0.002 else 0 end)::double precision,
         f.sim::double precision,
         a.ambito
  from fusion f join ambito a on a.chunk_id = f.chunk_id
  order by 9 desc
  limit greatest(p_count, 1);
end $$;

-- ── Búsqueda semántica de unidades por descripción, con filtros SQL previos ────────────────────────
create or replace function rpc_buscar_unidades_semantico(
  query_embedding vector(768),
  f jsonb default '{}'::jsonb,
  p_count int default 10
) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(r order by (r ->> 'similitud')::float desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', v.id, 'referencia', v.referencia, 'ubicacion', v.ubicacion, 'municipio', v.municipio,
      'distrito', v.distrito, 'zona', v.zona, 'tipo', v.tipo, 'operacion', v.operacion, 'estado', v.estado,
      'precio', v.precio, 'superficie_m2', v.superficie_m2, 'habitaciones', v.habitaciones,
      'descripcion', v.descripcion,
      'similitud', round((1 - (u.descripcion_embedding <=> query_embedding))::numeric, 4)
    ) as r
    from fn_filtrar_unidades(f) v
    join unidades u on u.id = v.id
    where u.descripcion_embedding is not null
    order by u.descripcion_embedding <=> query_embedding
    limit least(greatest(p_count, 1), 30)
  ) t
$$;

-- ── Cruce demanda-oferta ────────────────────────────────────────────────────────────────────────────
create or replace function fn_puntuar(d demandas, u v_unidades) returns jsonb
language plpgsql stable as $$
declare
  pts int := 60;
  motivos text[] := '{}';
  tiene_lugar boolean := (cardinality(d.zona_ids) + cardinality(d.municipio_ids) + cardinality(d.distrito_ids)) > 0;
begin
  if not d.activa or d.operacion <> u.operacion or u.estado <> 'disponible' then
    return jsonb_build_object('ok', false);
  end if;
  if cardinality(d.tipos) > 0 and not (u.tipo = any (d.tipos)) then
    return jsonb_build_object('ok', false);
  end if;
  if tiene_lugar and not (u.zona_id = any (d.zona_ids) or u.municipio_id = any (d.municipio_ids)
                          or u.distrito_id = any (d.distrito_ids)) then
    return jsonb_build_object('ok', false);
  end if;
  if d.presupuesto_max is not null and u.precio > d.presupuesto_max * 1.10 then
    return jsonb_build_object('ok', false);
  end if;
  if d.habitaciones_min is not null and coalesce(u.habitaciones, 0) < d.habitaciones_min then
    return jsonb_build_object('ok', false);
  end if;
  if d.superficie_min is not null and coalesce(u.superficie_m2, 0) < d.superficie_min then
    return jsonb_build_object('ok', false);
  end if;
  if (d.necesita_mascotas and not u.admite_mascotas) or (d.necesita_amueblado and not u.amueblado)
     or (d.necesita_terraza and not u.terraza) then
    return jsonb_build_object('ok', false);
  end if;

  if d.presupuesto_max is null or u.precio <= d.presupuesto_max then
    pts := pts + 20; motivos := array_append(motivos, 'Dentro de presupuesto');
  else
    pts := pts + 5; motivos := array_append(motivos, 'Hasta un 10 % por encima del presupuesto');
  end if;
  if tiene_lugar then
    pts := pts + 10; motivos := array_append(motivos, 'Zona buscada: ' || coalesce(u.distrito, u.municipio));
  end if;
  if d.necesita_mascotas then pts := pts + 3; motivos := array_append(motivos, 'Admite mascotas'); end if;
  if d.necesita_terraza then pts := pts + 3; motivos := array_append(motivos, 'Tiene terraza'); end if;
  if d.necesita_amueblado then pts := pts + 3; motivos := array_append(motivos, 'Amueblado'); end if;
  if d.fecha_entrada is not null and u.fecha_disponible is not null and u.fecha_disponible <= d.fecha_entrada then
    pts := pts + 5; motivos := array_append(motivos, 'Disponible para la fecha de entrada');
  end if;
  return jsonb_build_object('ok', true, 'puntos', least(pts, 100), 'motivos', to_jsonb(motivos));
end $$;

create or replace function rpc_coincidencias_unidad(p_unidad bigint, p_limite int default 20) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(r order by (r ->> 'puntuacion')::int desc, (r ->> 'cliente_id')::bigint), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'demanda_id', d.id, 'cliente_id', c.id, 'cliente', c.nombre, 'cliente_tipo', c.tipo,
      'telefono', c.telefono, 'presupuesto_max', d.presupuesto_max, 'notas', d.notas,
      'puntuacion', least((x.m ->> 'puntos')::int + coalesce(round(10 * greatest(0, least(1,
          (1 - (c.notas_embedding <=> ud.descripcion_embedding) - 0.55) / 0.3)))::int, 0), 100),
      'motivos', x.m -> 'motivos'
    ) as r
    from v_unidades u
    join unidades ud on ud.id = u.id
    join demandas d on d.activa and d.operacion = u.operacion
    join clientes c on c.id = d.cliente_id
    cross join lateral (select fn_puntuar(d, u) as m) x
    where u.id = p_unidad and (x.m ->> 'ok')::boolean
    order by (x.m ->> 'puntos')::int desc
    limit least(greatest(p_limite, 1), 100)
  ) t
$$;

create or replace function rpc_coincidencias_cliente(p_cliente bigint, p_limite int default 20) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(r order by (r ->> 'puntuacion')::int desc, (r ->> 'unidad_id')::bigint), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'demanda_id', d.id, 'unidad_id', u.id, 'referencia', u.referencia, 'ubicacion', u.ubicacion,
      'municipio', u.municipio, 'distrito', u.distrito, 'tipo', u.tipo, 'operacion', u.operacion,
      'precio', u.precio, 'superficie_m2', u.superficie_m2, 'habitaciones', u.habitaciones,
      'puntuacion', least((x.m ->> 'puntos')::int + coalesce(round(10 * greatest(0, least(1,
          (1 - (c.notas_embedding <=> ud.descripcion_embedding) - 0.55) / 0.3)))::int, 0), 100),
      'motivos', x.m -> 'motivos'
    ) as r
    from clientes c
    join demandas d on d.cliente_id = c.id and d.activa
    join v_unidades u on u.operacion = d.operacion and u.estado = 'disponible'
    join unidades ud on ud.id = u.id
    cross join lateral (select fn_puntuar(d, u) as m) x
    where c.id = p_cliente and (x.m ->> 'ok')::boolean
    order by (x.m ->> 'puntos')::int desc
    limit least(greatest(p_limite, 1), 100)
  ) t
$$;

-- ── Alertas, morosidad y CRM para el chat ───────────────────────────────────────────────────────────
create or replace function rpc_alertas(p_tipo text default null, p_severidad text default null, p_limite int default 25)
returns jsonb
language plpgsql stable as $$
declare
  res jsonb;
begin
  select jsonb_build_object(
    'total', (select count(*) from v_alertas
              where (p_tipo is null or tipo = p_tipo) and (p_severidad is null or severidad = p_severidad)),
    'por_tipo', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb)
                 from (select tipo, count(*) n from v_alertas
                       where (p_severidad is null or severidad = p_severidad) group by tipo) t),
    'items', coalesce((select jsonb_agg(to_jsonb(a) order by
                         case a.severidad when 'alta' then 0 when 'media' then 1 else 2 end, a.dias)
      from (select * from v_alertas
            where (p_tipo is null or tipo = p_tipo) and (p_severidad is null or severidad = p_severidad)
            order by case severidad when 'alta' then 0 when 'media' then 1 else 2 end, dias
            limit least(greatest(p_limite, 1), 100)) a), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function rpc_morosidad(p_limite int default 20) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'total', (select count(*) from v_morosidad),
    'deuda_total', (select coalesce(sum(deuda), 0) from v_morosidad),
    'items', coalesce((select jsonb_agg(to_jsonb(m) order by m.deuda desc)
      from (select * from v_morosidad order by deuda desc limit least(greatest(p_limite, 1), 100)) m), '[]'::jsonb)
  )
$$;

create or replace function rpc_buscar_clientes(p_texto text) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'nombre', c.nombre, 'tipo', c.tipo, 'telefono', c.telefono, 'email', c.email,
    'demandas_activas', (select count(*) from demandas d where d.cliente_id = c.id and d.activa)
  ) order by c.nombre), '[]'::jsonb)
  from (select * from clientes
        where norm(nombre) like '%' || norm(trim(p_texto)) || '%' or id::text = trim(p_texto)
        order by nombre limit 10) c
$$;

create or replace function rpc_resolver_unidad(p_ref text) returns bigint
language sql stable as $$
  select id from unidades where upper(referencia) = upper(trim(p_ref)) or id::text = trim(p_ref) limit 1
$$;

-- Guarda embeddings calculados fuera (seed): solo en tablas permitidas, nunca SQL libre.
create or replace function rpc_guardar_embeddings(p_tabla text, p_filas jsonb) returns int
language plpgsql as $$
declare
  n int;
begin
  if p_tabla = 'unidades' then
    update unidades u set descripcion_embedding = x.embedding::vector(768)
      from jsonb_to_recordset(p_filas) as x(id bigint, embedding text) where u.id = x.id;
  elsif p_tabla = 'clientes' then
    update clientes c set notas_embedding = x.embedding::vector(768)
      from jsonb_to_recordset(p_filas) as x(id bigint, embedding text) where c.id = x.id;
  else
    raise exception 'Tabla no permitida: %', p_tabla;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── Mantenimiento ───────────────────────────────────────────────────────────────────────────────────
-- Tras cargar filas con id explícito (seed), sincroniza las secuencias de identidad.
create or replace function fn_reset_sequences() returns void
language plpgsql as $$
declare
  r record;
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.is_identity = 'YES'
  loop
    execute format(
      'select setval(pg_get_serial_sequence(%L, %L), greatest((select coalesce(max(%I), 0) from public.%I), 1), (select count(*) > 0 from public.%I))',
      'public.' || r.table_name, r.column_name, r.column_name, r.table_name, r.table_name);
  end loop;
end $$;
