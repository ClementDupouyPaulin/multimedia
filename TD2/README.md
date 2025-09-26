# TD2 — Sensibilisation Multimédia — Scènes complètes
Deux dossiers :
- `threejs-scene/` → Ex.1 Three.js
- `babylonjs-scene/` → Ex.2 Babylon.js

## Démarrer en local
Depuis ce dossier, lancez un serveur local (ex: Python) :
```bash
python3 -m http.server 8000
```
Puis ouvrez :
- http://localhost:8000/threejs-scene/
- http://localhost:8000/babylonjs-scene/

## Fonctionnalités
- Caméra + lumières + renderer
- Primitif texturé
- Chargement modèle GLTF (URL externe)
- Particules de pluie
- Brouillard (Three.js)
- Contrôles Orbit / Orientation mobile (iOS/Android) avec bouton de permission
- Ombres
- GUI (lil-gui) / (Babylon GUI)
- Physique avec Ammo.js (Babylon)

## Dépannage
- Utilisez un serveur local pour éviter les erreurs CORS (Three.js/Babylon).
- Ouvrez la console (F12) pour voir les erreurs.
- Sur iOS, vous devez appuyer sur « Activer capteurs (mobile) » pour autoriser DeviceOrientation.
