-- Menu: English copy, EU allergens and paid extras ({id, name, name_en, price}).
alter table public.menu_items
  add column if not exists name_en text,
  add column if not exists description_en text,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists options jsonb not null default '[]';
alter table public.menu_items drop constraint if exists menu_items_options_array;
alter table public.menu_items add constraint menu_items_options_array check (jsonb_typeof(options) = 'array');

-- Site: English copy, about page, contacts and ordering rules.
-- opening_hours is keyed by weekday as in extract(dow): "0" = Sunday … "6" = Saturday.
alter table public.site_settings
  add column if not exists tagline_en text default 'Handmade burgers in Santa Vittoria d''Alba',
  add column if not exists about text,
  add column if not exists about_en text,
  add column if not exists email text,
  add column if not exists instagram text,
  add column if not exists ordering_open boolean not null default true,
  add column if not exists prep_minutes int not null default 20,
  add column if not exists opening_hours jsonb not null default '{
    "0": [["12:00","14:30"],["19:00","23:00"]],
    "1": [],
    "2": [],
    "3": [["12:00","14:30"],["19:00","23:00"]],
    "4": [["12:00","14:30"],["19:00","23:00"]],
    "5": [["12:00","14:30"],["19:00","23:00"]],
    "6": [["12:00","14:30"],["19:00","23:00"]]
  }';
alter table public.site_settings drop constraint if exists site_settings_prep_minutes;
alter table public.site_settings add constraint site_settings_prep_minutes check (prep_minutes between 0 and 180);
update public.site_settings set tagline_en = 'Handmade burgers in Santa Vittoria d''Alba' where id = 1 and tagline_en is null;

update public.menu_items set name_en = 'French Fries', description_en = 'Fresh hand-cut potatoes' where name = 'Patatine Fritte' and name_en is null;
update public.menu_items set description_en = 'Battered onion rings' where name = 'Onion Rings' and description_en is null;
update public.menu_items set name_en = 'Craft beer', description_en = 'Local beer 33cl' where name = 'Birra artigianale' and name_en is null;
update public.menu_items set name_en = 'House Tiramisù', description_en = 'The classic Italian dessert, made with love and coffee' where name = 'Tiramisù della Casa' and name_en is null;
update public.menu_items set description_en = 'Piedmontese beef 180g, cheddar, lettuce, tomato, Pappy sauce' where name = 'Pappy Classic' and description_en is null;
update public.menu_items set description_en = 'Double smash, crispy bacon, melted cheddar, caramelised onion' where name = 'Bacon Smash' and description_en is null;
update public.menu_items set description_en = 'Crispy chicken, coleslaw, lime mayo' where name = 'Chicken Crispy' and description_en is null;

-- Orders: a short public code for the customer's tracking page, and a hashed IP for rate limiting.
alter table public.orders
  add column if not exists public_code text,
  add column if not exists ip_hash text,
  add column if not exists lang text not null default 'it';
update public.orders set public_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)) where public_code is null;
alter table public.orders alter column public_code set not null;
create unique index if not exists orders_public_code_key on public.orders (public_code);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('nuovo', 'in preparazione', 'pronto', 'ritirato', 'annullato')) not valid;

-- Customers no longer insert rows directly: the client used to send its own prices and total,
-- so anyone could order at €0. Orders now go through place_order(), which prices them here.
drop policy if exists "anyone can order" on public.orders;
revoke insert on public.orders from anon, authenticated;

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
  v_headers json;
  v_ip text;
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
  if length(p_notes) > 500 then raise exception 'invalid_notes'; end if;
  if p_lang not in ('it', 'en') then p_lang := 'it'; end if;

  -- Pickup is same-day only, inside today's opening hours and after the preparation time.
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

  -- Rate limits: per IP, per phone and a global cap so a script cannot flood the kitchen.
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip',
                   btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), '');
  v_ip_hash := encode(digest('pappy:' || v_ip, 'sha256'), 'hex');
  if v_ip <> '' and (select count(*) from public.orders where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.orders where phone = p_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'rate_limited';
  end if;

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

-- Tracking page: only what the customer needs, never name or phone, and only for recent orders.
create or replace function public.order_status(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('status', status, 'pickup_time', pickup_time, 'total', total, 'items', items, 'created_at', created_at)
  from public.orders
  where public_code = upper(btrim(p_code)) and created_at > now() - interval '2 days'
$$;

-- Lets the login screen hide "create account" once the owner has signed up.
create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.user_roles where role = 'admin') $$;

revoke all on function public.place_order(text, text, text, text, jsonb, text) from public;
revoke all on function public.order_status(text) from public;
revoke all on function public.admin_exists() from public;
grant execute on function public.place_order(text, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.order_status(text) to anon, authenticated;
grant execute on function public.admin_exists() to anon, authenticated;
