-- Called once a day by .github/workflows/daily-maintenance.yml. Two jobs in one:
--  1. Real database activity, so a Supabase Free project is never paused for 7 days of inactivity
--     (internal pg_cron jobs do not count; an API request does).
--  2. Keeps the promise in the privacy notice: orders are deleted after 12 months.
-- Callable with the public key on purpose: the only thing it can delete is data that must be deleted anyway.
create table if not exists public.maintenance_log (
  id int primary key default 1 check (id = 1),
  last_run timestamptz not null default now(),
  deleted_orders int not null default 0
);
alter table public.maintenance_log enable row level security;
revoke all on public.maintenance_log from anon, authenticated;
grant select on public.maintenance_log to authenticated;
create policy "admin read maintenance" on public.maintenance_log for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.daily_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_deleted int := 0;
begin
  select last_run into v_last from public.maintenance_log where id = 1;
  -- Running it more often than hourly does nothing, so hammering the endpoint is pointless.
  if v_last is null or v_last < now() - interval '1 hour' then
    delete from public.orders where created_at < now() - interval '12 months';
    get diagnostics v_deleted = row_count;
    insert into public.maintenance_log (id, last_run, deleted_orders) values (1, now(), v_deleted)
    on conflict (id) do update set last_run = excluded.last_run, deleted_orders = excluded.deleted_orders;
    v_last := now();
  end if;
  return jsonb_build_object('ok', true, 'last_run', v_last, 'deleted_orders', v_deleted);
end $$;

revoke all on function public.daily_maintenance() from public;
grant execute on function public.daily_maintenance() to anon, authenticated;
