"""USDA soil texture class from sand / silt / clay percentages (the texture triangle).

Boundaries are the USDA-NRCS definitions (Soil Survey Manual / NRCS texture calculator),
written as the usual inequality set. Inputs are re-normalised to sum to 100 first, because
SoilGrids predicts each fraction independently and their sum is only approximately 100.
"""
from __future__ import annotations


def usda_texture_class(sand: float, silt: float, clay: float) -> str:
    total = sand + silt + clay
    if total <= 0:
        raise ValueError("sand + silt + clay must be > 0")
    sand, silt, clay = (100 * x / total for x in (sand, silt, clay))

    if silt + 1.5 * clay < 15:
        return "sand"
    if silt + 2 * clay < 30:
        return "loamy_sand"
    if clay >= 40:
        if silt >= 40:
            return "silty_clay"
        if sand > 45:
            return "sandy_clay"
        return "clay"
    if clay >= 35 and sand > 45:
        return "sandy_clay"
    if clay >= 27:
        if sand <= 20:
            return "silty_clay_loam"
        if sand <= 45:
            return "clay_loam"
        return "sandy_clay_loam"
    if clay >= 20 and silt < 28 and sand > 45:
        return "sandy_clay_loam"
    if silt >= 80 and clay < 12:
        return "silt"
    if silt >= 50:
        return "silt_loam"
    if clay >= 7 and silt >= 28 and sand <= 52:
        return "loam"
    return "sandy_loam"
