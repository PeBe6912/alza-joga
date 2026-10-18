alter table public.lessons
  add column if not exists feedback_requested_at timestamptz;

alter table public.reservations
  add column if not exists feedback_token uuid not null default gen_random_uuid();

create unique index if not exists reservations_feedback_token_idx
  on public.reservations (feedback_token);

create table if not exists public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  rating text not null check (rating in ('great', 'good', 'not_right')),
  topics text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_feedback_comment_length check (char_length(coalesce(comment, '')) <= 1500),
  constraint lesson_feedback_topics_count check (cardinality(topics) <= 7)
);

create index if not exists lesson_feedback_lesson_created_idx
  on public.lesson_feedback (lesson_id, created_at);

alter table public.lesson_feedback enable row level security;
revoke all on table public.lesson_feedback from public, anon, authenticated;
grant all on table public.lesson_feedback to service_role;

create or replace function public.admin_lesson_feedback_summary(p_lesson_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'requested', l.feedback_requested_at is not null,
    'total', count(f.id),
    'ratings', jsonb_build_object(
      'great', count(f.id) filter (where f.rating = 'great'),
      'good', count(f.id) filter (where f.rating = 'good'),
      'not_right', count(f.id) filter (where f.rating = 'not_right')
    ),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('topic', topic, 'count', topic_count) order by topic_count desc, topic)
      from (
        select topic, count(*) as topic_count
        from public.lesson_feedback feedback_row
        cross join unnest(feedback_row.topics) topic
        where feedback_row.lesson_id = l.id
        group by topic
      ) topic_counts
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(comment order by created_at desc)
      from public.lesson_feedback
      where lesson_id = l.id and nullif(btrim(comment), '') is not null
    ), '[]'::jsonb)
  )
  from public.lessons l
  left join public.lesson_feedback f on f.lesson_id = l.id
  where l.id = p_lesson_id
  group by l.id;
$$;

create or replace function public.feedback_form(p_token uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'title', l.title,
    'starts_at', l.starts_at,
    'teacher', i.name,
    'submitted', f.id is not null,
    'rating', f.rating,
    'topics', coalesce(to_jsonb(f.topics), '[]'::jsonb),
    'comment', f.comment
  ) into v_result
  from public.reservations r
  join public.lessons l on l.id = r.lesson_id
  join public.instructors i on i.id = l.instructor_id
  left join public.lesson_feedback f on f.reservation_id = r.id
  where r.feedback_token = p_token
    and r.status = 'attended'
    and l.feedback_requested_at is not null
    and l.ends_at <= now()
    and l.ends_at >= now() - interval '30 days';

  if v_result is null then raise exception 'FEEDBACK_NOT_AVAILABLE'; end if;
  return v_result;
end;
$$;

create or replace function public.submit_lesson_feedback(
  p_token uuid,
  p_rating text,
  p_topics text[],
  p_comment text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation_id uuid;
  v_lesson_id uuid;
  v_allowed_topics constant text[] := array['Tempo lekce', 'Náročnost', 'Vysvětlení pozic', 'Skladba lekce', 'Atmosféra', 'Hudba', 'Organizace'];
begin
  if p_rating not in ('great', 'good', 'not_right')
     or cardinality(coalesce(p_topics, '{}'::text[])) > 7
     or exists (select 1 from unnest(coalesce(p_topics, '{}'::text[])) topic where not (topic = any(v_allowed_topics)))
     or char_length(coalesce(p_comment, '')) > 1500 then
    raise exception 'INVALID_FEEDBACK';
  end if;

  select r.id, r.lesson_id into v_reservation_id, v_lesson_id
  from public.reservations r
  join public.lessons l on l.id = r.lesson_id
  where r.feedback_token = p_token
    and r.status = 'attended'
    and l.feedback_requested_at is not null
    and l.ends_at <= now()
    and l.ends_at >= now() - interval '30 days'
  for update of r;

  if not found then raise exception 'FEEDBACK_NOT_AVAILABLE'; end if;

  insert into public.lesson_feedback (lesson_id, reservation_id, rating, topics, comment)
  values (v_lesson_id, v_reservation_id, p_rating, coalesce(p_topics, '{}'::text[]), nullif(btrim(p_comment), ''))
  on conflict (reservation_id) do update set
    rating = excluded.rating,
    topics = excluded.topics,
    comment = excluded.comment,
    updated_at = now();

  return jsonb_build_object('submitted', true);
end;
$$;

create or replace function public.admin_record_attendance(
  p_lesson_id uuid,
  p_attendance jsonb,
  p_feedback_requested boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active_count integer;
  v_received_count integer;
  v_result jsonb;
  v_ends_at timestamptz;
begin
  if p_attendance is null or jsonb_typeof(p_attendance) <> 'array' or jsonb_array_length(p_attendance) > 100 then
    raise exception 'INVALID_ATTENDANCE';
  end if;

  select ends_at into v_ends_at from public.lessons
  where id = p_lesson_id and status <> 'cancelled' for update;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_ends_at > now() then raise exception 'LESSON_NOT_ENDED'; end if;

  select count(*) into v_active_count from public.reservations
  where lesson_id = p_lesson_id and status in ('confirmed', 'attended', 'no_show');

  with submitted as (
    select (item->>'reservation_id')::uuid as reservation_id, item->>'outcome' as outcome
    from jsonb_array_elements(p_attendance) item
  )
  select count(distinct reservation_id) into v_received_count from submitted
  where outcome in ('attended', 'no_show', 'waived');

  if jsonb_array_length(p_attendance) <> v_active_count or v_received_count <> v_active_count or exists (
    select 1 from jsonb_array_elements(p_attendance) item
    left join public.reservations r on r.id = (item->>'reservation_id')::uuid
      and r.lesson_id = p_lesson_id and r.status in ('confirmed', 'attended', 'no_show')
    where r.id is null or item->>'outcome' not in ('attended', 'no_show', 'waived')
  ) then raise exception 'INVALID_ATTENDANCE'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_attendance) item
    join public.reservations r on r.id = (item->>'reservation_id')::uuid
    where item->>'outcome' = 'waived' and r.payment_email_sent_at is not null
  ) then raise exception 'PAYMENT_ALREADY_SENT'; end if;

  with submitted as (
    select (item->>'reservation_id')::uuid as reservation_id, item->>'outcome' as outcome
    from jsonb_array_elements(p_attendance) item
  )
  update public.reservations r set
    status = case when s.outcome = 'attended' then 'attended'::public.reservation_status else 'no_show'::public.reservation_status end,
    attended_at = case when s.outcome = 'attended' then coalesce(r.attended_at, now()) else null end,
    payment_waived_at = case when s.outcome = 'waived' then coalesce(r.payment_waived_at, now()) else null end,
    updated_at = now()
  from submitted s where r.id = s.reservation_id;

  update public.lessons set feedback_requested_at = case when p_feedback_requested then coalesce(feedback_requested_at, now()) else null end
  where id = p_lesson_id;

  select jsonb_build_object(
    'lesson_id', l.id, 'title', l.title, 'starts_at', l.starts_at, 'ends_at', l.ends_at,
    'teacher', i.name, 'instructor_email', c.email, 'payment_mode', l.payment_mode,
    'price_czk', l.price_czk, 'cancellation_hours', private.setting_integer('cancellation_hours', 24),
    'payment_note', l.payment_note,
    'payment_qr_url', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end,
    'feedback_requested', l.feedback_requested_at is not null,
    'participants', coalesce(jsonb_agg(jsonb_build_object(
      'reservation_id', r.id, 'name', r.attendee_name, 'email', r.attendee_email,
      'status', r.status, 'feedback_token', r.feedback_token,
      'payment_waived_at', r.payment_waived_at, 'payment_email_sent_at', r.payment_email_sent_at,
      'payment_email_recipient', r.payment_email_recipient, 'payment_email_error', r.payment_email_error
    ) order by r.attendee_name, r.created_at) filter (where r.id is not null), '[]'::jsonb)
  ) into v_result
  from public.lessons l join public.instructors i on i.id = l.instructor_id
  left join private.instructor_contacts c on c.instructor_id = i.id
  left join public.reservations r on r.lesson_id = l.id and r.status in ('attended', 'no_show')
  where l.id = p_lesson_id group by l.id, i.id, c.email;

  return v_result;
end;
$$;

revoke all on function public.admin_lesson_feedback_summary(uuid) from public, anon, authenticated;
revoke all on function public.feedback_form(uuid) from public, anon, authenticated;
revoke all on function public.submit_lesson_feedback(uuid, text, text[], text) from public, anon, authenticated;
revoke all on function public.admin_record_attendance(uuid, jsonb, boolean) from public, anon, authenticated;

grant execute on function public.admin_lesson_feedback_summary(uuid) to service_role;
grant execute on function public.feedback_form(uuid) to service_role;
grant execute on function public.submit_lesson_feedback(uuid, text, text[], text) to service_role;
grant execute on function public.admin_record_attendance(uuid, jsonb, boolean) to service_role;
