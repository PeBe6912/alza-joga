create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  relation text not null check (relation in ('employee', 'guest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
revoke all on table public.user_profiles from public, anon, authenticated;
grant select, update on table public.user_profiles to authenticated;

create policy "Users can read their own profile"
on public.user_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.reservations
  add column user_id uuid references auth.users(id) on delete set null;

create index reservations_user_id_idx on public.reservations(user_id);

create table public.auth_email_requests (
  id bigint generated always as identity primary key,
  email_hash text not null check (char_length(email_hash) = 64),
  request_type text not null check (request_type in ('signup', 'recovery')),
  requested_at timestamptz not null default now()
);

alter table public.auth_email_requests enable row level security;
revoke all on table public.auth_email_requests from public, anon, authenticated;

create index auth_email_requests_lookup_idx
  on public.auth_email_requests(email_hash, request_type, requested_at desc);

create or replace function public.account_allow_auth_email(
  p_email_hash text,
  p_request_type text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(p_email_hash) <> 64 or p_request_type not in ('signup', 'recovery') then
    return false;
  end if;

  if exists (
    select 1
    from public.auth_email_requests
    where email_hash = p_email_hash
      and request_type = p_request_type
      and requested_at > now() - interval '2 minutes'
  ) then
    return false;
  end if;

  insert into public.auth_email_requests(email_hash, request_type)
  values (p_email_hash, p_request_type);

  delete from public.auth_email_requests
  where requested_at < now() - interval '7 days';

  return true;
end;
$$;

revoke all on function public.account_allow_auth_email(text, text) from public, anon, authenticated;
grant execute on function public.account_allow_auth_email(text, text) to service_role;

create function public.reserve_lesson(
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
    'payment_mode', v_lesson.payment_mode,
    'price_czk', v_lesson.price_czk,
    'payment_note', v_lesson.payment_note,
    'available_spots', v_lesson.capacity - v_lesson.booked_count - 1
  );
end;
$$;

revoke all on function public.reserve_lesson(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_lesson(uuid, text, text, text, text, uuid) to service_role;

create or replace function public.account_prepare_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_relation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_name text := btrim(p_full_name);
  v_relation text := case when p_relation = 'guest' then 'guest' else 'employee' end;
  v_claimed integer := 0;
begin
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = v_email) then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_FOUND';
  end if;

  if char_length(v_name) not between 2 and 120 then
    select attendee_name, attendee_relation
      into v_name, v_relation
    from public.reservations
    where lower(attendee_email) = v_email
    order by created_at desc
    limit 1;
  end if;

  if char_length(coalesce(v_name, '')) not between 2 and 120 then
    v_name := split_part(v_email, '@', 1);
  end if;
  if char_length(coalesce(v_name, '')) not between 2 and 120 then
    v_name := 'Uživatel';
  end if;

  insert into public.user_profiles(user_id, full_name, relation)
  values (p_user_id, v_name, v_relation)
  on conflict (user_id) do nothing;

  update public.reservations
  set user_id = p_user_id
  where user_id is null and lower(attendee_email) = v_email;
  get diagnostics v_claimed = row_count;

  return jsonb_build_object('claimed_reservations', v_claimed);
end;
$$;

revoke all on function public.account_prepare_profile(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.account_prepare_profile(uuid, text, text, text) to service_role;

create or replace function public.account_update_profile(
  p_user_id uuid,
  p_full_name text,
  p_relation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.user_profiles%rowtype;
begin
  if char_length(btrim(p_full_name)) not between 2 and 120 then
    raise exception using errcode = 'P0001', message = 'INVALID_NAME';
  end if;
  if p_relation not in ('employee', 'guest') then
    raise exception using errcode = 'P0001', message = 'INVALID_RELATION';
  end if;

  update public.user_profiles
  set full_name = btrim(p_full_name), relation = p_relation, updated_at = now()
  where user_id = p_user_id
  returning * into v_profile;

  if not found then raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_FOUND'; end if;

  return jsonb_build_object('full_name', v_profile.full_name, 'relation', v_profile.relation);
end;
$$;

revoke all on function public.account_update_profile(uuid, text, text) from public, anon, authenticated;
grant execute on function public.account_update_profile(uuid, text, text) to service_role;

create or replace function public.account_dashboard(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object('fullName', p.full_name, 'relation', p.relation)
      from public.user_profiles p where p.user_id = p_user_id
    ),
    'reservations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'title', l.title,
        'startsAt', l.starts_at,
        'endsAt', l.ends_at,
        'cancelBefore', l.cancel_before,
        'teacher', i.name,
        'location', l.location,
        'paymentMode', l.payment_mode,
        'priceCzk', l.price_czk
      ) order by l.starts_at desc)
      from public.reservations r
      join public.lessons l on l.id = r.lesson_id
      join public.instructors i on i.id = l.instructor_id
      where r.user_id = p_user_id
        and l.starts_at > now() - interval '12 months'
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.account_dashboard(uuid) from public, anon, authenticated;
grant execute on function public.account_dashboard(uuid) to service_role;

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
begin
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id and user_id = p_user_id
  for update;

  if not found then raise exception using errcode = 'P0001', message = 'RESERVATION_NOT_FOUND'; end if;

  select * into v_lesson from public.lessons where id = v_reservation.lesson_id for update;
  if v_reservation.status = 'cancelled' then
    return jsonb_build_object('already_cancelled', true, 'attendee_name', v_reservation.attendee_name,
      'attendee_email', v_reservation.attendee_email, 'title', v_lesson.title, 'starts_at', v_lesson.starts_at);
  end if;
  if v_reservation.status <> 'confirmed' then raise exception using errcode = 'P0001', message = 'CANCELLATION_NOT_ALLOWED'; end if;
  if now() > v_lesson.cancel_before then raise exception using errcode = 'P0001', message = 'CANCELLATION_DEADLINE_PASSED'; end if;

  update public.reservations set status = 'cancelled', cancelled_at = now() where id = v_reservation.id;
  update public.lessons set booked_count = greatest(booked_count - 1, 0) where id = v_lesson.id;

  return jsonb_build_object('already_cancelled', false, 'attendee_name', v_reservation.attendee_name,
    'attendee_email', v_reservation.attendee_email, 'title', v_lesson.title, 'starts_at', v_lesson.starts_at);
end;
$$;

revoke all on function public.account_cancel_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.account_cancel_reservation(uuid, uuid) to service_role;
