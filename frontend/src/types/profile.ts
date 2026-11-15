/** Unit systems the app can display. Metric only for now (no unit conversion exists). */
export type UnitSystem = "metric";

/** Data behind the "Profile" screen (design.md §7.9). Demo values, no real account. */
export interface ProfileData {
  /** Placeholder demo name, not a real person. */
  name: string;
  /** Place name, e.g. "Béni Mellal". */
  location: string;
  /** Placeholder demo address (reserved example.com domain), not a real inbox. */
  email: string;
  /** Placeholder demo number in the Moroccan format, not a real line. */
  phone: string;
  /** Year the account was created, e.g. "2026". */
  memberSince: string;
  /** Initial state of the notifications setting (display only, never persisted). */
  notificationsEnabled: boolean;
  units: UnitSystem;
}
