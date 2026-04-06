-- Organization-wide volunteer table column visibility (admin-managed).
-- Merged with each user's UserColumnPreferences.hidden_columns when rendering the table.
CREATE TABLE public."VolunteerTableGlobalSettings" (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  admin_hidden_columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public."VolunteerTableGlobalSettings" (id) VALUES (1);

ALTER TABLE public."VolunteerTableGlobalSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "full permission for development phase" ON public."VolunteerTableGlobalSettings" TO anon USING (true) WITH CHECK (true);
