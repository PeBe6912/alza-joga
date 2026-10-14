alter table public.reservations
  add column if not exists payment_email_recipient text,
  add column if not exists payment_email_message_id text,
  add column if not exists payment_email_error text;

create or replace function public.admin_payment_email_preview(p_lesson_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_ends_at timestamptz;
begin
  select ends_at into v_ends_at
  from public.lessons
  where id = p_lesson_id and status <> 'cancelled';

  if not found then
    raise exception 'LESSON_NOT_FOUND';
  end if;
  if v_ends_at > now() then
    raise exception 'LESSON_NOT_ENDED';
  end if;

  select jsonb_build_object(
    'lesson_id', l.id,
    'title', l.title,
    'starts_at', l.starts_at,
    'ends_at', l.ends_at,
    'teacher', i.name,
    'payment_mode', i.payment_mode,
    'price_czk', i.price_czk,
    'payment_note', i.payment_note,
    'participants', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'reservation_id', r.id,
          'name', r.attendee_name,
          'email', r.attendee_email,
          'status', r.status,
          'payment_email_sent_at', r.payment_email_sent_at,
          'payment_email_recipient', r.payment_email_recipient,
          'payment_email_error', r.payment_email_error
        )
        order by r.attendee_name, r.created_at
      ) filter (where r.id is not null),
      '[]'::jsonb
    )
  )
  into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join public.reservations r
    on r.lesson_id = l.id
   and r.status in ('confirmed', 'attended')
  where l.id = p_lesson_id
  group by l.id, i.id;

  return v_result;
end;
$$;

create or replace function public.admin_payment_email_recipients(
  p_lesson_id uuid,
  p_reservation_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_ends_at timestamptz;
begin
  if coalesce(array_length(p_reservation_ids, 1), 0) not between 1 and 100 then
    raise exception 'INVALID_RECIPIENTS';
  end if;

  select ends_at into v_ends_at
  from public.lessons
  where id = p_lesson_id and status <> 'cancelled';

  if not found then
    raise exception 'LESSON_NOT_FOUND';
  end if;
  if v_ends_at > now() then
    raise exception 'LESSON_NOT_ENDED';
  end if;

  select jsonb_build_object(
    'lesson_id', l.id,
    'title', l.title,
    'starts_at', l.starts_at,
    'teacher', i.name,
    'payment_mode', i.payment_mode,
    'price_czk', i.price_czk,
    'payment_note', i.payment_note,
    'participants', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'reservation_id', r.id,
          'name', r.attendee_name,
          'email', r.attendee_email
        )
        order by r.attendee_name, r.created_at
      ) filter (where r.id is not null),
      '[]'::jsonb
    )
  )
  into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join public.reservations r
    on r.lesson_id = l.id
   and r.id = any(p_reservation_ids)
   and r.status in ('confirmed', 'attended')
   and r.payment_email_sent_at is null
  where l.id = p_lesson_id
  group by l.id, i.id;

  return v_result;
end;
$$;

create or replace function public.record_payment_email_result(
  p_reservation_id uuid,
  p_sent boolean,
  p_recipient_email text,
  p_message_id text,
  p_error text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.reservations
  set
    payment_email_sent_at = case when p_sent then now() else payment_email_sent_at end,
    payment_email_recipient = case when p_sent then lower(btrim(p_recipient_email)) else payment_email_recipient end,
    payment_email_message_id = case when p_sent then p_message_id else payment_email_message_id end,
    payment_email_error = case when p_sent then null else left(coalesce(p_error, 'UNKNOWN_EMAIL_ERROR'), 500) end,
    status = case when p_sent and status = 'confirmed' then 'attended'::public.reservation_status else status end,
    attended_at = case when p_sent and attended_at is null then now() else attended_at end,
    updated_at = now()
  where id = p_reservation_id
    and status in ('confirmed', 'attended');
$$;

revoke all on function public.admin_payment_email_preview(uuid) from public, anon, authenticated;
revoke all on function public.admin_payment_email_recipients(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.record_payment_email_result(uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_payment_email_preview(uuid) to service_role;
grant execute on function public.admin_payment_email_recipients(uuid, uuid[]) to service_role;
grant execute on function public.record_payment_email_result(uuid, boolean, text, text, text) to service_role;
