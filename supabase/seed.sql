truncate table
  public."VolunteerRoles",
  public."VolunteerCohorts",
  public."Volunteers",
  public."Roles",
  public."Cohorts",
  public."Users"
restart identity cascade;

-- Seed Roles
insert into public."Roles" ("id", "name", "type", "is_active", "created_at")
values
  (1, 'Admin', 'admin', true, now()),
  (2, 'Volunteer', 'volunteer', true, now());

-- Seed Cohorts
insert into public."Cohorts" ("id", "year", "term", "is_active", "created_at")
values
  (1, '2025', 'Spring', true, now()),
  (2, '2025', 'Fall', true, now());

-- Seed Volunteers
insert into public."Volunteers" ("id", "name_org", "pseudonym", "pronouns", "email", "phone", "position", "opt_in_communication", "created_at", "updated_at")
values
  (1, 'Test Volunteer One', 'Test', 'he/him', 'test1@example.com', '1234567890', 'member', true, now(), now()),
  (2, 'Test Volunteer Two', 'Test', 'he/him', 'test2@example.com', '1234567890', 'member', true, now(), now());