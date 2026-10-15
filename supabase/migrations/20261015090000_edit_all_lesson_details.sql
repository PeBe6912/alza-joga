create or replace function public.admin_update_lesson(
  p_lesson_id uuid,
  p_title text,
  p_instructor_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity smallint,
  p_language text,
  p_payment_mode public.payment_mode,
  p_price_czk integer,
  p_payment_note text,
  p_minimum_attendance smallint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lesson public.lessons%rowtype;
  v_old_instructor public.instructors%rowtype;
  v_new_instructor public.instructors%rowtype;
  v_participants jsonb;
  v_cancellation_hours integer;
begin
  select * into v_lesson
  from public.lessons
  where id = p_lesson_id
  for update;

  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_lesson.status <> 'published' or v_lesson.starts_at <= now() then raise exception 'LESSON_NOT_MANAGEABLE'; end if;
  if char_length(btrim(p_title)) not between 2 and 120 then raise exception 'INVALID_TITLE'; end if;
  if p_ends_at <= p_starts_at or p_starts_at <= now() then raise exception 'INVALID_TIME'; end if;
  if p_capacity not between 1 and 100 then raise exception 'INVALID_CAPACITY'; end if;
  if p_capacity < v_lesson.booked_count then raise exception 'LESSON_CAPACITY_TOO_SMALL'; end if;
  if p_language not in ('cs', 'en') then raise exception 'INVALID_LANGUAGE'; end if;
  if p_minimum_attendance not between 1 and p_capacity then raise exception 'INVALID_MINIMUM_ATTENDANCE'; end if;
  if p_payment_mode = 'paid' and (p_price_czk is null or p_price_czk < 0) then raise exception 'INVALID_PRICE'; end if;
  if p_payment_mode = 'donation' and p_price_czk is not null then raise exception 'INVALID_PRICE'; end if;
  if char_length(btrim(p_payment_note)) not between 2 and 500 then raise exception 'INVALID_PAYMENT_NOTE'; end if;

  select * into v_old_instructor from public.instructors where id = v_lesson.instructor_id;
  select * into v_new_instructor from public.instructors where id = p_instructor_id and active;
  if not found then raise exception 'INVALID_INSTRUCTOR'; end if;

  if exists (
    select 1
    from public.lessons l
    where l.id <> p_lesson_id
      and l.instructor_id = p_instructor_id
      and l.status <> 'cancelled'
      and tstzrange(l.starts_at, l.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'LESSON_CONFLICT';
  end if;

  if btrim(p_title) = v_lesson.title
    and p_instructor_id = v_lesson.instructor_id
    and p_starts_at = v_lesson.starts_at
    and p_ends_at = v_lesson.ends_at
    and p_capacity = v_lesson.capacity
    and p_language = v_lesson.language
    and p_payment_mode = v_lesson.payment_mode
    and p_price_czk is not distinct from v_lesson.price_czk
    and btrim(p_payment_note) = v_lesson.payment_note
    and p_minimum_attendance = v_lesson.minimum_attendance
  then
    raise exception 'LESSON_UNCHANGED';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('name', r.attendee_name, 'email', r.attendee_email) order by r.created_at),
    '[]'::jsonb
  ) into v_participants
  from public.reservations r
  where r.lesson_id = p_lesson_id and r.status = 'confirmed';

  select coalesce((value #>> '{}')::integer, 24)
  into v_cancellation_hours
  from public.site_settings
  where key = 'cancellation_hours';
  v_cancellation_hours := coalesce(v_cancellation_hours, 24);

  update public.lessons
  set instructor_id = p_instructor_id,
      title = btrim(p_title),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      cancel_before = p_starts_at - make_interval(hours => v_cancellation_hours),
      capacity = p_capacity,
      language = p_language,
      payment_mode = p_payment_mode,
      price_czk = p_price_czk,
      payment_note = btrim(p_payment_note),
      minimum_attendance = p_minimum_attendance,
      low_attendance_confirmed_at = null,
      updated_at = now()
  where id = p_lesson_id;

  return jsonb_build_object(
    'action', 'update',
    'lesson_id', p_lesson_id,
    'title', btrim(p_title),
    'location', v_lesson.location,
    'teacher', v_new_instructor.name,
    'old_title', v_lesson.title,
    'old_teacher', v_old_instructor.name,
    'old_starts_at', v_lesson.starts_at,
    'old_ends_at', v_lesson.ends_at,
    'old_language', v_lesson.language,
    'old_payment_mode', v_lesson.payment_mode,
    'old_price_czk', v_lesson.price_czk,
    'new_starts_at', p_starts_at,
    'new_ends_at', p_ends_at,
    'new_language', p_language,
    'new_payment_mode', p_payment_mode,
    'new_price_czk', p_price_czk,
    'participants', v_participants
  );
end;
$$;

revoke all on function public.admin_update_lesson(uuid, text, uuid, timestamptz, timestamptz, smallint, text, public.payment_mode, integer, text, smallint)
  from public, anon, authenticated;
grant execute on function public.admin_update_lesson(uuid, text, uuid, timestamptz, timestamptz, smallint, text, public.payment_mode, integer, text, smallint)
  to service_role;
