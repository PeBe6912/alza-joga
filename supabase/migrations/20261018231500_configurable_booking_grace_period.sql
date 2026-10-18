insert into public.site_settings (key, value, is_public)
values ('booking_grace_minutes', '15'::jsonb, true)
on conflict (key) do nothing;

drop function if exists public.admin_update_booking_settings(smallint, smallint, integer, smallint);

create function public.admin_update_booking_settings(
  p_cancellation_hours smallint,
  p_booking_grace_minutes smallint,
  p_minimum_attendance smallint,
  p_default_paid_price integer,
  p_studio_capacity smallint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_lessons integer;
begin
  if p_cancellation_hours not between 0 and 168 then raise exception 'INVALID_CANCELLATION_HOURS'; end if;
  if p_booking_grace_minutes not between 0 and 60 then raise exception 'INVALID_BOOKING_GRACE_MINUTES'; end if;
  if p_studio_capacity not between 1 and 100 then raise exception 'INVALID_STUDIO_CAPACITY'; end if;
  if p_minimum_attendance not between 1 and p_studio_capacity then raise exception 'INVALID_MINIMUM_ATTENDANCE'; end if;
  if p_default_paid_price not between 0 and 10000 then raise exception 'INVALID_DEFAULT_PRICE'; end if;

  perform 1
  from public.lessons
  where starts_at > now() and status = 'published'
  for update;

  if exists (
    select 1
    from public.lessons
    where starts_at > now()
      and status = 'published'
      and booked_count > p_studio_capacity
  ) then
    raise exception 'LESSON_CAPACITY_TOO_SMALL';
  end if;

  insert into public.site_settings (key, value, is_public)
  values
    ('studio_capacity', to_jsonb(p_studio_capacity), true),
    ('cancellation_hours', to_jsonb(p_cancellation_hours), true),
    ('booking_grace_minutes', to_jsonb(p_booking_grace_minutes), true),
    ('minimum_attendance', to_jsonb(p_minimum_attendance), true),
    ('default_paid_price', to_jsonb(p_default_paid_price), true)
  on conflict (key) do update
  set value = excluded.value,
      is_public = true,
      updated_at = now();

  update public.lessons
  set capacity = p_studio_capacity,
      minimum_attendance = least(p_minimum_attendance, p_studio_capacity),
      cancel_before = starts_at - make_interval(hours => p_cancellation_hours),
      updated_at = now()
  where starts_at > now() and status = 'published';

  get diagnostics v_updated_lessons = row_count;

  return jsonb_build_object(
    'studio_capacity', p_studio_capacity,
    'cancellation_hours', p_cancellation_hours,
    'booking_grace_minutes', p_booking_grace_minutes,
    'minimum_attendance', p_minimum_attendance,
    'default_paid_price', p_default_paid_price,
    'updated_lessons', v_updated_lessons
  );
end;
$$;

revoke all on function public.admin_update_booking_settings(smallint, smallint, smallint, integer, smallint) from public, anon, authenticated;
grant execute on function public.admin_update_booking_settings(smallint, smallint, smallint, integer, smallint) to service_role;

create or replace function public.reserve_lesson(
  p_lesson_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_relation text,
  p_cancellation_token_hash text,
  p_user_id uuid default null
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
  if p_user_id is not null and not exists (select 1 from auth.users where id = p_user_id and lower(email) = v_email) then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_EMAIL_MISMATCH';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found or v_lesson.status <> 'published'
    or v_lesson.starts_at + make_interval(mins => private.setting_integer('booking_grace_minutes', 15)) < now()
  then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_AVAILABLE';
  end if;
  if v_lesson.booked_count >= v_lesson.capacity then
    raise exception using errcode = 'P0001', message = 'LESSON_FULL';
  end if;

  select * into v_instructor from public.instructors where id = v_lesson.instructor_id;
  begin
    insert into public.reservations (
      lesson_id, attendee_name, attendee_email, attendee_relation,
      cancellation_token_hash, user_id
    ) values (
      p_lesson_id, v_name, v_email, p_attendee_relation,
      p_cancellation_token_hash, p_user_id
    ) returning * into v_reservation;
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
    'language', v_lesson.language,
    'payment_mode', v_lesson.payment_mode,
    'price_czk', v_lesson.price_czk,
    'payment_note', v_lesson.payment_note,
    'available_spots', v_lesson.capacity - v_lesson.booked_count - 1
  );
end;
$$;

revoke all on function public.reserve_lesson(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_lesson(uuid, text, text, text, text, uuid) to service_role;
