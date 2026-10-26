alter table public.reservations add column late_cancelled_at timestamptz;

do $$
declare v_definition text;
begin
  v_definition := pg_get_functiondef('public.admin_cancel_reservation(uuid)'::regprocedure);
  if position('set status = ''no_show'', cancelled_at = now()' in v_definition) = 0 then
    raise exception 'Unexpected cancellation definition; review required';
  end if;
  execute replace(v_definition,
    'set status = ''no_show'', cancelled_at = now()',
    'set status = ''no_show'', cancelled_at = null, late_cancelled_at = now()');
end;
$$;
