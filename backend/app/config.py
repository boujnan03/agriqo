"""Backend settings: external API base URLs, timeouts, cache lifetimes, API keys.

Secrets come ONLY from environment variables (see the repo-root `.env.example`).
Everything here is read at call time (not import time), so tests can monkeypatch it.
"""
import os

# --- External APIs (all verified against official docs / live calls, 2026-11-15) ---
POWER_CLIMATOLOGY_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
OPENTOPO_URL = "https://portal.opentopography.org/API/globaldem"
OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast"

# Hard limit per external call (connect + response + body), spec §4 "Règles techniques".
EXTERNAL_TIMEOUT_S: float = 15.0

# Background re-fetch after a request-path timeout (app/background.py; SoilGrids only).
# The request itself still gives up at EXTERNAL_TIMEOUT_S: these budgets only apply to the
# task that keeps trying afterwards, so a slow answer (SoilGrids took 6-40 s on 2026-11-15)
# can still arrive and be cached instead of being cut off at 15 s every time.
BACKGROUND_TIMEOUT_S: float = 60.0  # per background attempt
BACKGROUND_ATTEMPTS: int = 3
BACKGROUND_BACKOFF_S: tuple[float, ...] = (5.0, 15.0)  # pauses between attempts

# Generic client name only: no personal or team contact details sent to third parties.
USER_AGENT = "FieldShift-backend/0.1 (NASA Space Apps 2026 hackathon MVP)"


def opentopo_api_key() -> str | None:
    """OpenTopography key from the environment; None (not "") when unset or blank."""
    key = os.environ.get("OPENTOPO_API_KEY", "").strip()
    return key or None
