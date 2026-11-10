# Scoring rules (must match `src/scoring.py`)

```
Total = w_water·Water + w_soil·SoilHealth + w_climate·Climate      (each 0–100)
```
Weights come from the UI sliders and are **normalised to sum to 1**. Negative weights
count as 0, and if every weight is 0 they become equal (⅓ each).

A rotation is a list of crops, one per growing season. The sequence **repeats**, so
the last crop is followed by the first one again.

**Data origin:** climate inputs come from **NASA POWER** (see `src/features.py`). Crop
parameters come from `data/crops.json`. Those are approximate FAO-style values, **not
NASA data, and not validated**.

## 1. Water score: how much of each crop's need the rain covers
For each crop slot:
- `rain` = mean Oct–May rainfall (`season_rain_mm`). Perennial crops (`season: "year"`) use the
  mean annual rainfall instead.
- `deficit = max(0, water_need_mm − rain)`. This is what irrigation has to supply.
- `crop score = 100 × (1 − deficit / water_need_mm)`

Rotation score = the mean over all slots. The score breakdown also reports the
irrigation need in mm per season.

## 2. Soil health score (crop table only, no NASA data)
```
50 (base)
+ 15 × number of slots with nitrogen_effect = +1 (legumes fix N)
+ 10 × (number of distinct crop families − 1)        (diversity)
− 10 × number of consecutive same-family pairs, counting last→first   (monoculture)
+  5 × sum of soil_health_effect (−1/0/+1)
```
The result is clamped to the 0–100 range.

## 3. Climate score: crop tolerance against local stress
Location stress indices, each between 0 and 1, computed from NASA POWER:

| Stress | Formula |
|---|---|
| heat | `min(1, heat_days_season / 20)`. A heat day is one with T2M_MAX > 35 °C, counted Oct–May |
| heat (perennials) | `min(1, heat_days_year / 80)` |
| dry spell | `clip((dry_spell_season − 15) / (60 − 15), 0, 1)`. Uses the mean longest run of days with rain < 1 mm |
| variability | `min(1, season_rain_cv / 0.5)`. CV = coefficient of variation of seasonal rainfall from one season to the next |
| drought | `0.5 × dry spell + 0.5 × variability` |

For each crop:
`100 − 50 × heat × (5 − heat_tolerance)/4 − 50 × drought × (5 − drought_tolerance)/4`.
A crop with tolerance 5 loses no points. A crop with tolerance 1 loses up to 50 points
per factor. Rotation score = the mean over all slots.

## 4. Missing data and ranking
- If the inputs for a sub-score are missing (NaN), that sub-score is shown as
  unavailable. It is left out of the total, and the remaining weights are
  re-normalised so they still sum to 1 (see `weights_used`).
- Rotations are ranked by total score. If the gap between the top two is **under 3
  points**, the result is flagged **"too close to call"**.

## 5. Hand-computed example (`tests/test_scoring.py`)
Inputs:
- Rain: 300 mm seasonal, 400 mm annual
- 10 heat days per season, 40 per year
- Mean longest dry spell: 37.5 days
- Seasonal rainfall CV: 0.25

Resulting stress: heat 0.5, dry spell 0.5, variability 0.5, drought 0.5.

Two test crops:

| Crop | Family | Need (mm) | Heat tol. | Drought tol. | Nitrogen | Soil effect |
|---|---|---|---|---|---|---|
| W | cereal | 400 | 1 | 3 | −1 | 0 |
| L | legume | 300 | 5 | 5 | +1 | +1 |

Weights 2/1/1, normalised to 0.5/0.25/0.25:

| Rotation | Water | Soil | Climate | Total |
|---|---|---|---|---|
| W→L | (75+100)/2 = 87.5 | 50+15+10−0+5 = 80 | (62.5+100)/2 = 81.25 | **84.06** |
| W→W | 75 | 50−20 = 30 | 62.5 | **60.63** |

## 6. Known simplifications
- A crop's water need is compared with mean rainfall only. The score ignores effective
  rainfall, evapotranspiration (ET₀), soil storage and irrigation efficiency.
- Heat days are counted over the whole season, not per crop growth stage.
- The tolerance scores (1–5) are expert estimates and need agronomist validation.
