alter table public.reservations
  alter column attendee_email drop not null;

create or replace function public.admin_add_walk_in(
  p_lesson_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_relation text,
  p_cancellation_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_attendee_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_attendee_email, ''))), '');
  v_capacity integer;
  v_participant_count integer;
  v_reservation_id uuid;
  v_ends_at timestamptz;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'INVALID_ATTENDEE_NAME';
  end if;
  if v_email is not null and (
    char_length(v_email) > 320
    or position('@' in v_email) <= 1
    or position('.' in split_part(v_email, '@', 2)) <= 0
  ) then
    raise exception 'INVALID_EMAIL';
  end if;
  if p_attendee_relation not in ('employee', 'guest') then
    raise exception 'INVALID_ATTENDEE_RELATION';
  end if;
  if p_cancellation_token_hash is null or char_length(p_cancellation_token_hash) <> 64 then
    raise exception 'INVALID_CANCELLATION_TOKEN';
  end if;

  select ends_at, capacity into v_ends_at, v_capacity
  from public.lessons
  where id = p_lesson_id and status <> 'cancelled'
  for update;

  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  if exists (
    select 1
    from public.reservations
    where lesson_id = p_lesson_id
      and status in ('confirmed', 'attended', 'no_show')
      and (
        (v_email is not null and attendee_email = v_email)
        or (v_email is null and attendee_email is null and lower(btrim(attendee_name)) = lower(v_name))
      )
  ) then
    raise exception 'WALK_IN_EXISTS';
  end if;

  insert into public.reservations (
    lesson_id,
    attendee_name,
    attendee_email,
    attendee_relation,
    status,
    attended_at,
    cancellation_token_hash
  ) values (
    p_lesson_id,
    v_name,
    v_email,
    p_attendee_relation,
    'attended',
    now(),
    p_cancellation_token_hash
  )
  returning id into v_reservation_id;

  select count(*) into v_participant_count
  from public.reservations
  where lesson_id = p_lesson_id
    and status in ('confirmed', 'attended', 'no_show');

  return jsonb_build_object(
    'reservation_id', v_reservation_id,
    'attendee_name', v_name,
    'attendee_email', v_email,
    'participant_count', v_participant_count,
    'capacity', v_capacity,
    'over_capacity', v_participant_count > v_capacity
  );
end;
$$;

revoke all on function public.admin_add_walk_in(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_add_walk_in(uuid, text, text, text, text) to service_role;
