-- Borra SOLO los datos de prueba (los que tienen id "prueba-...").
-- Los clientes y ventas reales no se tocan.

update public.kv
set value = (
      select coalesce(jsonb_agg(elemento), '[]'::jsonb)::text
      from jsonb_array_elements((value)::jsonb) as elemento
      where elemento->>'id' not like 'prueba-%'
    ),
    updated_at = now()
where key in ('nexus-embudo-clientes', 'nexus-embudo-ventas');
