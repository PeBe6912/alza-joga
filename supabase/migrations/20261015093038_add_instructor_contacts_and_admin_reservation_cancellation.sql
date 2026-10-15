create table if not exists private.instructor_contacts (
  instructor_id uuid primary key references public.instructors(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  updated_at timestamptz not null default now()
);

revoke all on table private.instructor_contacts from public, anon, authenticated;
grant select, insert, update on table private.instructor_contacts to service_role;

insert into private.instructor_contacts (instructor_id, email)
select id, case slug
  when 'daniela-stastna' then 'stastnadaniela7@gmail.com'
  when 'petr-bena' then 'pb.bena@gmail.com'
end
from public.instructors
where slug in ('daniela-stastna', 'petr-bena')
on conflict (instructor_id) do nothing;

create or replace function public.admin_instructor_contacts()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('instructor_id', instructor_id, 'email', email)
      order by instructor_id
    ),
    '[]'::jsonb
  )
  from private.instructor_contacts;
$$;

create or replace function public.admin_update_instructor_email(p_instructor_id uuid, p_email text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 320 then
    raise exception 'INVALID_EMAIL';
  end if;

  insert into private.instructor_contacts (instructor_id, email, updated_at)
  values (p_instructor_id, v_email, now())
  on conflict (instructor_id) do update
  set email = excluded.email, updated_at = now();
end;
$$;

create or replace function public.admin_payment_email_preview(p_lesson_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_ends_at timestamptz;
begin
  select ends_at into v_ends_at from public.lessons where id = p_lesson_id and status <> 'cancelled';
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select jsonb_build_object(
    'lesson_id', l.id, 'title', l.title, 'starts_at', l.starts_at, 'ends_at', l.ends_at,
    'teacher', i.name, 'instructor_email', c.email,
    'payment_mode', l.payment_mode, 'price_czk', l.price_czk,
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id, 'name', r.attendee_name, 'email', r.attendee_email,
      'status', r.status, 'payment_email_sent_at', r.payment_email_sent_at,
      'payment_email_recipient', r.payment_email_recipient, 'payment_email_error', r.payment_email_error
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join private.instructor_contacts c on c.instructor_id = i.id
  left join public.reservations r on r.lesson_id = l.id and r.status in ('confirmed', 'attended')
  where l.id = p_lesson_id
  group by l.id, i.id, c.email;
  return v_result;
end;
$$;

create or replace function public.admin_payment_email_recipients(p_lesson_id uuid, p_reservation_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_ends_at timestamptz;
begin
  if coalesce(array_length(p_reservation_ids, 1), 0) not between 1 and 100 then raise exception 'INVALID_RECIPIENTS'; end if;
  select ends_at into v_ends_at from public.lessons where id = p_lesson_id and status <> 'cancelled';
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select jsonb_build_object(
    'lesson_id', l.id, 'title', l.title, 'starts_at', l.starts_at,
    'teacher', i.name, 'instructor_email', c.email,
    'payment_mode', l.payment_mode, 'price_czk', l.price_czk,
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id, 'name', r.attendee_name, 'email', r.attendee_email
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join private.instructor_contacts c on c.instructor_id = i.id
  left join public.reservations r
    on r.lesson_id = l.id and r.id = any(p_reservation_ids)
   and r.status in ('confirmed', 'attended') and r.payment_email_sent_at is null
  where l.id = p_lesson_id
  group by l.id, i.id, c.email;
  return v_result;
end;
$$;

create or replace function public.admin_cancel_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_lesson public.lessons%rowtype;
  v_teacher text;
begin
  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.status <> 'confirmed' then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;

  select * into v_lesson
  from public.lessons
  where id = v_reservation.lesson_id
  for update;

  if not found or v_lesson.status = 'cancelled' or v_lesson.starts_at <= now() then
    raise exception 'CANCELLATION_NOT_ALLOWED';
  end if;

  select name into v_teacher from public.instructors where id = v_lesson.instructor_id;

  update public.reservations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = v_reservation.id;

  update public.lessons
  set booked_count = greatest(booked_count - 1, 0)
  where id = v_lesson.id;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'attendee_name', v_reservation.attendee_name,
    'attendee_email', v_reservation.attendee_email,
    'title', v_lesson.title,
    'starts_at', v_lesson.starts_at,
    'location', v_lesson.location,
    'teacher', v_teacher
  );
end;
$$;

revoke all on function public.admin_instructor_contacts() from public, anon, authenticated;
revoke all on function public.admin_update_instructor_email(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_payment_email_preview(uuid) from public, anon, authenticated;
revoke all on function public.admin_payment_email_recipients(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_cancel_reservation(uuid) from public, anon, authenticated;

grant execute on function public.admin_instructor_contacts() to service_role;
grant execute on function public.admin_update_instructor_email(uuid, text) to service_role;
grant execute on function public.admin_payment_email_preview(uuid) to service_role;
grant execute on function public.admin_payment_email_recipients(uuid, uuid[]) to service_role;
grant execute on function public.admin_cancel_reservation(uuid) to service_role;
