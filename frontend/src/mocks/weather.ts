import type { WeatherData } from "../types/weather";
import { farmDiagnostic } from "./farmDiagnostic";

/**
 * Mock 7-day forecast for the picked parcel near Béni Mellal, mid-November 2026, until the
 * backend calls a real forecast API. Illustrative values only (plausible for the season: mild
 * sunny days, a wetter spell mid-week), NOT fetched from anywhere.
 *
 * Source is a forecast API (Open-Meteo), deliberately distinct from NASA POWER: POWER is
 * historical / climatology only and cannot forecast (design.md §7.8).
 */
export const weatherData: WeatherData = {
  location: farmDiagnostic.location,
  forecast: {
    status: "ok",
    source: "Open-Meteo",
    data: {
      today: {
        temp_c: 19,
        condition: "partlyCloudy",
        precip_probability_pct: 10,
        humidity_pct: 58,
        wind_kmh: 12,
      },
      days: [
        {
          date: "2026-11-15",
          condition: "partlyCloudy",
          temp_max_c: 21,
          temp_min_c: 9,
        },
        {
          date: "2026-11-16",
          condition: "sunny",
          temp_max_c: 23,
          temp_min_c: 10,
        },
        {
          date: "2026-11-17",
          condition: "sunny",
          temp_max_c: 22,
          temp_min_c: 8,
        },
        {
          date: "2026-11-18",
          condition: "cloudy",
          temp_max_c: 19,
          temp_min_c: 11,
        },
        {
          date: "2026-11-19",
          condition: "showers",
          temp_max_c: 16,
          temp_min_c: 12,
        },
        {
          date: "2026-11-20",
          condition: "rain",
          temp_max_c: 14,
          temp_min_c: 7,
        },
        {
          date: "2026-11-21",
          condition: "partlyCloudy",
          temp_max_c: 18,
          temp_min_c: 6,
        },
      ],
    },
  },
};
