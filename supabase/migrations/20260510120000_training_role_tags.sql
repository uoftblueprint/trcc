-- Training column uses Roles.type = 'training' (name = free text), not Cohorts / VolunteerCohorts.

-- 1) Allow training on Roles
ALTER TABLE public."Roles" DROP CONSTRAINT IF EXISTS roles_type_check;

ALTER TABLE public."Roles"
  ADD CONSTRAINT roles_type_check CHECK (
    (type)::text = ANY (
      ARRAY[
        'prior'::text,
        'current'::text,
        'future_interest'::text,
        'training'::text
      ]
    )
  );

-- 2) Migrate existing VolunteerCohorts links into training tags ("Term Year")
INSERT INTO public."Roles" (name, type, is_active)
SELECT DISTINCT
  trim(both ' ' from (c.term || ' ' || c.year::text)),
  'training',
  true
FROM public."VolunteerCohorts" vc
JOIN public."Cohorts" c ON c.id = vc.cohort_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public."Roles" r
  WHERE r.type = 'training'
    AND lower(r.name) = lower(trim(both ' ' from (c.term || ' ' || c.year::text)))
);

INSERT INTO public."VolunteerRoles" (volunteer_id, role_id, created_at)
SELECT vc.volunteer_id, r.id, COALESCE(vc.created_at, now())
FROM public."VolunteerCohorts" vc
JOIN public."Cohorts" c ON c.id = vc.cohort_id
JOIN public."Roles" r
  ON r.type = 'training'
 AND lower(r.name) = lower(trim(both ' ' from (c.term || ' ' || c.year::text)))
ON CONFLICT ON CONSTRAINT "VolunteerRoles_pkey" DO NOTHING;

DELETE FROM public."VolunteerCohorts";

-- 3) Upsert from CSV: cohort cell becomes a training tag; role seeding includes training
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
RETURNS bigint
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
  v_link_role_id bigint;
  v_role_type_seed text;
  v_year smallint;
  v_term text;
  v_training_label text;
  v_training_role_id bigint;
BEGIN
  p_name := NULLIF(TRIM(p_name), '');
  p_email := NULLIF(TRIM(p_email), '');
  p_position := lower(NULLIF(TRIM(p_position), ''));
  p_pronouns := NULLIF(TRIM(p_pronouns), '');
  p_phone := NULLIF(TRIM(p_phone), '');
  p_notes := NULLIF(TRIM(p_notes), '');

  SELECT id
  INTO v_volunteer_id
  FROM public."Volunteers"
  WHERE name_org = p_name
    AND email IS NOT DISTINCT FROM p_email
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

  FOR v_role IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_roles, '[]'::jsonb))
  LOOP
    v_role_name := NULLIF(TRIM(v_role ->> 'name'), '');
    v_role_status := lower(NULLIF(TRIM(v_role ->> 'status'), ''));
    v_link_role_id := NULL;

    FOREACH v_role_type_seed IN ARRAY ARRAY['prior', 'current', 'future_interest', 'training']
    LOOP
      SELECT id
      INTO v_role_id
      FROM public."Roles"
      WHERE name = v_role_name
        AND type = v_role_type_seed
        AND is_active = true
      ORDER BY id
      LIMIT 1;

      IF v_role_id IS NULL THEN
        INSERT INTO public."Roles" (name, type)
        VALUES (v_role_name, v_role_type_seed)
        RETURNING id INTO v_role_id;
      END IF;

      IF v_role_type_seed = v_role_status THEN
        v_link_role_id := v_role_id;
      END IF;
    END LOOP;

    IF v_link_role_id IS NOT NULL THEN
      INSERT INTO public."VolunteerRoles" (volunteer_id, role_id)
      VALUES (v_volunteer_id, v_link_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Legacy cohort JSON: convert to one training tag "Season Year"
  IF p_cohort IS NOT NULL THEN
    IF TRIM(p_cohort ->> 'year') !~ '^\d+$' THEN
      RAISE EXCEPTION 'Invalid cohort year in payload: %', p_cohort;
    END IF;

    v_year := (p_cohort ->> 'year')::smallint;
    v_term := NULLIF(TRIM(p_cohort ->> 'season'), '');
    v_training_label := v_term || ' ' || v_year::text;

    SELECT id
    INTO v_training_role_id
    FROM public."Roles"
    WHERE name = v_training_label
      AND type = 'training'
      AND is_active = true
    ORDER BY id
    LIMIT 1;

    IF v_training_role_id IS NULL THEN
      INSERT INTO public."Roles" (name, type)
      VALUES (v_training_label, 'training')
      RETURNING id INTO v_training_role_id;
    END IF;

    INSERT INTO public."VolunteerRoles" (volunteer_id, role_id)
    VALUES (v_volunteer_id, v_training_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_volunteer_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_volunteer_with_roles_and_cohorts(text, text, text, text, text, jsonb, jsonb, text) IS
  'Upserts volunteer by (name_org, email). Roles use status prior|current|future_interest|training. Legacy p_cohort JSON adds a training tag.';

-- 4) Create volunteer RPC: ignore p_cohorts (training lives in p_roles with type training)
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
    v_role_type := NULLIF(TRIM(lower(v_role ->> 'type')), '');
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

  RETURN v_volunteer_id;
END;
$$;

COMMENT ON FUNCTION public.create_volunteer_with_roles_and_cohorts(jsonb, jsonb, jsonb) IS
  'Creates a volunteer with optional roles (types include training). p_cohorts is ignored; use roles with type training.';
