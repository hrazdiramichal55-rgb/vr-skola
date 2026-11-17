// =====================================================================
//  KOSTKOV – ZVUKY
//  Všechny zvuky se vyrábějí v prohlížeči (Web Audio), žádné soubory.
//  Hlasy postaviček a zvířat čte hlasová syntéza prohlížeče česky;
//  když český hlas chybí, ozve se „blábolení“ z pípnutí.
// =====================================================================

export const MATERIALY = {
  kamen: 'Kámen (ťuk)',
  drevo: 'Dřevo (klap)',
  trava: 'Tráva a hlína (šust)',
  pisek: 'Písek (chrup)',
  sklo: 'Sklo (cink)',
  kov: 'Kov (cink cink)',
  sliz: 'Sliz (blob)',
};

let ctx = null, hlavni = null, sum = null;
let zapnuto = true;

function pripravit() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  hlavni = ctx.createGain(); hlavni.gain.value = 0.5; hlavni.connect(ctx.destination);
  // bílý šum pro šustění, ťukání a kroky
  sum = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = sum.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
// Prohlížeč pustí zvuk až po kliknutí nebo klávese – voláme při každé akci hráče.
export function odemkni() {
  const c = pripravit();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}
export function nastavZapnuto(z) {
  zapnuto = z;
  if (!z && 'speechSynthesis' in window) speechSynthesis.cancel();
}
export const jeZapnuto = () => zapnuto;

const pripraveno = () => zapnuto && pripravit() && ctx.state === 'running';

// --- stavební kameny ---
function tonik(f1, f2, delka, hlasitost, typ = 'sine', zpozdeni = 0) {
  const t = ctx.currentTime + zpozdeni;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = typ; o.frequency.setValueAtTime(f1, t);
  if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + delka);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(hlasitost, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + delka);
  o.connect(g).connect(hlavni);
  o.start(t); o.stop(t + delka + 0.02);
}
function sumik(filtr, frekvence, q, delka, hlasitost, zpozdeni = 0) {
  const t = ctx.currentTime + zpozdeni;
  const s = ctx.createBufferSource(); s.buffer = sum;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = filtr; f.frequency.value = frekvence; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(hlasitost, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + delka);
  s.connect(f).connect(g).connect(hlavni);
  s.start(t, Math.random() * 0.3); s.stop(t + delka + 0.02);
}

// jeden „ťuk“ podle materiálu; sila 0–1
function uder(material, sila = 1, zpozdeni = 0) {
  const v = 0.35 * sila, r = 0.9 + Math.random() * 0.2;
  switch (material) {
    case 'drevo': tonik(260 * r, 150 * r, 0.09, v * 0.8, 'triangle', zpozdeni); sumik('bandpass', 900, 1.5, 0.06, v * 0.6, zpozdeni); break;
    case 'trava': sumik('lowpass', 1400 * r, 0.7, 0.09, v * 0.9, zpozdeni); break;
    case 'pisek': sumik('bandpass', 3200 * r, 0.8, 0.11, v * 0.8, zpozdeni); break;
    case 'sklo': tonik(2100 * r, 2050 * r, 0.25, v * 0.35, 'sine', zpozdeni); tonik(3150 * r, 3100 * r, 0.18, v * 0.2, 'sine', zpozdeni); break;
    case 'kov': tonik(880 * r, 870 * r, 0.35, v * 0.35, 'sine', zpozdeni); tonik(1320 * r, 1300 * r, 0.3, v * 0.25, 'sine', zpozdeni); sumik('highpass', 5000, 0.7, 0.03, v * 0.4, zpozdeni); break;
    case 'sliz': tonik(220 * r, 520 * r, 0.14, v * 0.7, 'sine', zpozdeni); break;
    default: sumik('bandpass', 1900 * r, 1.2, 0.07, v, zpozdeni); tonik(120 * r, 70, 0.05, v * 0.5, 'sine', zpozdeni);   // kámen
  }
}

// --- zvuky hry ---
export function tezba(material) { if (pripraveno()) uder(material, 0.6); }
export function rozbiti(material) {
  if (!pripraveno()) return;
  uder(material, 1.2);
  for (let i = 1; i <= 3; i++) uder(material, 0.4, i * 0.045);   // drobky
}
export function polozeni(material) {
  if (!pripraveno()) return;
  tonik(140, 90, 0.08, 0.25, 'sine');
  uder(material, 0.8);
}
export function krok(material) { if (pripraveno()) uder(material, 0.3); }
export function skok() { if (pripraveno()) tonik(300, 560, 0.12, 0.12, 'sine'); }
export function dopad() { if (pripraveno()) { tonik(110, 60, 0.12, 0.3, 'sine'); sumik('lowpass', 600, 0.7, 0.1, 0.25); } }
export function sebrani() { if (pripraveno()) { tonik(880, 880, 0.07, 0.12, 'square'); tonik(1320, 1320, 0.1, 0.12, 'square', 0.06); } }
export function vyroba() {
  if (!pripraveno()) return;
  [523, 659, 784, 1047].forEach((f, i) => tonik(f, f, 0.14, 0.1, 'square', i * 0.07));
}
export function rust() {
  if (!pripraveno()) return;
  [392, 494, 587, 784].forEach((f, i) => tonik(f, f * 1.02, 0.2, 0.12, 'triangle', i * 0.09));
}
export function chyba() { if (pripraveno()) { tonik(220, 200, 0.12, 0.12, 'square'); tonik(180, 160, 0.16, 0.12, 'square', 0.14); } }
export function klik() { if (pripraveno()) tonik(1000, 1000, 0.03, 0.08, 'square'); }

// --- hlasy postaviček a zvířat ---
let ceskyHlas = null, hlasyNacteny = false;
function najdiHlas() {
  if (!('speechSynthesis' in window)) return null;
  const hlasy = speechSynthesis.getVoices();
  if (hlasy.length) hlasyNacteny = true;
  ceskyHlas = hlasy.find((h) => /^cs/i.test(h.lang)) || null;
  return ceskyHlas;
}
if ('speechSynthesis' in window) {
  najdiHlas();
  speechSynthesis.addEventListener?.('voiceschanged', najdiHlas);
}
function blabol(text, vyska, hlasitost) {
  const slabik = Math.min(8, Math.max(2, Math.round(text.length / 4)));
  for (let i = 0; i < slabik; i++) {
    const f = 260 * vyska * (0.85 + Math.random() * 0.35);
    tonik(f, f * (0.9 + Math.random() * 0.2), 0.09, 0.12 * hlasitost, 'square', i * 0.11);
  }
}
// vyska 0,5 (hluboký) – 2 (pištivý); hlasitost 0–1 (podle vzdálenosti)
export function rekni(text, vyska = 1, hlasitost = 1) {
  if (!text || !zapnuto || hlasitost <= 0.05) return;
  pripravit();
  if (!hlasyNacteny) najdiHlas();
  if (ceskyHlas) {
    if (speechSynthesis.speaking) return;       // ať se nepřekřikují
    const u = new SpeechSynthesisUtterance(text);
    u.voice = ceskyHlas; u.lang = ceskyHlas.lang;
    u.pitch = Math.max(0, Math.min(2, vyska)); u.rate = 1.05; u.volume = Math.max(0.1, Math.min(1, hlasitost));
    speechSynthesis.speak(u);
  } else if (pripraveno()) blabol(text, vyska, hlasitost);
}

// materiál zabudovaných bloků hry
export function materialBloku(id, BL) {
  const def = BL[id]; if (!def) return 'kamen';
  if (def.zvuk) return def.zvuk;
  if (def.kytka) return 'trava';
  return ({ 1: 'trava', 2: 'trava', 3: 'kamen', 4: 'pisek', 5: 'drevo', 6: 'trava', 7: 'drevo', 8: 'kamen', 9: 'sklo', 11: 'kamen' })[id] || 'kamen';
}
