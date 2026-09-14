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

/**
 * One customer, one string.
 *
 * `normalisePhone` takes out the spaces and dashes people type but leaves the
 * digits exactly as given, so the same person is three different customers
 * depending on how they filled the form:
 *
 *     01755667788       8801755667788       +8801755667788
 *
 * Every one of those is a valid way to write one number, and the shop compared
 * them as strings. It cost real money and real support calls:
 *
 *   - `perPhoneLimit` counted uses with an exact match, so a code marked
 *     once-per-customer was spent three times by one phone.
 *   - `lookupOrder` matched exactly too, so a guest who typed `+880` at
 *     checkout was told "we can't find that order" when they later typed
 *     their number the ordinary way — which is how the tracker's own
 *     placeholder shows it.
 *   - "returning customers" in the analytics counted that person as three.
 *
 * So anything that *identifies* a customer — storing a number on an order or
 * an account, looking one up, counting coupon uses — goes through here first
 * and compares the local `01XXXXXXXXX` form. The shop's own contact number is
 * deliberately not canonicalised: it is displayed rather than matched, and
 * `+880` is how you publish a number people may ring from abroad.
 *
 * Anything that is not recognisably a Bangladeshi mobile comes back as its
 * bare digits, unchanged in length — `isBDMobile` is what decides whether it
 * is acceptable, and quietly reshaping junk would only hide the rejection.
 */
export function canonicalPhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  // +8801XXXXXXXXX / 8801XXXXXXXXX — the country code, written out.
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  // 1XXXXXXXXX — the leading zero dropped, as phones and spreadsheets do.
  if (digits.length === 10 && digits.startsWith("1")) return `0${digits}`;

  return digits;
}
