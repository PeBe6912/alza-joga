alter table public.reservations
  add column if not exists payment_waived_at timestamptz;

alter table public.reservations
  drop constraint if exists reservation_payment_waiver_state;

alter table public.reservations
  add constraint reservation_payment_waiver_state check (
    payment_waived_at is null or status = 'no_show'
  );

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

  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select jsonb_build_object(
    'lesson_id', l.id,
    'title', l.title,
    'starts_at', l.starts_at,
    'ends_at', l.ends_at,
    'teacher', i.name,
    'instructor_email', c.email,
    'payment_mode', l.payment_mode,
    'price_czk', l.price_czk,
    'cancellation_hours', private.setting_integer('cancellation_hours', 24),
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id,
      'name', r.attendee_name,
      'email', r.attendee_email,
      'status', r.status,
      'payment_waived_at', r.payment_waived_at,
      'payment_email_sent_at', r.payment_email_sent_at,
      'payment_email_recipient', r.payment_email_recipient,
      'payment_email_error', r.payment_email_error
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join private.instructor_contacts c on c.instructor_id = i.id
  left join public.reservations r
    on r.lesson_id = l.id
   and r.status in ('confirmed', 'attended', 'no_show')
  where l.id = p_lesson_id
  group by l.id, i.id, c.email;

  return v_result;
end;
$$;

create or replace function public.admin_record_attendance(
  p_lesson_id uuid,
  p_attendance jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active_count integer;
  v_received_count integer;
  v_result jsonb;
  v_ends_at timestamptz;
begin
  if p_attendance is null or jsonb_typeof(p_attendance) <> 'array' or jsonb_array_length(p_attendance) > 100 then
    raise exception 'INVALID_ATTENDANCE';
  end if;

  select ends_at into v_ends_at
  from public.lessons
  where id = p_lesson_id and status <> 'cancelled'
  for update;

  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select count(*) into v_active_count
  from public.reservations
  where lesson_id = p_lesson_id
    and status in ('confirmed', 'attended', 'no_show');

  with submitted as (
    select
      (item->>'reservation_id')::uuid as reservation_id,
      item->>'outcome' as outcome
    from jsonb_array_elements(p_attendance) item
  )
  select count(distinct reservation_id) into v_received_count
  from submitted
  where outcome in ('attended', 'no_show', 'waived');

  if jsonb_array_length(p_attendance) <> v_active_count
     or v_received_count <> v_active_count
     or exists (
       select 1
       from jsonb_array_elements(p_attendance) item
       left join public.reservations r
         on r.id = (item->>'reservation_id')::uuid
        and r.lesson_id = p_lesson_id
        and r.status in ('confirmed', 'attended', 'no_show')
       where r.id is null
          or item->>'outcome' not in ('attended', 'no_show', 'waived')
     ) then
    raise exception 'INVALID_ATTENDANCE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_attendance) item
    join public.reservations r on r.id = (item->>'reservation_id')::uuid
    where item->>'outcome' = 'waived'
      and r.payment_email_sent_at is not null
  ) then
    raise exception 'PAYMENT_ALREADY_SENT';
  end if;

  with submitted as (
    select
      (item->>'reservation_id')::uuid as reservation_id,
      item->>'outcome' as outcome
    from jsonb_array_elements(p_attendance) item
  )
  update public.reservations r
  set
    status = case when s.outcome = 'attended' then 'attended'::public.reservation_status else 'no_show'::public.reservation_status end,
    attended_at = case when s.outcome = 'attended' then coalesce(r.attended_at, now()) else null end,
    payment_waived_at = case when s.outcome = 'waived' then coalesce(r.payment_waived_at, now()) else null end,
    updated_at = now()
  from submitted s
  where r.id = s.reservation_id;

  select jsonb_build_object(
    'lesson_id', l.id,
    'title', l.title,
    'starts_at', l.starts_at,
    'ends_at', l.ends_at,
    'teacher', i.name,
    'instructor_email', c.email,
    'payment_mode', l.payment_mode,
    'price_czk', l.price_czk,
    'cancellation_hours', private.setting_integer('cancellation_hours', 24),
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id,
      'name', r.attendee_name,
      'email', r.attendee_email,
      'status', r.status,
      'payment_waived_at', r.payment_waived_at,
      'payment_email_sent_at', r.payment_email_sent_at,
      'payment_email_recipient', r.payment_email_recipient,
      'payment_email_error', r.payment_email_error
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join private.instructor_contacts c on c.instructor_id = i.id
  left join public.reservations r
    on r.lesson_id = l.id
   and r.status in ('attended', 'no_show')
  where l.id = p_lesson_id
  group by l.id, i.id, c.email;

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
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.reservations
  set
    payment_email_sent_at = case when p_sent then now() else payment_email_sent_at end,
    payment_email_recipient = case when p_sent then lower(btrim(p_recipient_email)) else payment_email_recipient end,
    payment_email_message_id = case when p_sent then p_message_id else payment_email_message_id end,
    payment_email_error = case when p_sent then null else left(coalesce(p_error, 'UNKNOWN_EMAIL_ERROR'), 500) end,
    updated_at = now()
  where id = p_reservation_id
    and status in ('attended', 'no_show')
    and payment_waived_at is null;
end;
$$;

create or replace function public.admin_cancel_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_lesson public.lessons%rowtype;
  v_teacher text;
  v_late_cancellation boolean;
begin
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.status <> 'confirmed' then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;

  select * into v_lesson
  from public.lessons
  where id = v_reservation.lesson_id
  for update;

  if not found or v_lesson.status = 'cancelled' or v_lesson.starts_at <= now() then
    raise exception 'CANCELLATION_NOT_ALLOWED';
  end if;

  v_late_cancellation := now() > v_lesson.cancel_before;
  select name into v_teacher from public.instructors where id = v_lesson.instructor_id;

  if v_late_cancellation then
    update public.reservations
    set status = 'no_show', cancelled_at = null, attended_at = null, payment_waived_at = null, updated_at = now()
    where id = v_reservation.id;
  else
    update public.reservations
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = v_reservation.id;

    update public.lessons
    set booked_count = greatest(booked_count - 1, 0)
    where id = v_lesson.id;
  end if;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'attendee_name', v_reservation.attendee_name,
    'attendee_email', v_reservation.attendee_email,
    'title', v_lesson.title,
    'starts_at', v_lesson.starts_at,
    'location', v_lesson.location,
    'teacher', v_teacher,
    'late_cancellation', v_late_cancellation
  );
end;
$$;

revoke all on function public.admin_payment_email_preview(uuid) from public, anon, authenticated;
revoke all on function public.admin_record_attendance(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.record_payment_email_result(uuid, boolean, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_cancel_reservation(uuid) from public, anon, authenticated;

grant execute on function public.admin_payment_email_preview(uuid) to service_role;
grant execute on function public.admin_record_attendance(uuid, jsonb) to service_role;
grant execute on function public.record_payment_email_result(uuid, boolean, text, text, text) to service_role;
grant execute on function public.admin_cancel_reservation(uuid) to service_role;
