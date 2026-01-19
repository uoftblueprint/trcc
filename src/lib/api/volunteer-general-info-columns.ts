export const VOLUNTEER_GENERAL_INFO_COLUMNS = [
  "name_org",
  "pseudonym",
  "pronouns",
  "email",
  "phone",
  "position",
  "opt_in_communication",
] as const;

export type VolunteerGeneralInfoColumn =
  (typeof VOLUNTEER_GENERAL_INFO_COLUMNS)[number];
