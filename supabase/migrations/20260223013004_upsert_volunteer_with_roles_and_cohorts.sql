-- Upsert volunteer with ParsedVolunteer-shaped payload.
-- Behavior:
-- 1) Rejects missing/null/blank name.
-- 2) Creates missing roles for all three types (prior/current/future_interest) per role name.
-- 3) Creates missing cohort from {"year": YYYY, "season": "Season"} value.
-- 4) Upserts volunteer by (name_org, email), then adds missing junction rows from payload.


CREATE OR REPLACE FUNCTION public.upsert_volunteer_with_roles_and_cohorts(
	p_name text,
	p_pronouns text,
	p_email text,
	p_phone text,
	p_position text,
	p_cohort jsonb,
	p_roles jsonb,
	p_notes text
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
			notes
		)
		VALUES (
			p_name,
			p_pronouns,
			p_email,
			p_phone,
			p_position,
			p_notes
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

COMMENT ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text) IS
	'Upserts volunteer by (name_org,email), ensures roles/cohorts exist, and inserts missing VolunteerRoles/VolunteerCohorts links from individual ParsedVolunteer parameters.';


GRANT EXECUTE ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text) TO service_role;
