begin;

create or replace function public.submit_lesson_feedback(
  p_token uuid,
  p_rating text,
  p_topics text[],
  p_comment text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation_id uuid;
  v_lesson_id uuid;
  v_allowed_topics constant text[] := array['Tempo lekce', 'Náročnost', 'Vysvětlení pozic', 'Skladba lekce', 'Dopomoci', 'Atmosféra', 'Hudba', 'Organizace', 'Tempo lekce: Pomalé', 'Tempo lekce: Akorát', 'Tempo lekce: Rychlé', 'Náročnost: Nízká', 'Náročnost: Akorát', 'Náročnost: Vysoká', 'Vysvětlení pozic: Málo podrobné', 'Vysvětlení pozic: Srozumitelné', 'Vysvětlení pozic: Příliš podrobné', 'Skladba lekce: Málo pestrá', 'Skladba lekce: Vyhovovala mi', 'Skladba lekce: Příliš střídání', 'Dopomoci: Uvítám více', 'Dopomoci: Vyhovovaly mi', 'Dopomoci: Raději bez nich', 'Atmosféra: Příjemná', 'Atmosféra: Neutrální', 'Atmosféra: Nepříjemná', 'Hudba: Vyhovovala mi', 'Hudba: Rušila mě', 'Hudba: Raději bez ní', 'Organizace: Bez problémů', 'Organizace: Drobné zádrhele', 'Organizace: Větší problémy'];
begin
  if p_rating not in ('great', 'good', 'not_right')
     or cardinality(coalesce(p_topics, '{}'::text[])) > 8
     or exists (select 1 from unnest(coalesce(p_topics, '{}'::text[])) topic where not (topic = any(v_allowed_topics)))
     or (select count(distinct split_part(topic, ': ', 1)) from unnest(coalesce(p_topics, '{}'::text[])) topic) <> cardinality(coalesce(p_topics, '{}'::text[]))
     or char_length(coalesce(p_comment, '')) > 1500 then
    raise exception 'INVALID_FEEDBACK';
  end if;

  select r.id, r.lesson_id into v_reservation_id, v_lesson_id
  from public.reservations r
  join public.lessons l on l.id = r.lesson_id
  where r.feedback_token = p_token
    and r.status = 'attended'
    and l.feedback_requested_at is not null
    and l.ends_at <= now()
    and l.ends_at >= now() - interval '30 days'
  for update of r;

  if not found then raise exception 'FEEDBACK_NOT_AVAILABLE'; end if;

  insert into public.lesson_feedback (lesson_id, reservation_id, rating, topics, comment)
  values (v_lesson_id, v_reservation_id, p_rating, coalesce(p_topics, '{}'::text[]), nullif(btrim(p_comment), ''))
  on conflict (reservation_id) do update set
    rating = excluded.rating,
    topics = excluded.topics,
    comment = excluded.comment,
    updated_at = now();

  return jsonb_build_object('submitted', true);
end;
$$;

commit;
