-- Allow anon to read/write public.Users for local development and tests (matches other tables).
CREATE POLICY "full permission for development phase" ON "public"."Users" TO "anon" USING (true) WITH CHECK (true);
