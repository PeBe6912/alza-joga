alter table public.lessons
  add column if not exists payment_mode public.payment_mode,
  add column if not exists price_czk integer,
  add column if not exists payment_note text,
  add column if not exists minimum_attendance smallint not null default 5,
  add column if not exists low_attendance_confirmed_at timestamptz;

update public.lessons l
set
  payment_mode = i.payment_mode,
  price_czk = i.price_czk,
  payment_note = i.payment_note
from public.instructors i
where i.id = l.instructor_id
  and (l.payment_mode is null or l.payment_note is null);

alter table public.lessons
  alter column payment_mode set not null,
  alter column payment_note set not null;

alter table public.lessons
  drop constraint if exists lessons_payment_details_check,
  drop constraint if exists lessons_minimum_attendance_check;

alter table public.lessons
  add constraint lessons_payment_details_check check (
    (payment_mode = 'paid' and price_czk is not null and price_czk >= 0)
    or (payment_mode = 'donation' and price_czk is null)
  ),
  add constraint lessons_minimum_attendance_check check (minimum_attendance between 1 and 100);

drop function if exists public.admin_create_lessons(text, uuid, timestamptz, timestamptz, smallint, text, integer);

create function public.admin_create_lessons(
  p_title text,
  p_instructor_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity smallint,
  p_language text,
  p_repeat_count integer,
  p_payment_mode public.payment_mode,
  p_price_czk integer,
  p_payment_note text,
  p_minimum_attendance smallint default 5
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_created jsonb;
begin
  if char_length(btrim(p_title)) not between 2 and 120 then raise exception 'INVALID_TITLE'; end if;
  if p_ends_at <= p_starts_at or p_starts_at <= now() then raise exception 'INVALID_TIME'; end if;
  if p_capacity not between 1 and 100 then raise exception 'INVALID_CAPACITY'; end if;
  if p_language not in ('cs', 'en') then raise exception 'INVALID_LANGUAGE'; end if;
  if p_repeat_count not between 1 and 52 then raise exception 'INVALID_REPEAT_COUNT'; end if;
  if p_minimum_attendance not between 1 and p_capacity then raise exception 'INVALID_MINIMUM_ATTENDANCE'; end if;
  if p_payment_mode = 'paid' and (p_price_czk is null or p_price_czk < 0) then raise exception 'INVALID_PRICE'; end if;
  if p_payment_mode = 'donation' and p_price_czk is not null then raise exception 'INVALID_PRICE'; end if;
  if char_length(btrim(p_payment_note)) not between 2 and 500 then raise exception 'INVALID_PAYMENT_NOTE'; end if;
  if not exists (select 1 from public.instructors where id = p_instructor_id and active) then raise exception 'INVALID_INSTRUCTOR'; end if;
  if exists (
    select 1
    from generate_series(0, p_repeat_count - 1) as series(week_offset)
    join public.lessons l
      on l.instructor_id = p_instructor_id
     and l.starts_at = p_starts_at + make_interval(weeks => series.week_offset)
     and l.status <> 'cancelled'
  ) then
    raise exception 'LESSON_CONFLICT';
  end if;

  with inserted as (
    insert into public.lessons (
      instructor_id, title, starts_at, ends_at, cancel_before, capacity, status, language,
      payment_mode, price_czk, payment_note, minimum_attendance
    )
    select
      p_instructor_id, btrim(p_title),
      p_starts_at + make_interval(weeks => series.week_offset),
      p_ends_at + make_interval(weeks => series.week_offset),
      p_starts_at + make_interval(weeks => series.week_offset) - interval '24 hours',
      p_capacity, 'published'::public.lesson_status, p_language,
      p_payment_mode, p_price_czk, btrim(p_payment_note), p_minimum_attendance
    from generate_series(0, p_repeat_count - 1) as series(week_offset)
    returning id, starts_at
  )
  select jsonb_build_object(
    'created', count(*),
    'lesson_ids', coalesce(jsonb_agg(id order by starts_at), '[]'::jsonb)
  ) into v_created from inserted;

  return v_created;
end;
$$;

revoke all on function public.admin_create_lessons(text, uuid, timestamptz, timestamptz, smallint, text, integer, public.payment_mode, integer, text, smallint) from public, anon, authenticated;
grant execute on function public.admin_create_lessons(text, uuid, timestamptz, timestamptz, smallint, text, integer, public.payment_mode, integer, text, smallint) to service_role;

create or replace function public.admin_confirm_low_attendance(p_lesson_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lesson public.lessons%rowtype;
begin
  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_lesson.status <> 'published' or v_lesson.starts_at <= now() then raise exception 'LESSON_NOT_AVAILABLE'; end if;
  if v_lesson.booked_count >= v_lesson.minimum_attendance then raise exception 'MINIMUM_ALREADY_MET'; end if;

  update public.lessons
  set low_attendance_confirmed_at = now(), updated_at = now()
  where id = p_lesson_id;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'booked_count', v_lesson.booked_count,
    'minimum_attendance', v_lesson.minimum_attendance,
    'low_attendance_confirmed', true
  );
end;
$$;

revoke all on function public.admin_confirm_low_attendance(uuid) from public, anon, authenticated;
grant execute on function public.admin_confirm_low_attendance(uuid) to service_role;

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
  if char_length(v_name) not between 2 and 120 then raise exception using errcode = 'P0001', message = 'INVALID_NAME'; end if;
  if char_length(v_email) > 320 or position('@' in v_email) <= 1 then raise exception using errcode = 'P0001', message = 'INVALID_EMAIL'; end if;
  if p_attendee_relation not in ('employee', 'guest') then raise exception using errcode = 'P0001', message = 'INVALID_RELATION'; end if;
  if char_length(p_cancellation_token_hash) <> 64 then raise exception using errcode = 'P0001', message = 'INVALID_TOKEN'; end if;

  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found or v_lesson.status <> 'published' or v_lesson.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_AVAILABLE';
  end if;
  if v_lesson.booked_count >= v_lesson.capacity then
    raise exception using errcode = 'P0001', message = 'LESSON_FULL';
  end if;

  select * into v_instructor from public.instructors where id = v_lesson.instructor_id;
  begin
    insert into public.reservations (lesson_id, attendee_name, attendee_email, attendee_relation, cancellation_token_hash)
    values (p_lesson_id, v_name, v_email, p_attendee_relation, p_cancellation_token_hash)
    returning * into v_reservation;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'ALREADY_BOOKED';
  end;

  update public.lessons set booked_count = booked_count + 1 where id = p_lesson_id;

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
    'payment_mode', v_lesson.payment_mode,
    'price_czk', v_lesson.price_czk,
    'payment_note', v_lesson.payment_note,
    'available_spots', v_lesson.capacity - v_lesson.booked_count - 1
  );
end;
$$;

revoke all on function public.reserve_lesson(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_lesson(uuid, text, text, text, text) to service_role;

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
  select ends_at into v_ends_at from public.lessons where id = p_lesson_id and status <> 'cancelled';
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select jsonb_build_object(
    'lesson_id', l.id, 'title', l.title, 'starts_at', l.starts_at, 'ends_at', l.ends_at,
    'teacher', i.name, 'payment_mode', l.payment_mode, 'price_czk', l.price_czk,
    'payment_note', l.payment_note,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id, 'name', r.attendee_name, 'email', r.attendee_email,
      'status', r.status, 'payment_email_sent_at', r.payment_email_sent_at,
      'payment_email_recipient', r.payment_email_recipient, 'payment_email_error', r.payment_email_error
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join public.reservations r on r.lesson_id = l.id and r.status in ('confirmed', 'attended')
  where l.id = p_lesson_id
  group by l.id, i.id;
  return v_result;
end;
$$;

create or replace function public.admin_payment_email_recipients(p_lesson_id uuid, p_reservation_ids uuid[])
returns jsonb
language plpgsql
security invoker
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

revoke all on function public.admin_payment_email_preview(uuid) from public, anon, authenticated;
revoke all on function public.admin_payment_email_recipients(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_payment_email_preview(uuid) to service_role;
grant execute on function public.admin_payment_email_recipients(uuid, uuid[]) to service_role;
