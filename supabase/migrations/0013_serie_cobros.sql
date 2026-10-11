-- 0013 · Serie mensual de cobros para el panel (tendencia de lo facturado y de la morosidad)

-- Por mes de vencimiento: lo emitido y lo que sigue sin cobrar (misma regla que la morosidad de rpc_indicadores:
-- sin pagar y vencido hace más de 5 días). Siempre devuelve `meses` filas, con ceros si un mes no tiene recibos.
create or replace function rpc_serie_cobros(f jsonb default '{}'::jsonb, meses integer default 12) returns jsonb
language sql stable as $$
  with us as (select id from fn_filtrar_unidades(f || jsonb_build_object('incluir_subunidades', true))),
  m as (
    select generate_series(
      date_trunc('month', current_date) - make_interval(months => greatest(meses, 1) - 1),
      date_trunc('month', current_date),
      interval '1 month'
    )::date as mes
  ),
  p as (
    select date_trunc('month', pg.fecha_vencimiento)::date as mes,
           sum(pg.importe) as emitido,
           sum(pg.importe) filter (where pg.fecha_pago is null and pg.fecha_vencimiento < current_date - 5) as impagado
    from pagos pg
    join contratos c on c.id = pg.contrato_id
    join us on us.id = c.unidad_id
    where pg.fecha_vencimiento <= current_date
      and pg.fecha_vencimiento >= date_trunc('month', current_date) - make_interval(months => greatest(meses, 1) - 1)
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object('mes', to_char(m.mes, 'YYYY-MM'), 'emitido', coalesce(p.emitido, 0), 'impagado', coalesce(p.impagado, 0))
      order by m.mes
    ),
    '[]'::jsonb
  )
  from m left join p on p.mes = m.mes
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function rpc_serie_cobros(jsonb, integer) to service_role';
  end if;
end $$;
