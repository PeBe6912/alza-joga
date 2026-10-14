create extension if not exists pg_cron;

create or replace function public.cleanup_inactive_reservations()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  with inactive_attendees as (
    select r.attendee_email
    from public.reservations r
    join public.lessons l on l.id = r.lesson_id
    group by r.attendee_email
    having max(l.starts_at) < now() - interval '12 months'
  )
  delete from public.reservations r
  using inactive_attendees inactive
  where r.attendee_email = inactive.attendee_email;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_inactive_reservations() from public, anon, authenticated;
grant execute on function public.cleanup_inactive_reservations() to postgres;

select cron.schedule(
  'joga-retention-cleanup',
  '17 3 * * *',
  'select public.cleanup_inactive_reservations();'
);
