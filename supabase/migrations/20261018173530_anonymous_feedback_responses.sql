create or replace function public.admin_lesson_feedback_overview()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'lesson_id', overview.lesson_id,
    'title', overview.title,
    'starts_at', overview.starts_at,
    'instructor_id', overview.instructor_id,
    'teacher', overview.teacher,
    'requested', overview.requested,
    'total', overview.total,
    'ratings', overview.ratings,
    'topics', overview.topics,
    'comments', overview.comments,
    'responses', overview.responses,
    'last_response_at', overview.last_response_at
  ) order by overview.starts_at desc), '[]'::jsonb)
  from (
    select
      l.id as lesson_id,
      l.title,
      l.starts_at,
      l.instructor_id,
      i.name as teacher,
      l.feedback_requested_at is not null as requested,
      count(f.id) as total,
      jsonb_build_object(
        'great', count(f.id) filter (where f.rating = 'great'),
        'good', count(f.id) filter (where f.rating = 'good'),
        'not_right', count(f.id) filter (where f.rating = 'not_right')
      ) as ratings,
      coalesce((
        select jsonb_agg(jsonb_build_object('topic', topic, 'count', topic_count) order by topic_count desc, topic)
        from (
          select topic, count(*) as topic_count
          from public.lesson_feedback feedback_row
          cross join unnest(feedback_row.topics) topic
          where feedback_row.lesson_id = l.id
          group by topic
        ) topic_counts
      ), '[]'::jsonb) as topics,
      coalesce((
        select jsonb_agg(comment order by created_at desc)
        from public.lesson_feedback
        where lesson_id = l.id and nullif(btrim(comment), '') is not null
      ), '[]'::jsonb) as comments,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'rating', feedback_row.rating,
          'topics', feedback_row.topics,
          'comment', nullif(btrim(feedback_row.comment), '')
        ) order by feedback_row.created_at desc)
        from public.lesson_feedback feedback_row
        where feedback_row.lesson_id = l.id
      ), '[]'::jsonb) as responses,
      max(f.created_at) as last_response_at
    from public.lessons l
    join public.instructors i on i.id = l.instructor_id
    left join public.lesson_feedback f on f.lesson_id = l.id
    where l.ends_at <= now()
      and l.starts_at >= now() - interval '12 months'
      and l.feedback_requested_at is not null
    group by l.id, i.name
  ) overview;
$$;

revoke all on function public.admin_lesson_feedback_overview() from public, anon, authenticated;
grant execute on function public.admin_lesson_feedback_overview() to service_role;
