export const bus = new EventTarget();
const $ = (sel) => document.querySelector(sel);

export function toast(msg, type='ok', timeout=2500){
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), timeout);
}

// Web Speech (micro)
let rec = null;
const micBtn = $('#btnMic');
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  rec = new SR();
  rec.lang = 'fr-FR';
  rec.continuous = false; rec.interimResults = false;
  rec.onresult = (e) => {
    const txt = e.results?.[0]?.[0]?.transcript?.trim();
    if (txt) {
      $('#cmdInput').value = txt;
      bus.dispatchEvent(new CustomEvent('nl-command', { detail:{ text: txt, origin:'voice' }}));
    }
  };
  rec.onerror = () => toast('Micro: erreur/autorisation refusée', 'warn', 3000);
  micBtn?.addEventListener('click', () => { try { rec.start(); toast('Parlez…', 'ok', 1200);} catch{} });
} else {
  micBtn?.setAttribute('disabled','true');
  micBtn?.setAttribute('title','Web Speech non supporté');
}

// Bouton Exécuter
$('#btnRun')?.addEventListener('click', () => {
  const text = $('#cmdInput').value.trim();
  if (text) bus.dispatchEvent(new CustomEvent('nl-command', { detail:{ text, origin:'text' }}));
});

// PWA install
let deferredPrompt = null;
const btnInstall = $('#btnInstall');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; btnInstall.hidden = false; });
btnInstall?.addEventListener('click', async () => { btnInstall.hidden = true; if (deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } });

export const ui = { $, bus, toast };
