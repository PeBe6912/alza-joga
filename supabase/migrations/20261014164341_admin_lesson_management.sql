create or replace function public.admin_change_lesson(
  p_lesson_id uuid,
  p_action text,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons%rowtype;
  v_instructor public.instructors%rowtype;
  v_participants jsonb;
  v_old_starts_at timestamptz;
  v_old_ends_at timestamptz;
begin
  if p_action not in ('reschedule', 'cancel') then
    raise exception using errcode = 'P0001', message = 'INVALID_ACTION';
  end if;

  select * into v_lesson
  from public.lessons
  where id = p_lesson_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_FOUND';
  end if;

  if v_lesson.status <> 'published' or v_lesson.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_MANAGEABLE';
  end if;

  select * into v_instructor
  from public.instructors
  where id = v_lesson.instructor_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', r.attendee_name,
        'email', r.attendee_email
      ) order by r.created_at
    ),
    '[]'::jsonb
  ) into v_participants
  from public.reservations r
  where r.lesson_id = p_lesson_id
    and r.status = 'confirmed';

  v_old_starts_at := v_lesson.starts_at;
  v_old_ends_at := v_lesson.ends_at;

  if p_action = 'reschedule' then
    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_starts_at <= now() then
      raise exception using errcode = 'P0001', message = 'INVALID_LESSON_TIME';
    end if;

    if p_starts_at = v_lesson.starts_at and p_ends_at = v_lesson.ends_at then
      raise exception using errcode = 'P0001', message = 'LESSON_TIME_UNCHANGED';
    end if;

    update public.lessons
    set starts_at = p_starts_at,
        ends_at = p_ends_at
    where id = p_lesson_id
    returning * into v_lesson;
  else
    update public.lessons
    set status = 'cancelled',
        booked_count = 0
    where id = p_lesson_id
    returning * into v_lesson;

    update public.reservations
    set status = 'cancelled',
        cancelled_at = now()
    where lesson_id = p_lesson_id
      and status = 'confirmed';
  end if;

  return jsonb_build_object(
    'action', p_action,
    'lesson_id', v_lesson.id,
    'title', v_lesson.title,
    'location', v_lesson.location,
    'teacher', v_instructor.name,
    'old_starts_at', v_old_starts_at,
    'old_ends_at', v_old_ends_at,
    'new_starts_at', v_lesson.starts_at,
    'new_ends_at', v_lesson.ends_at,
    'participants', v_participants
  );
end;
$$;

revoke all on function public.admin_change_lesson(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_change_lesson(uuid, text, timestamptz, timestamptz)
  to service_role;
