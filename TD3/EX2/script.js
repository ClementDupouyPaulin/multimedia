const video = document.getElementById('cam');
const hud = document.getElementById('hud');
const ctx = hud.getContext('2d');
const statusEl = document.getElementById('status');

const POIS = [
  { name:'Nice', lat:43.7009, lon:7.2683 },
  { name:'Marseille', lat:43.2965, lon:5.3698 },
];

function resize(){
  const r = video.getBoundingClientRect();
  hud.width = Math.max(1, Math.floor(r.width));
  hud.height = Math.max(1, Math.floor(r.height));
}
addEventListener('resize', resize);

// --- Caméra ---
let currentStream;
async function startCamera(facingMode='environment'){
  try{
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width:{ideal:1280}, height:{ideal:720} }, audio:false
    });
    video.srcObject = stream;
    currentStream = stream;
    await video.play();
    resize();
  }catch(e){
    console.error(e);
    statusEl.textContent = 'Caméra indisponible : ' + e.message;
  }
}
document.getElementById('useBack').onclick = () => startCamera('environment');
document.getElementById('useFront').onclick = () => startCamera('user');

// --- Orientation (heading/pitch/roll) ---
let heading = 0, pitch = 0, roll = 0;

function handleOrientation(e){
  // iOS : webkitCompassHeading (0 = nord, croissant horaire)
  if (typeof e.webkitCompassHeading === 'number'){
    heading = e.webkitCompassHeading;
  } else {
    // alpha:0..360 (vers le nord magnétique aproximatif)
    heading = (e.alpha || 0);
  }
  pitch = (e.beta || 0);
  roll = (e.gamma || 0);
}
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', handleOrientation, true);
}
document.getElementById('askPerm').onclick = async () => {
  if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
    try{
      const r = await DeviceOrientationEvent.requestPermission();
      statusEl.textContent = 'Orientation: ' + r;
    }catch(e){
      statusEl.textContent = 'Orientation refusée';
    }
  }
};

// --- Géolocalisation ---
let userLat = null, userLon = null, accuracy = null;
function onPos(pos){
  userLat = pos.coords.latitude;
  userLon = pos.coords.longitude;
  accuracy = pos.coords.accuracy;
}
function onErr(err){ console.warn(err); statusEl.textContent = 'Géoloc indisponible (HTTPS ? autorisations ?)'; }
if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy:true, maximumAge:2000, timeout:10000 });
}

// --- Utils : Haversine + bearing ---
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function bearing(lat1, lon1, lat2, lon2){
  const toRad = d => d*Math.PI/180, toDeg = r => r*180/Math.PI;
  const y = Math.sin(toRad(lon2-lon1))*Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// --- HUD ---
function draw(){
  requestAnimationFrame(draw);
  if (!video.videoWidth) return;

  ctx.clearRect(0,0,hud.width,hud.height);

  const cx = hud.width/2, cy = hud.height/2;

  // réticule
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'white';
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI*2); ctx.stroke();

  if (userLat==null || userLon==null) return;

  const FOV = 30; // ±15°
  POIS.forEach(p => {
    const br = bearing(userLat, userLon, p.lat, p.lon);
    let diff = ((br - heading + 540) % 360) - 180; // [-180,180]
    const dist = haversine(userLat, userLon, p.lat, p.lon);

    if (Math.abs(diff) <= FOV/2){
      const maxOffset = hud.width/2 - 40;
      const x = cx + (diff / (FOV/2)) * maxOffset;

      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.strokeStyle = 'white';
      ctx.fillRect(x-60, cy-84, 120, 50);
      ctx.strokeRect(x-60, cy-84, 120, 50);
      ctx.fillStyle = 'white';
      ctx.font = '14px ui-sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, x, cy-62);
      ctx.fillText((dist/1000).toFixed(1)+' km', x, cy-44);
    }
  });

  // stats
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.font = '12px ui-sans-serif';
  ctx.fillText('heading: ' + heading.toFixed(0) + '°  pitch: ' + pitch.toFixed(0) + '°', 10, 20);
  if (accuracy) ctx.fillText('GPS ±' + Math.round(accuracy) + ' m', 10, 36);
}
draw();

// démarrage
startCamera('environment');
