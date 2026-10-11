-- 0006 · Vistas de lectura para el chat, el dashboard y las alertas
-- Todas con security_invoker: respetan RLS del usuario que consulta.

drop view if exists v_alertas cascade;
drop view if exists v_ocupacion_por_distrito cascade;
drop view if exists v_morosidad cascade;
drop view if exists v_contratos_vigentes cascade;
drop view if exists v_unidades cascade;

create view v_unidades with (security_invoker = true) as
select
  u.id,
  u.referencia,
  u.tipo,
  u.operacion,
  u.estado,
  u.planta,
  u.puerta,
  e.direccion || case when u.planta is not null then ', ' || u.planta || coalesce(' ' || u.puerta, '') else '' end as ubicacion,
  u.superficie_m2,
  u.habitaciones,
  u.banos,
  u.precio_alquiler,
  u.precio_venta,
  u.precio_temporada_mes,
  case u.operacion
    when 'venta' then u.precio_venta
    when 'temporada' then coalesce(u.precio_temporada_mes, u.precio_alquiler)
    else u.precio_alquiler
  end as precio,
  case when u.superficie_m2 > 0 then round((case u.operacion
    when 'venta' then u.precio_venta
    when 'temporada' then coalesce(u.precio_temporada_mes, u.precio_alquiler)
    else u.precio_alquiler
  end) / u.superficie_m2, 2) end as precio_m2,
  u.amueblado,
  u.admite_mascotas,
  u.terraza,
  u.certificado_energetico,
  u.certificado_caducidad,
  u.referencia_catastral,
  u.descripcion,
  u.fecha_disponible,
  u.unidad_padre_id,
  u.propietario_id,
  (u.tipo in ('garaje', 'trastero')) as es_anexo,
  (u.unidad_padre_id is not null) as es_subunidad,
  exists (select 1 from unidades h where h.unidad_padre_id = u.id) as tiene_subunidades,
  (u.tipo not in ('garaje', 'trastero') and u.operacion <> 'venta'
    and not exists (select 1 from unidades h where h.unidad_padre_id = u.id)) as cuenta_ocupacion,
  e.id as edificio_id,
  e.referencia as edificio_referencia,
  e.direccion,
  e.codigo_postal,
  e.ascensor,
  e.anio_construccion,
  e.lat,
  e.lng,
  m.id as municipio_id,
  m.nombre as municipio,
  d.id as distrito_id,
  d.nombre as distrito,
  b.id as barrio_id,
  b.nombre as barrio,
  z.id as zona_id,
  z.nombre as zona,
  norm(z.nombre) as zona_norm,
  norm(m.nombre) as municipio_norm,
  norm(d.nombre) as distrito_norm,
  norm(b.nombre) as barrio_norm,
  norm(e.direccion) as direccion_norm,
  cv.id as contrato_vigente_id,
  cv.referencia as contrato_vigente_ref,
  cv.inquilino_id,
  cv.renta_mensual as renta_actual,
  cv.fecha_fin as contrato_fin
from unidades u
join edificios e on e.id = u.edificio_id
join municipios m on m.id = e.municipio_id
left join distritos d on d.id = e.distrito_id
left join barrios b on b.id = e.barrio_id
join zonas z on z.id = coalesce(d.zona_id, m.zona_id)
left join lateral (
  select c.id, c.referencia, c.inquilino_id, c.renta_mensual, c.fecha_fin
  from contratos c
  where c.unidad_id = u.id
    and c.tipo <> 'compraventa'
    and c.estado = 'vigente'
    and current_date between c.fecha_inicio and coalesce(c.fecha_fin, 'infinity'::date)
  order by c.fecha_inicio desc
  limit 1
) cv on true;

create view v_contratos_vigentes with (security_invoker = true) as
select
  c.id,
  c.referencia,
  c.tipo,
  c.unidad_id,
  u.referencia as unidad_referencia,
  v.ubicacion,
  v.municipio,
  v.distrito,
  v.zona,
  c.inquilino_id,
  i.nombre || ' ' || i.apellidos as inquilino,
  c.fecha_inicio,
  c.fecha_fin,
  (c.fecha_fin - current_date) as dias_para_fin,
  c.renta_mensual,
  c.fianza,
  c.fianza_depositada,
  c.indice_actualizacion
from contratos c
join unidades u on u.id = c.unidad_id
join v_unidades v on v.id = u.id
join inquilinos i on i.id = c.inquilino_id
where c.tipo <> 'compraventa'
  and c.estado = 'vigente'
  and current_date between c.fecha_inicio and coalesce(c.fecha_fin, 'infinity'::date);

-- Impago: sin fecha de pago y con más de 5 días de retraso sobre el vencimiento.
create view v_morosidad with (security_invoker = true) as
select
  c.id as contrato_id,
  c.referencia as contrato_referencia,
  c.unidad_id,
  u.referencia as unidad_referencia,
  v.ubicacion,
  v.zona,
  v.municipio,
  i.nombre || ' ' || i.apellidos as inquilino,
  i.telefono,
  count(*)::int as pagos_pendientes,
  sum(p.importe) as deuda,
  min(p.fecha_vencimiento) as desde,
  (current_date - min(p.fecha_vencimiento)) as dias_max
from pagos p
join contratos c on c.id = p.contrato_id
join unidades u on u.id = c.unidad_id
join v_unidades v on v.id = u.id
join inquilinos i on i.id = c.inquilino_id
where p.fecha_pago is null
  and p.fecha_vencimiento < current_date - 5
  and c.estado in ('vigente', 'rescindido')
group by c.id, c.referencia, c.unidad_id, u.referencia, v.ubicacion, v.zona, v.municipio, i.nombre, i.apellidos, i.telefono;

create view v_ocupacion_por_distrito with (security_invoker = true) as
select
  zona,
  municipio,
  coalesce(distrito, '(sin distrito)') as distrito,
  count(*)::int as unidades,
  count(*) filter (where estado = 'alquilada')::int as alquiladas,
  count(*) filter (where estado = 'disponible')::int as disponibles,
  count(*) filter (where estado in ('reforma', 'reservada'))::int as otras,
  round(100.0 * count(*) filter (where estado = 'alquilada')
    / nullif(count(*) filter (where estado in ('alquilada', 'disponible')), 0), 1) as ocupacion_pct,
  round(avg(precio) filter (where estado = 'alquilada'), 2) as renta_media
from v_unidades
where cuenta_ocupacion
group by zona, municipio, coalesce(distrito, '(sin distrito)');

-- Alertas calculadas en vivo. La clave incluye la fecha del evento para que reaparezcan al año siguiente.
create view v_alertas with (security_invoker = true) as
with base as (
  select
    'contrato_vence'::text as tipo,
    'contrato_vence:' || c.id || ':' || c.fecha_fin as clave,
    case when c.fecha_fin - current_date <= 30 then 'alta'
         when c.fecha_fin - current_date <= 60 then 'media' else 'baja' end as severidad,
    'Contrato ' || c.referencia || ' vence en ' || (c.fecha_fin - current_date) || ' días' as titulo,
    case when c.tipo = 'vivienda_habitual'
      then 'Vivienda habitual: preaviso de no renovación de 4 meses (arrendador) o 2 meses (arrendatario) según LAU art. 10. Orientativo: verificar con el contrato.'
      else 'Revisar las condiciones de prórroga y renovación del contrato.' end as detalle,
    c.fecha_fin as fecha_evento,
    (c.fecha_fin - current_date) as dias,
    c.unidad_id,
    c.id as contrato_id
  from contratos c
  where c.estado = 'vigente' and c.tipo <> 'compraventa'
    and c.fecha_fin between current_date and current_date + 120

  union all
  select
    'actualizacion_renta',
    'actualizacion_renta:' || c.id || ':' || a.proxima,
    case when a.proxima - current_date <= 15 then 'media' else 'baja' end,
    'Actualización de renta de ' || c.referencia || ' el ' || to_char(a.proxima, 'DD/MM/YYYY'),
    'Índice pactado: ' || upper(c.indice_actualizacion) || '. Renta actual: ' || c.renta_mensual || ' €.',
    a.proxima,
    (a.proxima - current_date),
    c.unidad_id,
    c.id
  from contratos c
  cross join lateral (
    select (c.fecha_inicio + ((extract(year from current_date)::int - extract(year from c.fecha_inicio)::int) * interval '1 year'))::date as este_anio
  ) x
  cross join lateral (
    select case when x.este_anio >= current_date then x.este_anio
                else (x.este_anio + interval '1 year')::date end as proxima
  ) a
  where c.estado = 'vigente' and c.tipo in ('vivienda_habitual', 'local', 'temporada')
    and c.indice_actualizacion <> 'ninguno'
    and a.proxima > c.fecha_inicio
    and a.proxima <= coalesce(c.fecha_fin, 'infinity'::date)
    and a.proxima - current_date <= 45

  union all
  select
    'certificado_energetico',
    'certificado:' || u.id || ':' || u.certificado_caducidad,
    case when u.certificado_caducidad < current_date then 'alta' else 'media' end,
    case when u.certificado_caducidad < current_date
      then 'Certificado energético caducado en ' || u.referencia
      else 'El certificado energético de ' || u.referencia || ' caduca en ' || (u.certificado_caducidad - current_date) || ' días' end,
    'Caducidad: ' || to_char(u.certificado_caducidad, 'DD/MM/YYYY') || '. Es obligatorio para alquilar o vender.',
    u.certificado_caducidad,
    (u.certificado_caducidad - current_date),
    u.id,
    null::bigint
  from unidades u
  where u.certificado_caducidad is not null
    and u.certificado_caducidad <= current_date + 60
    and u.estado <> 'vendida'
    and u.tipo not in ('garaje', 'trastero')

  union all
  select
    'fianza_pendiente',
    'fianza_pendiente:' || c.id,
    'media',
    'Fianza sin depositar en ' || c.referencia,
    'Fianza de ' || c.fianza || ' € pendiente de depósito en el organismo autonómico. Contrato iniciado el ' || to_char(c.fecha_inicio, 'DD/MM/YYYY') || '.',
    c.fecha_inicio,
    (current_date - c.fecha_inicio),
    c.unidad_id,
    c.id
  from contratos c
  where c.estado = 'vigente' and c.tipo <> 'compraventa'
    and c.fianza > 0 and not c.fianza_depositada
    and c.fecha_inicio <= current_date - 30

  union all
  select
    'impago',
    'impago:' || m.contrato_id || ':' || m.desde,
    case when m.pagos_pendientes >= 2 or m.dias_max > 30 then 'alta' else 'media' end,
    'Impago en ' || m.contrato_referencia || ' (' || m.inquilino || ')',
    m.pagos_pendientes || ' recibo(s) sin pagar por ' || m.deuda || ' €. Lleva ' || m.dias_max || ' días de retraso.',
    m.desde,
    m.dias_max,
    m.unidad_id,
    m.contrato_id
  from v_morosidad m
)
select b.*, u.referencia as unidad_referencia, vu.ubicacion, vu.municipio
from base b
left join unidades u on u.id = b.unidad_id
left join v_unidades vu on vu.id = b.unidad_id
where not exists (
  select 1 from alertas_estado ae
  where ae.clave = b.clave
    and (ae.estado = 'resuelta' or (ae.estado = 'pospuesta' and ae.hasta > now()))
);
