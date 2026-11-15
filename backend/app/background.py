"""Keep fetching a source in the background after it timed out on the request path.

Why: SoilGrids is often slower than the 15 s the request path allows (6-40 s observed on
2026-11-15). The request must not wait longer, and must never invent a value, so it answers
`indisponible` (timeout) right away; this module then keeps trying in the background and, once
a real answer arrives, stores it in the shared coordinate-keyed cache (app/cache.py). The next
request for the same point (e.g. the farmer pressing "Retry") is served from the cache.

Rules:
- One background task per (source, rounded point): concurrent callers share it (dedupe).
- Each attempt is bounded (config.BACKGROUND_TIMEOUT_S), attempts are bounded
  (config.BACKGROUND_ATTEMPTS) with pauses between them: it gives up eventually, and then
  nothing is cached, so the source stays `indisponible` until a later request succeeds.
- Only real answers (ok / pas_de_donnees) are cached, by run_source, exactly as on the
  request path.
- Tasks are process-local, like the cache, and cancelled on shutdown (main.lifespan).
"""
from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from app import config
from app.cache import CacheKey, cache_key
from app.sources._runner import Outcome, run_source

log = logging.getLogger(__name__)

# Strong references: asyncio only keeps weak ones to running tasks.
_tasks: dict[CacheKey, asyncio.Task[Outcome]] = {}


def pending(
    namespace: str, lat: float, lon: float, variant: str = ""
) -> asyncio.Task[Outcome] | None:
    """The background re-fetch currently running for this source and point, if any."""
    task = _tasks.get(cache_key(namespace, lat, lon, variant))
    return task if task is not None and not task.done() else None


def ensure_refetch(
    namespace: str,
    lat: float,
    lon: float,
    fetch: Callable[[float], Awaitable[Any]],
    variant: str = "",
) -> asyncio.Task[Outcome]:
    """Start a background re-fetch for this source and point, or return the running one.

    `fetch(timeout_s)` performs one call; it receives the per-attempt budget so it can lift
    the HTTP client's own per-operation timeout to match.
    """
    running = pending(namespace, lat, lon, variant)
    if running is not None:
        return running
    key = cache_key(namespace, lat, lon, variant)
    task = asyncio.create_task(
        _refetch(namespace, lat, lon, fetch, variant), name=f"refetch:{key}"
    )
    _tasks[key] = task

    def _forget(done: asyncio.Task[Outcome]) -> None:
        if _tasks.get(key) is done:
            del _tasks[key]

    task.add_done_callback(_forget)
    return task


async def _refetch(
    namespace: str,
    lat: float,
    lon: float,
    fetch: Callable[[float], Awaitable[Any]],
    variant: str,
) -> Outcome:
    budget = config.BACKGROUND_TIMEOUT_S
    outcome = Outcome("indisponible", error="timeout")
    for attempt in range(config.BACKGROUND_ATTEMPTS):
        if attempt:
            pauses = config.BACKGROUND_BACKOFF_S
            await asyncio.sleep(pauses[min(attempt - 1, len(pauses) - 1)])
        outcome = await run_source(
            namespace, lat, lon, lambda: fetch(budget), variant=variant, timeout_s=budget
        )
        if outcome.status != "indisponible":
            log.info("%s: background re-fetch succeeded (attempt %d)", namespace, attempt + 1)
            return outcome  # run_source already cached it
    log.warning(
        "%s: background re-fetch gave up after %d attempts (%s)",
        namespace,
        config.BACKGROUND_ATTEMPTS,
        outcome.error,
    )
    return outcome


async def cancel_all() -> None:
    """Stop every running re-fetch (app shutdown)."""
    tasks = list(_tasks.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    _tasks.clear()
