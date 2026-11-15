import type { ParcelLocation, SourcedData } from "./diagnostic";

/** Weather conditions the app can name and draw (one icon + one translated label each). */
export type WeatherCondition =
  "sunny" | "partlyCloudy" | "cloudy" | "showers" | "rain";

/** Current conditions, for the "today" summary. */
export interface WeatherNow {
  temp_c: number;
  condition: WeatherCondition;
  /** Chance of precipitation today, 0–100. */
  precip_probability_pct: number;
  /** Relative air humidity, 0–100. */
  humidity_pct: number;
  wind_kmh: number;
}

/** One day of the daily forecast. */
export interface ForecastDay {
  /** ISO date "YYYY-MM-DD"; the weekday shown is derived from it per language. */
  date: string;
  condition: WeatherCondition;
  temp_max_c: number;
  temp_min_c: number;
}

export interface WeatherForecast {
  today: WeatherNow;
  /** Today first, then the following days: 7 in total. */
  days: ForecastDay[];
}

/**
 * Data behind the Weather tab (design.md §7.8): the forecast for the parcel picked on Home.
 * One forecast API answers both the today summary and the 7 days, so they share one status.
 */
export interface WeatherData {
  location: ParcelLocation;
  forecast: SourcedData<WeatherForecast>;
}
