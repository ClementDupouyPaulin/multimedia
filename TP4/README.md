# TP4 – TerraSentinel Explorer

Prototype PWA éco-futuriste combinant cartographie assistée par IA, boussole 3D sensorielle et reconnaissance d'écosystèmes via vision par ordinateur. Conçue pour être déployable rapidement (GitHub Pages / Vercel) et utilisable en TD pour démontrer une intégration IA full-stack côté client.

## 1. Architecture & arborescence
```
TP4/
├── index.html               # Structure de la PWA et sections (carte, boussole, vision)
├── styles.css               # Thème néo-écologique, responsive et accessible
├── app.js                   # Logique cartographique + commandes en langage naturel + PWA
├── ui.js                    # Gestion UI, dictée vocale, bouton d'installation
├── compass.js               # Scène Three.js + DeviceOrientation + mode manuel
├── vision.js                # Flux caméra, MobileNet, intégration carte/3D
├── manifest.webmanifest     # Métadonnées PWA
├── service-worker.js        # Cache offline des assets essentiels
├── README.md                # Guide complet (ce fichier)
└── assets/
    ├── icons/               # Icônes PWA (remplaçables)
    └── models/              # Modèles glTF pour l'affichage 3D (ex. feuille stylisée)
```

### Flux de données
1. **UI** (`ui.js`) déclenche `terraApp.processCommand` (texte ou voix).
2. **app.js** parse la commande, pilote Leaflet, interroge OSM/OSRM, suggère des POI.
3. **vision.js** charge MobileNet via `ml5.js`, reconnaît un lieu → émet `ecosystem-detected` (consommé par `app.js` pour marquer la carte).
4. **compass.js** écoute les capteurs, anime le modèle 3D et reste synchronisable via l'évènement `ecosystem-heading` (exemple fourni).
5. **service-worker.js** met en cache les assets pour un fonctionnement hors ligne basique.

## 2. Installation & lancement local
### Pré-requis
- Navigateur moderne (Chrome, Edge, Firefox, Safari ≥ 16).
- Serveur HTTPS recommandé (obligatoire sur mobile pour caméra/capteurs). En local, `http://localhost` est accepté.

### Option 1 – Serveur statique simple
```bash
cd TP4
python -m http.server 5173
```
Puis ouvrir `http://localhost:5173`.

### Option 2 – Vite (si disponible)
```bash
npm create vite@latest terrasentinel -- --template vanilla
# Copier le contenu de TP4 dans terrasentinel
npm install
npm run dev -- --host
```

### Déploiement rapide
- **GitHub Pages** : déposer le dossier `TP4` à la racine du dépôt, activer Pages (branche `main`, dossier `/TP4`).
- **Vercel / Netlify** : import direct du repo, build command vide, dossier public `TP4`.

## 3. Permissions & sécurité
- **Géolocalisation** : invite l'utilisateur via bouton « Me localiser ».
- **DeviceOrientation** : bouton « Activer les capteurs » + rappel iOS (`DeviceOrientationEvent.requestPermission`).
- **Caméra** : bouton « Activer la caméra » gère les refus/erreurs (messages textuels + console).
- **Micro** : dictée vocale uniquement si l'API Web Speech est présente.

## 4. Personnalisation du modèle de vision
1. Aller sur [Teachable Machine](https://teachablemachine.withgoogle.com/), créer un projet « Image Project ».
2. Ajouter vos classes (ex. forêt boréale, mangrove, volcan). Minimum 30 images par classe.
3. `Train Model`, puis `Export Model` → `TensorFlow.js` → télécharger les fichiers.
4. Héberger le dossier exporté (GitHub, Firebase, etc.).
5. Dans `vision.js`, remplacer `ml5.imageClassifier("MobileNet")` par `ml5.imageClassifier('URL/model.json')`.
6. Adapter `catalog` pour vos classes (libellés, coordonnées, description, liens Wikipédia, modèle 3D / image).

## 5. Plan de test (check-list cliquable)
1. **Carte Leaflet**
   - Ouvrir la page → vérifier que la carte s'affiche sur l'Europe.
   - Cliquer sur « Me localiser » (autoriser la géolocalisation) → recentrage + cercle vert.
2. **Commandes IA**
   - Entrer `va à Montréal` → flyTo + message.
   - Entrer `zoome x2` → zoom augmente.
   - `ajoute un marqueur Refuge` → popup avec le libellé.
   - `itinéraire jusqu'à Bruxelles` → tracé vert (OSRM) + suggestion.
   - `affiche sanctuaires proches` → nouveaux marqueurs + suggestions.
   - `bascule satellite` → tiles Google Satellite (nécessite connexion).
3. **Dictée vocale** (Chrome desktop/mobile)
   - Cliquer 🎙️ → dire « va à Paris » → commande exécutée.
4. **Boussole 3D**
   - Cliquer « Activer les capteurs » (mobile) → aiguille suit l'orientation.
   - Sur desktop, déplacer le slider → valeur affichée change.
5. **Vision IA**
   - Cliquer « Activer la caméra » (HTTPS obligatoire) → flux vidéo.
   - Pointer vers images (testez avec photos sur écran) : jungle, corail, désert.
   - Sur détection → barre de confiance > 30 %, modèle 3D tourne, lien Wikipédia actif, carte centrée sur coordonnées.
6. **PWA**
   - Ouvrir menu navigateur → « Installer TerraSentinel ».
   - Mode avion → rechargement affiche la version cachée (assets en cache).

## 6. Débogage & problèmes courants
- **CORS / requêtes OSM** : s'assurer que `User-Agent` personnalisé est autorisé. Si erreur 429, ajouter un délai ou héberger votre proxy léger.
- **Service OSRM indisponible** : fallback vers texte explicatif, ou plugger un autre fournisseur (Mapbox Directions si clé dispo).
- **HTTPS requis** : pour caméra/capteurs, déployer via GitHub Pages (https://) ou utiliser `npm i -g http-server` puis `http-server -S -C cert.pem -K key.pem`.
- **iOS Safari** : activer « Motion & Orientation » dans les réglages. Sur la première interaction, cliquer sur « Activer les capteurs ».
- **WebGL non supporté** : afficher un message (Three.js renverra une erreur, vérifier la console). Sur très vieux matériels, désactiver la 3D et montrer seulement `fallbackImage`.
- **Dictée vocale** : API expérimentale; prévoir un fallback (saisie clavier). Si `voiceBtn` est grisé, navigateur non compatible.
- **MobileNet lent** : pré-charger le modèle en cliquant dès l'accueil sur « Activer la caméra » ou remplacer par un modèle Teachable Machine plus léger.

## 7. Conseils de soutenance
- **Introduction** : présenter TerraSentinel comme un compagnon IA pour missions environnementales.
- **Démonstration guidée** :
  1. Voice command « va à Montréal » → montre l'interprétation en direct.
  2. Zoom + ajout d'un marqueur « Refuge ». Résumer la logique NLP simple.
  3. Activer la boussole, tourner le téléphone, commenter l'accès capteurs + fallback.
  4. Lancer la reconnaissance sur une photo imprimée (corail) → modèle 3D + lien Wikipédia + marqueur carte.
  5. Installer la PWA en direct.
- **Conclusion** : insister sur la modularité (vision.js remplaçable par un modèle custom) et les bonnes pratiques (permissions explicites, accessibilité, offline).

## 8. Extensions optionnelles
- Intégrer l'API OSRM locale ou Mapbox Directions pour un guidage plus précis.
- Stocker en `localStorage` les lieux identifiés pour créer un carnet d'expédition.
- Ajouter un mode « mission » générant automatiquement des objectifs et notifications push (via service worker).
- Supporter des commandes vocales hors-ligne via [Vosk API WebAssembly](https://alphacephei.com/vosk/) (nécessite chargement supplémentaire).

Bon TD !
