// Exercice 2 — Leaflet + OSM + Triangle des Bermudes

const NICE = [43.7009, 7.2683];

// ➜ vue par défaut pour éviter l'écran gris
const map = L.map('map').setView(NICE, 11);

// Fond de carte OSM
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Marqueur sur Nice (centre-ville)
L.marker(NICE).addTo(map).bindPopup('Nice (centre)');

// Triangle des Bermudes (Miami, Bermudes, Porto Rico)
const MIAMI = [25.7617, -80.1918];
const BERMUDA = [32.3078, -64.7505];
const SAN_JUAN = [18.4655, -66.1057];

L.polygon([MIAMI, BERMUDA, SAN_JUAN], {
  color: 'red',
  weight: 3,
  fillOpacity: 0.1
}).addTo(map).bindPopup('Triangle des Bermudes');

// Position de l'utilisateur
function onPos(pos) {
  const { latitude, longitude, accuracy } = pos.coords;
  const ll = [latitude, longitude];
  const userMarker = L.marker(ll).addTo(map).bindPopup('Vous êtes ici');
  const accCircle = L.circle(ll, { radius: accuracy, weight: 2, fillOpacity: .1 }).addTo(map);
  const group = L.featureGroup([userMarker, accCircle]);
  map.fitBounds(group.getBounds().pad(0.25));
}
function onErr(err) {
  console.warn(err);
  // on garde la vue par défaut (Nice)
}

navigator.geolocation?.getCurrentPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 10000 });
