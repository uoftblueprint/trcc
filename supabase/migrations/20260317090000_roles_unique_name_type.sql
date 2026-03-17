-- Ensure Roles uniqueness is enforced on (name, type) instead of name alone.
ALTER TABLE public."Roles"
DROP CONSTRAINT IF EXISTS "Roles_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS roles_name_type_unique_idx ON public."Roles" (name, type);