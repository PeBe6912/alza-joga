create or replace function public.record_reservation_email_result(
  p_reservation_id uuid,
  p_sent boolean,
  p_message_id text,
  p_error text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reservations
  set
    confirmation_email_sent_at = case when p_sent then now() else null end,
    confirmation_email_message_id = case when p_sent then p_message_id else null end,
    confirmation_email_error = case when p_sent then null else left(coalesce(p_error, 'UNKNOWN_EMAIL_ERROR'), 500) end
  where id = p_reservation_id;
$$;

revoke all on function public.record_reservation_email_result(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.record_reservation_email_result(uuid, boolean, text, text) to service_role;
