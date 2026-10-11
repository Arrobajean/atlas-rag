-- 0008 · Confirmación transaccional del lector de documentos
-- Es la ÚNICA vía por la que datos leídos por la IA llegan a las tablas reales. Garantías:
--   · solo se escriben campos del catálogo (`catalogo_campos`), con tabla/columna fijadas allí;
--   · cada valor se valida (tipo, opciones, min/max, regex) antes de escribir nada;
--   · todo ocurre en una transacción: si algo falla, no se guarda nada;
--   · cada valor queda en `auditoria` marcado como 'ia' (sin tocar) o 'humano' (corregido).

create or replace function rpc_confirmar_extraccion(
  p_extraccion_id bigint,
  p_valores jsonb,
  p_resolucion jsonb,
  p_usuario text default null
) returns jsonb
language plpgsql as $$
declare
  ext extracciones%rowtype;
  campo record;
  kv record;
  v jsonb;
  num numeric;
  rec_inq jsonb := '{}'::jsonb;
  rec_con jsonb := '{}'::jsonb;
  attrs jsonb := '{}'::jsonb;
  finales jsonb := '{}'::jsonb;
  v_unidad bigint;
  v_inq bigint;
  v_con bigint;
  v_ref text;
  v_estado text;
  inq_modo text;
  cols text;
begin
  select * into ext from extracciones where id = p_extraccion_id for update;
  if not found then
    raise exception 'La extracción % no existe', p_extraccion_id;
  end if;
  if ext.estado <> 'borrador' then
    raise exception 'La extracción está "%" y no puede confirmarse', ext.estado;
  end if;
  if ext.tipo_documento <> 'contrato' then
    raise exception 'Esta versión solo confirma contratos de alquiler';
  end if;

  v_unidad := (p_resolucion ->> 'unidad_id')::bigint;
  if v_unidad is null or not exists (select 1 from unidades where id = v_unidad) then
    raise exception 'Elige una unidad existente de la lista';
  end if;

  inq_modo := coalesce(p_resolucion #>> '{inquilino,modo}', 'crear');
  if inq_modo not in ('crear', 'existente') then
    raise exception 'Modo de inquilino no válido: %', inq_modo;
  end if;

  -- 1. Validar cada campo del catálogo y repartirlo por destino
  for campo in
    select * from catalogo_campos where activo and tipo_documento = ext.tipo_documento order by orden
  loop
    if campo.entidad = 'inquilino' and inq_modo = 'existente' then
      continue;
    end if;

    v := p_valores -> campo.clave;
    if v is null or v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '') then
      if campo.obligatorio then
        raise exception 'Falta el campo obligatorio "%"', campo.etiqueta;
      end if;
      continue;
    end if;

    case campo.tipo_dato
      when 'texto' then
        if jsonb_typeof(v) not in ('string', 'number') then
          raise exception '"%" debe ser texto', campo.etiqueta;
        end if;
        v := to_jsonb(btrim(v #>> '{}'));
        if campo.validacion ? 'regex' and (v #>> '{}') !~ (campo.validacion ->> 'regex') then
          raise exception '"%" no tiene un formato válido', campo.etiqueta;
        end if;
      when 'numero', 'moneda' then
        begin
          num := (v #>> '{}')::numeric;
        exception when others then
          raise exception '"%" debe ser un número', campo.etiqueta;
        end;
        if campo.validacion ? 'min' and num < (campo.validacion ->> 'min')::numeric then
          raise exception '"%" no puede ser menor que %', campo.etiqueta, campo.validacion ->> 'min';
        end if;
        if campo.validacion ? 'max' and num > (campo.validacion ->> 'max')::numeric then
          raise exception '"%" no puede ser mayor que %', campo.etiqueta, campo.validacion ->> 'max';
        end if;
        v := to_jsonb(num);
      when 'fecha' then
        begin
          v := to_jsonb(((v #>> '{}')::date)::text);
        exception when others then
          raise exception '"%" debe ser una fecha válida (AAAA-MM-DD)', campo.etiqueta;
        end;
      when 'booleano' then
        if jsonb_typeof(v) <> 'boolean' then
          raise exception '"%" debe ser sí o no', campo.etiqueta;
        end if;
      when 'opcion' then
        if not (campo.opciones ? (v #>> '{}')) then
          raise exception '"%" tiene un valor no permitido: %', campo.etiqueta, v #>> '{}';
        end if;
    end case;

    finales := finales || jsonb_build_object(campo.clave, v);
    if campo.escritura = 'columna' then
      if campo.tabla_destino = 'inquilinos' then
        rec_inq := rec_inq || jsonb_build_object(campo.columna_destino, v);
      else
        rec_con := rec_con || jsonb_build_object(campo.columna_destino, v);
      end if;
    elsif campo.escritura = 'atributo' then
      attrs := attrs || jsonb_build_object(campo.id::text, v);
    end if;
  end loop;

  if (rec_con ->> 'fecha_fin')::date <= (rec_con ->> 'fecha_inicio')::date then
    raise exception 'La fecha de fin debe ser posterior a la de inicio';
  end if;

  -- 2. Inquilino: vincular uno existente o crear uno nuevo (nunca duplicar por documento)
  if inq_modo = 'existente' then
    v_inq := (p_resolucion #>> '{inquilino,id}')::bigint;
    if v_inq is null or not exists (select 1 from inquilinos where id = v_inq) then
      raise exception 'El inquilino elegido no existe';
    end if;
  else
    rec_inq := jsonb_set(rec_inq, '{documento}', to_jsonb(upper(rec_inq ->> 'documento')));
    if exists (select 1 from inquilinos where documento = rec_inq ->> 'documento') then
      raise exception 'Ya existe un inquilino con el documento %. Vincúlalo en lugar de crear uno nuevo', rec_inq ->> 'documento';
    end if;
    select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(rec_inq) k;
    execute format('insert into inquilinos (%1$s) select %1$s from jsonb_populate_record(null::inquilinos, $1) returning id', cols)
      into v_inq using rec_inq;
  end if;

  -- 3. Contrato
  v_estado := case when (rec_con ->> 'fecha_fin')::date < current_date then 'finalizado' else 'vigente' end;
  rec_con := rec_con || jsonb_build_object('unidad_id', v_unidad, 'inquilino_id', v_inq, 'estado', v_estado);
  select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(rec_con) k;
  begin
    execute format('insert into contratos (%1$s) select %1$s from jsonb_populate_record(null::contratos, $1) returning id', cols)
      into v_con using rec_con;
  exception when exclusion_violation then
    raise exception 'La unidad ya tiene un contrato que se solapa con ese periodo';
  end;

  -- 4. Atributos (solo los definidos en el catálogo)
  for kv in select key, value from jsonb_each(attrs) loop
    insert into atributos_valores (entidad, registro_id, campo_id, valor)
    values ('contrato', v_con, kv.key::bigint, kv.value)
    on conflict (entidad, registro_id, campo_id) do update set valor = excluded.valor, updated_at = now();
  end loop;

  -- 5. Estado de la unidad y vínculo con el documento
  if v_estado = 'vigente' then
    update unidades
       set estado = (case when (rec_con ->> 'fecha_inicio')::date <= current_date then 'alquilada' else 'reservada' end)::estado_unidad
     where id = v_unidad and estado in ('disponible', 'reservada');
  end if;
  update documentos set contrato_id = v_con, unidad_id = v_unidad, tipo = 'contrato' where id = ext.documento_id;
  update contratos set documento_id = ext.documento_id where id = v_con;

  -- 6. Auditoría: 'ia' si el agente aceptó lo leído, 'humano' si lo corrigió
  for campo in
    select * from catalogo_campos where activo and tipo_documento = ext.tipo_documento and escritura <> 'solo_lectura'
  loop
    continue when not (finales ? campo.clave);
    insert into auditoria (usuario, extraccion_id, tabla, registro_id, columna, valor_anterior, valor_nuevo, origen)
    values (
      p_usuario, ext.id,
      case when campo.escritura = 'atributo' then 'atributos_valores' else campo.tabla_destino end,
      case when campo.tabla_destino = 'inquilinos' then v_inq else v_con end,
      coalesce(campo.columna_destino, campo.clave),
      null,
      finales -> campo.clave,
      case when (ext.datos -> campo.clave -> 'valor') is not distinct from (finales -> campo.clave) then 'ia' else 'humano' end
    );
  end loop;

  update extracciones
     set estado = 'confirmado', valores_finales = finales, resolucion = p_resolucion,
         contrato_id = v_con, confirmado_por = p_usuario, confirmado_en = now()
   where id = ext.id;

  select referencia into v_ref from contratos where id = v_con;
  return jsonb_build_object('contrato_id', v_con, 'referencia', v_ref, 'inquilino_id', v_inq, 'unidad_id', v_unidad);
end $$;

-- Aprobación de campos propuestos por agentes. Un campo aprobado SIEMPRE es un atributo tipado
-- (nunca una columna nueva: añadir columnas exige una migración).
create or replace function rpc_aprobar_solicitud_campo(
  p_solicitud bigint,
  p_clave text default null,
  p_usuario text default null
) returns bigint
language plpgsql as $$
declare
  sol solicitudes_campo%rowtype;
  v_clave text;
  v_campo bigint;
begin
  select * into sol from solicitudes_campo where id = p_solicitud for update;
  if not found or sol.estado <> 'pendiente' then
    raise exception 'La solicitud no existe o ya fue revisada';
  end if;
  if sol.tipo_dato = 'opcion' then
    raise exception 'Los campos de tipo "opción" requieren definir sus valores permitidos mediante migración';
  end if;

  v_clave := 'attr_' || trim(both '_' from regexp_replace(lower(unaccent(coalesce(nullif(p_clave, ''), sol.clave_sugerida, sol.etiqueta))), '[^a-z0-9]+', '_', 'g'));
  insert into catalogo_campos (clave, etiqueta, ayuda, tipo_documento, entidad, grupo, escritura, tipo_dato, obligatorio, orden)
  values (v_clave, sol.etiqueta, sol.descripcion, sol.tipo_documento, 'contrato', 'Cláusulas', 'atributo', sol.tipo_dato, false,
          coalesce((select max(orden) from catalogo_campos where tipo_documento = sol.tipo_documento), 0) + 10)
  returning id into v_campo;

  update solicitudes_campo set estado = 'aprobada', revisado_por = p_usuario, campo_id = v_campo where id = sol.id;
  insert into auditoria (usuario, tabla, registro_id, columna, valor_nuevo, origen)
  values (p_usuario, 'catalogo_campos', v_campo, 'clave', to_jsonb(v_clave), 'humano');
  return v_campo;
end $$;

-- ── Resolución de entidades para el lector ──────────────────────────────────────────────────────────
-- Unidades candidatas por referencia catastral (exacta) o por dirección + planta/puerta leídas del PDF.
create or replace function rpc_candidatos_unidad(p_catastro text default null, p_direccion text default null, p_limite int default 8)
returns jsonb
language plpgsql stable as $$
declare
  cat text := upper(regexp_replace(coalesce(p_catastro, ''), '\s', '', 'g'));
  dir text := norm_calle(p_direccion);
begin
  return coalesce((
    select jsonb_agg(c order by (c ->> 'score')::int desc, c ->> 'referencia')
    from (
      select jsonb_build_object(
        'id', x.id, 'referencia', x.referencia, 'ubicacion', x.ubicacion, 'municipio', x.municipio,
        'tipo', x.tipo, 'estado', x.estado, 'superficie_m2', x.superficie_m2,
        'referencia_catastral', x.referencia_catastral, 'score', x.score) as c
      from (
        select v.id, v.referencia, v.ubicacion, v.municipio, v.tipo, v.estado, v.superficie_m2, v.referencia_catastral,
          (case when cat <> '' and upper(v.referencia_catastral) = cat then 100 else 0 end)
          + (case when dir <> '' and dir like '%' || norm_calle(v.direccion) || '%' then 50 else 0 end)
          + (case when dir <> '' and (
               (regexp_replace(coalesce(v.planta, ''), '\D', '', 'g') <> ''
                and dir ~ ('(^| )' || regexp_replace(v.planta, '\D', '', 'g') || ' ' || norm_calle(v.puerta) || '( |$)'))
               or (norm(v.planta) = 'bajo' and dir like '%bajo%' and dir like '%' || norm_calle(v.puerta) || '%')
             ) then 30 else 0 end) as score
        from v_unidades v
        where not v.es_anexo and not v.tiene_subunidades
      ) x
      where x.score >= 50
      order by x.score desc, x.referencia
      limit least(greatest(p_limite, 1), 20)
    ) t
  ), '[]'::jsonb);
end $$;

-- Inquilinos candidatos: documento exacto (100) o nombre parecido (pg_trgm).
create or replace function rpc_candidatos_inquilino(p_documento text default null, p_nombre text default null)
returns jsonb
language plpgsql stable as $$
declare
  doc text := upper(regexp_replace(coalesce(p_documento, ''), '[^A-Za-z0-9]', '', 'g'));
  nom text := norm(p_nombre);
begin
  return coalesce((
    select jsonb_agg(c order by (c ->> 'score')::int desc)
    from (
      select jsonb_build_object(
        'id', i.id, 'nombre', i.nombre || ' ' || i.apellidos, 'documento_tipo', i.documento_tipo,
        'documento', i.documento, 'email', i.email, 'telefono', i.telefono,
        'contratos', (select count(*) from contratos k where k.inquilino_id = i.id),
        'score', case when doc <> '' and upper(i.documento) = doc then 100
                      else round(similarity(norm(i.nombre || ' ' || i.apellidos), nom) * 80)::int end) as c
      from inquilinos i
      where (doc <> '' and upper(i.documento) = doc)
         or (nom <> '' and similarity(norm(i.nombre || ' ' || i.apellidos), nom) >= 0.6)
      limit 5
    ) t
  ), '[]'::jsonb);
end $$;

-- Datos de la BD con los que comparar lo leído en el PDF, más los contratos que se solaparían.
create or replace function rpc_contexto_lector(p_unidad bigint, p_inicio date default null, p_fin date default null)
returns jsonb
language plpgsql stable as $$
declare
  v v_unidades%rowtype;
begin
  select * into v from v_unidades where id = p_unidad;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'unidad', jsonb_build_object(
      'id', v.id, 'referencia', v.referencia, 'ubicacion', v.ubicacion, 'municipio', v.municipio,
      'tipo', v.tipo, 'estado', v.estado, 'superficie_m2', v.superficie_m2, 'habitaciones', v.habitaciones,
      'referencia_catastral', v.referencia_catastral, 'precio', v.precio, 'admite_mascotas', v.admite_mascotas,
      'amueblado', v.amueblado, 'certificado_energetico', v.certificado_energetico, 'direccion', v.direccion),
    'propietario', (select jsonb_build_object('id', p.id, 'nombre', p.nombre, 'documento', p.documento, 'tipo', p.tipo_persona)
                    from propietarios p where p.id = v.propietario_id),
    'contrato_vigente', (select jsonb_build_object('id', c.id, 'referencia', c.referencia, 'inicio', c.fecha_inicio,
                           'fin', c.fecha_fin, 'renta', c.renta_mensual, 'fianza', c.fianza,
                           'inquilino', i.nombre || ' ' || i.apellidos)
                         from contratos c join inquilinos i on i.id = c.inquilino_id
                         where c.id = v.contrato_vigente_id),
    'solapes', case when p_inicio is null or p_fin is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'referencia', c.referencia, 'estado', c.estado,
                                          'inicio', c.fecha_inicio, 'fin', c.fecha_fin))
      from contratos c
      where c.unidad_id = p_unidad and c.tipo <> 'compraventa' and c.estado <> 'borrador'
        and daterange(c.fecha_inicio, c.fecha_fin, '[]') && daterange(p_inicio, p_fin, '[]')), '[]'::jsonb) end
  );
end $$;
