alter table public.lessons
  add column booked_count smallint not null default 0
  check (booked_count between 0 and capacity);

alter table public.reservations
  add column attendee_relation text not null default 'employee'
    check (attendee_relation in ('employee', 'guest')),
  add column confirmation_email_sent_at timestamptz,
  add column confirmation_email_message_id text,
  add column confirmation_email_error text;

create or replace function public.reserve_lesson(
  p_lesson_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_relation text,
  p_cancellation_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons%rowtype;
  v_reservation public.reservations%rowtype;
  v_instructor public.instructors%rowtype;
  v_name text := btrim(p_attendee_name);
  v_email text := lower(btrim(p_attendee_email));
begin
  if char_length(v_name) not between 2 and 120 then
    raise exception using errcode = 'P0001', message = 'INVALID_NAME';
  end if;

  if char_length(v_email) > 320 or position('@' in v_email) <= 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL';
  end if;

  if p_attendee_relation not in ('employee', 'guest') then
    raise exception using errcode = 'P0001', message = 'INVALID_RELATION';
  end if;

  if char_length(p_cancellation_token_hash) <> 64 then
    raise exception using errcode = 'P0001', message = 'INVALID_TOKEN';
  end if;

  select * into v_lesson
  from public.lessons
  where id = p_lesson_id
  for update;

  if not found or v_lesson.status <> 'published' or v_lesson.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_AVAILABLE';
  end if;

  if v_lesson.booked_count >= v_lesson.capacity then
    raise exception using errcode = 'P0001', message = 'LESSON_FULL';
  end if;

  select * into v_instructor
  from public.instructors
  where id = v_lesson.instructor_id;

  begin
    insert into public.reservations (
      lesson_id,
      attendee_name,
      attendee_email,
      attendee_relation,
      cancellation_token_hash
    ) values (
      p_lesson_id,
      v_name,
      v_email,
      p_attendee_relation,
      p_cancellation_token_hash
    )
    returning * into v_reservation;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'ALREADY_BOOKED';
  end;

  update public.lessons
  set booked_count = booked_count + 1
  where id = p_lesson_id;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'attendee_name', v_reservation.attendee_name,
    'attendee_email', v_reservation.attendee_email,
    'lesson_id', v_lesson.id,
    'title', v_lesson.title,
    'starts_at', v_lesson.starts_at,
    'ends_at', v_lesson.ends_at,
    'cancel_before', v_lesson.cancel_before,
    'location', v_lesson.location,
    'teacher', v_instructor.name,
    'payment_mode', v_instructor.payment_mode,
    'price_czk', v_instructor.price_czk,
    'payment_note', v_instructor.payment_note,
    'available_spots', v_lesson.capacity - v_lesson.booked_count - 1
  );
end;
$$;

revoke all on function public.reserve_lesson(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_lesson(uuid, text, text, text, text) to service_role;

create or replace function public.cancel_reservation(p_cancellation_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_lesson public.lessons%rowtype;
begin
  select * into v_reservation
  from public.reservations
  where cancellation_token_hash = p_cancellation_token_hash
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'RESERVATION_NOT_FOUND';
  end if;

  select * into v_lesson
  from public.lessons
  where id = v_reservation.lesson_id
  for update;

  if v_reservation.status = 'cancelled' then
    return jsonb_build_object(
      'already_cancelled', true,
      'attendee_name', v_reservation.attendee_name,
      'attendee_email', v_reservation.attendee_email,
      'title', v_lesson.title,
      'starts_at', v_lesson.starts_at
    );
  end if;

  if v_reservation.status <> 'confirmed' then
    raise exception using errcode = 'P0001', message = 'CANCELLATION_NOT_ALLOWED';
  end if;

  if now() > v_lesson.cancel_before then
    raise exception using errcode = 'P0001', message = 'CANCELLATION_DEADLINE_PASSED';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where id = v_reservation.id;

  update public.lessons
  set booked_count = greatest(booked_count - 1, 0)
  where id = v_lesson.id;

  return jsonb_build_object(
    'already_cancelled', false,
    'attendee_name', v_reservation.attendee_name,
    'attendee_email', v_reservation.attendee_email,
    'title', v_lesson.title,
    'starts_at', v_lesson.starts_at
  );
end;
$$;

revoke all on function public.cancel_reservation(text) from public, anon, authenticated;
grant execute on function public.cancel_reservation(text) to service_role;

insert into public.lessons (
  instructor_id,
  title,
  description,
  starts_at,
  ends_at,
  cancel_before,
  capacity,
  status
)
select i.id, l.title, l.description, l.starts_at, l.ends_at,
  l.starts_at - interval '24 hours', 20, 'published'::public.lesson_status
from public.instructors i
join (values
  ('daniela-stastna', 'Ranní flow', 'Klidný start dne.', '2026-10-20 08:00:00+02'::timestamptz, '2026-10-20 09:00:00+02'::timestamptz),
  ('daniela-stastna', 'Polední restart', 'Protažení a nový dech uprostřed dne.', '2026-10-20 12:00:00+02'::timestamptz, '2026-10-20 13:00:00+02'::timestamptz),
  ('petr-bena', 'Strong slow flow', 'Silná, pomalá a soustředěná flow.', '2026-10-22 16:45:00+02'::timestamptz, '2026-10-22 17:45:00+02'::timestamptz),
  ('daniela-stastna', 'Ranní flow', 'Klidný start dne.', '2026-10-27 08:00:00+01'::timestamptz, '2026-10-27 09:00:00+01'::timestamptz)
) as l(instructor_slug, title, description, starts_at, ends_at)
  on i.slug = l.instructor_slug
where not exists (
  select 1 from public.lessons existing
  where existing.instructor_id = i.id
    and existing.starts_at = l.starts_at
);
