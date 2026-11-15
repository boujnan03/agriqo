"""Background SoilGrids re-fetch after a timeout (app/background.py), with SIMULATED delays.

Timeline used by the end-to-end tests (all delays scaled down, mocked SoilGrids):
- request path limit EXTERNAL_TIMEOUT_S is tiny, the mocked SoilGrids answers slower than it
  but faster than the background per-attempt budget: the first request gets `indisponible`,
  the background task then gets the real answer and caches it, a later request returns it.
"""
from __future__ import annotations

import asyncio
import time

import httpx
import pytest

from app import background, config
from app.cache import cache
from conftest import load, mock_all_ok, soilgrids_route

URL = "/api/parcel/diagnostic"
TADLA = {"lat": 32.40, "lon": -6.45}


@pytest.fixture
def timings(monkeypatch: pytest.MonkeyPatch):
    """Request limit 0.3 s; background attempts up to 3 s, 0.05 s apart."""
    monkeypatch.setattr(config, "EXTERNAL_TIMEOUT_S", 0.3)
    monkeypatch.setattr(config, "BACKGROUND_TIMEOUT_S", 3.0)
    monkeypatch.setattr(config, "BACKGROUND_ATTEMPTS", 3)
    monkeypatch.setattr(config, "BACKGROUND_BACKOFF_S", (0.05,))


class SlowSoilGrids:
    """Mocked SoilGrids answering after a delay (one per call, the last one repeating).

    Counts calls as they START: respx only records a call once its response completes, so a
    call cancelled by the request timeout would otherwise be invisible.
    """

    def __init__(self, *delays_s: float):
        self.delays = list(delays_s)
        self.started = 0

    async def __call__(self, request):
        delay = self.delays[min(self.started, len(self.delays) - 1)]
        self.started += 1
        await asyncio.sleep(delay)
        return httpx.Response(200, json=load("soilgrids_tadla.json"))


def wait_until(predicate, timeout_s: float = 5.0) -> None:
    deadline = time.monotonic() + timeout_s
    while not predicate():
        if time.monotonic() > deadline:
            raise AssertionError("condition not met in time")
        time.sleep(0.05)


# ------------------------------------------------------------------------- unit level


def test_concurrent_refetches_for_one_point_are_deduplicated(timings):
    calls = []

    async def fetch(timeout_s):
        calls.append(timeout_s)
        await asyncio.sleep(0.1)
        return "SOIL"

    async def scenario():
        t1 = background.ensure_refetch("soilgrids", 32.4, -6.45, fetch)
        t2 = background.ensure_refetch("soilgrids", 32.40001, -6.44999, fetch)  # same point
        assert t1 is t2
        assert background.pending("soilgrids", 32.4, -6.45) is t1
        return await t1

    outcome = asyncio.run(scenario())
    assert outcome.status == "ok" and outcome.data == "SOIL"
    assert calls == [3.0]  # ONE call, given the background per-attempt budget
    assert cache.get("soilgrids", 32.4, -6.45).data == "SOIL"  # written to the shared cache
    assert background.pending("soilgrids", 32.4, -6.45) is None


def test_gives_up_after_bounded_attempts_and_caches_nothing(timings, monkeypatch):
    monkeypatch.setattr(config, "BACKGROUND_TIMEOUT_S", 0.05)
    calls = []

    async def always_slow(timeout_s):
        calls.append(timeout_s)
        await asyncio.sleep(1)

    async def scenario():
        return await background.ensure_refetch("soilgrids", 32.4, -6.45, always_slow)

    outcome = asyncio.run(scenario())
    assert outcome.status == "indisponible" and outcome.error == "timeout"
    assert len(calls) == config.BACKGROUND_ATTEMPTS
    assert cache.get("soilgrids", 32.4, -6.45) is None  # never a fabricated value


# --------------------------------------------------------------------- end to end


def test_timeout_then_background_fetch_then_retry_gets_real_soil(client, mock_api, timings):
    mock_all_ok(mock_api)
    # Slower than the request limit (0.3 s), faster than a background attempt (3 s).
    soilgrids = SlowSoilGrids(0.6)
    soilgrids_route(mock_api).mock(side_effect=soilgrids)

    start = time.perf_counter()
    first = client.post(URL, json=TADLA).json()["soil"]
    assert time.perf_counter() - start < 1.0  # the request did NOT wait for the slow answer
    assert first == {
        "status": "indisponible",
        "source": "ISRIC SoilGrids",
        "error": "timeout",
        "retry_pending": True,
    }

    # The background task finishes and fills the cache…
    wait_until(lambda: cache.get("soilgrids", 32.4, -6.45) is not None)
    # …so the retry (the same request) now gets the real values, from the cache.
    retry = client.post(URL, json=TADLA).json()["soil"]
    assert retry["status"] == "ok"
    assert retry["texture_class"] == "clay_loam" and retry["ph"] == 7.4
    assert "retry_pending" not in retry
    # 1 request-path call (timed out) + 1 background call. The retry made none.
    assert soilgrids.started == 2


def test_request_during_background_fetch_waits_for_it_not_a_new_call(
    client, mock_api, timings, monkeypatch
):
    monkeypatch.setattr(config, "EXTERNAL_TIMEOUT_S", 0.5)
    mock_all_ok(mock_api)
    # Request-path call: 1.0 s (times out at 0.5 s). Background call: 0.3 s, so it lands
    # ~0.3 s into the next request's own 0.5 s window.
    soilgrids = SlowSoilGrids(1.0, 0.3)
    soilgrids_route(mock_api).mock(side_effect=soilgrids)

    assert client.post(URL, json=TADLA).json()["soil"]["status"] == "indisponible"
    second = client.post(URL, json=TADLA).json()["soil"]
    assert second["status"] == "ok" and second["texture_class"] == "clay_loam"
    assert soilgrids.started == 2  # the second request made no SoilGrids call of its own


def test_still_pending_answer_is_bounded_and_honest(client, mock_api, timings):
    mock_all_ok(mock_api)
    soilgrids = SlowSoilGrids(2.0)
    soilgrids_route(mock_api).mock(side_effect=soilgrids)
    client.post(URL, json=TADLA)

    start = time.perf_counter()
    second = client.post(URL, json=TADLA).json()["soil"]
    # Still running in the background: the request waited at most its normal limit, then
    # said so, with no value of any kind.
    assert time.perf_counter() - start < 1.0
    assert second == {
        "status": "indisponible",
        "source": "ISRIC SoilGrids",
        "error": "timeout",
        "retry_pending": True,
    }
    assert soilgrids.started == 2  # request-path call + the background one, nothing more


def test_non_timeout_failure_starts_no_background_fetch(client, mock_api, timings):
    mock_all_ok(mock_api)
    soilgrids_route(mock_api).respond(503)
    soil = client.post(URL, json=TADLA).json()["soil"]
    assert soil == {"status": "indisponible", "source": "ISRIC SoilGrids", "error": "http_503"}
    assert background.pending("soilgrids", 32.4, -6.45) is None
    assert soilgrids_route(mock_api).call_count == 1
