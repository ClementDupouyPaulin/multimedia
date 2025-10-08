// --- imports ESM (fiables sur GitHub Pages)
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// ---------- THREE.js (scène + terre) ----------
const container = document.getElementById('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, container.clientWidth/container.clientHeight, 0.1, 1000);
camera.position.set(0, 1.8, 4);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(4,3,2); scene.add(dir);

// Terre
const R = 1;
const textureUrl = 'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg';
const tex = new THREE.TextureLoader().load(textureUrl);
const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), new THREE.MeshPhongMaterial({ map: tex }));
scene.add(globe);

// Marqueurs
const markersGroup = new THREE.Group(); scene.add(markersGroup);
function latLonToVector3(lat, lon, radius=R, altitude=0){
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  const r = radius + altitude;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.sin(phi) * Math.sin(theta),
     r * Math.cos(phi)
  );
}
function createFlagMarker(lat, lon, flagUrl, label){
  const map = new THREE.TextureLoader().load(flagUrl || 'https://flagcdn.com/w20/un.png');
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest:true }));
  sprite.scale.set(0.22, 0.14, 1);
  sprite.position.copy(latLonToVector3(lat, lon, R, 0.02));
  sprite.userData = { lat, lon, label };
  markersGroup.add(sprite);
}
function clearGroup(g){ while(g.children.length) g.remove(g.children[0]); }

// Oriente gentiment le globe vers (lat,lon)
function spinTo(lat, lon){
  const targetEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(-lat),
    THREE.MathUtils.degToRad(lon),
    0, 'XYZ'
  );
  const q0 = globe.quaternion.clone();
  const q1 = new THREE.Quaternion().setFromEuler(targetEuler);
  const t0 = performance.now(), dur = 700;
  (function anim(){
    const t = Math.min(1, (performance.now()-t0)/dur);
    THREE.Quaternion.slerp(q0, q1, globe.quaternion, t);
    if (t < 1) requestAnimationFrame(anim);
  })();
}

// Marqueur utilisateur
const userMarker = new THREE.Mesh(new THREE.SphereGeometry(0.02,16,16), new THREE.MeshBasicMaterial({ color: 0xff5555 }));
userMarker.visible = false; scene.add(userMarker);

// Resize (au cas où le conteneur change)
addEventListener('resize', () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  camera.aspect = container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
});

// Raycasting → recentrer Leaflet
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

// Boucle
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

// ---------- Leaflet ----------
const map = L.map('map').setView([43.7009, 7.2683], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
map.on('click', ({latlng:{lat,lng}}) => { spinTo(lat, lng); });

// UI
document.getElementById('goTo')?.addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  spinTo(lat, lon); map.setView([lat, lon], 6);
});
document.getElementById('toMyPos')?.addEventListener('click', () => {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
    userMarker.visible = true;
    spinTo(latitude, longitude); map.setView([latitude, longitude], 8);
  });
});

// Données
const sel = document.getElementById('dataset');
function loadNeighbors(){
  clearGroup(markersGroup);
  [
    { name:'Nice', lat:43.7009, lon:7.2683, flag:'https://flagcdn.com/w20/fr.png' },
    { name:'Marseille', lat:43.2965, lon:5.3698, flag:'https://flagcdn.com/w20/fr.png' },
    { name:'Milan', lat:45.4642, lon:9.19,   flag:'https://flagcdn.com/w20/it.png' },
  ].forEach(i => createFlagMarker(i.lat, i.lon, i.flag, i.name));
}
async function loadEurope(){
  clearGroup(markersGroup);
  const res = await fetch('https://restcountries.com/v3.1/region/europe?fields=name,latlng,flags');
  const countries = await res.json();
  countries.forEach(c => {
    const [lat, lon] = c.latlng || [0,0];
    const flag = (c.flags && (c.flags.png || c.flags.svg)) || '';
    createFlagMarker(lat, lon, flag, c.name?.common || 'Pays');
  });
}
sel?.addEventListener('change', () => sel.value === 'neighbors' ? loadNeighbors() : loadEurope());
loadNeighbors();

// Géoloc continue pour mettre à jour le marqueur
if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
    userMarker.visible = true;
  }, console.warn, { enableHighAccuracy:true, maximumAge:2000, timeout:10000 });
}
