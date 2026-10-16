create or replace function private.enforce_studio_capacity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_studio_capacity integer;
begin
  v_studio_capacity := private.setting_integer('studio_capacity', 20);
  if new.capacity > v_studio_capacity then
    raise exception using errcode = 'P0001', message = 'INVALID_CAPACITY_OVER_STUDIO_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_enforce_studio_capacity on public.lessons;
create trigger lessons_enforce_studio_capacity
before insert or update of capacity on public.lessons
for each row execute function private.enforce_studio_capacity();

drop function if exists public.admin_update_booking_settings(smallint, smallint, integer);

create function public.admin_update_booking_settings(
  p_cancellation_hours smallint,
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
    'minimum_attendance', p_minimum_attendance,
    'default_paid_price', p_default_paid_price,
    'updated_lessons', v_updated_lessons
  );
end;
$$;

revoke all on function private.enforce_studio_capacity() from public, anon, authenticated;
revoke all on function public.admin_update_booking_settings(smallint, smallint, integer, smallint) from public, anon, authenticated;
grant execute on function public.admin_update_booking_settings(smallint, smallint, integer, smallint) to service_role;
