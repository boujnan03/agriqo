import type { Block } from "./diagnostic";

/**
 * The exact JSON shape of the backend's `GET /api/weather/forecast` (Open-Meteo behind it;
 * backend/app/models.py). The backend maps WMO codes to these condition keys, so the frontend
 * never deals with WMO codes itself.
 */
export type WeatherCondition =
  | "sunny"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "showers"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "unknown";

/** Today: current conditions + today's daily figures. Any value can be null. */
export interface WeatherToday {
  date: string;
  observed_at: string | null;
  temp_c: number | null;
  weather_code: number | null;
  condition: WeatherCondition;
  /** lucide icon name chosen by the backend; the UI maps `condition` itself (typed). */
  icon: string;
  humidity_pct: number | null;
  wind_kmh: number | null;
  temp_max_c: number | null;
  temp_min_c: number | null;
  precip_probability_pct: number | null;
}

/** One day of the daily forecast. */
export interface WeatherDay {
  /** ISO date "YYYY-MM-DD"; the weekday shown is derived from it per language. */
  date: string;
  weather_code: number | null;
  condition: WeatherCondition;
  icon: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  precip_probability_pct: number | null;
}

/** One forecast API answers both today and the 7 days, so they share one status. */
export type ForecastResponse = Block<{
  timezone: string | null;
  today: WeatherToday;
  /** Today first, then the following days (7 in total). */
  days: WeatherDay[];
}> & { location: { lat: number; lon: number } };
