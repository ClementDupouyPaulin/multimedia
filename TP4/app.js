const map = L.map("map", {
  zoomControl: true,
  attributionControl: true,
});

const initialView = [48.8566, 2.3522];
map.setView(initialView, 5);

const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">Contributeurs OSM</a>',
});
baseLayer.addTo(map);

let currentRoute = null;
const customMarkers = [];

const mapStatus = document.getElementById("mapStatus");
const suggestionsList = document.getElementById("suggestionsList");
const locateBtn = document.getElementById("locateBtn");

const ecoSpots = [
  {
    name: "Forêt primaire de Fontainebleau",
    coords: [48.4049, 2.637],
    description: "Réserve de biosphère inscrite par l'UNESCO.",
    wiki: "https://fr.wikipedia.org/wiki/For%C3%AAt_de_Fontainebleau",
  },
  {
    name: "Sanctuaire marin des Glénan",
    coords: [47.7217, -3.9636],
    description: "Archipel breton réputé pour sa biodiversité.",
    wiki: "https://fr.wikipedia.org/wiki/Archipel_des_Gl%C3%A9nan",
  },
  {
    name: "Vallée de M'Goun",
    coords: [31.5097, -6.2816],
    description: "Géoparc mondial abritant des villages oasiens.",
    wiki: "https://fr.wikipedia.org/wiki/Vall%C3%A9e_du_M%27Goun",
  },
  {
    name: "Réserve de Biosphère du Delta du Danube",
    coords: [45.033, 29.233],
    description: "L'un des deltas les mieux préservés d'Europe.",
    wiki: "https://fr.wikipedia.org/wiki/R%C3%A9serve_de_biosph%C3%A8re_du_delta_du_Danube",
  },
];

const sanitize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const updateStatus = (message) => {
  mapStatus.textContent = message;
  console.info(message);
};

const addSuggestion = (message) => {
  const li = document.createElement("li");
  li.textContent = message;
  suggestionsList.prepend(li);
  while (suggestionsList.children.length > 5) {
    suggestionsList.removeChild(suggestionsList.lastChild);
  }
};

const flyToLocation = (lat, lon, zoom = 13) => {
  map.flyTo([lat, lon], zoom, { animate: true, duration: 1.5 });
};

const addMarker = (lat, lon, label, options = {}) => {
  const marker = L.marker([lat, lon], options);
  marker.bindPopup(`<strong>${label}</strong>`).openPopup();
  marker.addTo(map);
  customMarkers.push(marker);
  return marker;
};

const clearRoute = () => {
  if (currentRoute) {
    map.removeLayer(currentRoute);
    currentRoute = null;
  }
};

const drawRoute = (geojson) => {
  clearRoute();
  currentRoute = L.geoJSON(geojson, {
    style: { color: "#36c28a", weight: 5, opacity: 0.8 },
  }).addTo(map);
  map.fitBounds(currentRoute.getBounds(), { padding: [30, 30] });
};

const geocode = async (query) => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "fr",
      "User-Agent": "TerraSentinel-Tutor/1.0 (educational demo)",
    },
  });
  if (!response.ok) {
    throw new Error(`Recherche échouée (${response.status})`);
  }
  const data = await response.json();
  return data[0] ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name } : null;
};

const searchNearbyEcoSpots = () => {
  const center = map.getCenter();
  const matches = ecoSpots
    .map((spot) => ({
      ...spot,
      distance: map.distance(center, L.latLng(spot.coords[0], spot.coords[1])),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  matches.forEach((spot) => {
    const marker = addMarker(
      spot.coords[0],
      spot.coords[1],
      `${spot.name}<br/><small>${spot.description}</small>`
    );
    marker.on("popupopen", () => {
      addSuggestion(`Découverte : ${spot.name} (${Math.round(spot.distance / 1000)} km)`);
    });
  });
  updateStatus(`Sanctuaires proches suggérés (${matches.length}).`);
};

const fetchRoute = async (destination) => {
  const origin = map.getCenter();
  const geo = await geocode(destination);
  if (!geo) {
    updateStatus("Destination introuvable.");
    return;
  }
  const url = new URL(`https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${geo.lon},${geo.lat}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  const response = await fetch(url.toString());
  if (!response.ok) {
    updateStatus("Le service d'itinéraire ne répond pas.");
    return;
  }
  const data = await response.json();
  if (!data.routes?.length) {
    updateStatus("Aucun itinéraire trouvé.");
    return;
  }
  drawRoute(data.routes[0].geometry);
  updateStatus(`Itinéraire piéton vers ${geo.display}.`);
  addSuggestion(`Trajet suggéré vers ${geo.display}`);
};

const toggleSatellite = (() => {
  let satelliteLayer = null;
  return () => {
    if (satelliteLayer) {
      map.removeLayer(satelliteLayer);
      satelliteLayer = null;
      updateStatus("Vue standard activée.");
      return;
    }
    satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      maxZoom: 19,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "Images © Google",
    });
    satelliteLayer.addTo(map);
    updateStatus("Vue satellite activée (Google).");
  };
})();

const processCommand = async (rawCommand) => {
  const command = rawCommand.trim();
  if (!command) return;
  const normalized = sanitize(command);
  addSuggestion(`🗣️ ${command}`);

  try {
    if (/^va[\s-]?a\s+/.test(normalized)) {
      const place = command.replace(/^va[\s-]?a\s+/i, "");
      const result = await geocode(place);
      if (result) {
        flyToLocation(result.lat, result.lon);
        updateStatus(`Navigation vers ${result.display}.`);
      } else {
        updateStatus("Lieu introuvable.");
      }
      return;
    }

    if (normalized.includes("zoome")) {
      const factorMatch = normalized.match(/zoome?\s*x?(\d+(?:\.\d+)?)/);
      const factor = factorMatch ? parseFloat(factorMatch[1]) : 2;
      map.setZoom(Math.min(map.getZoom() + Math.log2(factor), map.getMaxZoom()));
      updateStatus(`Zoom avant x${factor}.`);
      return;
    }

    if (normalized.includes("dezoome") || normalized.includes("dézoome")) {
      map.zoomOut();
      updateStatus("Zoom arrière.");
      return;
    }

    if (normalized.includes("ajoute un marqueur")) {
      const label = command.split("ajoute un marqueur")[1]?.trim() || "Marqueur personnalisé";
      const center = map.getCenter();
      addMarker(center.lat, center.lng, label);
      updateStatus(`Marqueur ajouté : ${label}.`);
      return;
    }

    if (normalized.includes("itineraire") || normalized.includes("itinéraire")) {
      const destination = command.split(/itinéraire\s+jusqu'?a/i)[1]?.trim();
      if (!destination) {
        updateStatus("Précise une destination.");
        return;
      }
      await fetchRoute(destination);
      return;
    }

    if (normalized.includes("sanctuaires") || normalized.includes("monuments") || normalized.includes("refuges")) {
      searchNearbyEcoSpots();
      return;
    }

    if (normalized.includes("bascule") && normalized.includes("satellite")) {
      toggleSatellite();
      return;
    }

    updateStatus("Commande inconnue. Essaie : va à Montréal, zoome x2...");
  } catch (error) {
    console.error(error);
    updateStatus(`Erreur : ${error.message}`);
  }
};

locateBtn?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    updateStatus("La géolocalisation n'est pas supportée.");
    return;
  }
  locateBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      flyToLocation(latitude, longitude, 15);
      addMarker(latitude, longitude, "Ma position");
      L.circleMarker([latitude, longitude], {
        radius: 18,
        color: "#36c28a",
        fillColor: "#36c28a",
        fillOpacity: 0.4,
      }).addTo(map);
      updateStatus("Position actuelle localisée.");
      locateBtn.disabled = false;
    },
    (error) => {
      updateStatus(`Géolocalisation refusée ou indisponible (${error.code}).`);
      locateBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.info("Service worker enregistré."))
      .catch((err) => console.warn("Échec d'enregistrement SW", err));
  });
}

window.addEventListener("ecosystem-detected", (event) => {
  const { detail } = event;
  if (!detail) return;
  const { coordinates, title, description, wikiUrl } = detail;
  if (coordinates) {
    addMarker(coordinates[0], coordinates[1], `${title}<br/><small>${description}</small>`);
    flyToLocation(coordinates[0], coordinates[1], 12);
  }
  if (wikiUrl) {
    addSuggestion(`ℹ️ Découverte : ${title}. Ressource : ${wikiUrl}`);
  }
});

window.terraApp = {
  processCommand,
  updateStatus,
};

export { processCommand, updateStatus };
