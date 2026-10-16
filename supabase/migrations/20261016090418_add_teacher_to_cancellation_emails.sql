create or replace function public.cancel_reservation(p_cancellation_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_lesson public.lessons%rowtype;
  v_teacher text;
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

  select name into v_teacher
  from public.instructors
  where id = v_lesson.instructor_id;

  if v_reservation.status = 'cancelled' then
    return jsonb_build_object(
      'already_cancelled', true,
      'attendee_name', v_reservation.attendee_name,
      'attendee_email', v_reservation.attendee_email,
      'title', v_lesson.title,
      'starts_at', v_lesson.starts_at,
      'teacher', v_teacher
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
    'starts_at', v_lesson.starts_at,
    'teacher', v_teacher
  );
end;
$$;

revoke all on function public.cancel_reservation(text) from public, anon, authenticated;
grant execute on function public.cancel_reservation(text) to service_role;

create or replace function public.account_cancel_reservation(
  p_user_id uuid,
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_lesson public.lessons%rowtype;
  v_teacher text;
begin
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id and user_id = p_user_id
  for update;

  if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_NOT_FOUND'; end if;

  select * into v_lesson from public.lessons where id = v_reservation.lesson_id for update;
  select name into v_teacher from public.instructors where id = v_lesson.instructor_id;

  if v_reservation.status = 'cancelled' then
    return jsonb_build_object('already_cancelled', true, 'attendee_name', v_reservation.attendee_name,
      'attendee_email', v_reservation.attendee_email, 'title', v_lesson.title, 'starts_at', v_lesson.starts_at,
      'teacher', v_teacher);
  end if;
  if v_reservation.status <> 'confirmed' then raise exception using errcode = 'P0001', message = 'CANCELLATION_NOT_ALLOWED'; end if;
  if now() > v_lesson.cancel_before then raise exception using errcode = 'P0001', message = 'CANCELLATION_DEADLINE_PASSED'; end if;

  update public.reservations set status = 'cancelled', cancelled_at = now() where id = v_reservation.id;
  update public.lessons set booked_count = greatest(booked_count - 1, 0) where id = v_lesson.id;

  return jsonb_build_object('already_cancelled', false, 'attendee_name', v_reservation.attendee_name,
    'attendee_email', v_reservation.attendee_email, 'title', v_lesson.title, 'starts_at', v_lesson.starts_at,
    'teacher', v_teacher);
end;
$$;

revoke all on function public.account_cancel_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.account_cancel_reservation(uuid, uuid) to service_role;
