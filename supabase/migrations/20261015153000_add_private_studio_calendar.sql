create table public.studio_blocks (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  category text not null default 'private_lesson' check (category in ('private_lesson', 'team_event', 'private_practice', 'maintenance', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_minutes smallint not null default 15 check (buffer_minutes = 15),
  contact_name text not null default '',
  contact_email text not null default '',
  notes text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_block_time_order check (ends_at > starts_at)
);

create index studio_blocks_starts_at_idx on public.studio_blocks (starts_at);

create table public.studio_occupancy (
  block_id uuid primary key references public.studio_blocks(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint studio_occupancy_time_order check (ends_at > starts_at)
);

create index studio_occupancy_starts_at_idx on public.studio_occupancy (starts_at);

alter table public.studio_occupancy enable row level security;
revoke all on table public.studio_occupancy from anon, authenticated;
grant select on table public.studio_occupancy to anon, authenticated;

create policy studio_occupancy_public_read
on public.studio_occupancy for select to anon, authenticated
using (true);

create trigger studio_blocks_set_updated_at
before update on public.studio_blocks
for each row execute function private.set_updated_at();

alter table public.studio_blocks enable row level security;
revoke all on table public.studio_blocks from anon, authenticated;
grant select, insert, update, delete on table public.studio_blocks to authenticated;

create policy studio_blocks_admin_read
on public.studio_blocks for select to authenticated
using (private.is_admin());

create policy studio_blocks_admin_insert
on public.studio_blocks for insert to authenticated
with check (private.is_admin());

create policy studio_blocks_admin_update
on public.studio_blocks for update to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy studio_blocks_admin_delete
on public.studio_blocks for delete to authenticated
using (private.is_admin());

create or replace function private.check_studio_block_conflict()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('joga-na-hallu-studio-calendar'));

  if exists (
    select 1 from public.lessons l
    where l.status = 'published'
      and tstzrange(l.starts_at, l.ends_at, '[)') &&
          tstzrange(new.starts_at - interval '15 minutes', new.ends_at + interval '15 minutes', '[)')
  ) or exists (
    select 1 from public.studio_blocks b
    where b.id <> new.id
      and tstzrange(b.starts_at - interval '15 minutes', b.ends_at + interval '15 minutes', '[)') &&
          tstzrange(new.starts_at - interval '15 minutes', new.ends_at + interval '15 minutes', '[)')
  ) then
    raise exception using errcode = 'P0001', message = 'STUDIO_CONFLICT';
  end if;

  return new;
end;
$$;

revoke all on function private.check_studio_block_conflict() from public, anon, authenticated;

create trigger studio_blocks_check_conflict
before insert or update of starts_at, ends_at on public.studio_blocks
for each row execute function private.check_studio_block_conflict();

create or replace function private.sync_studio_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.studio_occupancy where block_id = old.id;
    return old;
  end if;

  insert into public.studio_occupancy (block_id, starts_at, ends_at)
  values (new.id, new.starts_at - interval '15 minutes', new.ends_at + interval '15 minutes')
  on conflict (block_id) do update
  set starts_at = excluded.starts_at, ends_at = excluded.ends_at;
  return new;
end;
$$;

revoke all on function private.sync_studio_occupancy() from public, anon, authenticated;

create trigger studio_blocks_sync_occupancy
after insert or update or delete on public.studio_blocks
for each row execute function private.sync_studio_occupancy();

create or replace function private.check_lesson_studio_conflict()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'published' then return new; end if;
  perform pg_advisory_xact_lock(hashtext('joga-na-hallu-studio-calendar'));

  if exists (
    select 1 from public.lessons l
    where l.id <> new.id
      and l.status = 'published'
      and tstzrange(l.starts_at, l.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) or exists (
    select 1 from public.studio_blocks b
    where tstzrange(b.starts_at - interval '15 minutes', b.ends_at + interval '15 minutes', '[)') &&
          tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception using errcode = 'P0001', message = 'STUDIO_CONFLICT';
  end if;

  return new;
end;
$$;

revoke all on function private.check_lesson_studio_conflict() from public, anon, authenticated;

create trigger lessons_check_studio_conflict
before insert or update of starts_at, ends_at, status on public.lessons
for each row execute function private.check_lesson_studio_conflict();

