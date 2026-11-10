"""Template-based, plain-language explanations generated ONLY from computed numbers.

All user-facing strings live in TEXTS[lang]. To add Arabic/Darija, copy TEXTS["fr"]
to TEXTS["ar"], translate the values (keep the {placeholders}), and pass lang="ar".
"""
from __future__ import annotations

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
    },
}


def explain(summary: dict, scores: dict, crops: dict, lang: str = "fr") -> str:
    return "_(explication à venir)_"


def limitations(summary: dict, pdata, lang: str = "fr") -> str:
    return "_(limites à venir)_"
