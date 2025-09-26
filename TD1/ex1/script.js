// Exercice 1 — Geolocation API
const currentTable = document.getElementById('current');
const watchTable = document.getElementById('watch');

function fmt(n, digits=6) {
  if (n === null || n === undefined) return '—';
  return typeof n === 'number' ? n.toFixed(digits) : n;
}
function row(label, value) {
  return `<tr><td>${label}</td><td><code>${value}</code></td></tr>`;
}
function speedFmt(ms) {
  if (ms === null || ms === undefined) return '—';
  const kmh = ms * 3.6;
  return `${ms.toFixed(2)} m/s (${kmh.toFixed(1)} km/h)`;
}
function tsToDate(ts) {
  try { return new Date(ts).toLocaleString(); }
  catch { return '—'; }
}

function fill(tableEl, pos) {
  const c = pos.coords;
  tableEl.innerHTML = [
    row('Latitude', fmt(c.latitude, 6)),
    row('Longitude', fmt(c.longitude, 6)),
    row('Altitude', c.altitude !== null ? `${fmt(c.altitude, 1)} m` : '—'),
    row('Précision horizontale', c.accuracy !== null ? `${fmt(c.accuracy, 1)} m` : '—'),
    row('Précision altitude', c.altitudeAccuracy !== null ? `${fmt(c.altitudeAccuracy, 1)} m` : '—'),
    row('Vitesse', speedFmt(c.speed)),
    row('Timestamp', tsToDate(pos.timestamp)),
  ].join('');
}

function fillError(tableEl, err) {
  tableEl.innerHTML = row('Erreur', `${err.code} — ${err.message}`);
}

// Options : haute précision si GPS dispo, timeout raisonnable
const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

// 1) Position instantanée
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => fill(currentTable, pos),
    err => fillError(currentTable, err),
    options
  );

  // 2) Suivi continu
  const id = navigator.geolocation.watchPosition(
    pos => fill(watchTable, pos),
    err => fillError(watchTable, err),
    options
  );

  // Stopper le watch si on ferme la page
  window.addEventListener('beforeunload', () => navigator.geolocation.clearWatch(id));
} else {
  currentTable.innerHTML = row('Erreur', 'Geolocation non supportée par ce navigateur.');
  watchTable.innerHTML = currentTable.innerHTML;
}
