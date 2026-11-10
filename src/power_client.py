"""NASA POWER daily point client.

Response structure (verified with a real call, API v2.10.3):
    {
      "geometry": {"coordinates": [lon, lat, elevation_m]},
      "header": {"fill_value": -999.0, "start": "YYYYMMDD", "end": "YYYYMMDD", "sources": [...]},
      "properties": {"parameter": {"T2M": {"20250101": 7.0, ...}, ...}},
      "parameters": {"T2M": {"units": "C", "longname": "..."}, ...},
      "messages": []
    }

Fill value -999 means missing -> converted to NaN.
Responses are cached to data/cache/ as raw JSON. If the network fails, a bundled
Beni Mellal response (data/fallback_beni_mellal.json) is used so the demo works offline.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
import requests

API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = [
    "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR",
    "GWETTOP", "GWETROOT", "RH2M", "ALLSKY_SFC_SW_DWN",
]
FILL_VALUE = -999.0

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data" / "cache"
FALLBACK_FILE = ROOT / "data" / "fallback_beni_mellal.json"

DEFAULT_LAT, DEFAULT_LON = 32.34, -6.35
DEFAULT_START, DEFAULT_END = "20160101", "20251231"  # last 10 full years


@dataclass
class PowerData:
    df: pd.DataFrame               # daily, DatetimeIndex, one column per parameter, NaN = missing
    lat: float                     # requested point
    lon: float
    source: str                    # "api" | "cache" | "fallback"
    start: str
    end: str
    elevation_m: float | None = None
    units: dict = field(default_factory=dict)
    note: str = ""                 # e.g. why fallback was used


def _cache_path(lat: float, lon: float, start: str, end: str) -> Path:
    return CACHE_DIR / f"{lat:.2f}_{lon:.2f}_{start}_{end}.json"


def fetch_raw(lat: float, lon: float, start: str, end: str, timeout: int = 90) -> dict:
    """Call the POWER API and return the raw JSON dict (raises on HTTP/network error)."""
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "start": start,
        "end": end,
        "format": "JSON",
    }
    r = requests.get(API_URL, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    if "properties" not in data or "parameter" not in data["properties"]:
        raise ValueError(f"Unexpected POWER response: {str(data)[:300]}")
    return data


def parse_response(data: dict) -> pd.DataFrame:
    """Raw POWER JSON -> daily DataFrame. Fill values (-999) become NaN."""
    fill = data.get("header", {}).get("fill_value", FILL_VALUE)
    params = data["properties"]["parameter"]
    df = pd.DataFrame(params)
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df.index.name = "date"
    df = df.apply(pd.to_numeric, errors="coerce").astype(float)
    # Treat fill value (and anything at or below it, defensively) as missing.
    df = df.mask(df <= fill + 1e-6, np.nan)
    # Physically impossible values -> missing (soil wetness is a 0-1 fraction; rain >= 0).
    for col in ("GWETTOP", "GWETROOT"):
        if col in df:
            df.loc[(df[col] < 0) | (df[col] > 1), col] = np.nan
    if "PRECTOTCORR" in df:
        df.loc[df["PRECTOTCORR"] < 0, "PRECTOTCORR"] = np.nan
    return df.sort_index()


def _to_powerdata(data: dict, lat: float, lon: float, source: str, note: str = "") -> PowerData:
    header = data.get("header", {})
    coords = data.get("geometry", {}).get("coordinates", [None, None, None])
    units = {k: v.get("units", "") for k, v in data.get("parameters", {}).items()}
    return PowerData(
        df=parse_response(data), lat=lat, lon=lon, source=source,
        start=header.get("start", ""), end=header.get("end", ""),
        elevation_m=coords[2] if len(coords) > 2 else None, units=units, note=note,
    )


def get_power_data(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON,
                   start: str = DEFAULT_START, end: str = DEFAULT_END,
                   use_cache: bool = True, offline: bool = False) -> PowerData:
    """Cache -> API -> bundled fallback (Beni Mellal). Never raises if fallback exists.
    offline=True (or env FIELDSHIFT_OFFLINE=1) skips the network entirely (demo safety)."""
    offline = offline or os.environ.get("FIELDSHIFT_OFFLINE") == "1"
    lat, lon = round(lat, 2), round(lon, 2)
    path = _cache_path(lat, lon, start, end)
    if use_cache and path.exists():
        return _to_powerdata(json.loads(path.read_text(encoding="utf-8")), lat, lon, "cache")
    try:
        if offline:
            raise ConnectionError("offline mode")
        data = fetch_raw(lat, lon, start, end)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")
        return _to_powerdata(data, lat, lon, "api")
    except Exception as exc:  # network down, timeout, API error...
        if not FALLBACK_FILE.exists():
            raise
        data = json.loads(FALLBACK_FILE.read_text(encoding="utf-8"))
        note = (f"API NASA POWER indisponible ({type(exc).__name__}). "
                f"Données de secours pour Beni Mellal ({DEFAULT_LAT}, {DEFAULT_LON}) utilisées.")
        return _to_powerdata(data, DEFAULT_LAT, DEFAULT_LON, "fallback", note)


def build_fallback() -> Path:
    """Download the Beni Mellal 10-year response and store it as the offline fallback."""
    data = fetch_raw(DEFAULT_LAT, DEFAULT_LON, DEFAULT_START, DEFAULT_END)
    FALLBACK_FILE.write_text(json.dumps(data), encoding="utf-8")
    return FALLBACK_FILE


if __name__ == "__main__":
    import sys
    if "--build-fallback" in sys.argv:
        print("Fallback written to", build_fallback())
    pdata = get_power_data()
    print(f"source={pdata.source} point=({pdata.lat},{pdata.lon}) "
          f"range={pdata.start}-{pdata.end} elevation={pdata.elevation_m} m")
    if pdata.note:
        print("note:", pdata.note)
    print(pdata.df.shape)
    print(pdata.df.head(3))
    print("missing share per column:\n", pdata.df.isna().mean().round(4))
