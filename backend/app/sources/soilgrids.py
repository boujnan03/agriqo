"""ISRIC SoilGrids v2.0 (no key): topsoil properties at a point.

Verified 2026-11-15 against https://rest.isric.org/soilgrids/v2.0/openapi.json + live calls:
- GET /properties/query?lon&lat&property=..&depth=..&value=mean (repeated params).
- properties.layers[] -> {name, unit_measure: {d_factor, mapped_units, target_units},
  depths[]: {label, range: {top_depth, bottom_depth}, values: {mean}}}.
- mapped value / d_factor = value in target units: clay/sand/silt g/kg -> %,
  phh2o pH*10 -> pH, soc dg/kg -> g/kg.
- water, cities and other masked cells return HTTP 200 with every mean == null
  (checked live: Atlantic 33.00,-9.50; Bin el Ouidane 32.10,-6.45; Casablanca 33.59,-7.62;
  and Béni Mellal city 32.34,-6.36).
Resolution ~250 m, model predictions: ESTIMATES, not a lab analysis.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx

from app import config
from app.soil_texture import usda_texture_class
from app.sources._runner import NO_DATA, NoData

PROPERTIES = ["clay", "sand", "silt", "phh2o", "soc"]
DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]
DEPTH_LABEL = "0-30cm"


@dataclass(frozen=True)
class Soil:
    texture_class: str | None
    clay_pct: float | None
    sand_pct: float | None
    silt_pct: float | None
    ph: float | None
    organic_carbon_g_kg: float | None


async def fetch(
    client: httpx.AsyncClient, lat: float, lon: float, timeout_s: float | None = None
) -> Soil | NoData:
    """`timeout_s` overrides the client's per-operation timeout (background re-fetch only)."""
    params: list[tuple[str, str | float]] = [("lon", lon), ("lat", lat)]
    params += [("property", p) for p in PROPERTIES]
    params += [("depth", d) for d in DEPTHS]
    params += [("value", "mean")]
    resp = await client.get(
        config.SOILGRIDS_URL,
        params=params,
        timeout=httpx.USE_CLIENT_DEFAULT if timeout_s is None else httpx.Timeout(timeout_s),
    )
    resp.raise_for_status()
    return parse(resp.json())


def _layer_value(layer: dict) -> float | None:
    """Thickness-weighted mean over the depths that have a value, in target units."""
    d_factor = layer["unit_measure"]["d_factor"]
    if not d_factor or d_factor <= 0:
        raise ValueError(f"unexpected d_factor {d_factor!r} for {layer.get('name')}")
    num = den = 0.0
    for depth in layer["depths"]:
        mean = depth["values"].get("mean")
        if mean is None:
            continue
        thickness = depth["range"]["bottom_depth"] - depth["range"]["top_depth"]
        num += mean * thickness
        den += thickness
    if den == 0:
        return None
    return num / den / d_factor


def parse(payload: dict) -> Soil | NoData:
    values = {layer["name"]: _layer_value(layer) for layer in payload["properties"]["layers"]}
    if all(v is None for v in values.values()):
        return NO_DATA

    clay, sand, silt = values.get("clay"), values.get("sand"), values.get("silt")
    texture = None
    if clay is not None and sand is not None and silt is not None and clay + sand + silt > 0:
        texture = usda_texture_class(sand=sand, silt=silt, clay=clay)

    def r(v: float | None) -> float | None:
        return None if v is None else round(v, 1)

    return Soil(
        texture_class=texture,
        clay_pct=r(clay),
        sand_pct=r(sand),
        silt_pct=r(silt),
        ph=r(values.get("phh2o")),
        organic_carbon_g_kg=r(values.get("soc")),
    )
