import { updateStatus } from "./app.js";

const container = document.getElementById("compassCanvas");
const fallbackSlider = document.getElementById("fallbackHeading");
const headingOutput = document.getElementById("headingValue");
const enableOrientationBtn = document.getElementById("enableOrientationBtn");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1a1f);

const size = () => ({
  width: Math.max(container.clientWidth, 320),
  height: Math.max(container.clientHeight, 240),
});

const { width: initialWidth, height: initialHeight } = size();

const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
camera.position.set(0, 2, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(initialWidth, initialHeight);
container.appendChild(renderer.domElement);

const light = new THREE.HemisphereLight(0xffffff, 0x0a1a1f, 1.1);
scene.add(light);

const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.15, 64);
const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x123a42, metalness: 0.2, roughness: 0.6 });
const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
scene.add(baseMesh);

const ringGeometry = new THREE.RingGeometry(1.3, 1.45, 64);
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x36c28a, side: THREE.DoubleSide });
const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
ringMesh.rotation.x = Math.PI / 2;
ringMesh.position.y = 0.08;
scene.add(ringMesh);

const pointerGroup = new THREE.Group();
const needleGeometry = new THREE.ConeGeometry(0.12, 0.9, 32);
const needleMaterial = new THREE.MeshStandardMaterial({ color: 0xf97a57, metalness: 0.5, roughness: 0.2 });
const needle = new THREE.Mesh(needleGeometry, needleMaterial);
needle.position.y = 0.7;
pointerGroup.add(needle);

const tailGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 16);
const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xf8d16a, metalness: 0.3, roughness: 0.3 });
const tail = new THREE.Mesh(tailGeometry, tailMaterial);
tail.position.y = 0.15;
pointerGroup.add(tail);

pointerGroup.rotation.x = Math.PI / 2;
pointerGroup.position.y = 0.2;
scene.add(pointerGroup);

const cardinalGroup = new THREE.Group();

const createLabel = (text, angle) => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px Inter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.6, 0.6);
  const radius = 1.4;
  sprite.position.set(Math.sin(angle) * radius, 0.3, Math.cos(angle) * radius);
  cardinalGroup.add(sprite);
};

createLabel("N", 0);
createLabel("E", Math.PI / 2);
createLabel("S", Math.PI);
createLabel("O", (3 * Math.PI) / 2);
scene.add(cardinalGroup);

let currentHeading = 0;
let usingSensors = false;

const resizeObserver = new ResizeObserver(() => {
  const { width, height } = size();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
resizeObserver.observe(container);

const render = () => {
  requestAnimationFrame(render);
  pointerGroup.rotation.y = THREE.MathUtils.degToRad(currentHeading);
  renderer.render(scene, camera);
};
render();

const setHeading = (heading) => {
  currentHeading = heading % 360;
  headingOutput.textContent = `${Math.round(currentHeading)}°`;
};

fallbackSlider?.addEventListener("input", (event) => {
  if (usingSensors) return;
  setHeading(Number(event.target.value));
});

const handleOrientation = (event) => {
  if (typeof event.alpha !== "number") return;
  usingSensors = true;
  setHeading(360 - event.alpha);
};

let permissionRequested = false;

const enableSensors = async () => {
  if (typeof DeviceOrientationEvent === "undefined") {
    updateStatus("Capteurs non supportés.");
    return;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function" && !permissionRequested) {
      const state = await DeviceOrientationEvent.requestPermission();
      permissionRequested = true;
      if (state !== "granted") {
        updateStatus("Accès aux capteurs refusé.");
        return;
      }
    }
    window.addEventListener("deviceorientation", handleOrientation, true);
    updateStatus("Capteurs activés.");
  } catch (error) {
    updateStatus(`Capteurs indisponibles : ${error.message}`);
  }
};

enableOrientationBtn?.addEventListener("click", () => {
  enableSensors();
});

setHeading(Number(fallbackSlider?.value ?? 0));

window.addEventListener("ecosystem-heading", (event) => {
  const { detail } = event;
  if (!detail) return;
  setHeading(detail.heading);
});
