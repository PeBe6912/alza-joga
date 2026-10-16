alter table public.news_items
  add column display_order integer not null default 0,
  add column background_tone text not null default 'sage';

alter table public.news_items
  add constraint news_items_background_tone_check
  check (background_tone in ('sage', 'clay', 'sand', 'ink'));

with ranked as (
  select id,
         row_number() over (
           order by published_at desc nulls last, created_at desc, id
         )::integer as position
  from public.news_items
)
update public.news_items as item
set display_order = ranked.position
from ranked
where item.id = ranked.id;

update public.news_items
set background_tone = case title
  when 'Jógový týden 9.–13. listopadu 2026' then 'clay'
  when 'Poprvé na józe?' then 'sand'
  when 'Cvičením pomáháme' then 'sand'
  else 'sage'
end;

create index news_items_display_order_idx
  on public.news_items (display_order, created_at desc);
