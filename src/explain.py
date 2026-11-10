"""Template-based, plain-language explanations generated ONLY from computed numbers.

All user-facing strings live in TEXTS[lang]. To add Arabic/Darija, copy TEXTS["fr"]
to TEXTS["ar"], translate the values (keep the {placeholders}), and pass lang="ar".
"""
from __future__ import annotations

from src.features import HEAT_DAY_C
from src.scoring import TOO_CLOSE_POINTS

TEXTS: dict[str, dict] = {
    "fr": {
        "ui": {
            "title": "🌾 Field Shift — Comparer des rotations avec les données NASA",
            "subtitle": "Plaine du Tadla (Beni Mellal) · Données climatiques NASA POWER · Outil d'aide à la décision (prototype)",
            "priorities": "Vos priorités",
            "w_water": "💧 Économie d'eau", "w_soil": "🌱 Santé du sol", "w_climate": "🌡️ Adaptation au climat",
            "point": "Point sélectionné (lat, lon)", "reset": "Revenir à Beni Mellal",
            "loading": "Récupération de 10 ans de données NASA POWER…",
            "offline": "Mode hors-ligne.",
            "tabs": ["🗺️ Carte", "📊 Indicateurs environnementaux", "⚖️ Comparaison des rotations",
                     "💬 Explication & limites"],
            "selected_point": "Parcelle sélectionnée",
            "grid_cell": "Cellule approximative NASA POWER (~0.5°) : les données représentent cette zone, pas la parcelle",
            "click_hint": "Cliquez sur la carte pour choisir une parcelle",
            "data_source": "Source des données",
            "source_labels": {"api": "NASA POWER (en direct)", "cache": "NASA POWER (cache local)",
                              "fallback": "Secours hors-ligne (Beni Mellal)"},
            "period": "Période", "elevation": "Altitude (modèle)", "missing": "Données manquantes",
            "best_now": "Meilleure rotation selon vos priorités",
            "too_close": "Les deux premières rotations sont à moins de {pts:.0f} points : trop proches pour conclure.",
            "k_season_rain": "Pluie saison (oct–mai)", "k_cv": "Variabilité interannuelle",
            "k_heat": "Jours de forte chaleur",
            "k_heat_help": "Jours avec Tmax > {t:.0f} °C. Pendant la saison oct–mai : {n:.1f} j en moyenne.",
            "k_dry": "Plus longue période sèche (saison)",
            "k_soil": "Humidité zone racinaire",
            "k_soil_help": "GWETROOT moyen oct–mai, 0 = sec, 1 = saturé (indice modélisé).",
            "rain": "Pluie (mm)", "mean": "moyenne",
            "chart_season_rain": "Pluie par saison de culture (oct–mai, année de récolte)",
            "chart_soil": "Humidité du sol par saison (moy. oct–mai)",
            "chart_month_rain": "Pluie mensuelle moyenne",
            "chart_month_temp": "Températures mensuelles moyennes",
            "months": ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
            "table_view": "Voir le tableau des saisons",
            "nasa_caption": "Toutes les données de cet onglet proviennent de NASA POWER (MERRA-2 / CERES), community=AG.",
            "weights_now": "Poids normalisés : eau **{w:.0%}**, sol **{s:.0%}**, climat **{c:.0%}**",
            "sub_water": "Eau", "sub_soil": "Sol", "sub_climate": "Climat",
            "chart_subscores": "Sous-scores par rotation (0–100, plus haut = mieux)",
            "ranking": "Classement", "total": "Score total",
            "why": "Pourquoi ce score ?", "na": "non disponible (données manquantes)",
            "crop": "Culture", "need": "Besoin (mm)", "deficit": "Déficit (mm)",
            "irrig_need": "Besoin d'irrigation moyen estimé : {mm:.0f} mm par saison.",
            "soil_parts": {"base": "base", "legume_bonus": "légumineuses", "diversity_bonus": "diversité",
                           "repeat_penalty": "répétitions", "crop_effect": "effet cultures"},
            "heat_pen": "Pénalité chaleur", "drought_pen": "Pénalité sécheresse",
            "crop_caption": "Les paramètres des cultures (besoin en eau, tolérances) sont des valeurs approximatives "
                            "de type FAO, NON issues de la NASA, et doivent être validées par un agronome.",
            "explanation": "Explication", "limits": "Limites et incertitudes",
        },
        "explain": {
            "climate_h": "#### 🌦️ Ce que disent les données NASA pour ce point",
            "climate": (
                "Sur **{n_seasons} saisons** complètes (récoltes {first}–{last}), la saison de culture (octobre–mai) "
                "a reçu en moyenne **{rain:.0f} mm** de pluie, avec des écarts importants d'une année à "
                "l'autre : de **{rmin:.0f} mm** (saison la plus sèche) à **{rmax:.0f} mm** "
                "(variabilité **{cv:.0%}**)."),
            "heat": ("On compte en moyenne **{hy:.0f} jours par an** au-dessus de {t:.0f} °C, dont "
                     "**{hs:.1f} jours** pendant la saison oct–mai."),
            "dry": ("Chaque saison connaît en moyenne une période sèche (pluie < 1 mm/jour) de "
                    "**{dry:.0f} jours consécutifs**. L'humidité moyenne de la zone racinaire est de "
                    "**{gw:.2f}** sur une échelle de 0 (sec) à 1 (saturé)."),
            "trend": ("Les {k} dernières saisons ont été en moyenne **{diff:+.0f}%** par rapport aux "
                      "saisons précédentes ({recent:.0f} mm contre {older:.0f} mm)."),
            "result_h": "#### 🏆 Résultat selon vos priorités",
            "weights": "Vos priorités : eau **{w:.0%}**, sol **{s:.0%}**, climat **{c:.0%}**.",
            "best": "La rotation **{id} ({name})** obtient le meilleur score : **{total:.1f}/100**.",
            "close": ("⚠️ **Trop proche pour conclure** : {id1} ({t1:.1f}) et {id2} ({t2:.1f}) ne sont "
                      "séparées que de {d:.1f} points (seuil : {pts:.0f}). Cet écart est trop faible pour "
                      "cette méthode simplifiée ; d'autres critères (marché, main-d'œuvre, "
                      "accès à l'eau, avis d'un agronome) doivent trancher."),
            "clear": "L'écart avec la deuxième ({id2}, {t2:.1f}) est de **{d:.1f} points**.",
            "why_h": "#### 🔍 Pourquoi ?",
            "rot_line": ("- **{id} — {name}** : eau {w:.0f}, sol {s:.0f}, climat {c:.0f}. "
                         "Point fort : **{strong}**. Point faible : **{weak}**. "
                         "Besoin d'irrigation estimé ≈ **{irr:.0f} mm/saison** au-delà de la pluie moyenne. {soil_note}"),
            "soil_legume": "Contient {n} légumineuse(s) qui fixent l'azote.",
            "soil_none": "Aucune légumineuse : l'azote devra venir des engrais.",
            "soil_repeat": " {n} succession(s) de la même famille (risque maladies/adventices).",
            "tradeoff_h": "#### ⚖️ Compromis",
            "winner_of": "- Meilleure pour **{sub}** : **{id}** ({v:.0f}/100)",
            "sens_h": "#### 🎚️ Sensibilité aux priorités",
            "sens_same": ("Quelle que soit la priorité unique choisie (eau seule, sol seul ou climat seul), "
                          "**{id}** reste en tête : le résultat est robuste."),
            "sens_diff": ("Le classement dépend de vos priorités : si seule l'eau comptait → **{w}**, "
                          "seul le sol → **{s}**, seul le climat → **{c}**."),
            "na": "non disponible",
            "sub_names": {"water": "eau", "soil": "santé du sol", "climate": "climat"},
        },
        "limits": {
            "items": [
                "🛰️ **Résolution spatiale** : NASA POWER fournit des estimations régionales issues de "
                "modèles et satellites (MERRA-2 ≈ 0,5° × 0,625°, soit environ 50 km ; rayonnement CERES ≈ 1°). "
                "Les valeurs représentent une grande zone autour du point ({lat:.2f}, {lon:.2f}), "
                "**pas votre parcelle**. Irrigation, relief, sol et microclimat local ne sont pas captés.",
                "📅 **Période des données** : {first} → {last} ({n_seasons} saisons de culture complètes "
                "oct–mai utilisées). Source : {source}.",
                "❓ **Données manquantes** : {missing:.1%} des valeurs journalières (valeur -999 de NASA POWER "
                "traitée comme absente ; une saison avec moins de 90 % de jours valides est exclue).",
                "🌾 **Paramètres des cultures NON validés** : besoins en eau, tolérances à la chaleur et à "
                "la sécheresse, effets sur le sol sont des valeurs approximatives de type FAO "
                "(`data/crops.json`, `needs_validation: true`). Ils **ne viennent pas de la NASA** et doivent "
                "être vérifiés par un agronome (ORMVA Tadla, INRA, ONCA).",
                "🧮 **Méthode simplifiée** : score à base de règles transparentes (voir `docs/scoring.md`). "
                "Le bilan hydrique compare seulement besoin et pluie moyenne (pas d'évapotranspiration, "
                "de réserve du sol ni d'efficience d'irrigation). Les rendements, prix, coûts et l'accès "
                "réel à l'eau du barrage ne sont pas pris en compte.",
                "📉 **Le passé n'est pas l'avenir** : 10 ans de données ne décrivent pas les tendances "
                "climatiques futures ; un écart de moins de {pts:.0f} points entre deux rotations est "
                "considéré comme non significatif.",
            ],
            "disclaimer": ("> **Cet outil aide à la réflexion et à la discussion ; il ne remplace pas "
                           "l'expertise locale ni le conseil agricole.** La décision finale appartient à "
                           "l'agriculteur, avec l'appui des conseillers techniques."),
            "sources_h": "**Origine des données**",
            "sources": ("- **NASA** : NASA POWER Daily API (community AG) — T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, "
                        "GWETTOP, GWETROOT, RH2M, ALLSKY_SFC_SW_DWN.\n"
                        "- **Hors NASA** : table des cultures et rotations candidates (hypothèses de l'équipe, "
                        "à valider), fond de carte OpenStreetMap."),
            "source_names": {"api": "NASA POWER, appel direct", "cache": "NASA POWER, cache local",
                             "fallback": "fichier de secours Beni Mellal (hors-ligne)"},
        },
    },
}


def _fmt_row(r, crops, E):
    subs = {k: getattr(r, k).value for k in ("water", "soil", "climate")}
    avail = {k: v for k, v in subs.items() if v is not None}
    strong = E["sub_names"][max(avail, key=avail.get)] if avail else E["na"]
    weak = E["sub_names"][min(avail, key=avail.get)] if avail else E["na"]
    d = r.soil.details
    soil_note = (E["soil_legume"].format(n=d["n_legumes"]) if d["n_legumes"] else E["soil_none"])
    if d["n_repeats"]:
        soil_note += E["soil_repeat"].format(n=d["n_repeats"])
    irr = r.water.details.get("irrigation_need_mm_per_season", float("nan"))
    nan = float("nan")
    return E["rot_line"].format(
        id=r.id, name=r.name, w=subs["water"] if subs["water"] is not None else nan,
        s=subs["soil"], c=subs["climate"] if subs["climate"] is not None else nan,
        strong=strong, weak=weak, irr=irr, soil_note=soil_note)


def _winner_for(results, key):
    """Winner if only one sub-score counted (recomputed from existing sub-scores, no new data)."""
    cand = [r for r in results if getattr(r, key).value is not None]
    return max(cand, key=lambda r: getattr(r, key).value) if cand else None


def explain(summary: dict, scores: dict, crops: dict, lang: str = "fr",
            seasons=None) -> str:
    """Build a markdown explanation. Every number comes from `summary` / `scores`."""
    E = TEXTS[lang]["explain"]
    s = summary
    out = [E["climate_h"]]
    if s["n_seasons"]:
        has = seasons is not None and not seasons.empty
        rmax = float(seasons["rain_mm"].max()) if has else s["season_rain_mm"]
        first = int(seasons.index.min()) if has else s["first_date"][:4]
        last = int(seasons.index.max()) if has else s["last_date"][:4]
        out.append(E["climate"].format(n_seasons=s["n_seasons"], first=first,
                                       last=last, rain=s["season_rain_mm"],
                                       rmin=s["season_rain_min_mm"], rmax=rmax, cv=s["season_rain_cv"]))
    out.append(E["heat"].format(hy=s["heat_days_year"], t=HEAT_DAY_C, hs=s["heat_days_season"]))
    out.append(E["dry"].format(dry=s["dry_spell_season"], gw=s["gwetroot_season"]))
    if seasons is not None and len(seasons) >= 6:
        k = 3
        recent, older = seasons["rain_mm"].iloc[-k:].mean(), seasons["rain_mm"].iloc[:-k].mean()
        if older > 0:
            out.append(E["trend"].format(k=k, diff=100 * (recent / older - 1), recent=recent, older=older))

    ordered = scores["ordered"]
    if not ordered:
        return "\n\n".join(out)
    w = scores["weights"]
    out += [E["result_h"], E["weights"].format(w=w["water"], s=w["soil"], c=w["climate"])]
    best = ordered[0]
    out.append(E["best"].format(id=best.id, name=best.name, total=best.total))
    if len(ordered) > 1:
        second = ordered[1]
        d = best.total - second.total
        if scores["top_too_close"]:
            out.append(E["close"].format(id1=best.id, t1=best.total, id2=second.id, t2=second.total,
                                         d=d, pts=TOO_CLOSE_POINTS))
        else:
            out.append(E["clear"].format(id2=second.id, t2=second.total, d=d))

    out.append(E["why_h"])
    out.append("\n".join(_fmt_row(r, crops, E) for r in ordered))

    out.append(E["tradeoff_h"])
    lines = []
    winners = {}
    for key in ("water", "soil", "climate"):
        r = _winner_for(scores["results"], key)
        winners[key] = r.id if r else E["na"]
        if r:
            lines.append(E["winner_of"].format(sub=E["sub_names"][key], id=r.id, v=getattr(r, key).value))
    out.append("\n".join(lines))

    out.append(E["sens_h"])
    if len(set(winners.values())) == 1:
        out.append(E["sens_same"].format(id=winners["water"]))
    else:
        out.append(E["sens_diff"].format(w=winners["water"], s=winners["soil"], c=winners["climate"]))
    return "\n\n".join(out)


def limitations(summary: dict, pdata, lang: str = "fr") -> str:
    """Markdown list of limits, filled with the actual point, period and missing share."""
    L = TEXTS[lang]["limits"]
    vals = dict(lat=pdata.lat, lon=pdata.lon, first=summary["first_date"], last=summary["last_date"],
                n_seasons=summary["n_seasons"], missing=summary["missing_share"],
                source=L["source_names"].get(pdata.source, pdata.source), pts=TOO_CLOSE_POINTS)
    items = "\n".join(f"- {it.format(**vals)}" for it in L["items"])
    return "\n\n".join([items, L["disclaimer"], L["sources_h"], L["sources"]])
