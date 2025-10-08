// TD3 — Exo 1: Terre 3D + Leaflet (interactions bidirectionnelles)

// --------- THREE.JS GLOBE ---------
const container = document.getElementById('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, container.clientWidth/container.clientHeight, 0.1, 1000);
camera.position.set(0, 1.8, 4);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(devicePixelRatio);
container.appendChild(renderer.domElement);

// Controls (orbite)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lumière
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.5);
dir.position.set(5,3,2);
scene.add(dir);

// Terre (R=1)
const R = 1;
const tex = new THREE.TextureLoader().load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg');
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(R, 64, 64),
  new THREE.MeshPhongMaterial({ map: tex })
);
scene.add(globe);

// Groupe pour drapeaux/points
const markersGroup = new THREE.Group();
scene.add(markersGroup);

// Conversion lat/lon -> XYZ
function latLonToVector3(lat, lon, radius = R, altitude = 0){
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  const r = radius + altitude;
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z =  r * Math.sin(phi) * Math.sin(theta);
  const y =  r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Création d’un marqueur drapeau (sprite)
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

// Marqueur utilisateur (petite sphère rouge)
const userMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.02, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff5555 })
);
scene.add(userMarker);
userMarker.visible = false;

// Oriente le globe pour mettre (lat,lon) « en face »
function pointToFront(lat, lon){
  const target = latLonToVector3(lat, lon, R, 0).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(target, new THREE.Vector3(0,0,1));
  const start = globe.quaternion.clone();
  const end = q.multiply(globe.quaternion.clone());
  const duration = 600, t0 = performance.now();
  const anim = () => {
    const t = Math.min(1, (performance.now()-t0)/duration);
    THREE.Quaternion.slerp(start, end, globe.quaternion, t);
    if (t < 1) requestAnimationFrame(anim);
  };
  anim();
}

// Resize
addEventListener('resize', () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  camera.aspect = container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
});

// Raycaster pour clics drapeaux → recadrer la carte
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(markersGroup.children, true);
  if (hits[0]) {
    const { lat, lon } = hits[0].object.userData;
    map.setView([lat, lon], 5);
  }
});

// Animation
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// --------- LEAFLET ---------
const map = L.map('map').setView([43.7009, 7.2683], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Carte → orienter le globe
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  pointToFront(lat, lng);
});

// UI
document.getElementById('goTo').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  pointToFront(lat, lon);
  map.setView([lat, lon], 6);
});

document.getElementById('toMyPos').addEventListener('click', () => {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
    userMarker.visible = true;
    pointToFront(latitude, longitude);
    map.setView([latitude, longitude], 8);
  });
});

// Jeu de données
const datasetSel = document.getElementById('dataset');

async function loadEurope(){
  markersGroup.clear();
  const res = await fetch('https://restcountries.com/v3.1/region/europe?fields=name,latlng,flags');
  const countries = await res.json();
  countries.forEach(c => {
    const [lat, lon] = c.latlng ?? [0,0];
    const flag = (c.flags && (c.flags.png || c.flags.svg)) || '';
    createFlagMarker(lat, lon, flag, c.name?.common || 'Country');
  });
}
function loadNeighbors(){
  markersGroup.clear();
  [
    { name:'Nice', lat:43.7009, lon:7.2683, flag:'https://flagcdn.com/w20/fr.png' },
    { name:'Marseille', lat:43.2965, lon:5.3698, flag:'https://flagcdn.com/w20/fr.png' },
    { name:'Milan', lat:45.4642, lon:9.1900, flag:'https://flagcdn.com/w20/it.png' },
  ].forEach(i => createFlagMarker(i.lat, i.lon, i.flag, i.name));
}

datasetSel.addEventListener('change', () => {
  if (datasetSel.value === 'neighbors') loadNeighbors(); else loadEurope();
});
loadNeighbors();
