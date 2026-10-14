create or replace function public.admin_payment_email_recipients(p_lesson_id uuid, p_reservation_ids uuid[])
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_result jsonb;
  v_ends_at timestamptz;
begin
  if coalesce(array_length(p_reservation_ids, 1), 0) not between 1 and 100 then raise exception 'INVALID_RECIPIENTS'; end if;
  select ends_at into v_ends_at from public.lessons where id = p_lesson_id and status <> 'cancelled';
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select jsonb_build_object(
    'lesson_id', l.id, 'title', l.title, 'starts_at', l.starts_at,
    'teacher', i.name, 'payment_mode', l.payment_mode, 'price_czk', l.price_czk,
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id, 'name', r.attendee_name, 'email', r.attendee_email
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join public.reservations r
    on r.lesson_id = l.id and r.id = any(p_reservation_ids)
   and r.status in ('confirmed', 'attended') and r.payment_email_sent_at is null
  where l.id = p_lesson_id
  group by l.id, i.id;
  return v_result;
end;
$$;

revoke all on function public.admin_payment_email_recipients(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_payment_email_recipients(uuid, uuid[]) to service_role;
