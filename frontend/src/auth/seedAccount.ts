/**
 * The one demo account accepted by the Cover login gate (design.md §7.1).
 *
 * This is a UX gate, NOT security: there is no backend auth, no hashing, no registration and
 * no password reset. The credentials are public on purpose (documented in the repo README) so
 * anyone running the demo can get past Cover.
 */
export const SEED_ACCOUNT = {
  username: "demo",
  password: "tadla2026",
} as const;

/** True when the pair matches the seeded demo account (username is trimmed, both exact). */
export function checkCredentials(username: string, password: string): boolean {
  return (
    username.trim() === SEED_ACCOUNT.username &&
    password === SEED_ACCOUNT.password
  );
}
