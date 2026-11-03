-- The `media` bucket was created by Lovable outside the migrations; create it here so a fresh Supabase project works.
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;

-- Functions from the Lovable template were executable by anyone through /rest/v1/rpc.
-- first_user_admin() only runs as a trigger; has_role() is needed by signed-in users' RLS policies, not by visitors.
revoke all on function public.first_user_admin() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
