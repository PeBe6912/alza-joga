-- A late cancellation retains its payment/attendance record but releases its seat.
-- CREATE OR REPLACE below preserves the existing RPC signature and grants.
set local lock_timeout = '5s';
set local statement_timeout = '20s';

do $$
declare
  v_definition text;
  v_old text := E'    update public.lessons\n    set booked_count = greatest(booked_count - 1, 0)\n    where id = v_lesson.id;\n  end if;';
  v_new text := E'  end if;\n\n  update public.lessons\n  set booked_count = greatest(booked_count - 1, 0)\n  where id = v_lesson.id;';
begin
  v_definition := pg_get_functiondef('public.admin_cancel_reservation(uuid)'::regprocedure);
  if position('late_cancelled_at = now()' in v_definition) = 0
     or position(v_old in v_definition) = 0 then
    raise exception 'Unexpected admin_cancel_reservation definition; review before applying';
  end if;
  execute replace(v_definition, v_old, v_new);
end;
$$;

-- Repair only still-open lessons with explicitly recorded late cancellations.
-- Lock the lesson first, as booking does, so a concurrent reservation is not lost.
do $$
declare
  v_lesson record;
  v_active integer;
begin
  for v_lesson in
    select l.id
    from public.lessons l
    where l.ends_at > now() and l.status <> 'cancelled'
      and exists (
        select 1 from public.reservations r
        where r.lesson_id = l.id and r.status = 'no_show'
          and r.late_cancelled_at is not null
      )
    order by l.id
    for update of l
  loop
    select count(*) into v_active
    from public.reservations
    where lesson_id = v_lesson.id
      and status in ('confirmed', 'attended', 'no_show')
      and late_cancelled_at is null;

    update public.lessons set booked_count = v_active where id = v_lesson.id;
  end loop;
end;
$$;
