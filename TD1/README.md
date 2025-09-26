# TD1 — Géolocalisation & Leaflet

## Tester en local
```bash
cd td1-geoloc-leaflet
python3 -m http.server
# Ouvrez http://localhost:8000/
```

> Important : la géolocalisation du navigateur nécessite **HTTPS** ou **localhost**.

## Publier sur GitHub Pages (2 options)

### Option A : dépôt `<login>.github.io`
1. Créez le dépôt **public** nommé `votre-login.github.io`.
2. Copiez/collez le contenu de ce dossier à la racine du dépôt.
3. `git add . && git commit -m "TD1" && git push`.
4. Votre site : `https://votre-login.github.io/`.

### Option B : dépôt classique (par ex. `td1`)
1. Créez un dépôt (public de préférence).
2. Poussez le code.
3. Dans **Settings → Pages**, choisissez « Deploy from Branch », **main / root**.
4. L’URL est indiquée par GitHub Pages.

## Débogage
- Outils dev : `F12` → Console, Network, Sources (breakpoints).
- Android : Chrome → `chrome://inspect`, activer le **débogage USB** sur le téléphone.
- Simuler un mobile : `F12` → Toggle device toolbar.

## Structure
```
/index.html        # page d'accueil + liens
/ex1/index.html    # Geolocation API (getCurrentPosition + watchPosition)
/ex1/script.js
/ex2/index.html    # Leaflet + OSM + triangle des Bermudes + Nice
/ex2/script.js
/ex3/index.html    # FDC alternatifs, cercle précision, distance Marseille, GeoJSON
/ex3/script.js
/style.css
```

## Tokens (bonus)
Pour Mapbox/MapQuest, ajoutez vos jetons dans `ex3/script.js` aux emplacements prévus (facultatif).
