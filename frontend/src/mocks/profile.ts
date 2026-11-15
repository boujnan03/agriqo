import type { ProfileData } from "../types/profile";

/**
 * Mock profile for the "Profile" screen until accounts exist. `name` is a placeholder demo
 * value, not tied to any real person; the email (reserved example.com domain) and phone are
 * placeholders too. Nothing here is persisted or sent anywhere. The location is a place id,
 * translated through `places.<id>`.
 */
export const profileData: ProfileData = {
  name: "Youssef Amrani",
  location: "beniMellal", // shown through places.<id> (per-language name)
  email: "youssef.amrani@example.com",
  phone: "+212 6 00 00 00 00",
  memberSince: "2026",
  notificationsEnabled: true,
  units: "metric",
};
