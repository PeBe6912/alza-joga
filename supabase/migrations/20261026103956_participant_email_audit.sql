alter table public.reservations
  add column payment_email_last_resent_at timestamptz,
  add column payment_email_resend_requested_at timestamptz;

-- Atomic short claim. No SMTP/network call is made while a row lock is held.
create function public.claim_payment_email_resend(p_reservation_id uuid, p_expected_message_id text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  update public.reservations r
  set payment_email_resend_requested_at = clock_timestamp()
  where r.id = p_reservation_id
    and r.payment_email_message_id = p_expected_message_id
    and r.payment_email_sent_at is not null
    and r.status in ('attended', 'no_show')
    and r.payment_waived_at is null
    and (r.payment_email_resend_requested_at is null or r.payment_email_resend_requested_at < now() - interval '2 minutes')
    and exists (select 1 from public.lessons l where l.id = r.lesson_id and l.ends_at <= now() and l.status <> 'cancelled');
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;
revoke all on function public.claim_payment_email_resend(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_payment_email_resend(uuid, text) to service_role;

-- Preserve the existing cancellation rules and grants; only stop discarding the timestamp.
do $$
declare v_definition text;
begin
  v_definition := pg_get_functiondef('public.admin_cancel_reservation(uuid)'::regprocedure);
  if position('set status = ''no_show'', cancelled_at = null' in v_definition) = 0 then
    raise exception 'Unexpected admin_cancel_reservation definition; review before applying';
  end if;
  execute replace(v_definition, 'set status = ''no_show'', cancelled_at = null', 'set status = ''no_show'', cancelled_at = now()');
end;
$$;
