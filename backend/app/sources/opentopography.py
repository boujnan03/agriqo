"""OpenTopography Global DEM API (free key): elevation + mean slope around a point.

Verified 2026-11-15 against https://portal.opentopography.org/apidocs/openapi.json:
- GET /API/globaldem?demtype=SRTMGL1&south&north&west&east&outputFormat=GTiff&API_Key
- 200 = GeoTIFF bytes, 204 = No Data, 400 bad request, 401 missing/invalid key
  (checked live without a key -> 401 "API Key required").
SRTM GL1 = 1 arc-second (~30 m), coverage 60°N-56°S. Static data: cached for weeks.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import httpx
import numpy as np
from rasterio.io import MemoryFile

from app import config
from app.sources._runner import NO_DATA, MissingApiKey, NoData

DEM_TYPE = "SRTMGL1"
# Half the side of the box requested around the point: 250 m -> a ~500 m x 500 m box.
HALF_BOX_M = 250.0
M_PER_DEG_LAT = 111_320.0


@dataclass(frozen=True)
class Terrain:
    altitude: float | None
    slope_pct: float | None


def bbox(lat: float, lon: float) -> dict[str, float]:
    dlat = HALF_BOX_M / M_PER_DEG_LAT
    dlon = HALF_BOX_M / (M_PER_DEG_LAT * max(math.cos(math.radians(lat)), 1e-6))
    return {
        "south": round(max(lat - dlat, -90.0), 6),
        "north": round(min(lat + dlat, 90.0), 6),
        "west": round(max(lon - dlon, -180.0), 6),
        "east": round(min(lon + dlon, 180.0), 6),
    }


async def fetch(client: httpx.AsyncClient, lat: float, lon: float) -> Terrain | NoData:
    key = config.opentopo_api_key()
    if key is None:
        raise MissingApiKey("OPENTOPO_API_KEY is not set")
    resp = await client.get(
        config.OPENTOPO_URL,
        params={"demtype": DEM_TYPE, **bbox(lat, lon), "outputFormat": "GTiff", "API_Key": key},
    )
    if resp.status_code == 204:
        return NO_DATA
    resp.raise_for_status()
    return parse_geotiff(resp.content, lat, lon)


def parse_geotiff(content: bytes, lat: float, lon: float) -> Terrain | NoData:
    with MemoryFile(content) as mem, mem.open() as ds:
        band = ds.read(1, masked=True).astype("float64")
        if band.count() == 0:  # every pixel is nodata
            return NO_DATA
        z = band.filled(np.nan)

        row, col = ds.index(lon, lat)
        row = min(max(row, 0), z.shape[0] - 1)
        col = min(max(col, 0), z.shape[1] - 1)
        alt = z[row, col]
        altitude = None if math.isnan(alt) else round(float(alt))

        slope_pct = None
        if z.shape[0] >= 2 and z.shape[1] >= 2:
            # Pixel size in metres: geographic rasters (SRTM is EPSG:4326) are in degrees.
            dx, dy = abs(ds.transform.a), abs(ds.transform.e)
            if ds.crs is None or ds.crs.is_geographic:
                dx *= M_PER_DEG_LAT * math.cos(math.radians(lat))
                dy *= M_PER_DEG_LAT
            dz_dy, dz_dx = np.gradient(z, dy, dx)
            slope = np.hypot(dz_dx, dz_dy) * 100.0
            if np.isfinite(slope).any():
                slope_pct = round(float(np.nanmean(slope)), 1)

    return Terrain(altitude=altitude, slope_pct=slope_pct)
