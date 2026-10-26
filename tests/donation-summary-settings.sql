-- Test roundtrip and validation without publishing fixture values.
begin;
do $$
declare
  v_before jsonb;
  v_after jsonb;
  v_summary jsonb;
  v_rejected boolean;
begin
  select jsonb_object_agg(key, value) into v_before from public.site_settings where key <> 'donation_summary';
  v_summary := public.admin_update_donation_summary(11075, date '2026-10-26');
  assert v_summary = '{"amount_czk":11075,"as_of":"2026-10-26"}'::jsonb, 'Incorrect summary roundtrip';
  assert exists(select 1 from public.site_settings where key = 'donation_summary' and value = v_summary and is_public), 'Summary not publicly readable';
  v_summary := public.admin_update_donation_summary(11075.50, date '2026-10-26');
  assert (v_summary->>'amount_czk')::numeric = 11075.50, 'Decimal amount lost';
  v_summary := public.admin_update_donation_summary(0, date '2024-02-29');
  assert (v_summary->>'amount_czk')::numeric = 0, 'Zero amount rejected';
  v_rejected := false;
  begin perform public.admin_update_donation_summary(-1, date '2026-10-26');
  exception when raise_exception then if sqlerrm <> 'INVALID_DONATION_AMOUNT' then raise; end if; v_rejected := true; end;
  assert v_rejected, 'Negative amount accepted';
  v_rejected := false;
  begin perform public.admin_update_donation_summary(1.234, date '2026-10-26');
  exception when raise_exception then if sqlerrm <> 'INVALID_DONATION_AMOUNT' then raise; end if; v_rejected := true; end;
  assert v_rejected, 'Invalid precision accepted';
  v_rejected := false;
  begin perform public.admin_update_donation_summary(null, date '2026-10-26');
  exception when raise_exception then if sqlerrm <> 'INVALID_DONATION_AMOUNT' then raise; end if; v_rejected := true; end;
  assert v_rejected, 'Missing amount accepted';
  v_rejected := false;
  begin perform public.admin_update_donation_summary(1, current_date + 2);
  exception when raise_exception then if sqlerrm <> 'INVALID_DONATION_DATE' then raise; end if; v_rejected := true; end;
  assert v_rejected, 'Future date accepted';
  v_rejected := false;
  begin perform public.admin_update_donation_summary(1, null);
  exception when raise_exception then if sqlerrm <> 'INVALID_DONATION_DATE' then raise; end if; v_rejected := true; end;
  assert v_rejected, 'Missing date accepted';
  select jsonb_object_agg(key, value) into v_after from public.site_settings where key <> 'donation_summary';
  assert v_before = v_after, 'Unrelated booking settings changed';
  assert not has_function_privilege('anon', 'public.admin_update_donation_summary(numeric,date)', 'execute'), 'Anonymous write allowed';
  assert not has_function_privilege('authenticated', 'public.admin_update_donation_summary(numeric,date)', 'execute'), 'Participant write allowed';
  assert has_function_privilege('service_role', 'public.admin_update_donation_summary(numeric,date)', 'execute'), 'Server cannot save summary';
end;
$$;
rollback;
