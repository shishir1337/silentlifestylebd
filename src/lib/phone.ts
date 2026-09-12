/**
 * Bangladeshi mobile numbers — one definition, deliberately.
 *
 * This pattern existed in three copies (checkout validation, the account
 * profile form, the SMS signup), which is exactly the kind of duplication that
 * is harmless until it isn't: Phase 2 adds a fourth caller on the server, and a
 * server that disagrees with the browser about what a valid number looks like
 * rejects orders the form just told the customer were fine.
 *
 * Operators are 013–019, so the third digit is constrained. `+880` and `880`
 * are accepted because people paste numbers in from their contacts that way.
 */
export const BD_MOBILE = /^(?:\+?880|0)1[3-9]\d{8}$/;

/** Removes the spaces and dashes people type. Never alters the digits. */
export function normalisePhone(input: string): string {
  return input.replace(/[\s-]/g, "");
}

/** Validates after normalising, so "017 1234 5678" is accepted. */
export function isBDMobile(input: string): boolean {
  return BD_MOBILE.test(normalisePhone(input));
}
