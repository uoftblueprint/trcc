-- Create volunteer with zero or more roles and zero or more cohorts in one transaction.
-- Position is always stored as null (not taken from JSON).
-- Role rows are resolved by (name, type); cohorts by (year, term).

CREATE OR REPLACE FUNCTION public.create_volunteer_with_roles_and_cohorts(
  p_volunteer jsonb,
  p_roles jsonb,
  p_cohorts jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_volunteer_id bigint;
  v_role jsonb;
  v_role_name text;
  v_role_type text;
  v_role_id bigint;
  v_cohort jsonb;
  v_cohort_year smallint;
  v_cohort_term text;
  v_cohort_id bigint;
BEGIN
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
    NULL,
    COALESCE((p_volunteer ->> 'opt_in_communication')::boolean, true),
    NULLIF(TRIM(p_volunteer ->> 'notes'), '')
  )
  RETURNING id INTO v_volunteer_id;

  IF v_volunteer_id IS NULL THEN
    RAISE EXCEPTION 'Failed to insert volunteer';
  END IF;

  FOR v_role IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_roles, '[]'::jsonb))
  LOOP
    v_role_name := NULLIF(TRIM(v_role ->> 'name'), '');
    v_role_type := NULLIF(TRIM(v_role ->> 'type'), '');
    IF v_role_name IS NULL OR v_role_type IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id
      INTO v_role_id
    FROM public."Roles"
    WHERE name = v_role_name
      AND type = v_role_type
      AND is_active = true
    ORDER BY id
    LIMIT 1;

    IF v_role_id IS NULL THEN
      INSERT INTO public."Roles" (name, type)
      VALUES (v_role_name, v_role_type)
      RETURNING id INTO v_role_id;
    END IF;

    IF v_role_id IS NOT NULL THEN
      INSERT INTO public."VolunteerRoles" (volunteer_id, role_id)
      VALUES (v_volunteer_id, v_role_id)
      ON CONFLICT ON CONSTRAINT "VolunteerRoles_pkey" DO NOTHING;
    END IF;
  END LOOP;

  FOR v_cohort IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_cohorts, '[]'::jsonb))
  LOOP
    IF TRIM(COALESCE(v_cohort ->> 'year', '')) !~ '^\d+$' THEN
      CONTINUE;
    END IF;

    v_cohort_year := (v_cohort ->> 'year')::smallint;
    v_cohort_term := NULLIF(TRIM(v_cohort ->> 'term'), '');

    IF v_cohort_term IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id
      INTO v_cohort_id
    FROM public."Cohorts"
    WHERE year = v_cohort_year AND term = v_cohort_term
    LIMIT 1;

    IF v_cohort_id IS NULL THEN
      INSERT INTO public."Cohorts" (year, term)
      VALUES (v_cohort_year, v_cohort_term)
      RETURNING id INTO v_cohort_id;
    END IF;

    IF v_cohort_id IS NOT NULL THEN
      INSERT INTO public."VolunteerCohorts" (volunteer_id, cohort_id)
      VALUES (v_volunteer_id, v_cohort_id)
      ON CONFLICT ON CONSTRAINT "VolunteerCohorts_pkey" DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_volunteer_id;
END;
$$;

COMMENT ON FUNCTION public.create_volunteer_with_roles_and_cohorts(jsonb, jsonb, jsonb) IS
  'Creates a volunteer with optional many roles and cohorts. Position is always null.';

GRANT EXECUTE ON FUNCTION public.create_volunteer_with_roles_and_cohorts(jsonb, jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_volunteer_with_roles_and_cohorts(jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_volunteer_with_roles_and_cohorts(jsonb, jsonb, jsonb) TO service_role;
