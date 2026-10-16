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
  if not found or v_lesson.status <> 'published' or v_lesson.starts_at <= now() then
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
