"""POST /api/parcel/diagnostic: soil, climate, soil moisture and relief for one point.

Four upstream calls run in parallel; each is independent (own timeout, own status), so a
slow or failing source only turns ITS block `indisponible`. See docs/SPEC_Diagnostic_Parcelle.md.
"""
from __future__ import annotations

import asyncio

import httpx

from app.cache import round_coord
from app.models import (
    ClimateBlock,
    DateRange,
    DiagnosticRequest,
    DiagnosticResponse,
    Location,
    SoilBlock,
    SoilMoistureBlock,
    TerrainBlock,
)
from app.sources import opentopography, power, soilgrids
from app.sources._runner import Outcome, run_source

SRC_SOIL = "ISRIC SoilGrids"
SRC_POWER = "NASA POWER"
SRC_TERRAIN = "OpenTopography"

# Plain-language messages / caveats (French, as in the spec).
MSG_NO_SOIL = "Pas de données de sol ici. Vérifiez que le point est sur une terre agricole."
NOTE_SOIL = "Estimation (~250 m), pas une analyse de laboratoire"
NOTE_CLIMATE = (
    "Résolution ~50 km : deux parcelles proches ont le même climat. "
    "temp_max_c = moyenne des 12 mois de la température maximale journalière moyenne "
    "(T2M_MAX_AVG) sur la période de climatologie : un maximum habituel, pas un record ; "
    "frost_days = jours avec T2M_MIN < 0 °C sur les 12 derniers mois (données journalières)."
)
NOTE_CLIMATE_NO_FROST = (
    NOTE_CLIMATE + " frost_days indisponible : données journalières NASA POWER non reçues."
)
NOTE_MOISTURE = (
    "Humidité de surface (GWETTOP, 0-1), résolution ~50 km, quelques jours de retard. "
    f"Seuils indicatifs du projet, à valider : sec < {power.MOISTURE_DRY_BELOW:.2f} "
    f"≤ moyen < {power.MOISTURE_WET_FROM:.2f} ≤ humide."
)
MSG_NO_MOISTURE = (
    f"Pas de mesure d'humidité du sol sur les {power.MOISTURE_MAX_AGE_DAYS} derniers jours ici."
)
NOTE_TERRAIN = "SRTM GL1 (~30 m). Pente moyenne sur ~500 m autour du point."
MSG_NO_TERRAIN = "Pas de données d'altitude pour ce point."


def _r1(v: float | None) -> float | None:
    return None if v is None else round(v, 1)


def soil_block(o: Outcome) -> SoilBlock:
    if o.status == "indisponible":
        return SoilBlock(status="indisponible", source=SRC_SOIL, error=o.error)
    if o.status == "pas_de_donnees":
        return SoilBlock(status="pas_de_donnees", source=SRC_SOIL, message=MSG_NO_SOIL)
    s: soilgrids.Soil = o.data
    return SoilBlock(
        status="ok",
        source=SRC_SOIL,
        texture_class=s.texture_class,
        clay_pct=s.clay_pct,
        sand_pct=s.sand_pct,
        silt_pct=s.silt_pct,
        ph=s.ph,
        organic_carbon_g_kg=s.organic_carbon_g_kg,
        depth=soilgrids.DEPTH_LABEL,
        note=NOTE_SOIL,
    )


def climate_block(clim: Outcome, daily: Outcome) -> ClimateBlock:
    """Status follows the climatology call (the block's main figures).

    frost_days comes from the daily call: if that one failed, it is null and the note
    says why. If the climatology failed, the whole block is indisponible.
    """
    if clim.status != "ok":
        return ClimateBlock(status="indisponible", source=SRC_POWER, error=clim.error)
    c: power.Climatology = clim.data
    if c.annual.get("T2M") is None and c.annual.get("PRECTOTCORR") is None:
        return ClimateBlock(
            status="pas_de_donnees", source=SRC_POWER, message="Pas de données climatiques ici."
        )

    frost = power.frost_days(daily.data) if daily.status == "ok" else None
    rain_rate = c.annual.get("PRECTOTCORR")  # mean mm/day over the climatology period
    return ClimateBlock(
        status="ok",
        source=SRC_POWER,
        temp_mean_c=_r1(c.annual.get("T2M")),
        # Typical daily high, averaged over the 12 months (T2M_MAX_AVG), not the
        # all-time hourly record that T2M_MAX holds. Null if any month is missing.
        temp_max_c=_r1(power.mean_of_months(c, "T2M_MAX_AVG")),
        # mm/day x 365.25 days = mean annual total.
        rain_mm_year=None if rain_rate is None else round(rain_rate * 365.25),
        frost_days=None if frost is None else frost.days,
        climatology_period=c.period,
        frost_days_period=None if frost is None else DateRange(start=frost.start, end=frost.end),
        note=NOTE_CLIMATE if frost is not None else NOTE_CLIMATE_NO_FROST,
    )


def soil_moisture_block(daily: Outcome) -> SoilMoistureBlock:
    if daily.status == "indisponible":
        return SoilMoistureBlock(status="indisponible", source=SRC_POWER, error=daily.error)
    current = power.current_soil_moisture(daily.data, as_of=power.today()) if daily.data else None
    if current is None:
        return SoilMoistureBlock(status="pas_de_donnees", source=SRC_POWER, message=MSG_NO_MOISTURE)
    return SoilMoistureBlock(
        status="ok",
        source=SRC_POWER,
        gwettop=round(current.gwettop, 2),
        gwetroot=None if current.gwetroot is None else round(current.gwetroot, 2),
        label=power.moisture_label(current.gwettop),
        date=current.date,
        note=NOTE_MOISTURE,
    )


def terrain_block(o: Outcome) -> TerrainBlock:
    if o.status == "indisponible":
        return TerrainBlock(status="indisponible", source=SRC_TERRAIN, error=o.error)
    t: opentopography.Terrain | None = o.data
    if o.status == "pas_de_donnees" or t is None or (t.altitude is None and t.slope_pct is None):
        return TerrainBlock(status="pas_de_donnees", source=SRC_TERRAIN, message=MSG_NO_TERRAIN)
    return TerrainBlock(
        status="ok", source=SRC_TERRAIN, altitude=t.altitude, slope_pct=t.slope_pct, note=NOTE_TERRAIN
    )


async def build_diagnostic(client: httpx.AsyncClient, req: DiagnosticRequest) -> DiagnosticResponse:
    # Query every API with the same rounded point the cache is keyed on.
    lat, lon = round_coord(req.lat), round_coord(req.lon)

    # run_source never raises: each call turns its own failure into an `indisponible`
    # outcome, so gather always returns four outcomes and no call can abort the others.
    clim, daily, soil, terrain = await asyncio.gather(
        run_source("power_climatology", lat, lon, lambda: power.fetch_climatology(client, lat, lon)),
        run_source("power_daily", lat, lon, lambda: power.fetch_daily(client, lat, lon)),
        run_source("soilgrids", lat, lon, lambda: soilgrids.fetch(client, lat, lon)),
        run_source("opentopography", lat, lon, lambda: opentopography.fetch(client, lat, lon)),
    )

    # RECOMMENDATIONS ATTACH HERE (later, not in this service): a teammate's ML model will
    # produce them from these blocks + `req.previous_crop`, and they will be added to the
    # response as a `recommendations` field. `req.previous_crop` and `req.polygon` are
    # accepted on the request for that forward compatibility but deliberately unused now.
    return DiagnosticResponse(
        location=Location(lat=req.lat, lon=req.lon),
        soil=soil_block(soil),
        climate=climate_block(clim, daily),
        soil_moisture=soil_moisture_block(daily),
        terrain=terrain_block(terrain),
    )
