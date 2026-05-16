-- Custom column definitions (admin-managed)
CREATE TABLE public."CustomColumns" (
  id serial PRIMARY KEY,
  name text NOT NULL,
  column_key text UNIQUE NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('text', 'number', 'boolean', 'tag')),
  tag_options text[] DEFAULT '{}',
  is_multi boolean DEFAULT false,
  default_position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public."Users"(id)
);

ALTER TABLE public."Volunteers"
  ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;

CREATE TABLE public."UserColumnPreferences" (
  user_id uuid PRIMARY KEY REFERENCES public."Users"(id) ON DELETE CASCADE,
  column_order jsonb DEFAULT '[]'::jsonb,
  hidden_columns jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.remove_custom_column_data(p_column_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public."Volunteers"
  SET custom_data = custom_data - p_column_key
  WHERE custom_data ? p_column_key;
$$;

ALTER TABLE public."CustomColumns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserColumnPreferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "full permission for development phase" ON public."CustomColumns" TO anon USING (true) WITH CHECK (true);
CREATE POLICY "full permission for development phase" ON public."UserColumnPreferences" TO anon USING (true) WITH CHECK (true);
