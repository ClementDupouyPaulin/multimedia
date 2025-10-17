import { ui, toast } from './ui.js';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0';
const [{ default: THREE }, { OrbitControls }] = await Promise.all([
  import(`${THREE_CDN}/build/three.module.js`),
  import(`${THREE_CDN}/examples/jsm/controls/OrbitControls.js`)
]);

const container = document.getElementById('compass3d');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 100);
camera.position.set(0, 1.8, 4);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 2; controls.maxDistance = 8;

scene.add(new THREE.AmbientLight(0xffffff, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(3,4,2); scene.add(dir);

const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.08,64), new THREE.MeshPhongMaterial({ color: 0x0f1522 }));
plate.position.y = -0.05; scene.add(plate);
const needle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 32), new THREE.MeshPhongMaterial({ color: 0xeb5757 }));
needle.position.set(0, 0.6, 0); scene.add(needle);

function setHeadingDeg(deg){
  needle.rotation.y = THREE.MathUtils.degToRad(deg);
  ui.$('#hdgValue').textContent = `${Math.round(deg)%360}°`;
}

// Capteurs
let hasSensor=false;
function handleDO(e){
  hasSensor=true;
  const heading = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : (e.alpha ?? 0);
  setHeadingDeg(360 - heading);
}
if ('DeviceOrientationEvent' in window) window.addEventListener('deviceorientation', handleDO, true);
ui.$('#btnIOS')?.addEventListener('click', async () => {
  if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
    try { const r=await DeviceOrientationEvent.requestPermission(); toast(`Capteurs: ${r}`, r==='granted'?'ok':'warn'); }
    catch { toast('Capteurs refusés', 'warn'); }
  } else { toast('iOS 13+ seulement', 'warn'); }
});
ui.$('#hdgSlider')?.addEventListener('input', (e) => { if (!hasSensor) setHeadingDeg(parseInt(e.target.value,10)); });

addEventListener('resize', () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  camera.aspect = container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
});
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
