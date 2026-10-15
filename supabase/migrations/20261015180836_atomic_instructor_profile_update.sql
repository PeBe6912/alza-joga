create or replace function public.admin_update_instructor_profile(
  p_instructor_id uuid,
  p_email text,
  p_name text,
  p_styles text[],
  p_bio text,
  p_practice_quote text,
  p_photo_url text,
  p_payment_mode public.payment_mode,
  p_price_czk integer,
  p_payment_note text,
  p_paid_qr_url text,
  p_donation_qr_url text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_updated_at timestamptz;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 320 then
    raise exception 'INVALID_EMAIL';
  end if;
  if btrim(p_name) = '' or length(btrim(p_name)) > 120 then
    raise exception 'INVALID_INSTRUCTOR_NAME';
  end if;
  if btrim(p_bio) = '' then
    raise exception 'INVALID_INSTRUCTOR_BIO';
  end if;
  if p_payment_mode = 'paid' and (p_price_czk is null or p_price_czk < 0 or p_price_czk > 10000) then
    raise exception 'INVALID_INSTRUCTOR_PRICE';
  end if;
  if not exists (select 1 from public.instructors where id = p_instructor_id) then
    raise exception 'INVALID_INSTRUCTOR';
  end if;

  insert into private.instructor_contacts (instructor_id, email, updated_at)
  values (p_instructor_id, v_email, now())
  on conflict (instructor_id) do update
  set email = excluded.email, updated_at = now();

  update public.instructors
  set name = btrim(p_name),
      styles = coalesce(p_styles, '{}'::text[]),
      bio = btrim(p_bio),
      practice_quote = coalesce(btrim(p_practice_quote), ''),
      photo_url = nullif(btrim(coalesce(p_photo_url, '')), ''),
      payment_mode = p_payment_mode,
      price_czk = case when p_payment_mode = 'paid' then p_price_czk else null end,
      payment_note = coalesce(btrim(p_payment_note), ''),
      paid_qr_url = nullif(btrim(coalesce(p_paid_qr_url, '')), ''),
      donation_qr_url = nullif(btrim(coalesce(p_donation_qr_url, '')), '')
  where id = p_instructor_id
  returning updated_at into v_updated_at;

  return jsonb_build_object('instructor_id', p_instructor_id, 'updated_at', v_updated_at);
end;
$$;

revoke all on function public.admin_update_instructor_profile(uuid, text, text, text[], text, text, text, public.payment_mode, integer, text, text, text)
from public, anon, authenticated;
grant execute on function public.admin_update_instructor_profile(uuid, text, text, text[], text, text, text, public.payment_mode, integer, text, text, text)
to service_role;
