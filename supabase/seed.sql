-- Seed data for Roles table
INSERT INTO public."Roles" (name, type, is_active, created_at)
VALUES
  ('Admin', 'Role 1', true, NOW()),
  ('Volunteer', 'Role 2', true, NOW())
ON CONFLICT DO NOTHING;

-- Seed data for Cohorts table
INSERT INTO public."Cohorts" (term, year, is_active, created_at)
VALUES
  ('Winter', 2024, true, NOW()),
  ('Spring', 2025, true, NOW()),
  ('Fall', 2025, true, NOW())
ON CONFLICT DO NOTHING;

-- Seed data for Volunteers table
INSERT INTO public."Volunteers" (name_org, email, phone, position, pronouns, pseudonym, opt_in_communication, created_at, updated_at)
VALUES
  ('Dummy', 'dummy@gmail.com', '9999999999', 'Volunteer', 'he/him', 'Dumb', true, NOW(), NOW()),
ON CONFLICT DO NOTHING;