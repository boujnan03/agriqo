# Implémentation : « types de saison » (modèle AGRIQO v5) dans l'application

Runtime files: `backend/app/seasons/model_files/`. Training files: `ml/seasons/`.

> **À qui s'adresse ce document.** À l'instance de Claude Code qui fera l'implémentation. Il est
> autonome : il contient les décisions de l'équipe, des constats vérifiés sur les fichiers du
> modèle, l'architecture cible, les tests attendus et l'ordre de travail. Tout ce qui existe déjà
> ailleurs (code, `design.md`, notebook) est cité par chemin et section, pas recopié. **Lis les
> sources citées avant de coder.**
>
> **Règle de travail.** Faire les étapes 0, 1 et 2 (§13), puis **s'arrêter et demander une
> validation** avant les étapes 3 à 5.
>
> Rédigé le 2026-11-15. Les valeurs chiffrées ont été recalculées sur les fichiers réels avec
> scikit-learn 1.6.1, numpy 2.4.6, pandas 3.1.1 et joblib 1.6.0 (CPython 3.11).

---

## 1. Contexte (court)

- Projet **AGRIQO / Field Shift**, NASA Space Apps Challenge 2026, challenge « Field Shift:
  Adapting Farms with NASA Data ». Public : agriculteurs de la plaine du Tadla (Béni Mellal).
- À lire avant tout : `README.md` (stack, commandes), `ARCHITECTURE.md` §8 (état
  actuel du frontend) et §7 (prochaine étape backend), `frontend/design.md` (design system).
- **État actuel :**
  - backend : FastAPI, `backend/app/main.py` ne sert que `GET /health` ;
  - frontend : React 19 / Vite, toutes les pages lisent des mocks (`frontend/src/mocks/`) ;
  - `frontend/src/services/api.ts` est un placeholder que rien n'importe ;
  - le backend n'a pas de CORS ;
  - le dossier n'est **pas un dépôt git**.
- **But de ce travail :** remplacer une partie des mocks par les vrais résultats du modèle de
  types de saison, sans aucun appel réseau à l'exécution.

## 2. Ce que fait le modèle

**Source :** le notebook `ml/seasons/notebook/agriqo-season-model-training-v5.ipynb` (dans le
dépôt). Les références ci-dessous utilisent ses titres de section.

| Sujet | Où le lire dans le notebook |
|---|---|
| Constantes (période, seuils, `FEATURES`, `PARAMS`) | §1 Configuration |
| Grille des cellules NASA POWER, 0,5° × 0,625° | §2, `LATS` / `LONS` |
| Définition exacte des 8 features | §3, fonction `season_features` |
| Anomalies | §3, fonctions `make_baseline` et `add_anomalies` |
| Jeux de features candidats | §4, `FEATURE_SETS` |
| Règle de sélection | §5 |
| Nommage des classes | §6, fonction `describe` |
| Validations | §7.1 à §7.6 |
| Sauvegarde | §8 |
| Test de rechargement | dernière cellule |

**Faits clés (vérifiés sur les fichiers) :**
- **Modèle :** `Pipeline([("scaler", StandardScaler()), ("cluster", KMeans(n_clusters=4, n_init=10, random_state=42))])`.
- **Seulement 3 features en entrée, dans cet ordre :** `rain_mm_anom`, `gwetroot_mean_anom`,
  `heat_spring_anom` (jeu `eau_sol_printemps`). Les 5 autres features servent au nommage et à
  l'explication, pas à la prédiction.
- **Saison :** d'octobre à mai, nommée par l'année de fin. La saison `2025` va d'octobre 2024 à
  mai 2025. À l'écran, afficher « 2024–2025 ».
- **Anomalie :** `(valeur − moyenne de la cellule) / écart-type de la cellule`, sur la référence
  fixe 1996–2025. Un écart-type nul vaut 0 (`fillna(0)`). **Les anomalies sont déjà calculées
  dans `season_features.csv` : ne pas les recalculer.** Les recalculer à partir de
  `season_baseline.json`, dont les valeurs sont arrondies à 4 décimales, introduit jusqu'à
  0,013 d'écart sur `gwetroot_mean_anom`.
- **Les 4 classes** (`label_map` du meta : `0` → « sèche et chaude », `1` → « très humide et
  fraîche », `2` → « normale et chaude », `3` → « normale et fraîche »). Ordre du plus sec au plus
  humide : sèche et chaude, normale et fraîche, normale et chaude, très humide et fraîche.

| Classe | Saisons (sur 3060) | Pluie moyenne | Jours > 30 °C (mars–mai) | Anomalie pluie | Anomalie chaleur de printemps |
|---|---|---|---|---|---|
| sèche et chaude | 985 | 219,1 mm | 18,1 | −0,90 | +0,87 |
| normale et fraîche | 889 | 292,6 mm | 7,0 | −0,19 | −0,82 |
| normale et chaude | 618 | 366,1 mm | 15,6 | +0,29 | +0,57 |
| très humide et fraîche | 568 | 570,1 mm | 6,2 | +1,55 | −0,84 |

**Couverture :**
- 102 cellules au Maroc, au nord de 29,5° N, sans les cellules désertiques ;
- 30 saisons par cellule (1996–2025), soit 3060 lignes ;
- régions : Nord 25, Centre 58, Sud 19 cellules.

**Limites :**
- une cellule fait environ 50 × 60 km ;
- seules les saisons complètes sont classées ;
- la dernière saison disponible est **2025**, car la saison 2026 n'est pas dans les fichiers ;
- aucune donnée de sol, de culture, de gel ou de végétation.

### 2.1 Constats vérifiés (n'existent dans aucun fichier)

1. **Le `.joblib` se charge sans avertissement** avec scikit-learn 1.6.1 et numpy 2.4.6.
   `model.feature_names_in_` vaut `['rain_mm_anom', 'gwetroot_mean_anom', 'heat_spring_anom']`.
   Il faut donc prédire avec un **DataFrame pandas** qui a ces colonnes, sinon scikit-learn émet un
   avertissement sur les noms de features.
2. **`predict()` revient à prendre le centroïde le plus proche** dans l'espace normalisé
   (vérifié sur les 3060 lignes). Cela sert à calculer la marge.
3. **Marge :** `(d2 − d1) / d2`, où `d1` et `d2` sont les distances euclidiennes aux deux
   centroïdes les plus proches, dans l'espace `scaler.transform`. **322 saisons sur 3060
   (10,5 %) ont une marge inférieure à 0,15** : ce sont les cas limites.
4. **Stabilité de k = 4 :** `ari_boot_min = 0,4592`, contre 0,7957 pour k = 3
   (`model_selection.csv`, lignes 1 et 2). Le modèle reste celui retenu, mais l'interface affiche
   les cas limites.
5. **Écart-type nul dans `season_baseline.json` :** la cellule **C046** (32,0 ; −5,625, Moyen
   Atlas) a `std.heat_days = null` et `std.heat_spring = null`, car aucun jour au-dessus de 30 °C
   en 30 ans. Ses anomalies de chaleur valent donc 0. Six cellules ont une chaleur de printemps
   **non significative** (écart-type nul ou normale inférieure à 1 jour) : **C035, C046, C059,
   C066, C072, C078**. Dans ces cellules, le qualificatif « chaude » ou « fraîche » n'a pas de
   sens : C046 a 8 saisons « sèche et chaude » avec 0 jour chaud.
6. **Tendance par rapport à la référence fixe :** sur tout le Maroc, la classe « sèche et
   chaude » représente 32,2 % des saisons de 1996 à 2025, mais 50,3 % de celles de 2016 à 2025
   (513 sur 1020).
7. **Tadla, cellule C057 (32,5 ; −6,25) :**
   - 9 saisons « sèche et chaude » sur 10 entre 2016 et 2025, contre 3 sur 20 entre 1996 et 2015 ;
   - sur 1996–2025 : sèche et chaude 12, normale et fraîche 8, très humide et fraîche 6,
     normale et chaude 4 ;
   - deux saisons limites : 2000 (marge 0,076) et 2001 (0,102).
8. **Libellés trompeurs :**
   - « sèche » s'applique aussi à des saisons modérément déficitaires (C057 2020 : 89 % de la
     pluie normale) ;
   - « normale et fraîche » a en moyenne moins de pluie que « normale et chaude » (292,6 contre
     366,1 mm) ;
   - « chaude » et « fraîche » sont nommées d'après `heat_days_anom`, qui n'est pas une feature
     du modèle.
   
   **Il faut donc toujours afficher le pourcentage de pluie par rapport à la normale à côté du
   type.**

## 3. Fichiers du modèle

**Emplacement :** les 4 fichiers d'exécution (les 4 premières lignes du tableau) sont dans
`backend/app/seasons/model_files/`, avec leurs empreintes dans `model_files/SHA256SUMS`.
`model_selection.csv` est dans `ml/seasons/reports/v5/`. Empreintes vérifiées à la mise en place.

| Fichier | Octets | SHA-256 |
|---|---|---|
| `season_model.joblib` | 13897 | `3a2e0e21d45758e85a8651b271572d6e65c8423f3bb5a05fd1ca09ee493ae40c` |
| `season_model_meta.json` | 7449 | `eacfe8d19bb4a836b5274d6b044980d275a69b744df20e8eb82a0622b8e8dfbb` |
| `season_baseline.json` | 49653 | `9b98dc41c5b28683f233b083d06979d0fc304b65abe141c81904dcbf498373ec` |
| `season_features.csv` | 811447 | `9fb599d408ec04a0504cd3752a0b7aa93a093b4fafc612e059bb62b2ff31ba03` |
| `model_selection.csv` | 3437 | `d97f8d55ce02c65ba61497f137ad583afe7a04414ac012f8541d79429f9abe89` |

**Contenu de chaque fichier :**
- **`season_model_meta.json` :** clés `features`, `raw_features`, `label_map`,
  `label_order_dry_to_wet`, `reference_seasons` ([1996, 2025]), `thresholds`, `grid` (`lats`,
  `lons`), `coverage.cells` (102 couples [lat, lon]), `metrics`, `sklearn_version` ("1.6.1"),
  `trained_at` ("2026-11-15T10:29:22+00:00").
- **`season_baseline.json` :** clés `C000` à `C113`, 102 cellules, mais les numéros ne sont pas
  continus. Chacune contient `{lat, lon, mean{8 features}, std{8 features}}`. `std` peut valoir
  `null` (C046).
- **`season_features.csv` :** 3060 lignes, avec les colonnes `point, season, <8 features brutes>,
  lat, lon, region, <8 features>_anom`. **Il n'y a pas de colonne de classe** : le backend la
  calcule au démarrage.
- **`model_selection.csv` :** les 24 candidats. Ce fichier n'est utilisé que pour la documentation
  et la transparence, pas à l'exécution (d'où son emplacement dans `ml/seasons/reports/v5/`).

**Autres fichiers d'entraînement**, hors de `model_files/` :
- `power_cache/` : 342 fichiers JSON NASA POWER bruts, 89 Mo, dans `ml/seasons/data/power_cache/`,
  **local uniquement** (ignoré par git) ;
- les graphiques du notebook, dans `ml/seasons/reports/v5/` :
  `cells-by-region-and-season-types-2022.png` et `season-types-pca-scatter.png`.

## 4. Décisions de l'équipe

1. **Fichiers :**
   - les 4 fichiers d'exécution sont déjà dans `backend/app/seasons/model_files/` (§3) ;
   - `ml/seasons/data/` et `results__1_.zip` sont déjà dans le `.gitignore` racine ;
   - créer un `.dockerignore` **racine** contenant `ml/seasons/data/` et `results__1_.zip`. Les
     contextes de build actuels sont `./backend` et `./frontend`, donc ces entrées sont
     préventives : l'écrire dans le commentaire du fichier.
2. **Aucun appel NASA POWER en direct.** Tout vient des 4 fichiers d'exécution.
3. **Le classement des cultures** (`frontend/src/mocks/recommendations.ts`, `cropDetails.ts`) est
   **conservé, avec la mention « Exemple »** (§10).
4. **Ajouter « irrigué / pluvial » aux données de la ferme.** Pour une ferme irriguée, les
   conseils liés à la sécheresse sont **atténués** (variante de texte `irrigue`, §8).
5. **Les cellules « proches »** (jusqu'à 0,5°) sont acceptées, avec une mention visible.
6. **La carte est un SVG simple**, sans Leaflet ni aucune autre dépendance de carte.
7. **Arabe standard** (pas de darija). Toutes les traductions arabes sont **relues par l'équipe**.
   Les marquer dans la description de la PR.
8. **Seuils des conseils :** chaque conseil porte `needsValidation: true`, et l'interface affiche
   « À valider par un agronome ».
9. **Pas de fusion avec la fonctionnalité « Diagnostic de ma parcelle »** pour l'instant. Ne rien
   partager avec elle et ne pas la créer.
10. **Message « Field Shift »** : il est montré quand la règle `field_shift` (§8) se déclenche.
    Pour Tadla : « 9 saisons sèches sur 10 depuis 2016, contre 3 sur 20 entre 1996 et 2015 ».
    Il est **toujours** formulé « par rapport à 1996–2025 ».

## 5. Règles du projet à respecter (renvois)

| Règle | Où la lire |
|---|---|
| Une nouvelle page ou un nouveau composant doit d'abord être décrit dans `design.md` | `frontend/design.md` §11 (checklist) et §10 |
| Templates d'écran | `design.md` §7 : Accueil = §7.2, Aperçu = §7.3, Recommandations = §7.4, Détail = §7.5, Carte = §7.7 |
| Couleurs | `design.md` §2. Les `--icon-*` sont réservées aux faits sol, eau et culture. |
| Une seule carte mise en avant par écran | `design.md` §6 |
| Badge de 2 mots maximum | `design.md` §6 |
| Une barre de progression est toujours accompagnée de son chiffre | `design.md` §6 |
| Accessibilité : la couleur n'est jamais le seul signal, éléments interactifs réels | `design.md` §9 |
| RTL : propriétés CSS logiques uniquement ; un SVG ne se retourne pas tout seul | `design.md` §9a, et l'exemple de `frontend/src/pages/overview/ClimateChart.tsx` |
| Chiffres occidentaux dans les 3 langues | `design.md` §9a, et `formatDate` dans `frontend/src/pages/Map.tsx` |
| Valeurs de design uniquement dans `src/theme/tokens.ts`, puis `npm run tokens` | `frontend/src/theme/tokens.ts`. Le test `frontend/tests/theme/tokens.test.ts` échoue sur tout hex, px ou `rgb()` hors de `src/theme`. |
| i18n : **exactement les mêmes clés et les mêmes `{{placeholders}}`** dans `ar.json`, `fr.json` et `en.json` | `frontend/tests/i18n/i18n.test.tsx`. Les clés de pluriel en découlent (§9.2). |
| Arabe par défaut ; les tests remettent l'arabe après chaque test | `frontend/src/i18n/index.ts`, `frontend/tests/setup.ts`, `inLanguage()` dans `frontend/tests/utils.tsx` |
| Services : une fonction par endpoint, `AbortSignal`, erreur levée si la réponse HTTP n'est pas OK | `frontend/src/services/api.ts` |
| Tests sans réseau ; ne jamais inventer de chiffres ; séparer données NASA et non-NASA | `README.md` (section Backend) et les suites de tests (`backend/tests/conftest.py`, `frontend/tests/fakeBackend.ts`) |
| Garder `docker compose up --build` fonctionnel | `README.md`, section « Run with Docker » |

## 6. Architecture backend

### 6.1 Arborescence (nouveaux fichiers marqués `+`)

```
backend/
  requirements.txt          (modifié)
+ requirements-dev.txt      -r requirements.txt, pytest, httpx (épingler les versions installées)
  app/
    main.py                 (modifié) CORS, lifespan (chargement du modèle), include_router
+   config.py               CORS_ORIGINS (variable d'env, séparée par des virgules)
+   seasons/
+     __init__.py
      model_files/          les 4 fichiers d'exécution (§3) + SHA256SUMS (déjà en place)
+     constants.py          seuils nommés (§8), MARGIN_LIMIT, NEAR_MAX_DEG, EXPECTED_SHA256
+     labels.py             nom français → identifiant stable (§9.1)
+     store.py              chargement + contrôles (§6.3), tables précalculées en mémoire
+     grid.py               locate(lat, lon) → correspondance de cellule (§6.4)
+     advice.py             règles de conseil (§8). Étape 3.
+     schemas.py            modèles Pydantic, JSON en camelCase
+     router.py             /seasons/zone, /seasons/map
+ tests/
+   conftest.py             fixture du store chargé une seule fois (scope session)
+   test_store.py  test_grid.py  test_api.py  test_advice.py  test_map.py
```

**Dépendances** à ajouter à `backend/requirements.txt`. Ce sont les versions exactes vérifiées ;
`scipy` et `threadpoolctl` sont des dépendances transitives de scikit-learn, figées pour un build
reproductible.
```
scikit-learn==1.6.1
numpy==2.4.6
scipy==1.17.1
pandas==3.1.1
joblib==1.6.0
threadpoolctl==3.8.0
```

**Pourquoi ces contraintes :**
- numpy doit rester en **2.x** : un pickle créé avec numpy 2 ne se charge pas avec numpy 1.x.
- scikit-learn doit être **exactement** la version `sklearn_version` du meta.
- L'image Docker grossit d'environ 150 Mo. Le `Dockerfile` n'a pas besoin de changer, puisque
  `COPY app ./app` inclut déjà `model_files/`.

### 6.2 Rôle des modules

- **`labels.py`** : `LABEL_IDS = {"sèche et chaude": "dry_hot", "normale et fraîche":
  "normal_cool", "normale et chaude": "normal_hot", "très humide et fraîche": "very_wet_cool"}`.
  `TYPE_ORDER = ["dry_hot", "normal_cool", "normal_hot", "very_wet_cool"]` (du plus sec au plus
  humide). **Ne jamais utiliser le numéro de cluster en dehors de `store.py`** : il change à chaque
  réentraînement.
- **`store.py`** : au démarrage, fait les contrôles (§6.3), puis prédit les 3060 saisons en un seul
  appel et calcule la marge. Il expose :
  - un `SeasonStore` avec `status` (`"ok"` ou `"error"`) et `error` (message) ;
  - `cells` (102 entrées : lat, lon, région, normales, `heatRelevant`) ;
  - `seasons[cell_id]` (30 lignes triées) ;
  - `first_season = 1996` et `last_season = 2025`, lus dans les données.
- **`grid.py`** : fonction pure `locate(lat, lon, cells) -> CellMatch(status, cell_id, distance_deg)`.
- **`router.py`** : lit le store par une dépendance FastAPI, ce qui permet de l'injecter dans les
  tests. Aucun I/O pendant une requête.
- **`main.py`** :
  - `CORSMiddleware`, avec `allow_origins` lu dans `CORS_ORIGINS` (par défaut
    `http://localhost:8080,http://localhost:5173`) et `allow_methods=["GET"]` ;
  - chargement du store dans le `lifespan` ;
  - `GET /health` renvoie toujours HTTP 200 (le healthcheck Docker en dépend), avec
    `{"status": "ok", "seasonsModel": "ok" | "error"}`.
  - Ajouter `CORS_ORIGINS` à `.env.example` et à `docker-compose.yml` (service `backend`,
    `environment`).

### 6.3 Contrôles au chargement (`store.py`), dans cet ordre

Au premier échec, on s'arrête : `status = "error"`, l'erreur est journalisée, l'application
démarre quand même, et `/seasons/*` répond 503.

1. Les 4 fichiers d'exécution existent dans `model_files/`, à un chemin fixe calculé depuis `__file__`.
   **Aucun chemin ne vient d'une requête ni d'une variable d'environnement.**
2. **SHA-256** de chaque fichier égal à `EXPECTED_SHA256` (valeurs du §3), **avant** tout
   `joblib.load`. joblib, comme pickle, peut exécuter du code.
3. `sklearn.__version__ == meta["sklearn_version"]` (`"1.6.1"`) et
   `int(numpy.__version__.split(".")[0]) == 2`.
4. `joblib.load(<chemin fixe>)`.
5. Le modèle est un `Pipeline` dont les étapes sont `scaler` (`StandardScaler`) et `cluster`
   (`KMeans`), avec `n_clusters == meta["k"] == 4`.
6. `list(model.feature_names_in_) == meta["features"] == ["rain_mm_anom", "gwetroot_mean_anom", "heat_spring_anom"]`.
7. Les valeurs de `meta["label_map"]` sont exactement les 4 clés de `LABEL_IDS`, et
   `meta["label_order_dry_to_wet"]` traduit en identifiants donne `TYPE_ORDER`.
8. Cohérence des données :
   - les clés de la baseline sont exactement l'ensemble des `point` du CSV (102) ;
   - les couples (lat, lon) de la baseline sont exactement `meta["coverage"]["cells"]` ;
   - le CSV a 3060 lignes, 30 saisons par cellule, de 1996 à 2025 ;
   - toutes les colonnes attendues sont présentes.
9. Prédiction sur `df[meta["features"]]`, puis vérification que le résultat est égal à l'argmin
   des distances aux centroïdes.
10. Non-régression (validation du notebook, §7.4) : C057 a le type `dry_hot` pour 2016, 2023 et
    2024.

**`heatRelevant` d'une cellule** = `std.heat_spring` non nul **et** `mean.heat_spring ≥ 1.0`. Il
vaut `false` pour C035, C046, C059, C066, C072 et C078.

### 6.4 Rattachement à la cellule

1. On calcule la cellule NASA POWER qui contient le point :
   - `i = round((lat − 29.5) / 0.5)` et `j = round((lon + 9.375) / 0.625)` ;
   - le centre vaut `(29.5 + 0.5·i, −9.375 + 0.625·j)`, arrondi à 3 décimales (même grille que le
     notebook §2).
2. Si ce centre est l'une des 102 cellules, le statut est **`ok`** (cellule = celle qui contient
   le point).
3. Sinon, on prend la cellule la plus proche selon `hypot(Δlat, Δlon)` en degrés, la même
   distance que le notebook §7.4. Si la distance vaut au plus **`NEAR_MAX_DEG = 0.5`**, le statut
   est **`proche`**. Sinon, il est **`hors_zone`**.
4. `distanceDeg` est **toujours** la distance du point au centre de la cellule retenue, arrondie à
   3 décimales.

**Résultats attendus** (vérifiés ; ils servent aussi à la liste des lieux, §7.3) :

| Lieu | lat ; lon | Statut | Cellule | Centre | distanceDeg |
|---|---|---|---|---|---|
| Béni Mellal | 32.34 ; −6.35 | ok | C057 | 32.5 ; −6.25 | 0.189 |
| Tadla (lieu de test) | 32.34 ; −6.36 | ok | C057 | 32.5 ; −6.25 | 0.194 |
| Kasba Tadla | 32.60 ; −6.27 | ok | C057 | 32.5 ; −6.25 | 0.102 |
| Fquih Ben Salah | 32.50 ; −6.69 | ok | C056 | 32.5 ; −6.875 | 0.185 |
| Bin el Ouidane | 32.10 ; −6.45 | ok | C045 | 32.0 ; −6.25 | 0.224 |
| Khouribga | 32.88 ; −6.91 | ok | C069 | 33.0 ; −6.875 | 0.125 |
| Settat | 33.00 ; −7.62 | ok | C068 | 33.0 ; −7.5 | 0.12 |
| Casablanca | 33.59 ; −7.62 | ok | C079 | 33.5 ; −7.5 | 0.15 |
| Rabat | 34.02 ; −6.84 | ok | C089 | 34.0 ; −6.875 | 0.04 |
| Meknès | 33.89 ; −5.55 | ok | C091 | 34.0 ; −5.625 | 0.133 |
| Fès | 34.03 ; −5.00 | ok | C092 | 34.0 ; −5.0 | 0.03 |
| Marrakech | 31.63 ; −8.01 | ok | C032 | 31.5 ; −8.125 | 0.174 |
| Agadir | 30.42 ; −9.60 | ok | C012 | 30.5 ; −9.375 | 0.239 |
| Oujda | 34.68 ; −1.91 | ok | C105 | 34.5 ; −1.875 | 0.183 |
| Tanger | 35.77 ; −5.80 | **proche** | C113 | 35.5 ; −5.625 | 0.322 |
| Océan | 33.00 ; −9.50 | **hors_zone** | (C066) | 33.0 ; −8.75 | 0.75 |
| Sahara | 30.00 ; −5.00 | **hors_zone** | (C037) | 31.5 ; −5.0 | 1.5 |
| Dakhla | 23.70 ; −15.90 | **hors_zone** | (C000) | 29.5 ; −9.375 | 8.73 |

Les coordonnées des villes sont des centres-villes approximatifs, à vérifier par l'équipe. Les
résultats ci-dessus ont été calculés avec exactement ces valeurs.

### 6.5 Endpoints

Le JSON est en **camelCase** (Pydantic : `alias_generator=to_camel`, `populate_by_name=True`). Les
identifiants de type (`dry_hot`…) restent des chaînes snake_case.

**Arrondis :**
- mm : 1 décimale ;
- jours : entier pour une saison, 1 décimale pour une moyenne ou une normale ;
- `gwetrootMean` : 2 décimales (fraction de 0 à 1) ;
- `tMeanC` : 1 décimale ;
- `margin` : 2 décimales ;
- `rainPctNormal` : entier, `round(100 × rain_mm / normale)` calculé sur les valeurs **non
  arrondies**.

#### `GET /seasons/zone?lat=<float>&lon=<float>[&water=pluvial|irrigue]`

- `lat` doit être dans [−90, 90] et `lon` dans [−180, 180] ; les deux sont obligatoires.
- `water` vaut `pluvial` par défaut. Il est ajouté à l'**étape 3** ; avant, le paramètre n'existe
  pas et `advice` vaut `[]`.

**Exemple complet** pour `lat=32.34&lon=-6.36&water=pluvial`, une fois l'étape 3 faite (valeurs
réelles) :

```json
{
  "status": "ok",
  "query": { "lat": 32.34, "lon": -6.36, "water": "pluvial" },
  "cell": {
    "id": "C057", "lat": 32.5, "lon": -6.25, "distanceDeg": 0.194,
    "region": "Centre", "heatRelevant": true
  },
  "reference": { "from": 1996, "to": 2025 },
  "normals": {
    "rainMm": 458.6, "rainAutumnMm": 189.9, "rainSpringMm": 149.3,
    "heatSpringDays": 12.6, "gwetrootMean": 0.58, "tMeanC": 13.8
  },
  "lastSeason": {
    "season": 2025, "type": "dry_hot", "margin": 0.64, "borderline": false,
    "rainMm": 370.6, "rainPctNormal": 81, "rainAutumnMm": 91.5, "rainSpringMm": 212.4,
    "heatSpringDays": 16, "gwetrootMean": 0.51, "tMeanC": 14.6
  },
  "history": [
    { "season": 2016, "type": "dry_hot",     "margin": 0.2,  "borderline": false, "rainMm": 229.9, "rainPctNormal": 50,  "rainAutumnMm": 33.8,  "rainSpringMm": 117.6, "heatSpringDays": 10, "gwetrootMean": 0.47, "tMeanC": 14.1 },
    { "season": 2017, "type": "dry_hot",     "margin": 0.35, "borderline": false, "rainMm": 382.5, "rainPctNormal": 83,  "rainAutumnMm": 206.7, "rainSpringMm": 49.9,  "heatSpringDays": 23, "gwetrootMean": 0.55, "tMeanC": 14.3 },
    { "season": 2018, "type": "normal_cool", "margin": 0.49, "borderline": false, "rainMm": 513.7, "rainPctNormal": 112, "rainAutumnMm": 76.6,  "rainSpringMm": 262.1, "heatSpringDays": 0,  "gwetrootMean": 0.58, "tMeanC": 12.9 },
    { "season": 2019, "type": "dry_hot",     "margin": 0.22, "borderline": false, "rainMm": 374.3, "rainPctNormal": 82,  "rainAutumnMm": 211.8, "rainSpringMm": 122.4, "heatSpringDays": 23, "gwetrootMean": 0.57, "tMeanC": 14.0 },
    { "season": 2020, "type": "dry_hot",     "margin": 0.51, "borderline": false, "rainMm": 409.1, "rainPctNormal": 89,  "rainAutumnMm": 125.2, "rainSpringMm": 264.5, "heatSpringDays": 17, "gwetrootMean": 0.52, "tMeanC": 14.6 },
    { "season": 2021, "type": "dry_hot",     "margin": 0.26, "borderline": false, "rainMm": 389.5, "rainPctNormal": 85,  "rainAutumnMm": 105.7, "rainSpringMm": 94.7,  "heatSpringDays": 15, "gwetrootMean": 0.55, "tMeanC": 14.1 },
    { "season": 2022, "type": "dry_hot",     "margin": 0.85, "borderline": false, "rainMm": 318.2, "rainPctNormal": 69,  "rainAutumnMm": 77.8,  "rainSpringMm": 208.9, "heatSpringDays": 18, "gwetrootMean": 0.5,  "tMeanC": 14.4 },
    { "season": 2023, "type": "dry_hot",     "margin": 0.76, "borderline": false, "rainMm": 268.1, "rainPctNormal": 58,  "rainAutumnMm": 121.2, "rainSpringMm": 64.6,  "heatSpringDays": 20, "gwetrootMean": 0.48, "tMeanC": 15.9 },
    { "season": 2024, "type": "dry_hot",     "margin": 0.57, "borderline": false, "rainMm": 250.7, "rainPctNormal": 55,  "rainAutumnMm": 62.5,  "rainSpringMm": 106.0, "heatSpringDays": 26, "gwetrootMean": 0.47, "tMeanC": 16.1 },
    { "season": 2025, "type": "dry_hot",     "margin": 0.64, "borderline": false, "rainMm": 370.6, "rainPctNormal": 81,  "rainAutumnMm": 91.5,  "rainSpringMm": 212.4, "heatSpringDays": 16, "gwetrootMean": 0.51, "tMeanC": 14.6 }
  ],
  "counts": {
    "recent":    { "from": 2016, "to": 2025, "total": 10, "byType": { "dry_hot": 9,  "normal_cool": 1, "normal_hot": 0, "very_wet_cool": 0 } },
    "before":    { "from": 1996, "to": 2015, "total": 20, "byType": { "dry_hot": 3,  "normal_cool": 7, "normal_hot": 4, "very_wet_cool": 6 } },
    "reference": { "from": 1996, "to": 2025, "total": 30, "byType": { "dry_hot": 12, "normal_cool": 8, "normal_hot": 4, "very_wet_cool": 6 } }
  },
  "advice": [
    { "id": "drought_tolerant", "variant": "pluvial", "crops": ["orge", "legumineuses"], "needsValidation": true,
      "evidence": { "count": 9, "total": 10, "from": 2016, "to": 2025 } },
    { "id": "dry_autumn", "variant": "pluvial", "crops": [], "needsValidation": true,
      "evidence": { "below": 8, "total": 10, "meanMm": 111.3, "normalMm": 189.9, "pct": 59 } },
    { "id": "hot_spring", "variant": "pluvial", "crops": ["ble", "orge"], "needsValidation": true,
      "evidence": { "above": 8, "total": 10, "meanDays": 16.8, "normalDays": 12.6 } },
    { "id": "last_season_dry", "variant": "pluvial", "crops": [], "needsValidation": true,
      "evidence": { "season": 2025, "rainMm": 370.6, "normalMm": 458.6, "pct": 81 } },
    { "id": "field_shift", "variant": "pluvial", "crops": [], "needsValidation": true,
      "evidence": { "recent": 9, "recentTotal": 10, "since": 2016, "before": 3, "beforeTotal": 20, "beforeFrom": 1996, "beforeTo": 2015 } }
  ],
  "model": { "name": "StandardScaler + KMeans", "k": 4, "version": "v5", "trainedAt": "2026-11-15T10:29:22+00:00", "sklearnVersion": "1.6.1" },
  "source": "NASA POWER daily API (community AG), modèle AGRIQO v5"
}
```

- **`history`** contient les 10 dernières saisons, de la plus ancienne à la plus récente.
  `lastSeason` est égal au dernier élément de `history`.
- **Fenêtres :** `recent` = les 10 dernières saisons du CSV ; `before` = toutes les saisons
  antérieures ; `reference` = toutes. Elles sont dérivées des données (`last_season − 9`), et non
  codées en dur.

**`proche`** (`lat=35.77&lon=-5.80`) : même forme, avec `"status": "proche"` et
`"cell": { "id": "C113", "lat": 35.5, "lon": -5.625, "distanceDeg": 0.322, "region": "Nord",
"heatRelevant": true }`. La dernière saison de C113 est `normal_hot`, avec `rainPctNormal: 110`.

**`hors_zone`** (`lat=33.0&lon=-9.5`) : réponse **HTTP 200**.
```json
{
  "status": "hors_zone",
  "query": { "lat": 33.0, "lon": -9.5, "water": "pluvial" },
  "nearestCell": { "id": "C066", "lat": 33.0, "lon": -8.75, "distanceDeg": 0.75 },
  "maxDistanceDeg": 0.5,
  "cell": null, "reference": null, "normals": null, "lastSeason": null,
  "history": [], "counts": null, "advice": [],
  "model": { "name": "StandardScaler + KMeans", "k": 4, "version": "v5", "trainedAt": "2026-11-15T10:29:22+00:00", "sklearnVersion": "1.6.1" },
  "source": "NASA POWER daily API (community AG), modèle AGRIQO v5"
}
```
`nearestCell` est présent dans les 3 statuts ; pour `ok` et `proche`, il est égal à `cell`.

#### `GET /seasons/map?season=<int>` (étape 4)

- `season` doit être dans `[first_season, last_season]`, soit [1996, 2025]. Valeur par défaut :
  `last_season`.
- Réponse :
  `{ "season": 2025, "cells": [ { "id": "C057", "lat": 32.5, "lon": -6.25, "type": "dry_hot", "rainPctNormal": 81, "gwetrootMean": 0.51, "borderline": false }, … 102 cellules ], "grid": { "lats": [...], "lons": [...] }, "source": "…" }`.
- `grid` est recopié de `meta["grid"]`.

**Comptes nationaux attendus :**
- 2025 : `dry_hot` 71, `normal_cool` 24, `normal_hot` 4, `very_wet_cool` 3 ;
- 2022 : `dry_hot` 73, `normal_cool` 12, `very_wet_cool` 9, `normal_hot` 8.

#### Codes d'erreur

| Cas | Code | Corps |
|---|---|---|
| `lat`/`lon` absents, non numériques ou hors bornes ; `water` invalide ; `season` hors plage | 422 | Format FastAPI par défaut |
| Modèle non chargé (contrôle du §6.3 échoué) | 503 | `{"detail": {"code": "model_unavailable", "message": "<cause>"}}` |
| Point hors de la couverture | **200** | `status: "hors_zone"` (ce n'est pas une erreur) |

## 7. Architecture frontend

### 7.1 Fichiers

| Fichier | Rôle |
|---|---|
| `src/types/seasons.ts` | `SeasonTypeId`, `CellStatus` (`"ok" \| "proche" \| "hors_zone"`), `WaterRegime` (`"pluvial" \| "irrigue"`), `SeasonEntry`, `ZoneResponse`, `AdviceItem`, `SeasonMapResponse`, qui reprennent le JSON du §6.5 |
| `src/services/seasons.ts` | `fetchZone({lat, lon, water}, signal)` et `fetchSeasonMap(season, signal)`, sur le modèle de `api.ts` (`API_BASE_URL`, `AbortSignal`, `throw` si la réponse n'est pas OK). Mettre à jour le commentaire d'en-tête de `api.ts` (« not wired » n'est plus vrai). |
| `src/hooks/useZone.ts` | `{ state: "loading" \| "error" \| "ready", data?, retry() }`. Relance quand le lieu ou `water` change. Annule la requête précédente avec `AbortController`. |
| `src/farm/FarmContext.tsx` | Contexte « ma ferme » (§7.2). **Ne pas l'appeler `useLocation`**, qui est déjà le nom d'un hook React Router. Utiliser `useFarm()`. |
| `src/data/places.ts` | Liste des lieux (§7.3). Ce sont des données réelles, pas un mock. |
| `src/i18n/format.ts` | `formatNumber(value, language, fractionDigits)` avec `Intl.NumberFormat(locale, { numberingSystem: "latn" })`, en réutilisant la table `DATE_LOCALE` de `pages/Map.tsx` (à déplacer ici). Ajouter aussi `formatSeason(2025) → "2024–2025"`. |
| `src/pages/overview/SeasonRainChart.tsx` | Remplace `ClimateChart` (§7.5) |
| `src/pages/map/SeasonGrid.tsx` | Carte SVG (étape 4) |
| `src/components/Select.tsx` | Nouveau : `<select>` natif stylé (choix du lieu, saison sur la carte). À décrire d'abord dans `design.md` §6. |
| `src/components/TextField.tsx` | Nouveau (étape 5) : saisie de lat/lon. À décrire d'abord dans `design.md` §6. |
| `src/components/AdviceCard.tsx` | Nouveau (étape 3) : une carte standard avec icône, conseil, « Pourquoi : … », source et « À valider par un agronome ». À décrire d'abord dans `design.md` §6. |

**Composants réutilisés tels quels :** `Card`, `Badge`, `ProgressBar`, `FactList`,
`SegmentedControl`, `Header`, `Screen`, `Button`, `Icon`, `PhotoFrame` (`frontend/src/components/`).

**Ajouts à `design.md`, à faire avant le code, dans le même commit que le composant :**
- §6 : `Select`, `TextField`, `AdviceCard`, « état de chargement, d'erreur ou hors zone » (texte
  sobre en `--text-600` et un bouton « Réessayer », pas de squelette animé) ;
- §2 : 4 jetons de couleur des types de saison (étape 4) ;
- §7.4 : la nouvelle section de conseils dans Recommandations ;
- §7.7 : la grille SVG.

### 7.2 Contexte de la ferme

`FarmContext` contient `{ placeId: PlaceId | null, lat, lon, water: WaterRegime }` et les
setters correspondants.

- **Valeur par défaut :** `beniMellal` (32.34 ; −6.35), `water: "pluvial"`.
- **Persistance :** dans `localStorage` sous la clé `agriqo.farm`, avec try/catch en lecture comme
  en écriture. L'application doit fonctionner sans `localStorage`.
- **Où le placer :** le provider entoure `RouterProvider` dans `src/App.tsx`. **Il faut aussi
  modifier `renderRoute` et `renderWithRouter`** dans `frontend/tests/utils.tsx` pour qu'ils
  enveloppent le provider. Ajouter un paramètre optionnel pour l'état initial.
- **`water` est saisi par l'agriculteur :** c'est une donnée non-NASA, à ne pas présenter comme
  une donnée satellite.

### 7.3 Liste des lieux (`src/data/places.ts`)

Ce sont les 14 premières lignes du tableau du §6.4 (statut `ok` ou `proche`), avec les
identifiants : `beniMellal`, `kasbaTadla`, `fquihBenSalah`, `binElOuidane`, `khouribga`,
`settat`, `casablanca`, `rabat`, `meknes`, `fes`, `marrakech`, `agadir`, `oujda`, `tanger`.
« Tadla (lieu de test) » n'y figure pas : c'est Béni Mellal.

Les noms vont dans `places.<id>`, dans les 3 fichiers i18n :

| id | fr | en | ar |
|---|---|---|---|
| beniMellal | Béni Mellal | Beni Mellal | بني ملال |
| kasbaTadla | Kasba Tadla | Kasba Tadla | قصبة تادلة |
| fquihBenSalah | Fquih Ben Salah | Fquih Ben Salah | الفقيه بن صالح |
| binElOuidane | Bin el Ouidane | Bin el Ouidane | بين الويدان |
| khouribga | Khouribga | Khouribga | خريبكة |
| settat | Settat | Settat | سطات |
| casablanca | Casablanca | Casablanca | الدار البيضاء |
| rabat | Rabat | Rabat | الرباط |
| meknes | Meknès | Meknes | مكناس |
| fes | Fès | Fez | فاس |
| marrakech | Marrakech | Marrakesh | مراكش |
| agadir | Agadir | Agadir | أكادير |
| oujda | Oujda | Oujda | وجدة |
| tanger | Tanger | Tangier | طنجة |

Les points « hors zone » (océan, Sahara) ne sont pas dans la liste. Ils se démontrent par l'API
(curl) aux étapes 1 et 2, et par la saisie libre à l'étape 5.

### 7.4 `/farm` (Accueil, `design.md` §7.2)

Fichiers concernés : `frontend/src/pages/Farm.tsx`, `mocks/farm.ts`, `types/farm.ts`.

```
┌ Votre ferme ────────────────────── [AR FR EN] ┐
│ [illustration de la parcelle]   📍 Béni Mellal│   chip = nom du lieu choisi
│ Lieu        [ Béni Mellal            ▾ ]      │   Select (places)
│ Zone climatique : 32,5° N · 6,25° O · ~20 km  │   cell + distance (statut ok)
│  (statut proche : + « zone voisine, ~35 km »)  │
│ Irrigation  [ Pluviale | Irriguée ]           │   SegmentedControl → FarmContext.water
│ ─ Type de sol      Argileux       [Exemple]   │   reste mock
│ ─ Culture actuelle Blé            [Exemple]   │   reste mock
│ [ Analyser ma ferme → ]                        │   → /overview (inchangé)
└───────────────────────────────────────────────┘
```

- **Remplacé :** `farmData.location` (vient maintenant du contexte) et `farmData.waterAvailability`
  (« Limitée », remplacé par le régime irrigué ou pluvial).
- **Conversion en km :** `distanceDeg × 111`, arrondi à 5 km. L'indiquer comme « ~ » : c'est une
  approximation d'affichage, pas une donnée.

### 7.5 `/overview` (Analyses, `design.md` §7.3), l'écran principal

Fichiers concernés : `frontend/src/pages/Overview.tsx`, `mocks/overview.ts`, `types/overview.ts`,
`pages/overview/ClimateChart.tsx`.

```
┌ Aperçu de la ferme ─────────────────────────────┐
│ Dernière saison disponible : 2024–2025  📍 Béni Mellal
│ [Sèche]  Sèche et chaude                         │   Badge court + nom complet
│ Pluie            370,6 mm · normale 458,6 mm     │
│ ███████████████░░░░  81 % de la normale           │   ProgressBar value=81 max=100 (plafonné), chiffre affiché
│ Jours > 30 °C (mars–mai)   16 · normale 12,6     │
│ (si borderline : « Classement limite : saison proche de deux types »)
├ Pluie des 10 dernières saisons ─────────────────┤
│ [SeasonRainChart : 10 barres + ligne de la normale, valeurs écrites]
├ Vos 10 dernières saisons ───────────────────────┤
│ Sèches et chaudes : 9 sur 10                     │
│ 2025  Sèche et chaude       81 %                 │   FactList, du plus récent au plus ancien
│ 2024  Sèche et chaude       55 %                 │
│ …                                                │
│ 2018  Normale et fraîche   112 %                 │
│ ⓘ Par rapport à 1996–2025 : saisons sèches       │   si advice field_shift présent
│   9 sur 10 depuis 2016, contre 3 sur 20 entre    │
│   1996 et 2015.                                  │
├ Humidité de la zone racinaire (oct.–mai) ───────┤
│ 51 % · normale 58 %   ████████░░                  │   gwetrootMean × 100
└ Source : NASA POWER, normale 1996–2025 de votre zone (~50 km) ┘
[ Voir mes recommandations → ]
```

**Remplacés :**
- `avgTemp` et `totalRainfall` par les valeurs de la dernière saison ;
- `monthly` et `ClimateChart` par `SeasonRainChart`. Il n'y a pas de données mensuelles : il faut
  **supprimer** `ClimateChart.tsx`, son CSS, son test, le type `MonthlyClimate` et les clés
  `chart.*` devenues inutiles ;
- `soilMoisturePercent` par `gwetrootMean` ;
- `healthIndex`, **inventé, sans source**, est supprimé.

Ensuite, `mocks/overview.ts` est supprimé.

**`SeasonRainChart` :**
- reprend la méthode de `ClimateChart` : une seule échelle, valeurs écrites, légende en texte,
  correction RTL de la ligne SVG ;
- barres = `rainMm` de chaque saison, ligne horizontale = `normals.rainMm` ;
- les barres n'utilisent **pas** de couleur par type : `--green-700`, comme les barres
  actuelles ;
- nom accessible : la liste « saison : mm ».

**États :**
- **chargement** : texte « Chargement… » ;
- **erreur** : message et bouton « Réessayer » ;
- **hors zone** : une carte « Votre lieu est hors de la zone couverte (Maroc, au nord de 29,5° N).
  Cellule la plus proche à ~85 km. » avec un bouton vers `/farm`.
- **Cellule `heatRelevant: false`** : afficher le nom du type **sans qualificatif de chaleur**
  (clé `nameNoHeat`, §9.1) et masquer la ligne des jours à plus de 30 °C.

### 7.6 `/recommendations` (`design.md` §7.4, à compléter)

```
┌ ← Recommandations ───────────────────────────────┐
│ Ce que dit le climat de votre zone               │   NOUVELLE section, données réelles
│ ┌ ☀ Privilégiez des cultures tolérantes à la    ┐│   AdviceCard (carte standard)
│ │ sécheresse (orge, pois chiche, lentille) et    ││
│ │ des variétés à cycle court.                    ││
│ │ Pourquoi : saisons sèches et chaudes : 9 sur 10││
│ │ (2016–2025).                                   ││
│ │ Source : NASA POWER · À valider par un agronome││
│ └────────────────────────────────────────────────┘│
│ … une AdviceCard par conseil (field_shift : déjà affiché sur /overview, ne pas répéter ici)
│ Aucun conseil → « Aucun signal climatique marqué dans votre zone sur 2016–2025. »
├ Cultures [Exemple] ──────────────────────────────┤
│ Classement d'exemple : pas encore calculé à partir de vos données.
│ [carte mise en avant Blé] [Orge 85 %] [Légumineuses 82 %] [plan de rotation]   inchangés
└──────────────────────────────────────────────────┘
```

- La carte « mise en avant » reste la **seule** carte `featured` de l'écran (`design.md` §6). Les
  AdviceCard sont des cartes standard.
- Si `water = irrigue`, les conseils concernés utilisent la variante `irrigue` (§8).

### 7.7 `/crop/:id` (`design.md` §7.5)

Fichier concerné : `frontend/src/pages/CropDetail.tsx`.

- La boîte « Pourquoi ce choix ? » garde le texte mock (avec la mention « Exemple »).
- Elle **ajoute** un paragraphe « Climat de votre zone : … » pour chaque conseil déclenché dont
  `crops` contient l'id de la culture, avec la même raison que l'AdviceCard. Exemple pour `orge`
  à Tadla : `drought_tolerant` et `hot_spring`.
- Si aucun conseil ne concerne la culture, on n'ajoute rien.
- Les autres faits (besoin en eau, saison, rendement) restent en mock.

### 7.8 `/map` (`design.md` §7.7, étape 4)

Fichiers concernés : `frontend/src/pages/Map.tsx`, `mocks/map.ts`, `types/map.ts`.

```
┌ Carte ─────────────────────────────────────────┐
│ Saison [ 2024–2025 ▾ ]                          │   Select, de 1996 à 2025
│ [Type de saison | Précipitations | Humidité du sol | Végétation]  SegmentedControl
│   N                                             │
│   ▢▢                                            │   SeasonGrid : 1 rect par cellule,
│  ▢▢▢▣▣▣▢▢                                       │   placé par (index lon, index lat),
│ ▢▢▣▣◉▣▣▣▢▢▢                                     │   nord en haut, NE SE RETOURNE PAS en RTL
│  ▢▣▣▣▣                                          │   ◉ = votre cellule (contour épais)
│ Légende : ■ Sèche et chaude ■ Normale et fraîche ■ …   (texte, dans l'ordre sec → humide)
│ Votre zone (2024–2025) : Sèche et chaude · 81 % de la pluie normale
│ Végétation : [Exemple] (illustration actuelle, pas de données NDVI)
└────────────────────────────────────────────────┘
```

**Grille :**
- 13 lignes (`meta.grid.lats`, de 29,5 à 35,5) × 14 colonnes (`lons`, de −9,375 à −1,25) ;
- seules les 102 cellules sont dessinées ;
- l'élément `<svg>` porte `dir="ltr"` et ses coordonnées ne sont jamais inversées : c'est de la
  géographie, pas un sens de lecture ;
- chaque `<rect>` contient un `<title>` (« 2024–2025 · C057 · Sèche et chaude · 81 % ») ;
- la couleur n'est jamais le seul signal : légende en texte et phrase « Votre zone : … ».

**Couches :**
- **Type** : 4 nouveaux jetons `--season-dry-hot`, `--season-normal-cool`, `--season-normal-hot`,
  `--season-very-wet-cool`. Leurs valeurs hex sont à proposer dans `design.md` §2 et à faire
  valider (contraste ≥ 3:1 avec `--white`).
- **Précipitations** : 4 classes de `rainPctNormal` (< 70, 70–89, 90–110, > 110 %) qui
  **réutilisent les 4 mêmes jetons**, dans l'ordre du sec à l'humide. La légende change.
- **Humidité du sol** : `gwetrootMean` en 4 classes (< 0,45, 0,45–0,55, 0,55–0,65, ≥ 0,65), avec
  les mêmes jetons.
- **Végétation** : reste l'illustration actuelle, avec la mention « Exemple ».
- `mapData.lastUpdated`, une date inventée, est remplacé par « Saison 2024–2025 · normale
  1996–2025 ».

## 8. Règles de conseil (`backend/app/seasons/advice.py`, étape 3)

**Fenêtres et définitions :**
- `W` = les 10 dernières saisons de la cellule (2016–2025) ; `B` = les saisons antérieures
  (1996–2015) ;
- « normale » = `baseline.mean[f]` de la cellule, **non arrondie** ;
- « sous la normale » = strictement `<`, « au-dessus » = strictement `>` ;
- `pct = round(100 × moyenne_W / normale)` ;
- les moyennes affichées sont arrondies à 1 décimale.

**Seuils nommés (`constants.py`) :**
```
DRY_SEASONS_MIN = 4
AUTUMN_BELOW_MIN = 6        AUTUMN_PCT_MAX = 85
SPRING_BELOW_MIN = 6        SPRING_PCT_MAX = 90
HOT_SPRING_ABOVE_MIN = 6    HOT_SPRING_ANOM_MIN = 0.3   # moyenne sur W de heat_spring_anom (CSV)
HEAT_RELEVANT_MIN_NORMAL_DAYS = 1.0
WET_SEASONS_MIN = 3
SHIFT_DRY_MIN = 5           SHIFT_SHARE_GAP = 0.30
MARGIN_LIMIT = 0.15         NEAR_MAX_DEG = 0.5
```

| id | Condition | Conseil, variante `pluvial` | Variante `irrigue` | `crops` | Raison (preuve) |
|---|---|---|---|---|---|
| `drought_tolerant` | nombre de `dry_hot` sur W ≥ `DRY_SEASONS_MIN` | Cultures tolérantes à la sécheresse (orge, pois chiche, lentille), variétés à cycle court | **Atténué :** la sécheresse pèse moins, mais prévoir des restrictions d'eau d'irrigation les années sèches | `orge`, `legumineuses` | « saisons sèches et chaudes : {count} sur {total} ({from}–{to}) » |
| `dry_autumn` | nombre de saisons de W sous la normale d'automne ≥ 6 **et** pct < 85 | Ne pas semer sur sol sec ; attendre la première pluie utile | **Atténué :** prévoir une irrigation d'installation après le semis | — | « pluie oct.–déc. sous la normale {below} fois sur {total} ; {meanMm} mm contre {normalMm} mm ({pct} %) » |
| `hot_spring` | `heatRelevant` **et** nombre de saisons de W au-dessus de la normale de chaleur de printemps ≥ 6 **et** moyenne W de `heat_spring_anom` ≥ 0,3 | Semis précoce, variétés précoces (finir le remplissage du grain avant la chaleur) | Identique | `ble`, `orge` | « jours > 30 °C (mars–mai) au-dessus de la normale {above} fois sur {total} ; {meanDays} jours contre {normalDays} » |
| `dry_spring` | nombre de saisons de W sous la normale de printemps ≥ 6 **et** pct < 90 | Variétés précoces qui finissent leur cycle plus tôt | **Atténué :** garder de l'eau pour une irrigation au remplissage du grain | `orge` | « pluie mars–mai sous la normale {below} fois sur {total} ; {pct} % de la normale » |
| `last_season_dry` | type de la dernière saison = `dry_hot` | Réserves d'eau du sol probablement basses : prudence sur les intrants coûteux | **Atténué :** vérifier les dotations d'eau d'irrigation avant de choisir les cultures | — | « saison {season} : {rainMm} mm, soit {pct} % de la normale ({normalMm} mm) » |
| `wet_frequent` | nombre de `very_wet_cool` sur W ≥ 3 | Le blé est envisageable ; surveiller les maladies fongiques (rouilles) | Identique | `ble` | « saisons très humides : {count} sur {total} » |
| `field_shift` | nombre de `dry_hot` sur W ≥ 5 **et** (part sèche sur W − part sèche sur B) ≥ 0,30 | Le climat de votre zone a changé : les saisons sèches sont beaucoup plus fréquentes qu'avant | Identique | — | « par rapport à 1996–2025 : saisons sèches {recent} sur {recentTotal} depuis {since}, contre {before} sur {beforeTotal} entre {beforeFrom} et {beforeTo} » |

**Garde-fous :**
- **Ordre de sortie** : celui du tableau.
- Chaque conseil a `needsValidation: true`. L'interface affiche « À valider par un agronome » et la
  source « NASA POWER, normale 1996–2025 de votre zone ».
- `hot_spring` n'est **jamais** évalué si `heatRelevant` est `false` (C035, C046, C059, C066,
  C072, C078).
- **Statut `hors_zone`** : `advice` vaut `[]`. Les conseils sont aussi calculés pour `proche`,
  et l'interface rappelle la mention « zone voisine ».
- **Aucun chiffre n'est inventé** : chaque nombre affiché vient de `evidence`. Les textes ne
  contiennent que des placeholders.
- **Résultat connu :** `drought_tolerant` se déclenche dans **87 cellules sur 102**. C'est une
  conséquence de la décennie sèche, pas un bug. Cela figure dans les questions ouvertes (§14).
- Documenter ces règles dans `docs/seasons_rules.md`, avec une ligne par règle, ses seuils et
  « needs_validation ». Toute modification d'un seuil doit mettre à jour le code, ce document et
  les tests (même principe que pour les règles de scoring).

**Résultats attendus** (vérifiés, `water=pluvial`) :

| Cellule | Conseils déclenchés (avec leurs preuves) |
|---|---|
| **C057** (Tadla) | `drought_tolerant` (9/10) · `dry_autumn` (8/10 ; 111,3 contre 189,9 mm ; 59 %) · `hot_spring` (8/10 ; 16,8 contre 12,6 jours) · `last_season_dry` (2025 ; 370,6 contre 458,6 mm ; 81 %) · `field_shift` (9/10 contre 3/20) |
| **C045** (Bin el Ouidane) | `drought_tolerant` (6/10) · `dry_autumn` (10/10 ; 90,8 contre 158,9 mm ; 57 %) · `field_shift` (6/10 contre 3/20) |
| **C079** (Casablanca) | `drought_tolerant` (5/10) · `dry_autumn` (8/10 ; 138,0 contre 191,4 mm ; 72 %) · `last_season_dry` (2025 ; 279,9 contre 416,4 mm ; 67 %) · `field_shift` (5/10 contre 3/20) |
| **C091** (Meknès) | `drought_tolerant` (5/10) · `dry_autumn` (8/10 ; 168,0 contre 230,2 mm ; 73 %) · `hot_spring` (7/10 ; 19,0 contre 16,1 jours) · `last_season_dry` (2025 ; 423,2 contre 537,5 mm ; 79 %). Pas de `field_shift` (5/10 contre 5/20 : l'écart vaut 0,25). |
| **C113** (Tanger, proche) | **aucun conseil** |
| **C046** (`heatRelevant: false`) | `dry_autumn` seulement (7/10 ; 88,1 contre 112,3 mm ; 78 %) |

**Nombre de cellules où chaque règle se déclenche (sur 102) :**
`drought_tolerant` 87, `dry_autumn` 94, `dry_spring` 25, `hot_spring` 52, `last_season_dry` 71,
`field_shift` 52, `wet_frequent` 3.

`dry_spring` ne se déclenche dans aucune des cellules de test. À Tadla, la pluie de printemps est
sous la normale 6 fois sur 10, mais la moyenne vaut 100,7 % de la normale.

**Avec `water=irrigue`** : on obtient les mêmes ids, mais `variant: "irrigue"` pour
`drought_tolerant`, `dry_autumn`, `dry_spring` et `last_season_dry`. Les autres gardent
`"pluvial"`.

## 9. Libellés et traductions

### 9.1 Types de saison (identifiants stables)

Clés à créer : `seasons.types.<id>.name` (nom complet), `.short` (Badge, 2 mots maximum) et
`.nameNoHeat` (cellules où `heatRelevant` est `false`).

| id | fr name / short / nameNoHeat | en name / short / nameNoHeat | ar name / short / nameNoHeat |
|---|---|---|---|
| `dry_hot` | Sèche et chaude / Sèche / Sèche | Dry and hot / Dry / Dry | جافة وحارة / جافة / جافة |
| `normal_cool` | Normale et fraîche / Normale fraîche / Normale | Normal and cool / Normal, cool / Normal | عادية وباردة نسبيًا / عادية باردة / عادية |
| `normal_hot` | Normale et chaude / Normale chaude / Normale | Normal and warm / Normal, warm / Normal | عادية وحارة / عادية حارة / عادية |
| `very_wet_cool` | Très humide et fraîche / Très humide / Très humide | Very wet and cool / Very wet / Very wet | ممطرة جدًا وباردة نسبيًا / ممطرة جدًا / ممطرة جدًا |

Toujours afficher une saison sous la forme « 2024–2025 » (`formatSeason`), jamais « 2025 » seul.

**Autres libellés à prévoir (fr | en | ar) :**
- « Classement limite » | « Borderline » | « تصنيف حدّي » ;
- « Zone voisine » | « Nearby area » | « منطقة مجاورة » ;
- « Hors zone » | « Outside the area » | « خارج المنطقة المغطاة » ;
- « Pluviale » | « Rain-fed » | « بعلية » ;
- « Irriguée » | « Irrigated » | « مسقية » ;
- « Exemple » | « Example » | « مثال » ;
- « À valider par un agronome » | « To be validated by an agronomist » | « يجب أن يتحقق منه مهندس زراعي ».

Les textes des conseils sont dans le §8, en français. Les traduire en anglais et en arabe
standard ; **toutes les chaînes arabes sont à relire par l'équipe** (décision 7).

### 9.2 Pluriels et compteurs

**Contrainte technique :** `frontend/tests/i18n/i18n.test.tsx` exige les **mêmes clés** et les
**mêmes placeholders** que `ar.json` dans les 3 fichiers. Or i18next utilise 6 catégories pour
l'arabe (`_zero`, `_one`, `_two`, `_few` pour 3 à 10, `_many` pour 11 à 99, `_other`), contre
`_one`/`_many`/`_other` en français et `_one`/`_other` en anglais.

**Règle 1 (préférée) : éviter l'accord en nombre.** Écrire « libellé : N sur M » plutôt que
« N saisons sèches ». Exemple : « Saisons sèches et chaudes : {{count}} sur {{total}} » /
« Dry and hot seasons: {{count}} of {{total}} » / « المواسم الجافة والحارة: {{count}} من أصل
{{total}} ». C'est le format de toutes les raisons du §8.

**Règle 2 : si une phrase accordée est nécessaire,** créer les **6 suffixes dans les 3 fichiers**.
Pour chaque suffixe, les placeholders sont ceux de la forme arabe. Les formes inutilisées en
français et en anglais restent des phrases correctes. Exemple pour `seasons.dryCount` :

| suffixe | ar (référence) | fr | en |
|---|---|---|---|
| `_zero` | لا يوجد أي موسم جاف وحار | aucune saison sèche et chaude | no dry and hot season |
| `_one` | موسم واحد جاف وحار | une saison sèche et chaude | one dry and hot season |
| `_two` | موسمان جافان وحاران | deux saisons sèches et chaudes | two dry and hot seasons |
| `_few` | {{count}} مواسم جافة وحارة | {{count}} saisons sèches et chaudes | {{count}} dry and hot seasons |
| `_many` | {{count}} موسمًا جافًا وحارًا | {{count}} saisons sèches et chaudes | {{count}} dry and hot seasons |
| `_other` | {{count}} موسم جاف وحار | {{count}} saisons sèches et chaudes | {{count}} dry and hot seasons |

**Nombres :** toujours formatés par `formatNumber`, en chiffres latins. La virgule décimale est
utilisée en français (« 370,6 »), le point en anglais (« 370.6 »). En arabe, utiliser la locale
`ar-MA` avec `numberingSystem: "latn"`, comme `DATE_LOCALE` dans `pages/Map.tsx`. Un test vérifie
qu'il n'y a aucun chiffre arabe oriental (même motif que `frontend/tests/pages/Map.test.tsx`).

## 10. Ce qui reste en mock, et comment l'indiquer

| Donnée | Fichier | Indication |
|---|---|---|
| Classement des cultures, `matchPercent`, culture mise en avant, plan de rotation | `mocks/recommendations.ts` | Badge « Exemple » sur le titre de section, et la ligne « Classement d'exemple : pas encore calculé à partir de vos données. » |
| Fiche culture (besoin en eau, saison, rendement, « pourquoi » d'origine) | `mocks/cropDetails.ts` | Badge « Exemple » près des faits ; le paragraphe climat ajouté (§7.7) est réel |
| Type de sol, culture actuelle | `mocks/farm.ts` | Badge « Exemple » sur chaque ligne |
| Couche Végétation | `mocks/map.ts` | Badge « Exemple » |
| Profil (nom, lieu) | `mocks/profile.ts` | Hors sujet : ne pas toucher |

**Clés communes :** `common.example` (« Exemple ») et `common.exampleNotice`. Aucun chiffre mock ne
doit être présenté à côté d'une donnée NASA sans cette mention.

## 11. Ce qui n'est pas possible avec ces seuls fichiers (à dire, pas à contourner)

- **La saison 2026** (oct. 2025 → mai 2026) et la **saison en cours** ne sont pas disponibles,
  faute de données journalières, et sans appel en direct (décision 2). L'interface dit
  « Dernière saison **disponible** : 2024–2025 ».
- **Pas de comparaison « pluie depuis le 1er octobre par rapport à la normale »**, car il n'y a
  pas de normale jour par jour.
- **Pas de graphique mensuel.**
- **Pas de données** de sol, de gel, de végétation (NDVI), ni de rendement.
- **Précision limitée à la zone :** environ 50 km. Écrire « votre zone », jamais « votre
  parcelle ».

## 12. Tests à écrire

**Backend** (`pytest`, sans réseau, sur les vrais fichiers de `model_files/`) :
- **Commandes sous Windows :**
  ```
  cd backend
  python -m venv .venv
  .venv\Scripts\pip install -r requirements-dev.txt
  .venv\Scripts\python -m pytest
  ```
- **Tolérance :** comparer les valeurs à 1 décimale avec `pytest.approx(abs=0.051)`. Les cas
  `x.x5` dépendent de l'arrondi binaire ; exemple réel : 264.55 donne 264.5.

`test_store.py` :
- le store est `ok` ; 102 cellules ; 3060 saisons ; saisons de 1996 à 2025 ;
- nombre par type sur 3060 : `dry_hot` 985, `normal_cool` 889, `normal_hot` 618,
  `very_wet_cool` 568 ;
- 322 saisons ont une marge inférieure à 0,15 ;
- `predict` est égal à l'argmin des distances ;
- **C057, de 1996 à 2025, dans l'ordre :** `very_wet_cool, very_wet_cool, normal_cool, dry_hot,
  normal_cool, normal_cool, normal_cool, normal_hot, normal_cool, dry_hot, normal_hot,
  normal_cool, normal_cool, very_wet_cool, very_wet_cool, very_wet_cool, normal_hot,
  very_wet_cool, dry_hot, normal_hot, dry_hot, dry_hot, normal_cool, dry_hot, dry_hot, dry_hot,
  dry_hot, dry_hot, dry_hot, dry_hot`. C'est la même liste que la dernière cellule du notebook ;
- `heatRelevant` est faux exactement pour {C035, C046, C059, C066, C072, C078} ;
- **cas d'échec** :
  - empreinte SHA-256 modifiée (copie d'un fichier dans `tmp_path`, un octet changé) → `error`,
    et **`joblib.load` n'est pas appelé** (à vérifier avec un mock) ;
  - version de scikit-learn simulée à « 1.5.0 » (monkeypatch) → `error` ;
  - `label_map` inconnu → `error`.

`test_grid.py` : les 18 lignes du tableau du §6.4 (statut, cellule, `distanceDeg`). Ajouter le cas
limite d'un point exactement à 0,5° d'une cellule et hors de toute cellule : statut `proche`.

`test_api.py` (`fastapi.testclient.TestClient`) :
- `lat=32.34&lon=-6.36` → les valeurs du §6.5, notamment `cell.id = "C057"`, `normals.rainMm =
  458.6`, `lastSeason.rainPctNormal = 81`, `counts.recent.byType.dry_hot = 9`,
  `counts.before.byType.dry_hot = 3`, et la liste des 10 `history[].type` ;
- Tanger → `proche`, C113, 0.322 ;
- océan et Sahara → 200 avec `hors_zone`, `nearestCell` C066 (0.75) et C037 (1.5) ;
- `lat=91`, `lon=-181`, `lat` absent, `lat=abc` → 422 ;
- store en erreur (injecté) → 503 avec `code = "model_unavailable"` ;
- `/health` → 200, avec `seasonsModel` à `ok` ou `error` selon le store ;
- en-tête CORS présent pour l'origine `http://localhost:8080`.

`test_advice.py` (étape 3) :
- le tableau « Résultats attendus » du §8, avec chaque valeur de preuve ;
- les variantes `irrigue` ;
- le nombre de cellules par règle (87 / 94 / 25 / 52 / 71 / 52 / 3) ;
- `hot_spring` absent pour C046 ;
- `advice` vaut `[]` pour `hors_zone`.

`test_map.py` (étape 4) :
- 102 cellules ;
- comptes nationaux de 2025 (71 / 24 / 4 / 3) et de 2022 (73 / 12 / 9 / 8) ;
- `season=1995` et `season=2026` → 422.

**Frontend** (Vitest + Testing Library, `fetch` simulé avec `vi.stubGlobal`, jamais le réseau) :
- **Fixtures** : `frontend/tests/fixtures/seasons/zone-c057.json` (le JSON complet du §6.5),
  `zone-c113-proche.json` et `zone-ocean-hors-zone.json`. Ce sont des copies figées des réponses
  réelles, à produire avec l'API de l'étape 1.
- `services/seasons` :
  - l'URL construite contient `lat`, `lon` (et `water` à partir de l'étape 3) ;
  - une erreur est levée si la réponse HTTP n'est pas OK ;
  - l'`AbortSignal` est transmis.
- `FarmContext` :
  - la valeur par défaut est Béni Mellal / pluvial ;
  - le choix est persisté ;
  - l'application fonctionne si `localStorage` lève une exception.
- `/overview` :
  - en français : « 2024–2025 », badge « Sèche », « 370,6 mm », « 81 % », « 9 sur 10 », message
    Field Shift avec « 1996–2025 » ;
  - en arabe : le RTL est actif et il n'y a aucun chiffre arabe oriental ;
  - états chargement, erreur (puis « Réessayer » relance la requête), hors zone, proche (mention
    « zone voisine ») ;
  - cellule avec `heatRelevant: false` : nom sans qualificatif et pas de ligne de jours chauds.
- `/farm` :
  - le changement de lieu met à jour le chip et la zone ;
  - le `SegmentedControl` d'irrigation met à jour le contexte ;
  - les badges « Exemple » sont présents.
- `/recommendations` et `/crop/orge` (étape 3) :
  - les AdviceCards de C057 et leurs raisons ;
  - la mention « À valider par un agronome » ;
  - la variante irriguée ;
  - la section « Exemple » ;
  - le paragraphe climat à Tadla (C057) : `/crop/orge` affiche `drought_tolerant` et
    `hot_spring` ; `/crop/legumineuses` affiche `drought_tolerant` ; `/crop/ble` affiche
    `hot_spring` ;
  - avec la fixture C113 (aucun conseil), aucun paragraphe climat n'apparaît sur `/crop/orge`.
- `/map` (étape 4) :
  - 102 `<rect>` ;
  - la cellule de l'utilisateur est marquée ;
  - le `<svg>` porte `dir="ltr"` même en arabe ;
  - la légende est en texte.
- **Tests existants à mettre à jour** (et non à supprimer sans raison) :
  - `tests/pages/Overview.test.tsx` ;
  - `tests/pages/Farm.test.tsx` ;
  - `tests/pages/Map.test.tsx` (étape 4) ;
  - `tests/pages/ClimateChart.test.tsx` (supprimé avec le composant).

**Commandes de fin de chaque étape**, depuis `frontend/` (voir `README.md`) :
`npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, puis `npm run build`.
Ensuite, `docker compose up --build` depuis la racine.

## 13. Étapes (dans l'ordre)

**Étape 0 : préparation (≈ 0,5 h)**
- Fichiers déjà en place (§3) : vérifier `sha256sum -c backend/app/seasons/model_files/SHA256SUMS`.
- `.dockerignore` racine (décision 1) ; le `.gitignore` est déjà fait.
- Dépendances (§6.1).
- `CORS_ORIGINS` dans `.env.example`.

*Terminé quand :*
- les 4 empreintes de `SHA256SUMS` correspondent ;
- `pip install -r backend/requirements-dev.txt` passe ;
- `docker compose up --build` construit les deux images et `/health` répond 200.

**Étape 1 : backend MVP (≈ 3–4 h)**
- `config.py`, `constants.py`, `labels.py`, `store.py`, `grid.py`, `schemas.py`, `router.py`.
- `GET /seasons/zone`, sans `water` et avec `advice: []`.
- CORS, `/health` enrichi.
- `test_store.py`, `test_grid.py`, `test_api.py`.

*Terminé quand :*
- `pytest` passe sans réseau ;
- `curl "http://localhost:8000/seasons/zone?lat=32.34&lon=-6.36"` renvoie le JSON du §6.5 (sans
  conseils) ;
- l'océan renvoie `hors_zone` ;
- un fichier modifié provoque une erreur 503 sans que `joblib.load` soit appelé.

**Étape 2 : frontend MVP (≈ 4–5 h)**
- Ajouts à `design.md` (Select, états, `SeasonRainChart`).
- `types`, `services`, `hooks/useZone`, `FarmContext` (+ `tests/utils.tsx`), `data/places.ts`,
  `i18n/format.ts`.
- `/farm` (§7.4) et `/overview` (§7.5).
- Clés i18n ar/fr/en (§9) ; mentions « Exemple » sur `/farm`.
- Tests.

*Terminé quand :*
- les 5 commandes du §12 passent ;
- dans l'application lancée avec Docker :
  - Béni Mellal affiche « 2024–2025 · Sèche et chaude · 81 % » et « 9 sur 10 » ;
  - Casablanca affiche C079, avec la dernière saison `dry_hot` à 67 % ;
  - Tanger affiche la mention « zone voisine » ;
  - le passage en arabe fonctionne (RTL, chiffres latins).

⛔ **S'ARRÊTER ICI. Faire un résumé (fichiers, captures, écarts) et demander la validation de
l'équipe avant l'étape 3.**

**Étape 3 : conseils (≈ 3–4 h)**
- `advice.py` + paramètre `water` + `test_advice.py` ; `docs/seasons_rules.md`.
- `AdviceCard` (d'abord dans `design.md`) ; section de `/recommendations` (§7.6) avec la mention
  « Exemple » ; paragraphe climat de `/crop/:id` (§7.7) ; message Field Shift sur `/overview`.

*Terminé quand :*
- le tableau du §8 est reproduit à l'identique par les tests ;
- passer en « Irriguée » sur `/farm` change les textes sur `/recommendations` ;
- toutes les vérifications passent.

**Étape 4 : carte SVG (≈ 3–4 h)**
- `GET /seasons/map` + `test_map.py`.
- Jetons de couleur des saisons (`design.md` §2, puis `tokens.ts`, puis `npm run tokens`).
- `SeasonGrid`, sélecteur de saison, 3 couches réelles + Végétation « Exemple ».
- Mise à jour de `mocks/map.ts`, `types/map.ts` et `Map.test.tsx`.

*Terminé quand :*
- 2024–2025 affiche 71 cellules « sèche et chaude » ;
- la cellule de l'utilisateur est mise en évidence ;
- la carte ne se retourne pas en arabe ;
- toutes les vérifications passent.

**Étape 5 : saisie libre de la localisation (≈ 2–3 h)**
- `TextField` (d'abord dans `design.md`).
- Sur `/farm` : « Ma position » (`navigator.geolocation`, avec gestion du refus) et saisie de
  lat/lon validée côté client avec les mêmes bornes que le backend.

*Terminé quand :*
- saisir 33.00 / −9.50 affiche l'état « hors zone » sur `/overview` ;
- un refus de géolocalisation affiche un message clair, sans erreur ;
- toutes les vérifications passent.

**À la fin de chaque étape :** mettre à jour `ARCHITECTURE.md` (nouvelle section « Types de
saison ») et `README.md` (comment lancer les tests backend).

## 14. Questions encore ouvertes

1. **Couleurs** des 4 jetons de saison (étape 4) : valeurs hex à valider par l'équipe.
2. **Coordonnées** des 14 lieux : ce sont des centres-villes approximatifs, à confirmer.
3. **Valeur par défaut de `water`** : `pluvial` aujourd'hui, mais le Tadla est majoritairement
   irrigué. Faut-il passer à `irrigue` par défaut ?
4. **Seuils des conseils** (§8) : en attente d'un agronome. `drought_tolerant` se déclenche dans
   87 cellules sur 102 : garder 4 sur 10, ou monter à 5 ou 6 ?
5. **k = 4 et sa stabilité** (`ari_boot_min` 0,46) : faut-il réentraîner en k = 3 (0,80) ? Cela
   changerait les identifiants de type, les tests et les traductions.
6. **Relecture des chaînes arabes** (décision 7) : qui, et quand ?
7. **Libellé « chaude »** dans les cellules où il est peu significatif mais pas nul (normale de
   chaleur de printemps entre 1 et 3 jours, comme C045 avec 2,2 jours) : faut-il un seuil
   `HEAT_RELEVANT_MIN_NORMAL_DAYS` plus haut ?
8. **Plus tard** (hors périmètre, décision 2) : classement en direct de la saison 2026 et de la
   saison en cours. Cela demandera un appel NASA POWER, un portage exact de `season_features`
   (notebook §3) et des normales jour par jour.
