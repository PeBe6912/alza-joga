create or replace function public.admin_delete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_title text;
  v_deleted_reservations integer;
begin
  select title
  into v_title
  from public.lessons
  where id = p_lesson_id
  for update;

  if not found then
    raise exception 'LESSON_NOT_FOUND';
  end if;

  delete from public.reservations
  where lesson_id = p_lesson_id;
  get diagnostics v_deleted_reservations = row_count;

  delete from public.lessons
  where id = p_lesson_id;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'title', v_title,
    'deleted_reservations', v_deleted_reservations
  );
end;
$$;

revoke all on function public.admin_delete_lesson(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_lesson(uuid) to service_role;
