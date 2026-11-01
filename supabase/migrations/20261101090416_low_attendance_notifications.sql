begin;

alter table public.reservations
  add column lesson_confirmation_requested_at timestamptz,
  add column lesson_confirmation_sent_at timestamptz,
  add column lesson_confirmation_message_id text,
  add column lesson_confirmation_error text;

create or replace function public.admin_confirm_low_attendance(p_lesson_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_lesson public.lessons%rowtype;
  v_participants jsonb;
begin
  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_lesson.status <> 'published' or v_lesson.starts_at <= now() then raise exception 'LESSON_NOT_AVAILABLE'; end if;
  if v_lesson.low_attendance_confirmed_at is null and v_lesson.booked_count >= v_lesson.minimum_attendance then raise exception 'MINIMUM_ALREADY_MET'; end if;
  update public.lessons set low_attendance_confirmed_at = coalesce(low_attendance_confirmed_at, now()), updated_at = now() where id = p_lesson_id;
  with claimed as (
    update public.reservations set lesson_confirmation_requested_at = now()
    where lesson_id = p_lesson_id and status = 'confirmed' and attendee_email is not null
      and lesson_confirmation_sent_at is null and lesson_confirmation_requested_at is null
    returning id, attendee_name, attendee_email
  ) select coalesce(jsonb_agg(jsonb_build_object('reservation_id',id,'name',attendee_name,'email',attendee_email)), '[]'::jsonb) into v_participants from claimed;
  return jsonb_build_object('booked_count',v_lesson.booked_count,'minimum_attendance',v_lesson.minimum_attendance,'low_attendance_confirmed',true,
    'title',v_lesson.title,'starts_at',v_lesson.starts_at,'location',v_lesson.location,
    'teacher',(select name from public.instructors where id=v_lesson.instructor_id),'participants',v_participants);
end;
$$;

create or replace function public.record_lesson_confirmation_email(p_reservation_id uuid,p_sent boolean,p_message_id text,p_error text)
returns void language sql security invoker set search_path = '' as $$
  update public.reservations set
    lesson_confirmation_sent_at = case when p_sent then now() else lesson_confirmation_sent_at end,
    lesson_confirmation_message_id = case when p_sent then p_message_id else lesson_confirmation_message_id end,
    lesson_confirmation_error = case when p_sent then null else left(coalesce(p_error,'EMAIL_NOT_SENT'),500) end,
    lesson_confirmation_requested_at = case when p_sent then lesson_confirmation_requested_at else null end
  where id=p_reservation_id and lesson_confirmation_requested_at is not null and lesson_confirmation_sent_at is null;
$$;
revoke all on function public.record_lesson_confirmation_email(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.record_lesson_confirmation_email(uuid,boolean,text,text) to service_role;
commit;
