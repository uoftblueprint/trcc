-- Expose auth.users email for public.Users rows via SECURITY DEFINER function.
-- This avoids requiring service role keys at runtime for server-side pages.

drop function if exists public.get_users_with_email();

create or replace function public.get_users_with_email()
returns table (
  id uuid,
  created_at timestamptz,
  name text,
  role public.user_roles,
  email text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.created_at,
    u.name,
    u.role,
    au.email
  from public."Users" u
  left join auth.users au on au.id = u.id
  order by u.created_at desc;
$$;

revoke all on function public.get_users_with_email() from public;
grant execute on function public.get_users_with_email() to anon, authenticated, service_role;

