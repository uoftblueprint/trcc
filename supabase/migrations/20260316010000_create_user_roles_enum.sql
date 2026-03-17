-- Create user_roles enum and migrate Users.role to use it.

do $$
begin
  -- Create enum type if it does not exist
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_roles'
  ) then
    create type public.user_roles as enum ('admin', 'staff');
  end if;
end;
$$;

-- If Users.role column exists and is not already using the enum, cast it.
alter table public."Users"
  alter column role type public.user_roles
  using role::public.user_roles;

-- Add name column if missing (app and get_users_with_email expect it).
alter table public."Users"
  add column if not exists name text;

