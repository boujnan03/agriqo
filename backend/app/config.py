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

# Generic client name only: no personal or team contact details sent to third parties.
USER_AGENT = "FieldShift-backend/0.1 (NASA Space Apps 2026 hackathon MVP)"


def opentopo_api_key() -> str | None:
    """OpenTopography key from the environment; None (not "") when unset or blank."""
    key = os.environ.get("OPENTOPO_API_KEY", "").strip()
    return key or None
