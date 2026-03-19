drop extension if exists "pg_net";

create type "public"."user_roles" as enum ('admin', 'staff');

alter table "public"."Roles" drop constraint "Roles_name_key";
alter table "public"."Users" drop constraint "Users_email_key";
alter table "public"."Cohorts" drop constraint "cohorts_term_check";
alter table "public"."Roles" drop constraint "roles_type_check";
alter table "public"."Volunteers" drop constraint "volunteers_position_check";

drop index if exists "public"."Roles_name_key";
drop index if exists "public"."Users_email_key";

alter table "public"."Users" drop column "email";
alter table "public"."Users" add column "name" text;
alter table "public"."Users"
  alter column "role" set data type public.user_roles using "role"::public.user_roles;

create unique index cohorts_year_term_unique
  on public."Cohorts" using btree (year, term);

create unique index roles_name_type_unique
  on public."Roles" using btree (name, type);

alter table "public"."Cohorts"
  add constraint "cohorts_year_term_unique"
  unique using index "cohorts_year_term_unique";

alter table "public"."Roles"
  add constraint "roles_name_type_unique"
  unique using index "roles_name_type_unique";

alter table "public"."Users"
  add constraint "Users_id_fkey"
  foreign key (id) references auth.users(id)
  on update cascade
  on delete cascade
  not valid;

alter table "public"."Users" validate constraint "Users_id_fkey";

alter table "public"."Cohorts"
  add constraint "cohorts_term_check"
  check (((term)::text = any ((array[
    'Fall'::character varying,
    'Spring'::character varying,
    'Summer'::character varying,
    'Winter'::character varying
  ])::text[])))
  not valid;

alter table "public"."Cohorts" validate constraint "cohorts_term_check";

alter table "public"."Roles"
  add constraint "roles_type_check"
  check (((type)::text = any ((array[
    'prior'::character varying,
    'current'::character varying,
    'future_interest'::character varying
  ])::text[])))
  not valid;

alter table "public"."Roles" validate constraint "roles_type_check";

alter table "public"."Volunteers"
  add constraint "volunteers_position_check"
  check ((("position")::text = any ((array[
    'member'::character varying,
    'volunteer'::character varying,
    'staff'::character varying
  ])::text[])))
  not valid;

alter table "public"."Volunteers" validate constraint "volunteers_position_check";

set check_function_bodies = off;

create or replace function public.create_user_from_auth()
returns trigger
language plpgsql
security definer
as $function$
begin
  -- Avoid creating duplicate user rows
  if not exists (select 1 from public."Users" where id = new.id) then
    insert into public."Users" (id, role)
    values (
      new.id,
      null
    );
  end if;

  return new;
end;
$function$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

create or replace function public.create_volunteer_with_role_and_cohort(
  p_volunteer jsonb,
  p_role_name text,
  p_role_type text,
  p_cohort_year smallint,
  p_cohort_term text
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role_id bigint;
  v_cohort_id bigint;
  v_volunteer_id bigint;
begin
  -- Get or create role
  select id into v_role_id
  from public."Roles"
  where name = p_role_name and type = p_role_type
  limit 1;

  if v_role_id is null then
    insert into public."Roles" (name, type)
    values (p_role_name, p_role_type)
    returning id into v_role_id;
  end if;

  if v_role_id is null then
    raise exception 'Failed to get or create role';
  end if;

  -- Get or create cohort
  select id into v_cohort_id
  from public."Cohorts"
  where year = p_cohort_year and term = p_cohort_term
  limit 1;

  if v_cohort_id is null then
    insert into public."Cohorts" (year, term)
    values (p_cohort_year, p_cohort_term)
    returning id into v_cohort_id;
  end if;

  if v_cohort_id is null then
    raise exception 'Failed to get or create cohort';
  end if;

  -- Insert volunteer
  insert into public."Volunteers" (
    name_org,
    pseudonym,
    pronouns,
    email,
    phone,
    position,
    opt_in_communication,
    notes
  )
  values (
    (p_volunteer ->> 'name_org'),
    nullif(trim(p_volunteer ->> 'pseudonym'), ''),
    nullif(trim(p_volunteer ->> 'pronouns'), ''),
    nullif(trim(p_volunteer ->> 'email'), ''),
    nullif(trim(p_volunteer ->> 'phone'), ''),
    nullif(trim(p_volunteer ->> 'position'), ''),
    coalesce((p_volunteer ->> 'opt_in_communication')::boolean, true),
    nullif(trim(p_volunteer ->> 'notes'), '')
  )
  returning id into v_volunteer_id;

  if v_volunteer_id is null then
    raise exception 'Failed to insert volunteer';
  end if;

  -- Link volunteer to role
  insert into public."VolunteerRoles" (volunteer_id, role_id)
  values (v_volunteer_id, v_role_id);

  -- Link volunteer to cohort
  insert into public."VolunteerCohorts" (volunteer_id, cohort_id)
  values (v_volunteer_id, v_cohort_id);

  return v_volunteer_id;
end;
$function$;

create policy "full permission for development"
  on "public"."Users"
  as permissive
  for all
  to authenticated
  using (true)
  with check (true);

create policy "full permissions for development phase"
  on "public"."Users"
  as permissive
  for all
  to anon
  using (true)
  with check (true);

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.create_user_from_auth();
