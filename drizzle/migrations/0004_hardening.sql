-- 1. Least-privilege table grants.
-- Supabase grants every privilege (including TRUNCATE, which RLS does not cover) to anon and authenticated
-- on new tables. RLS already blocks the rows; this also removes the privileges nobody should have.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.menu_items, public.site_settings to anon;
grant select on public.menu_items, public.site_settings, public.user_roles, public.orders, public.maintenance_log to authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant update on public.site_settings to authenticated;
grant update, delete on public.orders to authenticated;

-- 2. Images are served through signed links, so visitors never need to list or read the bucket directly.
drop policy if exists "public read media" on storage.objects;
drop policy if exists "admin read media" on storage.objects;
create policy "admin read media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'));

-- 3. Anti-abuse for place_order(): stricter, burst-aware limits.
-- The client IP comes from cf-connecting-ip, which Cloudflare sets and refuses to accept from the client.
-- x-forwarded-for is only a fallback, and then its LAST entry (added by the proxy), since the first one can be forged.
create or replace function public.client_ip_hash()
returns text
language plpgsql
stable
as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text;
begin
  v_ip := nullif(btrim(v_headers ->> 'cf-connecting-ip'), '');
  if v_ip is null and v_headers ->> 'x-forwarded-for' is not null then
    v_ip := btrim((string_to_array(v_headers ->> 'x-forwarded-for', ','))[array_length(string_to_array(v_headers ->> 'x-forwarded-for', ','), 1)]);
  end if;
  if v_ip is null or v_ip = '' then return null; end if;
  return encode(extensions.digest('pappy:' || v_ip, 'sha256'), 'hex');
end $$;
revoke all on function public.client_ip_hash() from public, anon, authenticated;

-- Raises 'rate_limited' or 'kitchen_busy'. Limits:
--   per IP:    2 orders in 2 minutes, 5 per hour
--   per phone: 3 per hour
--   whole shop: 40 orders in 10 minutes, and at most 30 orders still waiting ('nuovo') at once
create or replace function public.check_order_limits(p_ip_hash text, p_phone text)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if p_ip_hash is not null then
    if (select count(*) from public.orders where ip_hash = p_ip_hash and created_at > now() - interval '2 minutes') >= 2
       or (select count(*) from public.orders where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'rate_limited';
    end if;
  end if;
  if (select count(*) from public.orders where phone = p_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.orders where status = 'nuovo') >= 30 then
    raise exception 'kitchen_busy';
  end if;
end $$;
revoke all on function public.check_order_limits(text, text) from public, anon, authenticated;
create index if not exists orders_ip_hash_created_idx on public.orders (ip_hash, created_at desc);
create index if not exists orders_phone_created_idx on public.orders (phone, created_at desc);

-- Same as 0001, with the limits moved into the helpers above and the phone normalised before counting,
-- so "+39 333 1234567" and "3331234567" count as the same number.
create or replace function public.place_order(
  p_name text,
  p_phone text,
  p_pickup_time text,
  p_notes text,
  p_items jsonb,
  p_lang text default 'it'
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.site_settings;
  v_now timestamp := now() at time zone 'Europe/Rome';
  v_earliest timestamp;
  v_pickup time;
  v_open boolean := false;
  v_slot jsonb;
  v_line jsonb;
  v_item public.menu_items;
  v_item_id uuid;
  v_qty int;
  v_total_qty int := 0;
  v_opt_id text;
  v_opt jsonb;
  v_opt_names jsonb;
  v_seen text[];
  v_unit numeric;
  v_lines jsonb := '[]';
  v_total numeric := 0;
  v_ip_hash text;
  v_code text;
begin
  select * into s from public.site_settings where id = 1;
  if not s.ordering_open then raise exception 'ordering_closed'; end if;

  p_name := btrim(coalesce(p_name, ''));
  p_phone := btrim(coalesce(p_phone, ''));
  p_notes := btrim(coalesce(p_notes, ''));
  if length(p_name) not between 1 and 100 then raise exception 'invalid_name'; end if;
  if p_phone !~ '^\+?[0-9][0-9 ./-]{5,19}$' then raise exception 'invalid_phone'; end if;
  -- Store in international form (+39 assumed when no country code), so the kitchen sees one format and
  -- "333 1234567", "+39 333.123.4567" and "0039 3331234567" all count as the same phone for the limit.
  p_phone := regexp_replace(p_phone, '(?!^\+)[^0-9]', '', 'g');
  if p_phone like '00%' then p_phone := '+' || substr(p_phone, 3); end if;
  if left(p_phone, 1) <> '+' then p_phone := '+39' || p_phone; end if;
  if p_phone !~ '^\+?[0-9]{6,15}$' then raise exception 'invalid_phone'; end if;
  if length(p_notes) > 500 then raise exception 'invalid_notes'; end if;
  if p_lang not in ('it', 'en') then p_lang := 'it'; end if;

  begin
    v_pickup := p_pickup_time::time;
  exception when others then
    raise exception 'invalid_time';
  end;
  v_earliest := v_now + make_interval(mins => s.prep_minutes);
  if v_now::date + v_pickup < v_earliest then raise exception 'invalid_time'; end if;
  for v_slot in select * from jsonb_array_elements(coalesce(s.opening_hours -> extract(dow from v_now)::int::text, '[]'))
  loop
    if v_pickup between (v_slot ->> 0)::time and (v_slot ->> 1)::time then v_open := true; end if;
  end loop;
  if not v_open then raise exception 'invalid_time'; end if;

  v_ip_hash := public.client_ip_hash();
  perform public.check_order_limits(v_ip_hash, p_phone);

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'invalid_items';
  end if;
  for v_line in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_item_id := (v_line ->> 'id')::uuid;
      v_qty := (v_line ->> 'qty')::int;
    exception when others then
      raise exception 'invalid_items';
    end;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'invalid_items'; end if;
    v_total_qty := v_total_qty + v_qty;

    select * into v_item from public.menu_items where id = v_item_id and available;
    if not found then raise exception 'item_unavailable'; end if;

    v_unit := v_item.price;
    v_opt_names := '[]';
    v_seen := '{}';
    if jsonb_typeof(v_line -> 'options') = 'array' then
      for v_opt_id in select jsonb_array_elements_text(v_line -> 'options')
      loop
        if v_opt_id = any(v_seen) then continue; end if;
        v_seen := v_seen || v_opt_id;
        v_opt := null;
        select o into v_opt from jsonb_array_elements(v_item.options) o where o ->> 'id' = v_opt_id;
        if v_opt is null then raise exception 'item_unavailable'; end if;
        v_unit := v_unit + coalesce((v_opt ->> 'price')::numeric, 0);
        v_opt_names := v_opt_names || to_jsonb(v_opt ->> 'name');
      end loop;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'id', v_item.id, 'name', v_item.name, 'price', v_unit, 'qty', v_qty, 'options', v_opt_names);
    v_total := v_total + v_unit * v_qty;
  end loop;
  if v_total_qty > 50 then raise exception 'invalid_items'; end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.orders (customer_name, phone, pickup_time, notes, items, total, public_code, ip_hash, lang)
  values (p_name, p_phone, to_char(v_pickup, 'HH24:MI'), p_notes, v_lines, round(v_total, 2), v_code, v_ip_hash, p_lang);

  return jsonb_build_object('code', v_code, 'total', round(v_total, 2));
end $$;

revoke all on function public.place_order(text, text, text, text, jsonb, text) from public;
grant execute on function public.place_order(text, text, text, text, jsonb, text) to anon, authenticated;
