# Spécification : fonctionnalité « Diagnostic de ma parcelle »

**Projet :** NASA Space Apps Challenge 2026 – Challenge *Field Shift: Adapting Farms with NASA Data*
**Zone cible :** Béni Mellal–Tadla (Maroc), mais l'outil doit fonctionner partout dans le monde
**Destinataire :** membre de l'équipe chargé de l'implémentation

---

## 1. Objectif

L'agriculteur indique la localisation de sa parcelle. L'application interroge des APIs gratuites (dont des données NASA), puis affiche une fiche claire :

- type de sol (texture, pH, matière organique…)
- climat (température, pluie, risque de gel)
- humidité actuelle du sol
- relief (altitude, pente)
- une suggestion simple de rotation de cultures (règles, pas de Machine Learning)

> Aucun modèle d'entraînement n'est nécessaire : les APIs renvoient des données prêtes à l'emploi, et les recommandations sont basées sur des règles simples.

---

## 2. Parcours utilisateur

1. L'agriculteur ouvre la carte (Leaflet) et clique sur sa parcelle, ou saisit lat/lon. (Bonus : dessiner un polygone.)
2. Le frontend envoie les coordonnées au backend.
3. Le backend interroge les APIs **en parallèle** et renvoie un seul JSON.
4. Le frontend affiche la fiche « Diagnostic de ma parcelle ».

---

## 3. APIs retenues

| Priorité | API | Données | Clé ? |
|---|---|---|---|
| 1 | NASA POWER (community AG) | Climat + humidité du sol (GWETTOP, GWETROOT) | Non |
| 2 | ISRIC SoilGrids v2.0 | Type de sol | Non |
| 3 | OpenTopography (SRTM GL1, 30 m) | Altitude, pente | Oui (gratuite) |
| 4 (bonus) | Sentinel-2 via Copernicus Data Space | NDVI (santé de la végétation) | Compte gratuit + OAuth |

> Les URLs ci-dessous sont indicatives : **vérifier chaque endpoint dans la documentation officielle avant de coder.**

### 3.1 NASA POWER (sans clé)

- **Climatologie** :
  `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN&community=AG&latitude={lat}&longitude={lon}&format=JSON`
- **30 derniers jours** :
  `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP,GWETROOT,T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&latitude={lat}&longitude={lon}&start=YYYYMMDD&end=YYYYMMDD&format=JSON`
- À calculer :
  - température moyenne et max annuelle (°C)
  - pluie annuelle (mm)
  - nombre de jours avec risque de gel (T2M_MIN < 0 °C)
  - humidité du sol actuelle (0–1) → statut « sec / moyen / humide »
- Résolution ~50 km : deux parcelles proches auront le même climat (à indiquer dans l'interface).

### 3.2 ISRIC SoilGrids v2.0 (sans clé)

- `https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=clay&property=sand&property=silt&property=phh2o&property=soc&property=nitrogen&property=cec&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`
- Appliquer les facteurs d'échelle donnés dans la réponse (ex. clay en g/kg → %, phh2o ÷ 10).
- Déduire la **classe texturale USDA** (triangle des textures) à partir de sable / limon / argile.
- Résolution ~250 m : ce sont des **estimations**, pas une analyse de laboratoire (mention obligatoire dans l'interface).
- L'API est parfois lente ou indisponible : ne jamais bloquer le reste de la fiche.

### 3.3 OpenTopography – SRTM (clé gratuite)

- `https://portal.opentopography.org/API/globaldem?demtype=SRTMGL1&south=..&north=..&west=..&east=..&outputFormat=GTiff&API_Key={KEY}`
- Bbox d'environ 500 m autour du point.
- Avec `rasterio` + `numpy` : altitude au point (m) et pente moyenne (%).
- Clé dans la variable d'environnement `OPENTOPO_API_KEY` (jamais dans le code).
- Les données ne changent pas : mettre en cache.

### 3.4 Bonus – NDVI Sentinel-2

- Copernicus Data Space, Sentinel Hub **Statistical API**, OAuth « client credentials ».
- NDVI moyen du polygone (ou d'un buffer de 100 m autour du point) sur les 60 derniers jours, en filtrant les nuages.
- Si pas d'image sans nuages : statut « indisponible ».

---

## 4. Backend

- **Stack :** Python + FastAPI, `httpx` (async), `asyncio.gather`.
- **Endpoint :** `POST /api/parcel/diagnostic`

Requête :

```json
{ "lat": 32.34, "lon": -6.36, "polygon": null, "previous_crop": "blé" }
```

Réponse (exemple de structure, valeurs fictives) :

```json
{
  "location": { "lat": 32.34, "lon": -6.36 },
  "soil": {
    "status": "ok",
    "source": "ISRIC SoilGrids",
    "texture_class": "clay loam",
    "clay_pct": 32, "sand_pct": 30, "silt_pct": 38,
    "ph": 8.1, "organic_carbon_g_kg": 9.5,
    "note": "Estimation (~250 m), pas une analyse de laboratoire"
  },
  "climate": {
    "status": "ok",
    "source": "NASA POWER",
    "temp_mean_c": 18.5, "temp_max_c": 38.0,
    "rain_mm_year": 350, "frost_days": 5
  },
  "soil_moisture": {
    "status": "ok",
    "source": "NASA POWER",
    "gwettop": 0.21, "label": "sec"
  },
  "terrain": {
    "status": "indisponible",
    "source": "SRTM / OpenTopography"
  },
  "recommendations": [
    "Après le blé, semer une légumineuse (fève, lentille) pour restaurer l'azote."
  ]
}
```

### Règles techniques

- Timeout de **15 s par API** ; une API en échec → `"status": "indisponible"`, sans bloquer les autres.
- Chaque bloc contient `source` et `status` (`ok` / `indisponible` / `pas_de_donnees`).
- **Cache** par coordonnées arrondies à 3 décimales (dictionnaire en mémoire ou SQLite).
- **Ne jamais inventer de valeurs** : une donnée manquante est signalée comme telle.

---

## 5. Cas particuliers à gérer

| Cas | Comportement attendu |
|---|---|
| lat hors [-90, 90] ou lon hors [-180, 180] | Erreur 400 avec message clair |
| Point dans l'eau (mer, oued, barrage ex. Bin el Ouidane) | SoilGrids renvoie null → « Pas de données de sol ici. Vérifiez que le point est sur une terre agricole. » |
| Zone urbaine (ex. Casablanca) | Même message que ci-dessus |
| Désert / roche | Afficher les données disponibles, signaler le sol manquant |
| API lente ou en panne | Bloc « indisponible », le reste de la fiche s'affiche |
| Nuages (Sentinel-2) | NDVI « indisponible » pour la période |

---

## 6. Recommandations (règles simples)

Implémenter un module `rules.py` avec des règles lisibles, par exemple :

- Précédent = céréale (blé, orge) → proposer une légumineuse (fève, lentille, pois chiche) pour l'azote.
- Pluie annuelle < 400 mm et humidité « sec » → cultures tolérantes à la sécheresse (orge, lentille).
- pH > 8 → éviter les cultures qui préfèrent les sols acides.
- Pente > 8 % → cultures couvrantes contre l'érosion (luzerne/bersim, fourrages).
- Jours de gel élevés → éviter les cultures sensibles au gel en hiver.

Chaque recommandation affiche **pourquoi** (la donnée qui l'a déclenchée), ex. : « pH 8.1 (SoilGrids) ».

---

## 7. Frontend

- Carte Leaflet (tuiles OpenStreetMap), clic → marqueur → bouton « Analyser ma parcelle ».
- Indicateur de chargement pendant les appels.
- Fiche en 4 cartes avec icônes : **Sol, Climat, Humidité, Relief**, + bloc **Recommandations**.
- Chaque carte affiche la source (ex. « Données : NASA POWER »).
- Langues : français et arabe (darija si possible). Textes simples pour l'agriculteur.

---

## 8. Tests à faire

| Lieu | lat, lon | Attendu |
|---|---|---|
| Tadla (agricole) | 32.34, -6.36 | Fiche complète |
| Océan Atlantique | 33.00, -9.50 | « Pas de données de sol » |
| Barrage Bin el Ouidane | 32.10, -6.45 | Pas de sol (eau) |
| Casablanca centre | 33.59, -7.62 | Sol manquant ou incohérent, message clair |
| Sahara | 30.00, -5.00 | Données partielles, pas de plantage |

> Coordonnées approximatives : les ajuster sur la carte si besoin.

---

## 9. Livrables

1. Code backend (FastAPI) + `requirements.txt`
2. Composant frontend : carte + fiche
3. `rules.py` des recommandations
4. `README.md` : installation, variables d'environnement, lancement, exemple de test sur Béni Mellal
5. Un exemple de réponse JSON réelle

---

## 10. Ordre de travail conseillé

1. NASA POWER (le plus simple, sans clé) → fiche Climat + Humidité
2. SoilGrids → fiche Sol
3. Règles de recommandation
4. OpenTopography → fiche Relief
5. Bonus : NDVI Sentinel-2
