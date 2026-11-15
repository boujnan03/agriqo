"""French class names (from the model meta) -> stable type ids (spec §6.2, §9.1).

Never use the cluster NUMBER outside store.py: it changes with every retraining. The rest of
the app only sees these ids.
"""
from __future__ import annotations

LABEL_IDS: dict[str, str] = {
    "sèche et chaude": "dry_hot",
    "normale et fraîche": "normal_cool",
    "normale et chaude": "normal_hot",
    "très humide et fraîche": "very_wet_cool",
}

# Driest to wettest.
TYPE_ORDER: list[str] = ["dry_hot", "normal_cool", "normal_hot", "very_wet_cool"]
