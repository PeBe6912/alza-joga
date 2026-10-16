create table public.participant_journeys (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  attended_count integer not null default 0 check (attended_count >= 0),
  public_display_name text check (
    public_display_name is null
    or char_length(btrim(public_display_name)) between 2 and 40
  ),
  leaderboard_opt_in boolean not null default false,
  last_milestone_seen integer not null default 0 check (last_milestone_seen >= 0),
  updated_at timestamptz not null default now(),
  constraint public_name_required_for_leaderboard check (
    not leaderboard_opt_in or public_display_name is not null
  )
);

alter table public.participant_journeys enable row level security;
revoke all on table public.participant_journeys from public, anon, authenticated;

insert into public.participant_journeys(user_id, attended_count)
select p.user_id, count(r.id)::integer
from public.user_profiles p
left join public.reservations r
  on r.user_id = p.user_id and r.status = 'attended'
group by p.user_id;

create or replace function private.sync_participant_journey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is not null
    and old.status = 'attended'
    and (new.user_id is distinct from old.user_id or new.status <> 'attended') then
    update public.participant_journeys
    set attended_count = greatest(attended_count - 1, 0), updated_at = now()
    where user_id = old.user_id;
  end if;

  if new.user_id is not null
    and new.status = 'attended'
    and (old.user_id is distinct from new.user_id or old.status <> 'attended') then
    insert into public.participant_journeys(user_id, attended_count)
    values (new.user_id, 1)
    on conflict (user_id) do update
      set attended_count = public.participant_journeys.attended_count + 1,
          updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function private.sync_participant_journey() from public, anon, authenticated;

create trigger reservations_sync_participant_journey
after update of status, user_id on public.reservations
for each row execute function private.sync_participant_journey();

create or replace function public.account_update_journey(
  p_public_display_name text,
  p_leaderboard_opt_in boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(btrim(p_public_display_name), '');
  v_journey public.participant_journeys%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_FOUND';
  end if;
  if not exists (select 1 from public.user_profiles where user_id = v_user_id) then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_FOUND';
  end if;
  if v_name is not null and char_length(v_name) not between 2 and 40 then
    raise exception using errcode = 'P0001', message = 'INVALID_PUBLIC_NAME';
  end if;
  if p_leaderboard_opt_in and v_name is null then
    raise exception using errcode = 'P0001', message = 'PUBLIC_NAME_REQUIRED';
  end if;

  insert into public.participant_journeys(user_id, public_display_name, leaderboard_opt_in)
  values (v_user_id, v_name, p_leaderboard_opt_in)
  on conflict (user_id) do update
    set public_display_name = excluded.public_display_name,
        leaderboard_opt_in = excluded.leaderboard_opt_in,
        updated_at = now()
  returning * into v_journey;

  return jsonb_build_object(
    'publicDisplayName', v_journey.public_display_name,
    'leaderboardOptIn', v_journey.leaderboard_opt_in
  );
end;
$$;

create or replace function public.account_mark_milestone_seen(p_milestone integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_milestone < 0 then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_NOT_FOUND';
  end if;

  insert into public.participant_journeys(user_id, last_milestone_seen)
  values (v_user_id, p_milestone)
  on conflict (user_id) do update
    set last_milestone_seen = greatest(public.participant_journeys.last_milestone_seen, excluded.last_milestone_seen),
        updated_at = now();
end;
$$;

create or replace function public.public_journey_leaderboard()
returns table (
  "position" bigint,
  display_name text,
  attended_count integer
)
language sql
security definer
set search_path = ''
stable
as $$
  with ranked as (
    select
      dense_rank() over (order by j.attended_count desc) as position,
      j.public_display_name as display_name,
      j.attended_count
    from public.participant_journeys j
    where j.leaderboard_opt_in
      and j.public_display_name is not null
      and j.attended_count > 0
  )
  select ranked.position, ranked.display_name, ranked.attended_count
  from ranked
  order by ranked.attended_count desc, ranked.display_name asc
  limit 20;
$$;

revoke all on function public.account_update_journey(text, boolean) from public, anon, authenticated;
revoke all on function public.account_mark_milestone_seen(integer) from public, anon, authenticated;
revoke all on function public.public_journey_leaderboard() from public, anon, authenticated;
grant execute on function public.account_update_journey(text, boolean) to authenticated;
grant execute on function public.account_mark_milestone_seen(integer) to authenticated;
grant execute on function public.public_journey_leaderboard() to anon, authenticated;

create or replace function public.account_dashboard(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'fullName', p.full_name,
        'relation', p.relation,
        'publicDisplayName', j.public_display_name,
        'leaderboardOptIn', coalesce(j.leaderboard_opt_in, false)
      )
      from public.user_profiles p
      left join public.participant_journeys j on j.user_id = p.user_id
      where p.user_id = p_user_id
    ),
    'journey', (
      select jsonb_build_object(
        'attendedCount', coalesce(j.attended_count, 0),
        'lastMilestoneSeen', coalesce(j.last_milestone_seen, 0)
      )
      from public.user_profiles p
      left join public.participant_journeys j on j.user_id = p.user_id
      where p.user_id = p_user_id
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
        'priceCzk', l.price_czk,
        'paymentNote', l.payment_note,
        'paymentQrUrl', case when l.payment_mode = 'donation' then i.donation_qr_url else i.paid_qr_url end
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

insert into public.news_items(title, summary, body, published_at)
select
  'Každá lekce je krok na cestě',
  'Nová Cesta praxe připomíná společné milníky bez závodění a bez tlaku.',
  'V účtu nově uvidíš počet skutečně absolvovaných lekcí, svůj aktuální status a cestu k dalšímu milníku. Pokud budeš chtít, můžeš si zvolit veřejné jméno a dobrovolně se zobrazit mezi prvními 20 účastníky na stránce Cesta praxe. Statusy nehodnotí pokročilost, flexibilitu ani úroveň jógy. Připomínají jen čas, který jsme společně strávili na podložce.',
  now()
where not exists (
  select 1 from public.news_items where title = 'Každá lekce je krok na cestě'
);
