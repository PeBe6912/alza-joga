alter table public.instructors
  add column if not exists paid_qr_url text,
  add column if not exists donation_qr_url text;

update public.instructors
set paid_qr_url = coalesce(paid_qr_url, 'assets/qr-daniela-150.jpg')
where slug = 'daniela-stastna';

update public.instructors
set donation_qr_url = coalesce(donation_qr_url, 'assets/qr-dobry-andel.jpg')
where slug = 'petr-bena';

insert into public.site_settings (key, value, is_public)
values
  ('minimum_attendance', '5'::jsonb, true),
  ('default_paid_price', '150'::jsonb, true)
on conflict (key) do nothing;

create or replace function private.setting_integer(p_key text, p_fallback integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::integer end
     from public.site_settings where key = p_key),
    p_fallback
  );
$$;

revoke all on function private.setting_integer(text, integer) from public, anon, authenticated;

create or replace function private.set_lesson_cancel_before()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cancel_before = new.starts_at - make_interval(hours => private.setting_integer('cancellation_hours', 24));
  return new;
end;
$$;

create or replace function public.admin_update_booking_settings(
  p_cancellation_hours smallint,
  p_minimum_attendance smallint,
  p_default_paid_price integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if p_cancellation_hours not between 0 and 168 then raise exception 'INVALID_CANCELLATION_HOURS'; end if;
  if p_minimum_attendance not between 1 and 100 then raise exception 'INVALID_MINIMUM_ATTENDANCE'; end if;
  if p_default_paid_price not between 0 and 10000 then raise exception 'INVALID_DEFAULT_PRICE'; end if;

  insert into public.site_settings (key, value, is_public)
  values
    ('cancellation_hours', to_jsonb(p_cancellation_hours), true),
    ('minimum_attendance', to_jsonb(p_minimum_attendance), true),
    ('default_paid_price', to_jsonb(p_default_paid_price), true)
  on conflict (key) do update set value = excluded.value, is_public = true, updated_at = now();

  update public.lessons
  set minimum_attendance = least(p_minimum_attendance, capacity),
      cancel_before = starts_at - make_interval(hours => p_cancellation_hours),
      updated_at = now()
  where starts_at > now() and status = 'published';

  return jsonb_build_object(
    'cancellation_hours', p_cancellation_hours,
    'minimum_attendance', p_minimum_attendance,
    'default_paid_price', p_default_paid_price
  );
end;
$$;

revoke all on function public.admin_update_booking_settings(smallint, smallint, integer) from public, anon, authenticated;
grant execute on function public.admin_update_booking_settings(smallint, smallint, integer) to service_role;

create or replace function public.admin_payment_email_preview(p_lesson_id uuid)
returns jsonb
language plpgsql
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
    'teacher', i.name, 'payment_mode', l.payment_mode, 'price_czk', l.price_czk,
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
  left join public.reservations r on r.lesson_id = l.id and r.status in ('confirmed', 'attended')
  where l.id = p_lesson_id
  group by l.id, i.id;
  return v_result;
end;
$$;

create or replace function public.admin_payment_email_recipients(p_lesson_id uuid, p_reservation_ids uuid[])
returns jsonb
language plpgsql
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
    'teacher', i.name, 'payment_mode', l.payment_mode, 'price_czk', l.price_czk,
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id, 'name', r.attendee_name, 'email', r.attendee_email
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l
  join public.instructors i on i.id = l.instructor_id
  left join public.reservations r
    on r.lesson_id = l.id and r.id = any(p_reservation_ids)
   and r.status in ('confirmed', 'attended') and r.payment_email_sent_at is null
  where l.id = p_lesson_id
  group by l.id, i.id;
  return v_result;
end;
$$;

revoke all on function public.admin_payment_email_preview(uuid) from public, anon, authenticated;
revoke all on function public.admin_payment_email_recipients(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_payment_email_preview(uuid) to service_role;
grant execute on function public.admin_payment_email_recipients(uuid, uuid[]) to service_role;

update public.lessons
set cancel_before = starts_at - make_interval(hours => private.setting_integer('cancellation_hours', 24))
where starts_at > now() and status = 'published';
