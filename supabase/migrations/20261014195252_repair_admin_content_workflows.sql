grant select, insert, update, delete
on table public.instructors, public.lessons, public.reservations, public.news_items, public.site_settings
to service_role;

insert into public.news_items (title, summary, body, image_url, published_at)
select seed.title, seed.summary, seed.body, seed.image_url, seed.published_at
from (values
  (
    'Večerní lekce v novém světle',
    'Přidáváme podvečerní termíny. Přijď uzavřít pracovní den v klidném tempu.',
    'Přidáváme podvečerní termíny. Přijď uzavřít pracovní den v klidném tempu.',
    'assets/studio-lamps.jpeg',
    now() - interval '3 days'
  ),
  (
    'Cvičením pomáháme',
    'U vybraných lekcí můžeš místo vstupného dobrovolně přispět organizaci Dobrý anděl.',
    'U vybraných lekcí můžeš místo vstupného dobrovolně přispět organizaci Dobrý anděl.',
    null,
    now() - interval '2 days'
  ),
  (
    'Poprvé na józe?',
    'Nemusíš umět vůbec nic. Vezmi si pohodlné oblečení, podložku a přijď o pět minut dřív.',
    'Nemusíš umět vůbec nic. Vezmi si pohodlné oblečení, podložku a přijď o pět minut dřív.',
    null,
    now() - interval '1 day'
  )
) as seed(title, summary, body, image_url, published_at)
where not exists (
  select 1 from public.news_items existing where existing.title = seed.title
);
