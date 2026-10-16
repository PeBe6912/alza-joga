create policy "No direct access to auth email request log"
on public.auth_email_requests
for all
to anon, authenticated
using (false)
with check (false);
