alter table public.lessons
  add column if not exists language text not null default 'cs';

alter table public.lessons
  drop constraint if exists lessons_language_check;

alter table public.lessons
  add constraint lessons_language_check check (language in ('cs', 'en'));

create or replace function public.admin_create_lessons(
  p_title text,
  p_instructor_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity smallint,
  p_language text default 'cs',
  p_repeat_count integer default 1
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_created jsonb;
begin
  if char_length(btrim(p_title)) not between 2 and 120 then
    raise exception 'INVALID_TITLE';
  end if;
  if p_ends_at <= p_starts_at or p_starts_at <= now() then
    raise exception 'INVALID_TIME';
  end if;
  if p_capacity not between 1 and 100 then
    raise exception 'INVALID_CAPACITY';
  end if;
  if p_language not in ('cs', 'en') then
    raise exception 'INVALID_LANGUAGE';
  end if;
  if p_repeat_count not between 1 and 52 then
    raise exception 'INVALID_REPEAT_COUNT';
  end if;
  if not exists (
    select 1 from public.instructors
    where id = p_instructor_id and active
  ) then
    raise exception 'INVALID_INSTRUCTOR';
  end if;
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
      instructor_id,
      title,
      starts_at,
      ends_at,
      cancel_before,
      capacity,
      status,
      language
    )
    select
      p_instructor_id,
      btrim(p_title),
      p_starts_at + make_interval(weeks => series.week_offset),
      p_ends_at + make_interval(weeks => series.week_offset),
      p_starts_at + make_interval(weeks => series.week_offset) - interval '24 hours',
      p_capacity,
      'published'::public.lesson_status,
      p_language
    from generate_series(0, p_repeat_count - 1) as series(week_offset)
    returning id, starts_at
  )
  select jsonb_build_object(
    'created', count(*),
    'lesson_ids', coalesce(jsonb_agg(id order by starts_at), '[]'::jsonb)
  )
  into v_created
  from inserted;

  return v_created;
end;
$$;

revoke all on function public.admin_create_lessons(text, uuid, timestamptz, timestamptz, smallint, text, integer) from public, anon, authenticated;
grant execute on function public.admin_create_lessons(text, uuid, timestamptz, timestamptz, smallint, text, integer) to service_role;
