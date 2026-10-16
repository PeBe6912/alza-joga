create or replace function public.admin_reorder_news_items(p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item_count integer;
  v_distinct_count integer;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select count(*) into v_item_count from public.news_items;
  select count(distinct ids.item_id)
  into v_distinct_count
  from unnest(p_ordered_ids) as ids(item_id);

  if coalesce(array_length(p_ordered_ids, 1), 0) <> v_item_count
     or v_distinct_count <> v_item_count
     or exists (
       select 1
       from unnest(p_ordered_ids) as ids(item_id)
       where not exists (select 1 from public.news_items where id = ids.item_id)
     ) then
    raise exception 'INVALID_NEWS_ORDER' using errcode = '22023';
  end if;

  update public.news_items as item
  set display_order = ordered.position
  from unnest(p_ordered_ids) with ordinality as ordered(id, position)
  where item.id = ordered.id;
end;
$$;
