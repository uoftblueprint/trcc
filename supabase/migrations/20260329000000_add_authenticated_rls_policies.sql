-- Add RLS policies for authenticated users on all data tables.
-- Previously only "anon" policies existed, so logged-in users got zero rows.

CREATE POLICY "Allow authenticated read access on Volunteers"
  ON "public"."Volunteers"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access on Cohorts"
  ON "public"."Cohorts"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access on Roles"
  ON "public"."Roles"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access on VolunteerCohorts"
  ON "public"."VolunteerCohorts"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access on VolunteerRoles"
  ON "public"."VolunteerRoles"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access on Users"
  ON "public"."Users"
  FOR SELECT
  TO authenticated
  USING (true);

