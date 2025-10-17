import { processCommand, updateStatus } from "./app.js";

const commandInput = document.getElementById("commandInput");
const runCommandBtn = document.getElementById("runCommandBtn");
const voiceBtn = document.getElementById("voiceBtn");
const installBtn = document.getElementById("installBtn");

let deferredPrompt = null;
let recognition = null;

const initSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.disabled = true;
    voiceBtn.title = "Dictée non supportée";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("start", () => {
    voiceBtn.classList.add("recording");
    updateStatus("🎤 En écoute...");
  });

  recognition.addEventListener("end", () => {
    voiceBtn.classList.remove("recording");
    updateStatus("Fin de la dictée.");
  });

  recognition.addEventListener("result", (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();
    commandInput.value = text;
    processCommand(text);
  });

  recognition.addEventListener("error", (event) => {
    updateStatus(`Dictée indisponible : ${event.error}`);
  });
};

runCommandBtn?.addEventListener("click", () => {
  processCommand(commandInput.value);
});

commandInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    processCommand(commandInput.value);
  }
});

voiceBtn?.addEventListener("click", async () => {
  if (!recognition) {
    updateStatus("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
    return;
  }
  try {
    recognition.start();
  } catch (error) {
    updateStatus(`Impossible de démarrer la dictée : ${error.message}`);
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.hidden = false;
  installBtn.disabled = false;
  installBtn.textContent = "Installer TerraSentinel";
});

installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) {
    updateStatus("L'installation n'est pas disponible actuellement.");
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    updateStatus("Merci ! Application en cours d'installation.");
  } else {
    updateStatus("Installation annulée.");
  }
  deferredPrompt = null;
  installBtn.disabled = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.textContent = "Application installée";
  installBtn.disabled = true;
});

window.addEventListener("DOMContentLoaded", () => {
  initSpeechRecognition();
  installBtn.hidden = true;
  installBtn.disabled = true;
});
