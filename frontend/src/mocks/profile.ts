import type { ProfileData } from "../types/profile";

/**
 * Mock profile for the "Profile" screen until accounts exist. `name` is a placeholder demo
 * value, not tied to any real person. Nothing here is persisted or sent anywhere.
 */
export const profileData: ProfileData = {
  name: "Youssef Amrani",
  location: "Béni Mellal",
  memberSince: "2026",
  notificationsEnabled: true,
  units: "metric",
};
