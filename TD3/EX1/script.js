// --- Charge Three + OrbitControls (fallback si un CDN est bloqué) ---
async function loadThree() {
  const urls = [
    {
      three: 'https://unpkg.com/three@0.160.0/build/three.module.js',
      orbit: 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js',
    },
    {
      three: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
      orbit: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js',
    },
  ];
  let mod, ctrls;
  for (const u of urls) {
    try {
      mod = await import(u.three);
      ctrls = await import(u.orbit);
      return { THREE: mod, OrbitControls: ctrls.OrbitControls };
    } catch (e) { /* essaie le suivant */ }
  }
  throw new Error('Impossible de charger Three.js depuis les CDN.');
}

(async () => {
  const { THREE, OrbitControls } = await loadThree();

  // ---------- THREE : scène + Terre ----------
  const container = document.getElementById('globe');
  if (!container) throw new Error('Le conteneur #globe est introuvable.');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50, container.clientWidth / container.clientHeight, 0.1, 1000
  );
  camera.position.set(0, 1.8, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lumières
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(-3, 4, 2);
  scene.add(dir);

  // Terre (R=1)
  const R = 1;
  const loader = new THREE.TextureLoader();
  // crossOrigin par sécurité (quelques proxies stricts)
  loader.setCrossOrigin('');
  const tex = loader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg');
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 96),
    new THREE.MeshPhongMaterial({ map: tex, shininess: 18 })
  );
  scene.add(globe);

  // --- Points (InstancedMesh) ---
  const pointsData = []; // {lat,lon,color}
  let pointsMesh;
  const dotGeo = new THREE.SphereGeometry(0.01, 8, 8);

  function buildPoints(instances){
    if (pointsMesh) { scene.remove(pointsMesh); pointsMesh.geometry.dispose(); }
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    pointsMesh = new THREE.InstancedMesh(dotGeo, mat, instances.length);
    pointsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instances.forEach((p, i) => {
      const pos = latLonToVector3(p.lat, p.lon, R, 0.02);
      const m = new THREE.Matrix4().setPosition(pos);
      pointsMesh.setMatrixAt(i, m);
      pointsMesh.setColorAt(i, new THREE.Color(p.color || '#ff6666'));
    });
    pointsMesh.instanceColor.needsUpdate = true;
    scene.add(pointsMesh);
  }

  function latLonToVector3(lat, lon, radius = R, altitude = 0){
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    const r = radius + altitude;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.sin(phi) * Math.sin(theta),
       r * Math.cos(phi)
    );
  }

  function spinTo(lat, lon){
    const target = new THREE.Euler(
      THREE.MathUtils.degToRad(-lat),
      THREE.MathUtils.degToRad(lon),
      0, 'XYZ'
    );
    const q0 = globe.quaternion.clone();
    const q1 = new THREE.Quaternion().setFromEuler(target);
    const t0 = performance.now(), dur = 700;
    (function anim(){
      const t = Math.min(1, (performance.now()-t0)/dur);
      THREE.Quaternion.slerp(q0, q1, globe.quaternion, t);
      if (t < 1) requestAnimationFrame(anim);
    })();
  }

  // Marqueur utilisateur
  const userMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d })
  );
  userMarker.visible = false;
  scene.add(userMarker);

  // Picking (points instanciés) → recadrer mini-carte
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!pointsMesh) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObject(pointsMesh, true)[0];
    if (hit && hit.instanceId != null) {
      const p = pointsData[hit.instanceId];
      miniMap.setView([p.lat, p.lon], 5);
    }
  });

  // Resize
  addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });

  // Loop
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  // ---------- Mini-carte Leaflet (crée l’élément si absent) ----------
  let miniMapEl = document.getElementById('miniMap');
  if (!miniMapEl) {
    miniMapEl = document.createElement('div');
    miniMapEl.id = 'miniMap';
    miniMapEl.style.cssText = 'position:absolute;top:14px;left:14px;width:320px;height:220px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.08);z-index:10;';
    (document.getElementById('stage') || document.body).appendChild(miniMapEl);
  }
  const miniMap = L.map('miniMap').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(miniMap);

  miniMap.on('click', ({latlng:{lat,lng}}) => spinTo(lat, lng));

  // UI
  document.getElementById('goTo')?.addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('lat').value);
    const lon = parseFloat(document.getElementById('lon').value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    spinTo(lat, lon); miniMap.setView([lat, lon], 5);
  });
  document.getElementById('toMyPos')?.addEventListener('click', () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
      userMarker.visible = true;
      spinTo(latitude, longitude); miniMap.setView([latitude, longitude], 6);
    });
  });

  // Données : pays Europe (beaucoup de points) ou voisins
  const sel = document.getElementById('dataset');
  function loadNeighbors(){
    pointsData.length = 0;
    [
      { name:'Nice',      lat:43.7009, lon:7.2683,  color:'#7dd3fc' },
      { name:'Marseille', lat:43.2965, lon:5.3698,  color:'#86efac' },
      { name:'Milan',     lat:45.4642, lon:9.19,    color:'#fca5a5' },
    ].forEach(p => pointsData.push(p));
    buildPoints(pointsData);
  }
  async function loadEurope(){
    pointsData.length = 0;
    const res = await fetch('https://restcountries.com/v3.1/region/europe?fields=name,latlng');
    const countries = await res.json();
    const palette = ['#f87171','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6'];
    countries.forEach((c,i) => {
      const [lat, lon] = c.latlng || [0,0];
      pointsData.push({ lat, lon, color: palette[i % palette.length], name: c.name?.common });
    });
    buildPoints(pointsData);
  }
  sel?.addEventListener('change', () => sel.value === 'neighbors' ? loadNeighbors() : loadEurope());
  loadEurope();

  // Géoloc continue
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(pos => {
      const { latitude, longitude } = pos.coords;
      userMarker.position.copy(latLonToVector3(latitude, longitude, R, 0.03));
      userMarker.visible = true;
    }, console.warn, { enableHighAccuracy:true, maximumAge:2000, timeout:10000 });
  }
})();
