create extension if not exists pgcrypto with schema extensions;

-- The automatic-RLS helper is an event trigger helper, not a public API endpoint.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create type public.payment_mode as enum ('paid', 'donation');
create type public.lesson_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.reservation_status as enum ('confirmed', 'cancelled', 'attended', 'no_show');

create table public.instructors (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  bio text not null default '',
  styles text[] not null default '{}',
  photo_url text,
  payment_mode public.payment_mode not null,
  price_czk integer check (price_czk is null or price_czk >= 0),
  payment_note text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_payment_configuration check (
    (payment_mode = 'paid' and price_czk is not null)
    or (payment_mode = 'donation' and price_czk is null)
  )
);

create table public.lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancel_before timestamptz generated always as (starts_at - interval '24 hours') stored,
  capacity smallint not null default 20 check (capacity between 1 and 100),
  status public.lesson_status not null default 'draft',
  location text not null default 'Jógová místnost, 3. patro, HALL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_time_order check (ends_at > starts_at)
);

create index lessons_starts_at_idx on public.lessons (starts_at);
create index lessons_public_schedule_idx on public.lessons (status, starts_at);

create table public.reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  attendee_name text not null check (char_length(btrim(attendee_name)) between 2 and 120),
  attendee_email text not null check (
    char_length(attendee_email) <= 320
    and attendee_email = lower(btrim(attendee_email))
    and position('@' in attendee_email) > 1
  ),
  status public.reservation_status not null default 'confirmed',
  cancellation_token_hash text not null unique,
  cancelled_at timestamptz,
  attended_at timestamptz,
  payment_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_cancellation_state check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  )
);

create unique index reservations_active_email_idx
  on public.reservations (lesson_id, attendee_email)
  where status in ('confirmed', 'attended', 'no_show');

create index reservations_lesson_status_idx
  on public.reservations (lesson_id, status);

create index reservations_payment_queue_idx
  on public.reservations (payment_email_sent_at, lesson_id)
  where status = 'attended' and payment_email_sent_at is null;

create table public.news_items (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  summary text not null default '',
  body text not null default '',
  image_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index news_items_published_at_idx
  on public.news_items (published_at desc)
  where published_at is not null;

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger instructors_set_updated_at
before update on public.instructors
for each row execute function private.set_updated_at();

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function private.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function private.set_updated_at();

create trigger news_items_set_updated_at
before update on public.news_items
for each row execute function private.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function private.set_updated_at();

alter table public.instructors enable row level security;
alter table public.lessons enable row level security;
alter table public.reservations enable row level security;
alter table public.news_items enable row level security;
alter table public.site_settings enable row level security;

revoke all on table public.instructors from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.reservations from anon, authenticated;
revoke all on table public.news_items from anon, authenticated;
revoke all on table public.site_settings from anon, authenticated;

grant select on table public.instructors to anon, authenticated;
grant select on table public.lessons to anon, authenticated;
grant select on table public.news_items to anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert, update, delete on table public.instructors to authenticated;
grant insert, update, delete on table public.lessons to authenticated;
grant select, insert, update, delete on table public.reservations to authenticated;
grant insert, update, delete on table public.news_items to authenticated;
grant insert, update, delete on table public.site_settings to authenticated;

create policy instructors_public_read
on public.instructors for select
to anon, authenticated
using (active);

create policy instructors_admin_read
on public.instructors for select
to authenticated
using (private.is_admin());

create policy instructors_admin_insert
on public.instructors for insert
to authenticated
with check (private.is_admin());

create policy instructors_admin_update
on public.instructors for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy instructors_admin_delete
on public.instructors for delete
to authenticated
using (private.is_admin());

create policy lessons_public_read
on public.lessons for select
to anon, authenticated
using (status = 'published');

create policy lessons_admin_read
on public.lessons for select
to authenticated
using (private.is_admin());

create policy lessons_admin_insert
on public.lessons for insert
to authenticated
with check (private.is_admin());

create policy lessons_admin_update
on public.lessons for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy lessons_admin_delete
on public.lessons for delete
to authenticated
using (private.is_admin());

create policy reservations_admin_read
on public.reservations for select
to authenticated
using (private.is_admin());

create policy reservations_admin_insert
on public.reservations for insert
to authenticated
with check (private.is_admin());

create policy reservations_admin_update
on public.reservations for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy reservations_admin_delete
on public.reservations for delete
to authenticated
using (private.is_admin());

create policy news_public_read
on public.news_items for select
to anon, authenticated
using (published_at is not null and published_at <= now());

create policy news_admin_read
on public.news_items for select
to authenticated
using (private.is_admin());

create policy news_admin_insert
on public.news_items for insert
to authenticated
with check (private.is_admin());

create policy news_admin_update
on public.news_items for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy news_admin_delete
on public.news_items for delete
to authenticated
using (private.is_admin());

create policy settings_public_read
on public.site_settings for select
to anon, authenticated
using (is_public);

create policy settings_admin_read
on public.site_settings for select
to authenticated
using (private.is_admin());

create policy settings_admin_insert
on public.site_settings for insert
to authenticated
with check (private.is_admin());

create policy settings_admin_update
on public.site_settings for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy settings_admin_delete
on public.site_settings for delete
to authenticated
using (private.is_admin());

insert into public.instructors (
  slug,
  name,
  bio,
  styles,
  photo_url,
  payment_mode,
  price_czk,
  payment_note,
  sort_order
)
values
  (
    'daniela-stastna',
    'Daniela Šťastná',
    'Jógu aktivně praktikuje od roku 2014. V dubnu 2023 dokončila akreditovaný 200hodinový kurz MŠMT od Yoga4Everybody se specializací na fyzio jógu, hatha jógu, power jógu, vinyasa jógu, těhotenskou a restorativní jógu.',
    array['Fyzio', 'Hatha', 'Power', 'Vinyasa'],
    'assets/daniela-stastna.jpg',
    'paid',
    150,
    'QR kód k platbě bude odeslán po skončení lekce.',
    10
  ),
  (
    'petr-bena',
    'Petr Bena',
    'Jeho jógová cesta je poměrně krátká, ale velmi intenzivní. Od prosince 2023 se jóga proměnila ze způsobu, jak se zotavit z běžeckého zranění, v každodenní praxi. V roce 2026 dokončil v Ubudu na Bali 200hodinový kurz pro učitele power a vinyasa jógy. Nejbližší je mu strong slow flow.',
    array['Power', 'Vinyasa', 'Strong slow flow'],
    'assets/petr-bena.jpeg',
    'donation',
    null,
    'Dobrovolný příspěvek směřuje organizaci Dobrý anděl.',
    20
  );

insert into public.site_settings (key, value, is_public)
values
  ('studio_capacity', '20'::jsonb, true),
  ('cancellation_hours', '24'::jsonb, true),
  ('studio_location', to_jsonb('Jógová místnost, 3. patro, HALL'::text), true),
  ('whatsapp_qr_url', to_jsonb('assets/whatsapp-joga-qr.png'::text), true);
