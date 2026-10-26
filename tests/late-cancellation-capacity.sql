-- Integration regression test. All fixture rows and counter changes are rolled back.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';
do $$
declare
  v_lesson public.lessons%rowtype;
  v_reservation public.reservations%rowtype;
  v_id uuid;
  v_count integer;
  v_result jsonb;
  v_rejected boolean := false;
  v_token text := replace(extensions.gen_random_uuid()::text, '-', '');
begin
  select * into strict v_lesson from public.lessons
  where starts_at > now() and cancel_before < now() and status = 'published'
  order by starts_at limit 1 for update;

  insert into public.reservations (lesson_id, attendee_name, attendee_email, attendee_relation, cancellation_token_hash)
  values (v_lesson.id, 'Capacity regression test', v_token || '@example.invalid', 'guest', repeat(v_token, 2))
  returning id into v_id;
  -- Simulate a full class, then verify that late cancellation frees exactly one seat.
  update public.lessons set booked_count = capacity where id = v_lesson.id;
  v_result := public.admin_cancel_reservation(v_id);
  select * into v_reservation from public.reservations where id = v_id;
  select booked_count into v_count from public.lessons where id = v_lesson.id;
  assert v_result->>'late_cancellation' = 'true', 'Expected late cancellation';
  assert v_count = v_lesson.capacity - 1, 'Late cancellation did not free exactly one seat';
  assert v_reservation.status = 'no_show' and v_reservation.late_cancelled_at is not null,
    'Late cancellation must remain in attendance/payment workflow';
  assert v_reservation.cancelled_at is null and v_reservation.payment_waived_at is null
    and v_reservation.payment_email_sent_at is null, 'Payment state changed unexpectedly';

  begin
    perform public.admin_cancel_reservation(v_id);
  exception when raise_exception then
    if sqlerrm <> 'CANCELLATION_NOT_ALLOWED' then raise; end if;
    v_rejected := true;
  end;
  assert v_rejected, 'Repeated cancellation must be rejected';
  select booked_count into v_count from public.lessons where id = v_lesson.id;
  assert v_count = v_lesson.capacity - 1, 'Repeated cancellation decremented twice';

  v_result := public.reserve_lesson(v_lesson.id, 'Replacement regression test',
    'replacement-' || v_token || '@example.invalid', 'guest', repeat('a', 64), null::uuid);
  assert (v_result->>'available_spots')::integer = 0, 'Released seat could not be booked';
  select booked_count into v_count from public.lessons where id = v_lesson.id;
  assert v_count = v_lesson.capacity, 'Replacement booking counter is incorrect';

  -- Ordinary cancellation must still decrement once, without acquiring late/payment state.
  select * into strict v_lesson from public.lessons
  where starts_at > now() and cancel_before > now() and status = 'published'
  order by starts_at limit 1 for update;
  insert into public.reservations (lesson_id, attendee_name, attendee_email, attendee_relation, cancellation_token_hash)
  values (v_lesson.id, 'Ordinary cancellation regression test', v_token || '@example.invalid', 'guest', repeat('b', 64))
  returning id into v_id;
  update public.lessons set booked_count = capacity where id = v_lesson.id;
  v_result := public.admin_cancel_reservation(v_id);
  select * into v_reservation from public.reservations where id = v_id;
  select booked_count into v_count from public.lessons where id = v_lesson.id;
  assert v_result->>'late_cancellation' = 'false', 'Ordinary cancellation misclassified';
  assert v_count = v_lesson.capacity - 1, 'Ordinary cancellation must decrement exactly once';
  assert v_reservation.status = 'cancelled' and v_reservation.cancelled_at is not null
    and v_reservation.late_cancelled_at is null, 'Ordinary cancellation state changed';
end;
$$;
rollback;
