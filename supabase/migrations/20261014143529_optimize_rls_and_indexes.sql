create index lessons_instructor_id_idx on public.lessons (instructor_id);

drop policy instructors_public_read on public.instructors;
drop policy instructors_admin_read on public.instructors;
create policy instructors_public_read
on public.instructors for select
to anon
using (active);
create policy instructors_authenticated_read
on public.instructors for select
to authenticated
using (active or private.is_admin());

drop policy lessons_public_read on public.lessons;
drop policy lessons_admin_read on public.lessons;
create policy lessons_public_read
on public.lessons for select
to anon
using (status = 'published');
create policy lessons_authenticated_read
on public.lessons for select
to authenticated
using (status = 'published' or private.is_admin());

drop policy news_public_read on public.news_items;
drop policy news_admin_read on public.news_items;
create policy news_public_read
on public.news_items for select
to anon
using (published_at is not null and published_at <= now());
create policy news_authenticated_read
on public.news_items for select
to authenticated
using (
  (published_at is not null and published_at <= now())
  or private.is_admin()
);

drop policy settings_public_read on public.site_settings;
drop policy settings_admin_read on public.site_settings;
create policy settings_public_read
on public.site_settings for select
to anon
using (is_public);
create policy settings_authenticated_read
on public.site_settings for select
to authenticated
using (is_public or private.is_admin());
