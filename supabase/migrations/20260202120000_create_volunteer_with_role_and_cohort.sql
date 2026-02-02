-- Create volunteer with role and cohort in a single transaction.
-- If the role (by name) or cohort (by year, term) does not exist, they are created.
-- Returns the new volunteer id.

CREATE OR REPLACE FUNCTION public.create_volunteer_with_role_and_cohort(
  p_volunteer jsonb,
  p_role_name text,
  p_role_type text,
  p_cohort_year smallint,
  p_cohort_term text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id bigint;
  v_cohort_id bigint;
  v_volunteer_id bigint;
BEGIN
  -- Get or create role (Roles has UNIQUE on name)
  INSERT INTO public."Roles" (name, type)
  VALUES (p_role_name, p_role_type)
  ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type
  RETURNING id INTO v_role_id;

  -- Get or create cohort (no unique on year+term; we select first or insert)
  SELECT id INTO v_cohort_id
  FROM public."Cohorts"
  WHERE year = p_cohort_year AND term = p_cohort_term
  LIMIT 1;

  IF v_cohort_id IS NULL THEN
    INSERT INTO public."Cohorts" (year, term)
    VALUES (p_cohort_year, p_cohort_term)
    RETURNING id INTO v_cohort_id;
  END IF;

  IF v_cohort_id IS NULL THEN
    RAISE EXCEPTION 'Failed to get or create cohort';
  END IF;

  -- Insert volunteer
  INSERT INTO public."Volunteers" (
    name_org,
    pseudonym,
    pronouns,
    email,
    phone,
    position,
    opt_in_communication,
    notes
  )
  VALUES (
    (p_volunteer ->> 'name_org'),
    NULLIF(TRIM(p_volunteer ->> 'pseudonym'), ''),
    NULLIF(TRIM(p_volunteer ->> 'pronouns'), ''),
    NULLIF(TRIM(p_volunteer ->> 'email'), ''),
    NULLIF(TRIM(p_volunteer ->> 'phone'), ''),
    NULLIF(TRIM(p_volunteer ->> 'position'), ''),
    COALESCE((p_volunteer ->> 'opt_in_communication')::boolean, true),
    NULLIF(TRIM(p_volunteer ->> 'notes'), '')
  )
  RETURNING id INTO v_volunteer_id;

  IF v_volunteer_id IS NULL THEN
    RAISE EXCEPTION 'Failed to insert volunteer';
  END IF;

  -- Link volunteer to role
  INSERT INTO public."VolunteerRoles" (volunteer_id, role_id)
  VALUES (v_volunteer_id, v_role_id);

  -- Link volunteer to cohort
  INSERT INTO public."VolunteerCohorts" (volunteer_id, cohort_id)
  VALUES (v_volunteer_id, v_cohort_id);

  RETURN v_volunteer_id;
END;
$$;

COMMENT ON FUNCTION public.create_volunteer_with_role_and_cohort(jsonb, text, text, smallint, text) IS
  'Creates a volunteer with role and cohort in one transaction. Creates role or cohort if they do not exist.';

GRANT EXECUTE ON FUNCTION public.create_volunteer_with_role_and_cohort(jsonb, text, text, smallint, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_volunteer_with_role_and_cohort(jsonb, text, text, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_volunteer_with_role_and_cohort(jsonb, text, text, smallint, text) TO service_role;
