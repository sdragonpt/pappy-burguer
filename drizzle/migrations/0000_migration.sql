create type public.app_role as enum ('admin');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.first_user_admin() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users for each row execute function public.first_user_admin();

create table public.site_settings (id int primary key default 1 check (id=1), name text not null default 'Pappy Burger', logo_url text, tagline text default 'Hamburger artigianali a Santa Vittoria d''Alba', address text default 'Via Statale, 46, 12069 Santa Vittoria d''Alba CN', phone text, hours text default 'Mer–Dom 12:00–14:30 · 19:00–23:00', updated_at timestamptz default now());
grant select on public.site_settings to anon, authenticated; grant update on public.site_settings to authenticated; grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "read settings" on public.site_settings for select using (true);
create policy "admin update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.site_settings(id) values (1);

create table public.menu_items (id uuid primary key default gen_random_uuid(), category text not null default 'Burgers', name text not null, description text default '', price numeric(8,2) not null default 0, image_url text, available boolean not null default true, sort_order int not null default 0, created_at timestamptz default now());
grant select on public.menu_items to anon, authenticated; grant insert, update, delete on public.menu_items to authenticated; grant all on public.menu_items to service_role;
alter table public.menu_items enable row level security;
create policy "read menu" on public.menu_items for select using (true);
create policy "admin write menu" on public.menu_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.menu_items(category,name,description,price,sort_order) values
('Burgers','Pappy Classic','Manzo piemontese 180g, cheddar, lattuga, pomodoro, salsa Pappy',11.00,1),
('Burgers','Bacon Smash','Doppio smash, bacon croccante, cheddar fuso, cipolla caramellata',13.50,2),
('Burgers','Chicken Crispy','Pollo croccante, insalata coleslaw, maionese al lime',12.00,3),
('Contorni','Patatine Fritte','Patate fresche tagliate a mano',4.00,1),
('Contorni','Onion Rings','Anelli di cipolla in pastella',5.00,2),
('Bevande','Coca-Cola 33cl','',3.00,1),
('Bevande','Birra artigianale','Birra locale 33cl',5.50,2),
('Dolci','Tiramisù della Casa','Il classico dolce italiano fatto con amore e caffè',6.00,1);

create table public.orders (id uuid primary key default gen_random_uuid(), customer_name text not null, phone text not null, pickup_time text not null, notes text default '', items jsonb not null, total numeric(8,2) not null, status text not null default 'nuovo', created_at timestamptz default now());
grant insert on public.orders to anon, authenticated; grant select, update, delete on public.orders to authenticated; grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "anyone can order" on public.orders for insert to anon, authenticated with check (length(customer_name) between 1 and 100 and length(phone) between 5 and 30 and status='nuovo');
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));
alter publication supabase_realtime add table public.orders;

create policy "public read media" on storage.objects for select using (bucket_id='media');
create policy "admin upload media" on storage.objects for insert to authenticated with check (bucket_id='media' and public.has_role(auth.uid(),'admin'));
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id='media' and public.has_role(auth.uid(),'admin'));
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id='media' and public.has_role(auth.uid(),'admin'));