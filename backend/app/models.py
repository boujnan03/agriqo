"""Pydantic models for every request and response of the API.

Response blocks follow docs/SPEC_Diagnostic_Parcelle.md §4: one block per data source, each
carrying its own `status` and `source`. A missing value is reported as missing (null / a
non-ok status), NEVER replaced by an invented number.

Serialization rule (see `SourcedBlock`):
- `status == "ok"`: every data field is present; a value the source did not provide is an
  explicit `null`.
- any other status: only the fields that carry information are sent (status, source,
  error or message), as in the spec's `"terrain": {"status": "indisponible", ...}` example.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_serializer

# ok: real values. indisponible: the source failed / timed out / is not configured.
# pas_de_donnees: the source answered, but has nothing for this location (water, city...).
Status = Literal["ok", "indisponible", "pas_de_donnees"]

# Fields that are dropped whenever they are null, whatever the status.
_META_FIELDS = frozenset({"error", "message", "note"})


class SourcedBlock(BaseModel):
    status: Status
    source: str
    # Only when status == "indisponible": "timeout", "http_<code>", "network_error",
    # "invalid_response" or "missing_api_key". Machine-readable, for logs and the UI.
    error: str | None = None
    # Only when status == "pas_de_donnees": a plain-language (French) explanation.
    message: str | None = None
    # Mandatory caveats about the data (resolution, estimation, definitions).
    note: str | None = None

    @model_serializer(mode="wrap")
    def _omit_empty(self, handler: Any) -> dict[str, Any]:
        data = handler(self)
        return {
            k: v
            for k, v in data.items()
            if v is not None or (self.status == "ok" and k not in _META_FIELDS)
        }


# ---------------------------------------------------------------------------- diagnostic


class DiagnosticRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lat: float = Field(ge=-90, le=90, allow_inf_nan=False, examples=[32.40])
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False, examples=[-6.45])
    # Accepted for forward compatibility (drawn parcel, GeoJSON). Not used yet: every
    # source is queried at the point (lat, lon).
    polygon: dict[str, Any] | list[Any] | None = None
    # Accepted for the teammate's future recommendation model. NOT used by this service.
    previous_crop: str | None = Field(default=None, max_length=100, examples=["blé"])


class Location(BaseModel):
    lat: float
    lon: float


# USDA texture classes, as snake_case keys the frontend translates (AR/FR/EN).
TextureClass = Literal[
    "clay",
    "silty_clay",
    "sandy_clay",
    "clay_loam",
    "silty_clay_loam",
    "sandy_clay_loam",
    "loam",
    "silt_loam",
    "sandy_loam",
    "silt",
    "loamy_sand",
    "sand",
]


class SoilBlock(SourcedBlock):
    texture_class: TextureClass | None = None
    clay_pct: float | None = None
    sand_pct: float | None = None
    silt_pct: float | None = None
    ph: float | None = None
    organic_carbon_g_kg: float | None = None
    # Soil layer the values describe (depth-weighted mean of SoilGrids' 0-5/5-15/15-30 cm).
    depth: str | None = None


class DateRange(BaseModel):
    start: str
    end: str


class ClimateBlock(SourcedBlock):
    temp_mean_c: float | None = None
    temp_max_c: float | None = None
    rain_mm_year: int | None = None
    frost_days: int | None = None
    # Period of the climatology figures (temp_mean_c, temp_max_c, rain_mm_year), e.g. "2001-2025".
    climatology_period: str | None = None
    # Days actually counted for frost_days (the last 12 months of POWER daily data).
    frost_days_period: DateRange | None = None


SoilMoistureLabel = Literal["sec", "moyen", "humide"]


class SoilMoistureBlock(SourcedBlock):
    # NASA POWER surface (GWETTOP, top ~5 cm) and root-zone (GWETROOT) soil wetness, 0..1.
    gwettop: float | None = None
    gwetroot: float | None = None
    label: SoilMoistureLabel | None = None
    # Day of the value: POWER daily data lags a few days behind today.
    date: str | None = None


class TerrainBlock(SourcedBlock):
    # Elevation at the point, metres above sea level (SRTM GL1).
    altitude: int | None = None
    # Mean slope over a ~500 m box centred on the point, percent.
    slope_pct: float | None = None


class DiagnosticResponse(BaseModel):
    location: Location
    soil: SoilBlock
    climate: ClimateBlock
    soil_moisture: SoilMoistureBlock
    terrain: TerrainBlock
    # NOTE: no `recommendations` field on purpose. They will come from a teammate's ML
    # model and attach here later (see app/diagnostic.py).


# ------------------------------------------------------------------------------- weather

# Condition keys the frontend can translate and draw. Superset of the frontend's current
# WeatherCondition union (sunny, partlyCloudy, cloudy, showers, rain): fog, drizzle, snow
# and thunderstorm are real WMO outcomes (fog is common in the Tadla plain in autumn) and
# must not be disguised as another condition. "unknown" = a code outside the WMO table.
WeatherCondition = Literal[
    "sunny",
    "partlyCloudy",
    "cloudy",
    "fog",
    "drizzle",
    "showers",
    "rain",
    "snow",
    "thunderstorm",
    "unknown",
]


class WeatherDay(BaseModel):
    date: str
    weather_code: int | None
    condition: WeatherCondition
    # lucide icon name (kebab-case), e.g. "cloud-sun". The frontend uses lucide-react.
    icon: str
    temp_max_c: float | None
    temp_min_c: float | None
    precip_probability_pct: float | None


class WeatherToday(BaseModel):
    date: str
    # Local time of the "current" observation/model step, ISO 8601, e.g. "2026-11-15T12:30".
    observed_at: str | None
    temp_c: float | None
    weather_code: int | None
    condition: WeatherCondition
    icon: str
    humidity_pct: float | None
    wind_kmh: float | None
    temp_max_c: float | None
    temp_min_c: float | None
    precip_probability_pct: float | None


class WeatherResponse(SourcedBlock):
    location: Location
    timezone: str | None = None
    today: WeatherToday | None = None
    # Today first, then the following days (7 in total when the source provides them).
    days: list[WeatherDay] | None = None
