-- A single JSON setting keeps the amount and its as-of date atomic.
insert into public.site_settings (key, value, is_public)
values ('donation_summary', '{"amount_czk":null,"as_of":null}'::jsonb, true)
on conflict (key) do nothing;

create or replace function public.admin_update_donation_summary(p_amount_czk numeric, p_as_of date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_summary jsonb;
begin
  if p_amount_czk is null or p_amount_czk < 0 or p_amount_czk > 999999999.99
    or p_amount_czk <> round(p_amount_czk, 2) then
    raise exception 'INVALID_DONATION_AMOUNT';
  end if;
  if p_as_of is null or p_as_of < date '2000-01-01'
    or p_as_of > (now() at time zone 'Europe/Prague')::date then
    raise exception 'INVALID_DONATION_DATE';
  end if;
  v_summary := jsonb_build_object('amount_czk', p_amount_czk, 'as_of', p_as_of);
  insert into public.site_settings (key, value, is_public)
  values ('donation_summary', v_summary, true)
  on conflict (key) do update set value = excluded.value, is_public = true, updated_at = now();
  return v_summary;
end;
$$;

revoke all on function public.admin_update_donation_summary(numeric, date) from public, anon, authenticated;
grant execute on function public.admin_update_donation_summary(numeric, date) to service_role;
