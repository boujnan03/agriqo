"""Run ONE external source call with the project's honesty rules.

- Hard timeout per call (config.EXTERNAL_TIMEOUT_S, 15 s), measured end to end.
- Any failure becomes an `indisponible` outcome with a short machine-readable reason.
  It never raises, so one source failing can't abort an `asyncio.gather` of several.
- "The source answered, but has nothing here" (`NoData`) is a different, legitimate answer:
  `pas_de_donnees`.
- Only real answers (ok / pas_de_donnees) are cached; failures are retried next time.
"""
from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Literal

import httpx

from app import config
from app.cache import cache

log = logging.getLogger(__name__)


class NoData:
    """Returned by a fetcher when the source answered but has no value for the point."""

    __slots__ = ()

    def __repr__(self) -> str:
        return "NoData()"


NO_DATA = NoData()


class MissingApiKey(Exception):
    """The source needs a key that is not configured: report it, don't call."""


@dataclass(frozen=True)
class Outcome:
    status: Literal["ok", "indisponible", "pas_de_donnees"]
    data: Any = None
    error: str | None = None


async def run_source(
    namespace: str,
    lat: float,
    lon: float,
    fetch: Callable[[], Awaitable[Any]],
    *,
    variant: str = "",
    timeout_s: float | None = None,
) -> Outcome:
    """`variant`: extra cache-key part for answers that depend on more than the point.
    `timeout_s`: end-to-end limit; the request path always uses EXTERNAL_TIMEOUT_S (15 s),
    only the background re-fetch (app/background.py) passes its own budget."""
    cached = cache.get(namespace, lat, lon, variant)
    if cached is not None:
        return cached

    limit = config.EXTERNAL_TIMEOUT_S if timeout_s is None else timeout_s
    try:
        async with asyncio.timeout(limit):
            result = await fetch()
    except (TimeoutError, httpx.TimeoutException):
        log.warning("%s: timed out after %ss", namespace, limit)
        return Outcome("indisponible", error="timeout")
    except httpx.HTTPStatusError as exc:
        log.warning("%s: HTTP %s", namespace, exc.response.status_code)
        return Outcome("indisponible", error=f"http_{exc.response.status_code}")
    except httpx.HTTPError as exc:
        log.warning("%s: network error: %r", namespace, exc)
        return Outcome("indisponible", error="network_error")
    except MissingApiKey:
        log.info("%s: no API key configured, source skipped", namespace)
        return Outcome("indisponible", error="missing_api_key")
    except Exception:  # malformed payload, unexpected shape, unreadable raster...
        log.exception("%s: invalid response", namespace)
        return Outcome("indisponible", error="invalid_response")

    outcome = Outcome("pas_de_donnees") if isinstance(result, NoData) else Outcome("ok", result)
    cache.set(namespace, lat, lon, outcome, variant)
    return outcome
