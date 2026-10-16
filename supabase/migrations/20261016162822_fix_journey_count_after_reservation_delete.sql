create or replace function private.sync_participant_journey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_user_id uuid := case when tg_op in ('UPDATE', 'DELETE') then old.user_id else null end;
  v_new_user_id uuid := case when tg_op in ('INSERT', 'UPDATE') then new.user_id else null end;
begin
  if v_old_user_id is not null then
    insert into public.participant_journeys(user_id, attended_count)
    values (
      v_old_user_id,
      (
        select count(*)::integer
        from public.reservations r
        where r.user_id = v_old_user_id
          and r.status = 'attended'
      )
    )
    on conflict (user_id) do update
      set attended_count = excluded.attended_count,
          updated_at = now();
  end if;

  if v_new_user_id is not null and v_new_user_id is distinct from v_old_user_id then
    insert into public.participant_journeys(user_id, attended_count)
    values (
      v_new_user_id,
      (
        select count(*)::integer
        from public.reservations r
        where r.user_id = v_new_user_id
          and r.status = 'attended'
      )
    )
    on conflict (user_id) do update
      set attended_count = excluded.attended_count,
          updated_at = now();
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_participant_journey() from public, anon, authenticated;

drop trigger if exists reservations_sync_participant_journey on public.reservations;
create trigger reservations_sync_participant_journey
after insert or delete or update of status, user_id on public.reservations
for each row execute function private.sync_participant_journey();

update public.participant_journeys j
set attended_count = (
      select count(*)::integer
      from public.reservations r
      where r.user_id = j.user_id
        and r.status = 'attended'
    ),
    updated_at = now()
where j.attended_count is distinct from (
  select count(*)::integer
  from public.reservations r
  where r.user_id = j.user_id
    and r.status = 'attended'
);
