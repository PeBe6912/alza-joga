create table public.participant_account_blocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked_at timestamptz not null default now()
);

alter table public.participant_account_blocks enable row level security;
revoke all on table public.participant_account_blocks from public, anon, authenticated;

create policy "Participant account blocks are private"
on public.participant_account_blocks
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

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
  if exists (select 1 from public.participant_account_blocks where user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_DISABLED';
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

create or replace function public.account_delete_participant_profile(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unlinked integer := 0;
begin
  if not exists (
    select 1
    from auth.users
    where id = p_user_id
      and coalesce(raw_app_meta_data ->> 'role', '') = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'ADMIN_ACCOUNT_REQUIRED';
  end if;

  update public.reservations set user_id = null where user_id = p_user_id;
  get diagnostics v_unlinked = row_count;

  delete from public.user_profiles where user_id = p_user_id;
  insert into public.participant_account_blocks(user_id)
  values (p_user_id)
  on conflict (user_id) do update set blocked_at = excluded.blocked_at;

  return jsonb_build_object('unlinked_reservations', v_unlinked);
end;
$$;

revoke all on function public.account_delete_participant_profile(uuid) from public, anon, authenticated;
grant execute on function public.account_delete_participant_profile(uuid) to service_role;
