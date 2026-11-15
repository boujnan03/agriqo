# Season advice rules (`backend/app/seasons/advice.py`)

Rule-based advice returned by `GET /api/seasons/zone` in `advice[]`. Source of the rules:
`docs/seasons/IMPLEMENTATION_SEASONS.md` §8. **Every rule is `needs_validation`**: the
thresholds are placeholders until an agronomist reviews them. The UI shows "À valider par un
agronome" and the source "NASA POWER, normale 1996–2025 de votre zone".

**Changing a rule or a threshold:** update `advice.py` (and `constants.py`), this file and
`backend/tests/test_seasons_advice.py` together.

## Definitions

- **W** = the last 10 seasons of the cell (`RECENT_WINDOW`; currently 2016–2025).
  **B** = all earlier seasons (1996–2015). Both come from the data, not hard-coded years.
- A season runs October → May and is named by its end year (`2025` = Oct 2024 → May 2025).
- **Normal** = the cell's baseline mean over 1996–2025 (`season_baseline.json`), **not rounded**.
- "Below" / "above" the normal are strict (`<` / `>`).
- `pct = round(100 × mean over W / normal)`. Displayed means are rounded to 1 decimal.
- No number is invented: every number a text shows is in the rule's `evidence`.
- `variant`: `irrigue` only for the rules marked "attenuated" below when `water=irrigue`;
  every other rule keeps `pluvial`.
- Output order: the order of the table.
- `hors_zone`: no advice (`[]`). `proche`: advice computed for the nearest cell (the UI says
  "zone voisine").

## Rules

| id | Fires when | Thresholds (`constants.py`) | Irrigated (`water=irrigue`) | `crops` | `evidence` | needs_validation |
|---|---|---|---|---|---|---|
| `drought_tolerant` | `dry_hot` seasons in W ≥ 4 | `DRY_SEASONS_MIN = 4` | attenuated | `orge`, `legumineuses` | `count`, `total`, `from`, `to` | yes |
| `dry_autumn` | Oct–Dec rain below normal in ≥ 6 seasons of W **and** `pct < 85` | `AUTUMN_BELOW_MIN = 6`, `AUTUMN_PCT_MAX = 85` | attenuated | — | `below`, `total`, `meanMm`, `normalMm`, `pct` | yes |
| `hot_spring` | cell `heatRelevant` **and** spring heat days (> 30 °C, Mar–May) above normal in ≥ 6 seasons of W **and** mean over W of `heat_spring_anom` ≥ 0.3 | `HOT_SPRING_ABOVE_MIN = 6`, `HOT_SPRING_ANOM_MIN = 0.3` | same text | `ble`, `orge` | `above`, `total`, `meanDays`, `normalDays` | yes |
| `dry_spring` | Mar–May rain below normal in ≥ 6 seasons of W **and** `pct < 90` | `SPRING_BELOW_MIN = 6`, `SPRING_PCT_MAX = 90` | attenuated | `orge` | `below`, `total`, `pct` | yes |
| `last_season_dry` | the last season's type is `dry_hot` | — | attenuated | — | `season`, `rainMm`, `normalMm`, `pct` | yes |
| `wet_frequent` | `very_wet_cool` seasons in W ≥ 3 | `WET_SEASONS_MIN = 3` | same text | `ble` | `count`, `total` | yes |
| `field_shift` | `dry_hot` in W ≥ 5 **and** (dry share in W − dry share in B) ≥ 0.30 | `SHIFT_DRY_MIN = 5`, `SHIFT_SHARE_GAP = 0.30` | same text | — | `recent`, `recentTotal`, `since`, `before`, `beforeTotal`, `beforeFrom`, `beforeTo` | yes |

**`heatRelevant`** (per cell) = `std.heat_spring` is not null/zero **and** `mean.heat_spring ≥
1.0` (`HEAT_RELEVANT_MIN_NORMAL_DAYS`). False for C035, C046, C059, C066, C072, C078: there,
`hot_spring` is never evaluated, and "hot"/"cool" in a type name carries no meaning.

**`field_shift`** compares the two shares exactly (fractions), so a gap of exactly 0.30 counts.
Its text always says "par rapport à 1996–2025".

## Texts (French, placeholders only; translations live in the frontend)

| id | `pluvial` | `irrigue` | Reason |
|---|---|---|---|
| `drought_tolerant` | Cultures tolérantes à la sécheresse (orge, pois chiche, lentille), variétés à cycle court | La sécheresse pèse moins, mais prévoir des restrictions d'eau d'irrigation les années sèches | saisons sèches et chaudes : {count} sur {total} ({from}–{to}) |
| `dry_autumn` | Ne pas semer sur sol sec ; attendre la première pluie utile | Prévoir une irrigation d'installation après le semis | pluie oct.–déc. sous la normale {below} fois sur {total} ; {meanMm} mm contre {normalMm} mm ({pct} %) |
| `hot_spring` | Semis précoce, variétés précoces (finir le remplissage du grain avant la chaleur) | identique | jours > 30 °C (mars–mai) au-dessus de la normale {above} fois sur {total} ; {meanDays} jours contre {normalDays} |
| `dry_spring` | Variétés précoces qui finissent leur cycle plus tôt | Garder de l'eau pour une irrigation au remplissage du grain | pluie mars–mai sous la normale {below} fois sur {total} ; {pct} % de la normale |
| `last_season_dry` | Réserves d'eau du sol probablement basses : prudence sur les intrants coûteux | Vérifier les dotations d'eau d'irrigation avant de choisir les cultures | saison {season} : {rainMm} mm, soit {pct} % de la normale ({normalMm} mm) |
| `wet_frequent` | Le blé est envisageable ; surveiller les maladies fongiques (rouilles) | identique | saisons très humides : {count} sur {total} |
| `field_shift` | Le climat de votre zone a changé : les saisons sèches sont beaucoup plus fréquentes qu'avant | identique | par rapport à 1996–2025 : saisons sèches {recent} sur {recentTotal} depuis {since}, contre {before} sur {beforeTotal} entre {beforeFrom} et {beforeTo} |

## Expected results (checked by the tests, `water=pluvial`)

| Cell | Advice |
|---|---|
| C057 (Tadla) | `drought_tolerant` 9/10 · `dry_autumn` 8/10, 111.3 vs 189.9 mm, 59 % · `hot_spring` 8/10, 16.8 vs 12.6 days · `last_season_dry` 2025, 370.6 vs 458.6 mm, 81 % · `field_shift` 9/10 vs 3/20 |
| C045 (Bin el Ouidane) | `drought_tolerant` 6/10 · `dry_autumn` 10/10, 90.8 vs 158.9 mm, 57 % · `field_shift` 6/10 vs 3/20 |
| C079 (Casablanca) | `drought_tolerant` 5/10 · `dry_autumn` 8/10, 138.0 vs 191.4 mm, 72 % · `last_season_dry` 2025, 279.9 vs 416.4 mm, 67 % · `field_shift` 5/10 vs 3/20 |
| C091 (Meknès) | `drought_tolerant` 5/10 · `dry_autumn` 8/10, 168.0 vs 230.2 mm, 73 % · `hot_spring` 7/10, 19.0 vs 16.1 days · `last_season_dry` 2025, 423.2 vs 537.5 mm, 79 %. No `field_shift` (gap 0.25) |
| C113 (Tanger, proche) | none |
| C046 (`heatRelevant` false) | `dry_autumn` only, 7/10, 88.1 vs 112.3 mm, 78 % |

**Cells where each rule fires (of 102):** `drought_tolerant` 87, `dry_autumn` 94,
`dry_spring` 25, `hot_spring` 52, `last_season_dry` 71, `field_shift` 52, `wet_frequent` 3.

`drought_tolerant` firing in 87 cells reflects the dry decade, not a bug; whether to raise
`DRY_SEASONS_MIN` is an open question (spec §14).
