-- Persist custom_data on volunteer create (modal) and optional merge on CSV upsert.

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
  v_custom jsonb;
BEGIN
  v_custom := COALESCE(p_volunteer -> 'custom_data', '{}'::jsonb);
  IF jsonb_typeof(v_custom) IS DISTINCT FROM 'object' THEN
    v_custom := '{}'::jsonb;
  END IF;

  INSERT INTO public."Volunteers" (
    name_org,
    pseudonym,
    pronouns,
    email,
    phone,
    position,
    opt_in_communication,
    notes,
    custom_data
  )
  VALUES (
    (p_volunteer ->> 'name_org'),
    NULLIF(TRIM(p_volunteer ->> 'pseudonym'), ''),
    NULLIF(TRIM(p_volunteer ->> 'pronouns'), ''),
    NULLIF(TRIM(p_volunteer ->> 'email'), ''),
    NULLIF(TRIM(p_volunteer ->> 'phone'), ''),
    NULL,
    COALESCE((p_volunteer ->> 'opt_in_communication')::boolean, true),
    NULLIF(TRIM(p_volunteer ->> 'notes'), ''),
    v_custom
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

DROP FUNCTION IF EXISTS public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION public.upsert_volunteer_with_roles_and_cohorts(
	p_name text,
	p_pronouns text,
	p_email text,
	p_phone text,
	p_position text,
	p_cohort jsonb,
	p_roles jsonb,
	p_notes text,
	p_custom_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_volunteer_id bigint;
	v_role jsonb;
	v_role_name text;
	v_role_status text;
	v_role_id bigint;
	v_role_type_seed text;
	v_year smallint;
	v_term text;
	v_cohort_id bigint;
	v_link_role_id bigint;
	v_role_ids jsonb := '[]'::jsonb;
  	v_cohort_info jsonb := NULL;
BEGIN
	p_name := NULLIF(TRIM(p_name), '');
	p_email := NULLIF(TRIM(p_email), '');
	p_position := lower(NULLIF(TRIM(p_position), ''));
	p_pronouns := NULLIF(TRIM(p_pronouns), '');
	p_phone := NULLIF(TRIM(p_phone), '');
	p_notes := NULLIF(TRIM(p_notes), '');

	IF p_custom_data IS NOT NULL AND jsonb_typeof(p_custom_data) IS DISTINCT FROM 'object' THEN
		p_custom_data := '{}'::jsonb;
	END IF;

	-- Upsert by same (name_org, email) using strict equality.
	SELECT id
		INTO v_volunteer_id
	FROM public."Volunteers"
	WHERE name_org = p_name
		AND email = p_email
	ORDER BY id
	LIMIT 1;

	IF v_volunteer_id IS NULL THEN
		INSERT INTO public."Volunteers" (
			name_org,
			pronouns,
			email,
			phone,
			position,
			notes,
			custom_data
		)
		VALUES (
			p_name,
			p_pronouns,
			p_email,
			p_phone,
			p_position,
			p_notes,
			COALESCE(p_custom_data, '{}'::jsonb)
		)
		RETURNING id INTO v_volunteer_id;
	ELSE
		UPDATE public."Volunteers"
		SET
			pronouns = p_pronouns,
			email = p_email,
			phone = p_phone,
			position = p_position,
			notes = p_notes,
			custom_data = CASE
				WHEN p_custom_data IS NULL THEN custom_data
				ELSE COALESCE(custom_data, '{}'::jsonb) || p_custom_data
			END,
			updated_at = now()
		WHERE id = v_volunteer_id;
	END IF;

	-- Add-only behavior: keep existing links and insert missing links from payload.
	-- Roles payload shape: [{"name": "Front Desk", "status": "current"}, ...]
	FOR v_role IN
		SELECT value FROM jsonb_array_elements(COALESCE(p_roles, '[]'::jsonb))
	LOOP
		v_role_name := NULLIF(TRIM(v_role ->> 'name'), '');
		v_role_status := lower(NULLIF(TRIM(v_role ->> 'status'), ''));
		v_link_role_id := NULL;

		FOREACH v_role_type_seed IN ARRAY ARRAY['prior', 'current', 'future_interest']
		LOOP
			-- Prefer existing active role for this (name, type)
			SELECT id
				INTO v_role_id
			FROM public."Roles"
			WHERE name = v_role_name
				AND type = v_role_type_seed
				AND is_active = true
			ORDER BY id
			LIMIT 1;

			-- If not found, create and capture id. is_active defaults to true
			IF v_role_id IS NULL THEN
				INSERT INTO public."Roles" (name, type)
				VALUES (v_role_name, v_role_type_seed)
				RETURNING id INTO v_role_id;
			END IF;

			-- Keep the id for the status we need to link
			IF v_role_type_seed = v_role_status THEN
				v_link_role_id := v_role_id;
			END IF;
		END LOOP;

		INSERT INTO public."VolunteerRoles" (volunteer_id, role_id)
		VALUES (v_volunteer_id, v_link_role_id)
		ON CONFLICT DO NOTHING;
	END LOOP;

	-- Cohort payload shape: {"year": 2025, "season": "Summer"}
	IF p_cohort IS NOT NULL THEN

		IF TRIM(p_cohort ->> 'year') !~ '^\d+$' THEN
			RAISE EXCEPTION 'Invalid cohort year in payload: %', p_cohort;
		END IF;

		v_year := (p_cohort ->> 'year')::smallint;
		v_term := NULLIF(TRIM(p_cohort ->> 'season'), '');

		SELECT id
			INTO v_cohort_id
		FROM public."Cohorts"
		WHERE year = v_year
			AND term = v_term
		ORDER BY id
			LIMIT 1;

		IF v_cohort_id IS NULL THEN
			INSERT INTO public."Cohorts" (year, term)
			VALUES (v_year, v_term)
			RETURNING id INTO v_cohort_id;
		END IF;

		INSERT INTO public."VolunteerCohorts" (volunteer_id, cohort_id)
		VALUES (v_volunteer_id, v_cohort_id)
		ON CONFLICT DO NOTHING;
	END IF;

	RETURN v_volunteer_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text, jsonb) IS
	'Upserts volunteer by (name_org,email), merges optional p_custom_data into custom_data, ensures roles/cohorts exist, and inserts missing VolunteerRoles/VolunteerCohorts links.';

GRANT EXECUTE ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text, jsonb) TO service_role;
