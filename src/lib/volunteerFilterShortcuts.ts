/** Used in `FilterTuple.values` so the server matches null or empty string. */
export const BLANK_FIELD_FILTER_VALUE = "__BLANK_FIELD__";

/**
 * Synthetic `FilterTuple.field` — volunteers with missing email or missing phone
 * (null or empty string for either).
 */
export const CONTACT_INCOMPLETE_FIELD = "contact_incomplete";

/** Only accepted value for {@link CONTACT_INCOMPLETE_FIELD}. */
export const CONTACT_INCOMPLETE_FILTER_VALUE = "true";
