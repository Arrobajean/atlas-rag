-- 0014 · Panel del corredor: agenda de hoy, oportunidades, ingresos en riesgo, embudo y estado de los documentos con IA.
-- Cada función es independiente: el panel muestra solo las que existan.

-- ── 1. Agenda de hoy ────────────────────────────────────────────────────────────────────────────────
-- Lo que pide una acción ya: impagos, contratos a punto de vencer, certificados caducados, fianzas olvidadas
-- e incidencias urgentes. `nivel` 1 = hoy, 2 = esta semana, 3 = cuando se pueda. Ordenado por nivel e importe.
create or replace function rpc_agenda_hoy(p_limite int default 8) returns jsonb
language sql stable as $$
  with alertas as (
    select
      a.tipo, a.clave, a.titulo, a.dias, a.unidad_id, a.contrato_id, a.unidad_referencia, a.ubicacion,
      c.referencia as contrato_referencia,
      case a.tipo when 'contrato_vence' then c.renta_mensual when 'impago' then m.deuda when 'fianza_pendiente' then c.fianza end as importe,
      case
        when a.tipo = 'impago' then case when a.severidad = 'alta' then 1 else 2 end
        when a.tipo = 'contrato_vence' then case when a.dias <= 7 then 1 else 2 end
        when a.tipo = 'certificado_energetico' then 1
        else 3
      end as nivel
    from v_alertas a
    left join contratos c on c.id = a.contrato_id
    left join v_morosidad m on m.contrato_id = a.contrato_id
    where a.tipo = 'impago'
       or (a.tipo = 'contrato_vence' and a.dias <= 14)
       or (a.tipo = 'certificado_energetico' and a.dias < 0)
       or (a.tipo = 'fianza_pendiente' and a.dias >= 60)
  ),
  incidencias_abiertas as (
    select
      'incidencia'::text as tipo,
      'incidencia:' || i.id as clave,
      'Incidencia de ' || replace(i.categoria, '_', ' ') || ' (' || i.prioridad || ')' as titulo,
      (current_date - i.fecha_apertura) as dias,
      i.unidad_id,
      null::bigint as contrato_id,
      u.referencia as unidad_referencia,
      coalesce(v.ubicacion, e.direccion) as ubicacion,
      null::text as contrato_referencia,
      i.coste as importe,
      case i.prioridad when 'urgente' then 1 else 2 end as nivel
    from incidencias i
    left join unidades u on u.id = i.unidad_id
    left join v_unidades v on v.id = i.unidad_id
    left join edificios e on e.id = coalesce(i.edificio_id, u.edificio_id)
    where i.estado <> 'cerrada' and i.prioridad in ('urgente', 'alta')
  ),
  todo as (select * from alertas union all select * from incidencias_abiertas),
  elegidas as (
    select * from todo order by nivel, importe desc nulls last, dias limit least(greatest(p_limite, 1), 30)
  )
  select jsonb_build_object(
    'total', (select count(*) from todo),
    'por_nivel', jsonb_build_object(
      'hoy', (select count(*) from todo where nivel = 1),
      'semana', (select count(*) from todo where nivel = 2),
      'luego', (select count(*) from todo where nivel = 3)
    ),
    'importe_en_juego', (select coalesce(sum(importe), 0) from todo where nivel <= 2),
    'items', coalesce((select jsonb_agg(to_jsonb(e) order by e.nivel, e.importe desc nulls last, e.dias) from elegidas e), '[]'::jsonb)
  )
$$;

-- ── 2. Oportunidades: demanda ↔ oferta ──────────────────────────────────────────────────────────────
-- Unidades disponibles con más clientes que encajan (según fn_puntuar) y demandas activas sin ninguna oferta.
create or replace function rpc_oportunidades(p_limite int default 5) returns jsonb
language sql stable as $$
  with pares as (
    select u.id as unidad_id, u.referencia, u.ubicacion, u.operacion, u.precio, u.habitaciones,
           c.nombre as cliente, d.id as demanda_id,
           (x.m ->> 'puntos')::int as puntos
    from v_unidades u
    join demandas d on d.activa and d.operacion = u.operacion
    join clientes c on c.id = d.cliente_id
    cross join lateral (select fn_puntuar(d, u) as m) x
    where u.estado = 'disponible' and not u.es_anexo and (x.m ->> 'ok')::boolean
  ),
  por_unidad as (
    select unidad_id, referencia, ubicacion, operacion, precio, habitaciones,
           count(*)::int as clientes,
           max(puntos) as mejor_puntuacion,
           (array_agg(cliente order by puntos desc, cliente))[1] as mejor_cliente
    from pares
    group by unidad_id, referencia, ubicacion, operacion, precio, habitaciones
  ),
  demandas_con_oferta as (select distinct demanda_id from pares),
  sin_oferta as (
    select d.id, c.nombre as cliente, c.tipo, d.operacion, d.presupuesto_max
    from demandas d
    join clientes c on c.id = d.cliente_id
    where d.activa and d.id not in (select demanda_id from demandas_con_oferta)
  )
  select jsonb_build_object(
    'unidades_con_interesados', (select count(*) from por_unidad),
    'demandas_activas', (select count(*) from demandas where activa),
    'demandas_sin_oferta', (select count(*) from sin_oferta),
    'sin_oferta', coalesce((select jsonb_agg(to_jsonb(s) order by s.presupuesto_max desc nulls last)
                            from (select * from sin_oferta order by presupuesto_max desc nulls last limit 3) s), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.clientes desc, p.mejor_puntuacion desc, p.referencia)
                       from (select * from por_unidad order by clientes desc, mejor_puntuacion desc, referencia
                             limit least(greatest(p_limite, 1), 20)) p), '[]'::jsonb)
  )
$$;

-- ── 3. Ingresos en riesgo ───────────────────────────────────────────────────────────────────────────
-- Renta mensual de los contratos que vencen en 30/60/90 días y lo que cuesta cada mes un piso vacío.
create or replace function rpc_ingresos_riesgo(p_limite int default 5) returns jsonb
language sql stable as $$
  with venc as (
    select c.renta_mensual, (c.fecha_fin - current_date) as dias
    from contratos c
    where c.estado = 'vigente' and c.tipo <> 'compraventa'
      and c.fecha_fin between current_date and current_date + 90
  ),
  vacios as (
    select u.id, u.referencia, u.ubicacion, u.precio,
           greatest(current_date - u.fecha_disponible, 0) as dias_vacio
    from v_unidades u
    where u.cuenta_ocupacion and u.estado = 'disponible' and u.precio is not null
  )
  select jsonb_build_object(
    'renta_en_riesgo', jsonb_build_object(
      'd30', jsonb_build_object('contratos', (select count(*) from venc where dias <= 30), 'renta', (select coalesce(sum(renta_mensual), 0) from venc where dias <= 30)),
      'd60', jsonb_build_object('contratos', (select count(*) from venc where dias <= 60), 'renta', (select coalesce(sum(renta_mensual), 0) from venc where dias <= 60)),
      'd90', jsonb_build_object('contratos', (select count(*) from venc), 'renta', (select coalesce(sum(renta_mensual), 0) from venc))
    ),
    'vacios', jsonb_build_object(
      'unidades', (select count(*) from vacios),
      'renta_mensual', (select coalesce(sum(precio), 0) from vacios),
      'dias_medios', (select round(avg(dias_vacio)) from vacios where dias_vacio is not null),
      'items', coalesce((select jsonb_agg(to_jsonb(v) order by v.dias_vacio desc nulls last, v.precio desc)
                         from (select * from vacios order by dias_vacio desc nulls last, precio desc
                               limit least(greatest(p_limite, 1), 20)) v), '[]'::jsonb)
    )
  )
$$;

-- ── 4. Embudo de cartera ────────────────────────────────────────────────────────────────────────────
-- Cierres de los últimos `p_dias` días frente a los `p_dias` anteriores, y lo que hay ahora en cada fase.
create or replace function rpc_embudo(p_dias int default 30) returns jsonb
language sql stable as $$
  with cierres as (
    select c.tipo, coalesce(c.fecha_firma, c.fecha_inicio) as fecha
    from contratos c
    where c.estado <> 'borrador'
      and coalesce(c.fecha_firma, c.fecha_inicio) > current_date - 2 * greatest(p_dias, 1)
      and coalesce(c.fecha_firma, c.fecha_inicio) <= current_date
  )
  select jsonb_build_object(
    'dias', greatest(p_dias, 1),
    'disponibles', (select count(*) from v_unidades where estado = 'disponible' and not es_anexo and not tiene_subunidades),
    'reservadas', (select count(*) from v_unidades where estado = 'reservada' and not es_anexo),
    'alquileres', jsonb_build_object(
      'actual', (select count(*) from cierres where tipo <> 'compraventa' and fecha > current_date - greatest(p_dias, 1)),
      'anterior', (select count(*) from cierres where tipo <> 'compraventa' and fecha <= current_date - greatest(p_dias, 1))
    ),
    'ventas', jsonb_build_object(
      'actual', (select count(*) from cierres where tipo = 'compraventa' and fecha > current_date - greatest(p_dias, 1)),
      'anterior', (select count(*) from cierres where tipo = 'compraventa' and fecha <= current_date - greatest(p_dias, 1))
    )
  )
$$;

-- ── 5. Documentos con IA ────────────────────────────────────────────────────────────────────────────
-- Lo que el lector de contratos y el revisor de cláusulas dejan esperando a una persona.
create or replace function rpc_panel_documentos() returns jsonb
language sql stable as $$
  with borradores as (
    select e.id, e.documento_id, d.titulo, e.created_at,
           (select count(*) from jsonb_each(e.datos) kv
             where jsonb_typeof(kv.value) = 'object' and (kv.value ->> 'confianza') ~ '^[0-9.]+$' and (kv.value ->> 'confianza')::numeric < 0.7) as campos_dudosos
    from extracciones e
    join documentos d on d.id = e.documento_id
    where e.estado = 'borrador'
  ),
  ultima as (
    select distinct on (r.contrato_id) r.contrato_id, r.hallazgos, r.created_at
    from revisiones_contrato r
    where r.contrato_id is not null
    order by r.contrato_id, r.created_at desc
  ),
  hallazgos as (
    select c.referencia as contrato, h.value ->> 'titulo' as titulo, h.value ->> 'clausula' as clausula
    from ultima u
    join contratos c on c.id = u.contrato_id and c.estado = 'vigente'
    cross join lateral jsonb_array_elements(u.hallazgos) h
    where h.value ->> 'severidad' = 'alta'
  )
  select jsonb_build_object(
    'por_confirmar', (select count(*) from borradores),
    'con_dudas', (select count(*) from borradores where campos_dudosos > 0),
    'borradores', coalesce((select jsonb_agg(to_jsonb(b) order by b.campos_dudosos desc, b.created_at)
                            from (select id, documento_id, titulo, campos_dudosos, created_at from borradores
                                  order by campos_dudosos desc, created_at limit 3) b), '[]'::jsonb),
    'clausulas_alta', (select count(*) from hallazgos),
    'clausulas', coalesce((select jsonb_agg(to_jsonb(h)) from (select * from hallazgos limit 3) h), '[]'::jsonb),
    'indexado_error', (select count(*) from documentos where estado_indexado = 'error'),
    'indexado_pendiente', (select count(*) from documentos where estado_indexado in ('pendiente', 'procesando')),
    'documentos', (select count(*) from documentos where vigente)
  )
$$;

-- ── 6. Salud del asistente (solo para administración) ───────────────────────────────────────────────
create or replace function rpc_salud_asistente(p_dias int default 7) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'dias', greatest(p_dias, 1),
    'positivas', (select count(*) from valoraciones_chat where voto = 'up' and created_at > now() - make_interval(days => greatest(p_dias, 1))),
    'negativas', (select count(*) from valoraciones_chat where voto = 'down' and created_at > now() - make_interval(days => greatest(p_dias, 1))),
    'fallos', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc)
                        from (select pregunta, comentario, created_at from valoraciones_chat
                              where voto = 'down' and created_at > now() - make_interval(days => greatest(p_dias, 1))
                              order by created_at desc limit 3) f), '[]'::jsonb)
  )
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function rpc_agenda_hoy(int), rpc_oportunidades(int), rpc_ingresos_riesgo(int), rpc_embudo(int), rpc_panel_documentos(), rpc_salud_asistente(int) to service_role';
  end if;
end $$;
