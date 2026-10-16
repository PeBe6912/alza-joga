create or replace function public.public_lesson_share(p_lesson_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'starts_at', l.starts_at,
    'ends_at', l.ends_at,
    'capacity', l.capacity,
    'booked_count', l.booked_count,
    'location', l.location,
    'language', l.language,
    'payment_mode', l.payment_mode,
    'price_czk', l.price_czk,
    'status', l.status,
    'teacher', i.name
  )
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  where l.id = p_lesson_id;
$$;

revoke all on function public.public_lesson_share(uuid) from public, anon, authenticated;
grant execute on function public.public_lesson_share(uuid) to anon, authenticated;
