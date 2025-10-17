import { updateStatus } from "./app.js";

const video = document.getElementById("videoFeed");
const startBtn = document.getElementById("startVisionBtn");
const stopBtn = document.getElementById("stopVisionBtn");
const visionLabel = document.getElementById("visionLabel");
const visionStatus = document.getElementById("visionStatus");
const confidenceBar = document.getElementById("visionConfidence");
const actions = document.getElementById("recognitionActions");
const wikiLink = document.getElementById("wikiLink");
const fallbackImage = document.getElementById("fallbackImage");
const threeContainer = document.getElementById("threeContainer");

let stream = null;
let classifier = null;
let predicting = false;
let threeRenderer = null;
let threeScene = null;
let threeCamera = null;
let activeModel = null;
let animationFrameId = null;

const catalog = [
  {
    id: "rainforest",
    labels: ["rain forest", "jungle", "rainforest"],
    title: "Forêt tropicale",
    description: "Canopée humide abritant une biodiversité exceptionnelle.",
    wiki: "https://fr.wikipedia.org/wiki/For%C3%AAt_tropicale_humide",
    coordinates: [-3.4653, -62.2159],
    model: "assets/models/eco_leaf.gltf",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "coral",
    labels: ["coral reef", "coral", "reef"],
    title: "Récif corallien",
    description: "Ecosystème marin fragile et coloré.",
    wiki: "https://fr.wikipedia.org/wiki/R%C3%A9cif_corallien",
    coordinates: [-16.9186, 145.7781],
    model: "assets/models/eco_leaf.gltf",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "desert",
    labels: ["desert", "dune", "sand"],
    title: "Dunes protégées",
    description: "Paysage aride sensible à l'érosion.",
    wiki: "https://fr.wikipedia.org/wiki/Dune",
    coordinates: [27.9681, -12.9332],
    model: "assets/models/eco_leaf.gltf",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
  },
];

const sanitize = (str) => str.toLowerCase();

const initThreePreview = () => {
  if (threeRenderer) return;
  threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
  const width = threeContainer.clientWidth || 320;
  const height = threeContainer.clientHeight || 240;
  threeRenderer.setSize(width, height);
  threeContainer.appendChild(threeRenderer.domElement);

  threeScene = new THREE.Scene();
  threeScene.background = null;

  const light = new THREE.HemisphereLight(0xffffff, 0x202040, 1.2);
  threeScene.add(light);

  threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  threeCamera.position.set(2, 1.4, 2.4);
  threeCamera.lookAt(0, 0, 0);

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    if (activeModel) {
      activeModel.rotation.y += 0.01;
    }
    threeRenderer.render(threeScene, threeCamera);
  };
  animate();

  window.addEventListener("resize", () => {
    if (!threeRenderer) return;
    const w = threeContainer.clientWidth || 320;
    const h = threeContainer.clientHeight || 240;
    threeRenderer.setSize(w, h);
    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
  });
};

const loadModel = (url) =>
  new Promise((resolve, reject) => {
    const loader = new THREE.GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        resolve(gltf.scene);
      },
      undefined,
      (error) => reject(error)
    );
  });

const displayRecognition = async (item) => {
  actions.hidden = false;
  wikiLink.href = item.wiki;
  wikiLink.textContent = `Explorer ${item.title} sur Wikipédia`;
  fallbackImage.src = item.image;
  fallbackImage.hidden = false;

  initThreePreview();

  if (activeModel) {
    threeScene.remove(activeModel);
    activeModel = null;
  }

  try {
    const model = await loadModel(item.model);
    model.traverse((node) => {
      if (node.isMesh) {
        node.material = node.material.clone();
        node.material.color = new THREE.Color(0x36c28a);
      }
    });
    model.scale.setScalar(1.3);
    threeScene.add(model);
    activeModel = model;
  } catch (error) {
    console.warn("Impossible de charger le modèle 3D", error);
  }

  window.dispatchEvent(
    new CustomEvent("ecosystem-detected", {
      detail: {
        coordinates: item.coordinates,
        title: item.title,
        description: item.description,
        wikiUrl: item.wiki,
      },
    })
  );
};

const classifyFrame = async () => {
  if (!classifier || !predicting) return;
  try {
    const results = await classifier.classify(video);
    if (!Array.isArray(results) || !results.length) {
      confidenceBar.style.setProperty("--confidence", "0%");
      return;
    }
    const [first] = results;
    const confidence = first.confidence || 0;
    visionLabel.textContent = `Prédiction : ${first.label} (${(confidence * 100).toFixed(1)}%)`;
    confidenceBar.style.setProperty("--confidence", `${Math.round(confidence * 100)}%`);

    const normalized = sanitize(first.label);
    const match = catalog.find((item) => item.labels.some((alias) => normalized.includes(alias)));

    if (match && confidence > 0.3) {
      visionStatus.textContent = `${match.title} identifié.`;
      displayRecognition(match);
    } else {
      actions.hidden = true;
      visionStatus.textContent = "Aucun lieu identifié. Approche-toi ou change d'angle.";
    }
  } catch (error) {
    visionStatus.textContent = `Analyse interrompue : ${error.message}`;
  } finally {
    if (predicting) {
      requestAnimationFrame(classifyFrame);
    }
  }
};

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
    await video.play();
    visionStatus.textContent = "Caméra active. Stabilise-toi pour détecter un lieu.";
    predicting = true;
    classifyFrame();
  } catch (error) {
    visionStatus.textContent = `Caméra indisponible : ${error.message}`;
    updateStatus(`Caméra indisponible : ${error.message}`);
  }
};

const stopCamera = () => {
  predicting = false;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  video.srcObject = null;
  visionStatus.textContent = "Caméra inactive.";
  actions.hidden = true;
  confidenceBar.style.setProperty("--confidence", "0%");
};

const ensureModel = async () => {
  if (classifier) return;
  try {
    classifier = await ml5.imageClassifier("MobileNet");
    visionStatus.textContent = "Modèle MobileNet prêt. Pointez vers un lieu.";
  } catch (error) {
    visionStatus.textContent = `Échec du chargement du modèle : ${error.message}`;
  }
};

startBtn?.addEventListener("click", async () => {
  await ensureModel();
  await startCamera();
});

stopBtn?.addEventListener("click", () => {
  stopCamera();
});

window.addEventListener("beforeunload", () => {
  stopCamera();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});

export { startCamera };
