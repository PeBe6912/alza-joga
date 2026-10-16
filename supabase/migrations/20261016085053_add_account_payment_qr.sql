create or replace function public.account_dashboard(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object('fullName', p.full_name, 'relation', p.relation)
      from public.user_profiles p where p.user_id = p_user_id
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
