// ---------- THREE.js (scène + terre) ----------
const container = document.getElementById('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, container.clientWidth/container.clientHeight, 0.1, 1000);
camera.position.set(0, 1.8, 4);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(devicePixelRatio);
container.appendChild(renderer.domElement);

// contrôles
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// lumières
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(4,3,2);
scene.add(dir);

// Terre (R=1)
const R = 1;
const textureUrl = 'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg';
const tex = new THREE.TextureLoader().load(textureUrl);
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(R, 64, 64),
  new THREE.MeshPhongMaterial({ map: tex })
);
scene.add(globe);

// groupe pour marqueurs (drapeaux)
const markersGroup = new THREE.Group();
scene.add(markersGroup);

// conversion lat/lon -> XYZ (axe Y = nord)
function latLonToVector3(lat, lon, radius = R, altitude = 0){
  const phi = (90 - lat) * Math.PI / 180;      // colatitude
  const theta = (lon + 180) * Math.PI / 180;   // longitude
  const r = radius + altitude;
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z =  r * Math.sin(phi) * Math.sin(theta);
  const y =  r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// oriente doucement le globe pour mettre (lat,lon) en face
function spinTo(lat, lon){
  // orientation cible (simple : yaw = lon, pitch = -lat)
  const targetEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(-lat),
    THREE.MathUtils.degToRad(lon),
    0, 'XYZ'
  );
  const startQ = globe.quaternion.clone();
  const endQ = new THREE.Quaternion().setFromEuler(targetEuler);
  const t0 = performance.now(), dur = 700;
  const anim = () => {
    const t = Math.min(1, (performance.now()-t0)/dur);
    THREE.Quaternion.slerp(startQ, endQ, globe.quaternion, t);
    if (t<1) requestAnimationFrame(anim);
  };
  anim();
}

// création d’un sprite-drapeau
function createFlagMarker(lat, lon, flagUrl, label){
  const map = new THREE.TextureLoader().load(flagUrl);
  const material = new THREE.SpriteMaterial({ map, depthTest:true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.22, 0.14, 1);
  sprite.position.copy(latLonToVector3(lat, lon, R, 0.02));
  sprite.userData = { lat, lon, label };
  markersGroup.add(sprite);
  return sprite;
}

// vider le groupe proprement
function clearGroup(group){
  while(group.children.length) group.remove(group.children[0]);
}

// marqueur utilisateur
const userMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.02, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff5555 })
);
userMarker.visible = false;
scene.add(userMarker);

// redimensionnement
addEventListener('resize', () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  camera.aspect = container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
});

// picking drapeaux → recentrer la carte
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(markersGroup.children, true)[0];
  if (hit) {
    const { lat, lon } = hit.object.userData;
    map.setView([lat, lon], 5);
  }
});

// boucle
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// ---------- Leaflet ----------
const map = L.map('map').setView([43.7009, 7.2683], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// clic carte → orienter le globe
map.on('click', (e) => {
  spinTo(e.latlng.lat, e.latlng.lng);
});

// boutons UI
document.getElementById('goTo').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  spinTo(lat, lon);
  map.setView([lat, lon], 6);
});

document.getElementById('toMyPos').addEventListener('click', () => {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
    userMarker.visible = true;
    spinTo(latitude, longitude);
    map.setView([latitude, longitude], 8);
  });
});

// datasets (Europe via restcountries + quelques villes)
const datasetSel = document.getElementById('dataset');

async function loadEurope(){
  clearGroup(markersGroup);
  const res = await fetch('https://restcountries.com/v3.1/region/europe?fields=name,latlng,flags');
  const countries = await res.json();
  countries.forEach(c => {
    const [lat, lon] = c.latlng || [0,0];
    const flag = (c.flags && (c.flags.png || c.flags.svg)) || 'https://flagcdn.com/w20/un.png';
    createFlagMarker(lat, lon, flag, c.name?.common || 'Pays');
  });
}

function loadNeighbors(){
  clearGroup(markersGroup);
  [
    { name:'Nice', lat:43.7009, lon:7.2683, flag:'https://flagcdn.com/w20/fr.png' },
    { name:'Marseille', lat:43.2965, lon:5.3698, flag:'https://flagcdn.com/w20/fr.png' },
    { name:'Milan', lat:45.4642, lon:9.19,   flag:'https://flagcdn.com/w20/it.png' },
  ].forEach(i => createFlagMarker(i.lat, i.lon, i.flag, i.name));
}

datasetSel.addEventListener('change', () => {
  datasetSel.value === 'neighbors' ? loadNeighbors() : loadEurope();
});

// init : voisins + géoloc continue (si autorisée)
loadNeighbors();

if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
    userMarker.visible = true;
  }, err => console.warn(err), { enableHighAccuracy:true, maximumAge:2000, timeout:10000 });
}
