// Exercice 3 — couches, cercle précision, distance Marseille, GeoJSON
const map = L.map('map3');

// Fonds de carte
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

// CartoDB Positron (léger et lisible)
const cartodb = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap, &copy; CARTO'
});

// Stamen Toner (peut ne pas toujours être disponible publiquement)
const stamenToner = L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: 'Map tiles by Stamen Design, under CC BY 3.0 — Data © OpenStreetMap contributors'
});

// Contrôle de couches
L.control.layers(
  { 'OSM': osm, 'CartoDB Positron': cartodb, 'Stamen Toner (beta)': stamenToner },
  {},
  { collapsed: false }
).addTo(map);

// Points clés
const NICE = [43.7009, 7.2683];
const MARSEILLE = [43.2965, 5.3698];

// Segment Marseille ↔ Nice
const seg = L.polyline([MARSEILLE, NICE], { color: '#22c55e', weight: 3 }).addTo(map).bindPopup('Marseille ↔ Nice');
map.fitBounds(seg.getBounds().pad(0.25));

// Haversine (mètres)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Affichage distance utilisateur → Marseille + cercle précision
const distEl = document.getElementById('dist');
let userMarker, accuracyCircle;

function onPos(pos) {
  const { latitude, longitude, accuracy } = pos.coords;
  const ll = [latitude, longitude];

  if (!userMarker) {
    userMarker = L.marker(ll).addTo(map).bindPopup('Vous');
  } else {
    userMarker.setLatLng(ll);
  }
  if (!accuracyCircle) {
    accuracyCircle = L.circle(ll, { radius: accuracy, color: '#60a5fa', weight: 2, fillOpacity: .1 }).addTo(map);
  } else {
    accuracyCircle.setLatLng(ll).setRadius(accuracy);
  }

  const d = haversine(latitude, longitude, MARSEILLE[0], MARSEILLE[1]);
  const km = (d / 1000).toFixed(2);
  distEl.textContent = `Distance de votre position à Marseille : ${km} km (précision ±${Math.round(accuracy)} m)`;
}

function onErr(err) {
  console.warn(err);
  distEl.textContent = 'Impossible d’obtenir votre position (autorisation refusée ?). La distance est calculée seulement si la position est disponible.';
}

if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
} else {
  onErr(new Error('Geolocation non supportée'));
}

// GeoJSON — contour de la commune de Nice
const statusEl = document.getElementById('geojson-status');
fetch('https://geo.api.gouv.fr/communes?nom=Nice&format=geojson&geometry=contour')
  .then(r => r.json())
  .then(geo => {
    const layer = L.geoJSON(geo, { style: { color: 'purple', weight: 2, fillOpacity: .05 } }).addTo(map);
    statusEl.textContent = 'GeoJSON chargé ✔︎';
    // Adapter la vue si rien d’autre n’a fixé les bounds
    const b = layer.getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.25));
  })
  .catch(e => {
    console.error(e);
    statusEl.textContent = 'Échec du chargement du GeoJSON.';
  });

/* BONUS — itinéraire (optionnel)
   Mapbox Directions : nécessite un token (placez-le dans MAPBOX_TOKEN).
   Exemple (Polyline GeoJSON) : https://docs.mapbox.com/playground/directions/
*/
const MAPBOX_TOKEN = ''; // <-- Collez votre token ici (facultatif)
/*
async function traceItineraire() {
  if (!MAPBOX_TOKEN) return;
  // Nice → Marseille (profil driving)
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${NICE[1]},${NICE[0]};${MARSEILLE[1]},${MARSEILLE[0]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  const coords = data.routes?.[0]?.geometry?.coordinates ?? [];
  const latlngs = coords.map(([lng, lat]) => [lat, lng]);
  L.polyline(latlngs, { color: '#f59e0b', weight: 4 }).addTo(map).bindPopup('Itinéraire Mapbox (bonus)');
}
traceItineraire();
*/
