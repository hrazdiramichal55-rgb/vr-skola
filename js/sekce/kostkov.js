// =====================================================================
//  SEKCE: Kostkov – kostičkový svět, který si žáci postaví sami
//
//  Dva pohledy:
//   • Stavebnice – celý svět je zmenšený na stole před hráčem.
//     Funguje v brýlích i na PC. Klidný režim pro první zkoušky.
//   • Uvnitř světa – hráč chodí po světě. Na PC jako počítačová hra
//     (myš + WASD), v brýlích páčkami. Přepínač „Hraju na PC / ve VR“
//     je na paletě; v nasazených brýlích se hraje vždy ve VR.
//
//  Hra má dvě varianty (přepíná se na paletě):
//   • Přežití – batoh je na začátku prázdný. Spoušť se drží, dokud se blok
//     nevytěží. Z kmene se vyrobí prkna, klacky a nástroje, krumpáčem pak
//     kámen. Panel nahoře radí, co udělat dál. Tabulky TEZBA a RECEPTY níže.
//   • Tvoření – všechny bloky bez omezení, těží se jedním stiskem.
//
//  Ovládání v brýlích:
//   spoušť = těžit (v Přežití držet), boční tlačítko (grip) = položit blok,
//   A / X = další / předchozí blok, paleta bloků je u levé ruky.
//   Uvnitř světa: levá páčka chůze, pravá páčka do stran otáčení,
//   pravá páčka nahoru skok. Na schod vysoký jeden blok se vyleze samo.
//  Ovládání na PC:
//   stavebnice: levé tlačítko = těžit (v Přežití držet), pravé = položit,
//   1–9 = výběr bloku, táhnutím myši se otáčí pohled.
//   uvnitř světa: myš = rozhlížení, WASD = chůze, mezerník = skok, Shift = běh,
//   E nebo Esc = pustit myš a klikat na paletu (batoh, výroba, zpět ke stolu).
//
//  Dílna (kostkov-dilna.js): děti si na PC samy navrhnou bloky, kytky, druhy
//  stromů, postavičky (kostkov-postavy.js) a pravidla (gravitace, skok…).
//
//  Stavby i návrhy se ukládají v prohlížeči (na každém počítači a brýlích zvlášť).
// =====================================================================
import * as THREE from 'three';
import { vytvorTlacitko, vytvorPanel, pozadiPanelu, zaobleny, stitek } from '../ui.js';
import { nactiDilnu, otevriDilnu, bunkyStromu, prumernaBarva, SILA_UROVNE } from './kostkov-dilna.js';
import { vytvorPostavy, sestavPostavu } from './kostkov-postavy.js';
import * as zvuky from './kostkov-zvuky.js';

const NX = 64, NZ = 64, NY = 32, CH = 16, NCX = NX / CH, NCZ = NZ / CH, MORE = 9;
const KLIC = 'vr-skola-kostkov-v1';
const STUL = { y: 0.78, z: -0.9, meritko: 1.2 / NX };   // stůl se světem širokým 1,2 m
const OTOCENI = Math.PI / 6;                               // gravitaci, skok a rychlost nastavují děti v Dílně (Pravidla)
let SIRKA = 0.3, VYSKA = 1.6;                               // hráč v blocích (1 blok = 1 m); mění se podle velikosti „Moje postava“

// ---------- bloky ----------
const A = 0, TRAVA = 1, HLINA = 2, KAMEN = 3, PISEK = 4, KMEN = 5, LISTI = 6, PRKNA = 7, CIHLY = 8, SKLO = 9, VODA = 10, PODLOZI = 11;
// t = [horní, boční, spodní] dlaždice v atlasu, barva = proužek na tlačítku
const BL = {
  [TRAVA]:   { n: 'Tráva',   t: [0, 1, 2],    pevny: 1, barva: '#62a043' },
  [HLINA]:   { n: 'Hlína',   t: [2, 2, 2],    pevny: 1, barva: '#7e5a3c' },
  [KAMEN]:   { n: 'Kámen',   t: [3, 3, 3],    pevny: 1, barva: '#8a8a90' },
  [PISEK]:   { n: 'Písek',   t: [4, 4, 4],    pevny: 1, barva: '#ddcd96' },
  [KMEN]:    { n: 'Kmen',    t: [6, 5, 6],    pevny: 1, barva: '#684e30' },
  [LISTI]:   { n: 'Listí',   t: [7, 7, 7],    pevny: 1, barva: '#3e7632' },
  [PRKNA]:   { n: 'Prkna',   t: [8, 8, 8],    pevny: 1, barva: '#ba9058' },
  [CIHLY]:   { n: 'Cihly',   t: [9, 9, 9],    pevny: 1, barva: '#9e4a3a' },
  [SKLO]:    { n: 'Sklo',    t: [10, 10, 10], pevny: 1, pruhl: 1, barva: '#c8e6f0' },
  [VODA]:    { n: 'Voda',    t: [11, 11, 11], pevny: 0, pruhl: 1, barva: '#3470c4' },
  [PODLOZI]: { n: 'Podloží', t: [12, 12, 12], pevny: 1, barva: '#444' },
};
const PALETA = [TRAVA, HLINA, KAMEN, PISEK, KMEN, LISTI, PRKNA, CIHLY, SKLO];   // + vlastní bloky, kytky a sazenice z Dílny

// ---------- režim Přežití: nástroje, těžba a výroba ----------
// Na začátku je batoh prázdný. Rukou jde vytěžit dřevo, z něj se vyrobí
// prkna, klacky a dřevěné nástroje, krumpáčem pak kámen a kamenné nástroje.
const KLACKY = 'klacky';
const NASTROJE = {   // sila = kolikrát rychleji než ruka
  drevKrumpac: { n: 'Dřevěný krumpáč', druh: 'krumpac', sila: 2.5 },
  drevSekera:  { n: 'Dřevěná sekera',  druh: 'sekera',  sila: 2.5 },
  drevLopata:  { n: 'Dřevěná lopata',  druh: 'lopata',  sila: 2.5 },
  kamKrumpac:  { n: 'Kamenný krumpáč', druh: 'krumpac', sila: 5 },
  kamSekera:   { n: 'Kamenná sekera',  druh: 'sekera',  sila: 5 },
  kamLopata:   { n: 'Kamenná lopata',  druh: 'lopata',  sila: 5 },
};
// tvrdost = kolik sekund trvá rukou, nastroj = co těžbu zrychlí,
// nutny = bez nástroje to nejde, dava = co padne do batohu, sance = [předmět, pravděpodobnost]
const TEZBA = {
  [TRAVA]: { tvrdost: 0.9, nastroj: 'lopata', dava: HLINA },
  [HLINA]: { tvrdost: 0.8, nastroj: 'lopata', dava: HLINA },
  [PISEK]: { tvrdost: 0.8, nastroj: 'lopata', dava: PISEK },
  [KMEN]:  { tvrdost: 3,   nastroj: 'sekera', dava: KMEN },
  [PRKNA]: { tvrdost: 2.5, nastroj: 'sekera', dava: PRKNA },
  [LISTI]: { tvrdost: 0.35, dava: null, sance: [KLACKY, 0.25] },
  [KAMEN]: { tvrdost: 6,   nastroj: 'krumpac', nutny: true, dava: KAMEN },
  [CIHLY]: { tvrdost: 7,   nastroj: 'krumpac', nutny: true, dava: CIHLY },
  [SKLO]:  { tvrdost: 0.5, dava: null },
};
const RECEPTY = [
  { n: 'Prkna',         dava: [PRKNA, 4],        potreba: [[KMEN, 1]] },
  { n: 'Klacky',        dava: [KLACKY, 4],       potreba: [[PRKNA, 2]] },
  { n: 'Dřev. krumpáč', dava: ['drevKrumpac', 1], potreba: [[PRKNA, 3], [KLACKY, 2]] },
  { n: 'Dřev. sekera',  dava: ['drevSekera', 1],  potreba: [[PRKNA, 3], [KLACKY, 2]] },
  { n: 'Dřev. lopata',  dava: ['drevLopata', 1],  potreba: [[PRKNA, 1], [KLACKY, 2]] },
  { n: 'Kam. krumpáč',  dava: ['kamKrumpac', 1],  potreba: [[KAMEN, 3], [KLACKY, 2]] },
  { n: 'Kam. sekera',   dava: ['kamSekera', 1],   potreba: [[KAMEN, 3], [KLACKY, 2]] },
  { n: 'Kam. lopata',   dava: ['kamLopata', 1],   potreba: [[KAMEN, 1], [KLACKY, 2]] },
];
const PORADI_BATOHU = [KMEN, PRKNA, KLACKY, HLINA, PISEK, KAMEN, CIHLY, LISTI, SKLO];
const nazevPredmetu = (id) => id === KLACKY ? 'Klacky' : NASTROJE[id]?.n || BL[id]?.n || '?';
const KRATCE = { [KMEN]: 'kmen', [PRKNA]: 'prkna', [KLACKY]: 'klacky', [KAMEN]: 'kameny' };
const KRATCE1 = { [KMEN]: 'kmen', [PRKNA]: 'prkno', [KLACKY]: 'klacek', [KAMEN]: 'kámen' };

// ---------- náhoda a šum ----------
function hash(x, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
function sum(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, s) { let t = 0, amp = 1, f = 1, n = 0; for (let o = 0; o < 4; o++) { t += sum(x * f, z * f, s + o) * amp; n += amp; amp *= .5; f *= 2; } return t / n; }

// ---------- textury (vlastní pixel art, 16 × 16 px) ----------
// Atlas má 16 × 8 dlaždic: řádek 0 jsou bloky hry, od dlaždice 16 kresby z Dílny.
const TS = 16, DLAZDIC = 16, RADKU = 8, PRVNI_VLASTNI = 16;
function vytvorAtlas() {
  const atlas = document.createElement('canvas'); atlas.width = TS * DLAZDIC; atlas.height = TS * RADKU;
  const actx = atlas.getContext('2d'); const img = actx.createImageData(atlas.width, TS);
  const j = (c, v, k) => [c[0] * (1 - k / 2 + k * v), c[1] * (1 - k / 2 + k * v), c[2] * (1 - k / 2 + k * v)];
  const tile = (i, seed, fn) => {
    const r = rng(seed);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const c = fn(x, y, r()), o = (y * atlas.width + i * TS + x) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = c[3] ?? 255;
    }
  };
  const G = [96, 156, 64], D = [126, 90, 60];
  tile(0, 11, (x, y, v) => j(G, v, .3));
  tile(1, 12, (x, y, v) => (y < 3 || (y === 3 && hash(x, 1, 5) < .6) || (y === 4 && hash(x, 2, 5) < .25)) ? j(G, v, .3) : j(D, v, .3));
  tile(2, 13, (x, y, v) => j(D, v, .3));
  tile(3, 14, (x, y, v) => { const b = hash(x >> 1, y >> 1, 3) < .25 ? .8 : 1; return j([128 * b, 128 * b, 133 * b], v, .18); });
  tile(4, 15, (x, y, v) => j([222, 206, 150], v, .12));
  tile(5, 16, (x, y, v) => { const s = x % 4 === 0 ? .75 : 1; return j([104 * s, 78 * s, 48 * s], v, .2); });
  tile(6, 17, (x, y, v) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6.5 ? j([104, 78, 48], v, .2) : j(Math.floor(d) % 2 ? [178, 140, 88] : [158, 122, 74], v, .1); });
  tile(7, 18, (x, y, v) => v < .12 ? [36, 70, 30] : j([62, 118, 50], v, .35));
  tile(8, 19, (x, y, v) => (y % 4 === 3 || x === ((y >> 2) % 2 ? 3 : 11)) ? [128, 94, 54] : j([186, 144, 88], v, .12));
  tile(9, 20, (x, y, v) => (y % 4 === 3 || (x + ((y >> 2) % 2 ? 4 : 0)) % 8 === 7) ? j([198, 190, 174], v, .08) : j([158, 74, 58], v, .2));
  tile(10, 21, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? [222, 240, 246, 255] : ((x - y === 4 || x - y === 5) && x > 2 && x < 10) ? [255, 255, 255, 120] : [200, 230, 240, 40]);
  tile(11, 22, (x, y, v) => [...j([52, 112, 196], v, .12), 170]);
  tile(12, 23, (x, y, v) => v < .4 ? [50, 50, 55] : j([86, 86, 92], v, .2));
  actx.putImageData(img, 0, 0);
  return atlas;
}

// Stěny krychle: d = směr, s = stínování, k = která dlaždice (0 horní, 1 boční, 2 spodní)
const STENY = [
  { d: [-1, 0, 0], s: .8,  k: 1, c: [[0,1,0,0,1],[0,0,0,0,0],[0,1,1,1,1],[0,0,1,1,0]] },
  { d: [1, 0, 0],  s: .8,  k: 1, c: [[1,1,1,0,1],[1,0,1,0,0],[1,1,0,1,1],[1,0,0,1,0]] },
  { d: [0, -1, 0], s: .55, k: 2, c: [[1,0,1,1,0],[0,0,1,0,0],[1,0,0,1,1],[0,0,0,0,1]] },
  { d: [0, 1, 0],  s: 1,   k: 0, c: [[0,1,1,1,1],[1,1,1,0,1],[0,1,0,1,0],[1,1,0,0,0]] },
  { d: [0, 0, -1], s: .68, k: 1, c: [[1,0,0,0,0],[0,0,0,1,0],[1,1,0,0,1],[0,1,0,1,1]] },
  { d: [0, 0, 1],  s: .68, k: 1, c: [[0,0,1,0,0],[1,0,1,1,0],[0,1,1,0,1],[1,1,1,1,1]] },
];

export default {
  id: 'kostkov',
  nazev: 'Kostkov',
  popis: 'Postav si vlastní svět',
  barva: '#f2b544',
  napovedaPC: 'Kostičkový svět na stole. V Dílně (tlačítko na panelu vpravo) si nakreslíš vlastní bloky, kytky, stromy a postavičky a nastavíš pravidla hry. Na panelu taky přepneš, jestli hraješ na PC, nebo ve VR. Na PC klikni na „Vstoupit do světa“ a chodíš jako v počítačové hře (WASD, myš, E = batoh). Začínáš s prázdným batohem: podrž levé tlačítko na kmeni stromu a ve Výrobě si udělej prkna, klacky a nástroje.',

  spust(app) {
    const { scene, camera, renderer } = app;
    const koren = new THREE.Group();
    const NEBE = new THREE.Color(0x8ec5e6);
    scene.background = NEBE.clone();

    // ---------- data světa ----------
    const svetData = new Uint8Array(NX * NY * NZ);
    const idx = (x, y, z) => (y * NZ + z) * NX + x;
    const uvnitr = (x, y, z) => x >= 0 && x < NX && z >= 0 && z < NZ && y >= 0 && y < NY;
    const get = (x, y, z) => uvnitr(x, y, z) ? svetData[idx(x, y, z)] : A;
    const setRaw = (x, y, z, id) => { if (uvnitr(x, y, z)) svetData[idx(x, y, z)] = id; };

    let seed = 1, zmeny = new Map();
    let hra = 'preziti', batoh = {};              // hra: 'preziti' nebo 'tvoreni'
    let ovladani = 'pc', ovladaniUlozene = false; // ovladani: 'pc' (myš a klávesnice) nebo 'vr' (brýle)
    try {
      const s = JSON.parse(localStorage.getItem(KLIC) || 'null');
      if (s && s.seed) {
        seed = s.seed; zmeny = new Map(s.zmeny || []);
        if (s.hra) hra = s.hra;
        if (s.batoh) batoh = s.batoh;
        if (s.ovladani) { ovladani = s.ovladani; ovladaniUlozene = true; }
        if (s.zvuk === false) zvuky.nastavZapnuto(false);
      } else seed = (Math.random() * 1e9) | 0;
    } catch (e) { seed = (Math.random() * 1e9) | 0; }
    const stav = () => JSON.stringify({ seed, zmeny: [...zmeny], hra, batoh, ovladani, zvuk: zvuky.jeZapnuto() });
    let ulozCas = 0;
    const uloz = () => {
      clearTimeout(ulozCas);
      ulozCas = setTimeout(() => { try { localStorage.setItem(KLIC, stav()); } catch (e) {} }, 300);
    };
    const pocet = (id) => batoh[id] || 0;
    const pridej = (id, k) => { batoh[id] = pocet(id) + k; if (batoh[id] <= 0) delete batoh[id]; };

    // ---------- Dílna: vlastní bloky, kytky, stromy, postavičky a pravidla ----------
    let dilna = nactiDilnu();
    const pravidla = () => dilna.pravidla;
    const atlasCanvas = vytvorAtlas();
    let tex = null;
    let vlastniIds = [];                    // vlastní bloky, kytky a sazenice (pro paletu a batoh)
    function kresliDlazdici(index, px, pozadi) {
      const ctx = atlasCanvas.getContext('2d');
      const x0 = (index % DLAZDIC) * TS, y0 = Math.floor(index / DLAZDIC) * TS;
      ctx.clearRect(x0, y0, TS, TS);
      if (pozadi) { ctx.fillStyle = pozadi; ctx.fillRect(x0, y0, TS, TS); }
      px.forEach((b, i) => { if (b) { ctx.fillStyle = b; ctx.fillRect(x0 + i % 16, y0 + (i >> 4), 1, 1); } });
    }
    const barvaBloku = (id) => BL[id]?.barva || '#888888';
    function obrazekSazenice(druh) {                 // malý stromek z barev kmene a listí
      const k = barvaBloku(druh.kmen), l = druh.listi ? barvaBloku(druh.listi) : k;
      const px = Array(256).fill('');
      for (let y = 9; y < 16; y++) { px[y * 16 + 7] = k; px[y * 16 + 8] = k; }
      for (let y = 2; y < 10; y++) for (let x = 3; x < 13; x++) if ((x - 7.5) ** 2 / 25 + (y - 5.5) ** 2 / 16 <= 1) px[y * 16 + x] = l;
      return px;
    }
    function registrujVlastni() {
      for (const id of vlastniIds) { delete BL[id]; delete TEZBA[id]; }
      vlastniIds = [];
      let dlazdice = PRVNI_VLASTNI;
      const volno = () => dlazdice < DLAZDIC * RADKU;
      for (const b of dilna.bloky) {
        if (!volno()) break;
        kresliDlazdici(dlazdice, b.px, '#ffffff');
        BL[b.id] = { n: b.n, t: [dlazdice, dlazdice, dlazdice], pevny: 1, barva: prumernaBarva(b.px), vlastni: 1, zvuk: b.zvuk };
        const nastroj = b.nastroj === 'ruka' ? null : b.nastroj, nutny = !!nastroj && b.nutny;
        TEZBA[b.id] = { tvrdost: b.tvrdost, nastroj, nutny, uroven: nutny ? SILA_UROVNE[b.uroven] : 0, dava: b.id };
        vlastniIds.push(b.id); dlazdice++;
      }
      for (const k of dilna.kytky) {
        if (!volno()) break;
        kresliDlazdici(dlazdice, k.px);
        BL[k.id] = { n: k.n, t: [dlazdice, dlazdice, dlazdice], pevny: 0, kytka: 1, barva: prumernaBarva(k.px, '#e05050') };
        TEZBA[k.id] = { tvrdost: 0.15, dava: k.id };
        vlastniIds.push(k.id); dlazdice++;
      }
      for (const s of dilna.stromy) {
        if (!volno()) break;
        kresliDlazdici(dlazdice, obrazekSazenice(s));
        BL[s.id] = { n: 'Sazenice: ' + s.n, t: [dlazdice, dlazdice, dlazdice], pevny: 0, kytka: 1, sazenice: s, barva: s.listi ? barvaBloku(s.listi) : barvaBloku(s.kmen) };
        TEZBA[s.id] = { tvrdost: 0.15, dava: s.id };
        vlastniIds.push(s.id); dlazdice++;
      }
      if (tex) tex.needsUpdate = true;
    }
    // bloky ze smazaných návrhů zmizí ze světa i z batohu
    function vycistiNezname() {
      for (let i = 0; i < svetData.length; i++) { const id = svetData[i]; if (id && !BL[id]) svetData[i] = A; }
      for (const [k, id] of zmeny) if (id && !BL[id]) zmeny.set(k, A);
      for (const k of Object.keys(batoh)) if (/^\d+$/.test(k) && !BL[+k]) delete batoh[k];
    }
    registrujVlastni();

    // Strom podle druhu z Dílny. "nastav" zapisuje bloky (při růstu sazenice se i ukládají).
    function strom(x, y, z, druh, nastav = setRaw) {
      const kmen = BL[druh.kmen] && !BL[druh.kmen].kytka ? druh.kmen : KMEN;
      const listi = druh.listi ? (BL[druh.listi] && !BL[druh.listi].kytka ? druh.listi : LISTI) : 0;
      let i = 0;
      const nahoda = () => hash(x * 7 + (i++), z * 13, seed + 3);
      for (const [dx, dy, dz, t] of bunkyStromu(druh, nahoda)) {
        const id = t === 'k' ? kmen : listi; if (!id) continue;
        const X = x + dx, Y = y + dy, Z = z + dz;
        if (!uvnitr(X, Y, Z)) continue;
        const ted = get(X, Y, Z);
        if (ted === A || BL[ted]?.kytka || (t === 'k' && ted === listi)) nastav(X, Y, Z, id);
      }
    }
    function generuj() {
      svetData.fill(0);
      const vysky = new Int16Array(NX * NZ);
      for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) {
        const h = Math.max(3, Math.min(NY - 10, Math.floor(fbm(x / 34, z / 34, seed) * 22 + fbm(x / 14, z / 14, seed + 99) * 7 - 1)));
        vysky[z * NX + x] = h;
        for (let y = 0; y <= Math.max(h, MORE); y++) {
          let id;
          if (y === 0) id = PODLOZI;
          else if (y < h - 3) id = KAMEN;
          else if (y < h) id = h <= MORE + 1 ? PISEK : HLINA;
          else if (y === h) id = h <= MORE + 1 ? PISEK : TRAVA;
          else id = VODA;
          svetData[idx(x, y, z)] = id;
        }
      }
      // vlastní bloky z Dílny: ostrůvky na povrchu, nebo ruda v kameni (v podzemí / hluboko)
      for (const b of dilna.bloky) {
        if (!BL[b.id] || b.vyskyt === 'nikde' || !b.cetnost) continue;
        const kolik = Math.round(b.cetnost * (b.vyskyt === 'povrch' ? 4 : b.vyskyt === 'hluboko' ? 5 : 9));
        for (let i = 0; i < kolik; i++) {
          const x = Math.floor(hash(i, b.id, seed + 11) * NX), z = Math.floor(hash(b.id, i, seed + 13) * NZ);
          const h = vysky[z * NX + x];
          if (b.vyskyt === 'povrch') {
            const r = 1 + Math.floor(hash(i, z, seed + 17) * 2);
            for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
              if (dx * dx + dz * dz > r * r + 0.5) continue;
              const X = x + dx, Z = z + dz; if (!uvnitr(X, 0, Z)) continue;
              const h2 = vysky[Z * NX + X];
              if ([TRAVA, PISEK, HLINA].includes(get(X, h2, Z))) setRaw(X, h2, Z, b.id);
            }
          } else {
            const yMin = b.vyskyt === 'hluboko' ? 1 : 2, yMax = b.vyskyt === 'hluboko' ? Math.min(4, h - 4) : h - 4;
            if (yMax < yMin) continue;
            let X = x, Y = yMin + Math.floor(hash(i, x, seed + 19) * (yMax - yMin + 1)), Z = z;
            const delka = 3 + Math.floor(hash(z, i, seed + 23) * 4);     // žíla 3–6 bloků
            for (let k = 0; k < delka; k++) {
              if (get(X, Y, Z) === KAMEN) setRaw(X, Y, Z, b.id);
              const smer = Math.floor(hash(k, i, seed + b.id) * 6);
              if (smer === 0) X++; else if (smer === 1) X--; else if (smer === 2) Z++; else if (smer === 3) Z--; else if (smer === 4) Y++; else Y = Math.max(1, Y - 1);
            }
          }
        }
      }
      // stromy a kytky z Dílny (četnost 0–10)
      const druhy = dilna.stromy.filter((s) => s.cetnost > 0);
      const soucet = druhy.reduce((a, s) => a + s.cetnost, 0);
      for (let z = 3; z < NZ - 3; z++) for (let x = 3; x < NX - 3; x++) {
        const h = vysky[z * NX + x];
        if (get(x, h, z) !== TRAVA) continue;
        if (soucet && hash(x, z, seed + 7) < soucet * 0.0018) {
          let r = hash(x, z, seed + 8) * soucet;
          strom(x, h + 1, z, druhy.find((s) => (r -= s.cetnost) < 0) || druhy[0]);
          continue;
        }
        if (get(x, h + 1, z) !== A) continue;
        for (const k of dilna.kytky) if (k.cetnost > 0 && hash(x, z, seed + k.id) < k.cetnost * 0.004) { setRaw(x, h + 1, z, k.id); break; }
      }
      for (const [k, id] of zmeny) { const [x, y, z] = k.split(',').map(Number); setRaw(x, y, z, id); }
    }

    // ---------- scéna: svet (otáčení, měřítko) > mapa (posun) > kusy světa ----------
    const svet = new THREE.Group(), mapa = new THREE.Group();
    svet.add(mapa); koren.add(svet);

    tex = new THREE.CanvasTexture(atlasCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const matPevny = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true });
    const matPruhl = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const matKytky = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const MATERIALY = [matPevny, matPruhl, matKytky];

    // průhledné okolí: sousední stěna se kreslí, když je vedle vzduch, sklo, voda nebo kytka
    const pruhledny = (id) => !id || BL[id]?.pruhl || BL[id]?.kytka;
    const kusy = [];
    function postavKus(cx, cz) {
      const out = [0, 1, 2].map(() => ({ p: [], u: [], c: [], i: [] }));   // 0 pevné, 1 průhledné, 2 kytky
      const e = .002;
      const uv = (t, ux, uy) => {
        const sl = t % DLAZDIC, ra = Math.floor(t / DLAZDIC);
        return [(sl + (ux ? 1 - e : e)) / DLAZDIC, 1 - (ra + (uy ? e : 1 - e)) / RADKU];
      };
      for (let y = 0; y < NY; y++) for (let z = cz * CH; z < cz * CH + CH; z++) for (let x = cx * CH; x < cx * CH + CH; x++) {
        const id = svetData[idx(x, y, z)]; if (!id) continue;
        const def = BL[id];
        if (def.kytka) {                                      // kytka = dva zkřížené obrázky
          const o = out[2];
          for (const [ax, az, bx, bz] of [[.15, .15, .85, .85], [.15, .85, .85, .15]]) {
            const n = o.p.length / 3;
            o.p.push(x + ax, y, z + az, x + bx, y, z + bz, x + ax, y + 1, z + az, x + bx, y + 1, z + bz);
            o.u.push(...uv(def.t[0], 0, 0), ...uv(def.t[0], 1, 0), ...uv(def.t[0], 0, 1), ...uv(def.t[0], 1, 1));
            o.c.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
            o.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
          }
          continue;
        }
        const pr = !!def.pruhl, o = out[pr ? 1 : 0];
        for (const f of STENY) {
          const sous = get(x + f.d[0], y + f.d[1], z + f.d[2]);
          const ukaz = pr ? (!sous || (sous !== id && pruhledny(sous))) : pruhledny(sous);
          if (!ukaz) continue;
          const t = def.t[f.k], n = o.p.length / 3, st = f.s * f.s;   // stín v lineárních barvách
          const nizsi = id === VODA && get(x, y + 1, z) !== VODA;
          for (const [px, py, pz, ux, uy] of f.c) {
            o.p.push(x + px, y + (py && nizsi ? .88 : py), z + pz);
            o.u.push(...uv(t, ux, uy));
            o.c.push(st, st, st);
          }
          o.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
        }
      }
      const slot = kusy[cx + cz * NCX] || (kusy[cx + cz * NCX] = [null, null, null]);
      out.forEach((o, k) => {
        if (slot[k]) { mapa.remove(slot[k]); slot[k].geometry.dispose(); slot[k] = null; }
        if (!o.i.length) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
        g.setIndex(o.i); g.computeBoundingSphere();
        const m = new THREE.Mesh(g, MATERIALY[k]);
        if (k === 1) m.renderOrder = 1;
        mapa.add(m); slot[k] = m;
      });
    }
    const postavVse = () => { for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) postavKus(cx, cz); };
    function prestavOkoli(x, z) {
      const cx = Math.floor(x / CH), cz = Math.floor(z / CH), s = new Set([cx + ',' + cz]);
      if (x % CH === 0 && cx > 0) s.add((cx - 1) + ',' + cz);
      if (x % CH === CH - 1 && cx < NCX - 1) s.add((cx + 1) + ',' + cz);
      if (z % CH === 0 && cz > 0) s.add(cx + ',' + (cz - 1));
      if (z % CH === CH - 1 && cz < NCZ - 1) s.add(cx + ',' + (cz + 1));
      for (const k of s) { const [a, b] = k.split(',').map(Number); postavKus(a, b); }
    }
    function nastavBlok(x, y, z, id) {
      setRaw(x, y, z, id); zmeny.set(x + ',' + y + ',' + z, id);
      prestavOkoli(x, z); uloz();
    }
    generuj(); vycistiNezname(); postavVse();
    uloz();                                        // ať se svět při příštím otevření nezmění

    // podstavec a tráva pod stolem (jen ve stavebnici)
    const podstavec = new THREE.Mesh(
      new THREE.BoxGeometry(NX + 2, STUL.y / STUL.meritko, NZ + 2),
      new THREE.MeshBasicMaterial({ color: 0x6b4a2e }));
    podstavec.position.y = -STUL.y / STUL.meritko / 2 - 0.02;
    svet.add(podstavec);
    const podlaha = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ color: 0x4f7a3e }));
    podlaha.rotation.x = -Math.PI / 2;
    koren.add(podlaha);

    const obrys = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
      new THREE.LineBasicMaterial({ color: 0x111111 }));
    obrys.visible = false; mapa.add(obrys);

    // ---------- hráč (uvnitř světa) ----------
    const H = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), zem: false };
    let rezim = 'stul', otoceniStolu = 0, otoceni = 0;

    const pevne = (x, y, z) => {
      if (x < 0 || z < 0 || x >= NX || z >= NZ || y < 0) return true;
      if (y >= NY) return false;
      const id = svetData[idx(x, y, z)]; return id && BL[id].pevny;
    };

    // postavičky z Dílny
    const postavy = vytvorPostavy(mapa, { NX, NZ, NY, get, pevne, VODA, TRAVA, hash,
      priReci: (def) => zvuky.rekni(def.rec, def.hlas ?? 1, rezim === 'stul' ? 0.6 : 1) });
    const vsechnyPostavy = () => [...dilna.postavy, ...dilna.zvirata.map((z) => ({ ...z, zvire: true, rec: z.zvuk }))];
    postavy.rozmisti(vsechnyPostavy(), seed);
    const rostouci = [];                     // zasazené sazenice, které za chvíli vyrostou
    function narazi() {
      const p = H.pos;
      for (let y = Math.floor(p.y); y <= Math.floor(p.y + VYSKA - 1e-4); y++)
        for (let z = Math.floor(p.z - SIRKA); z <= Math.floor(p.z + SIRKA - 1e-4); z++)
          for (let x = Math.floor(p.x - SIRKA); x <= Math.floor(p.x + SIRKA - 1e-4); x++)
            if (pevne(x, y, z)) return true;
      return false;
    }
    function posunOsa(a, d) {
      const kroky = Math.max(1, Math.ceil(Math.abs(d) / .2)), s = d / kroky;
      for (let i = 0; i < kroky; i++) {
        H.pos[a] += s;
        if (narazi()) {
          H.pos[a] -= s;
          let lo = 0, hi = 1;
          for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; H.pos[a] += s * m; if (narazi()) hi = m; else lo = m; H.pos[a] -= s * m; }
          H.pos[a] += s * lo;
          return true;
        }
      }
      return false;
    }
    // vodorovný posun, na schod vysoký jeden blok vyleze sám
    function posunVodorovne(a, d) {
      if (!d) return;
      const pred = H.pos.clone();
      if (!posunOsa(a, d) || !H.zem) return;
      H.pos.copy(pred); H.pos.y += 1.01;
      if (narazi()) { H.pos.copy(pred); posunOsa(a, d); return; }
      if (posunOsa(a, d)) { H.pos.copy(pred); posunOsa(a, d); }
    }
    function najdiZem(sx, sz) {
      for (let r = 0; r < 40; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = sx + dx, z = sz + dz; if (!uvnitr(x, 0, z)) continue;
        for (let y = NY - 1; y > 0; y--) {
          const id = get(x, y, z); if (!id) continue;
          if (id !== VODA && id !== LISTI && !pevne(x, y + 1, z) && !pevne(x, y + 2, z)) { H.pos.set(x + .5, y + 1, z + .5); return; }
          break;
        }
      }
      H.pos.set(NX / 2 + .5, NY - 2, NZ / 2 + .5);
    }

    // ---------- paleta: batoh, výroba a tlačítka ----------
    const paleta = new THREE.Group();
    let pohled = 'batoh', vybranyPredmet = null, stranka = 0;
    let cas = 0, zprava = '', zpravaDobra = true, zpravaDo = 0;

    const hlavicka = vytvorPanel(0.56, 0.15, 768);
    hlavicka.mesh.position.y = 0.27;
    paleta.add(hlavicka.mesh);

    function dalsiUkol() {
      const drz = renderer.xr.isPresenting ? 'drž spoušť' : 'drž levé tlačítko';
      if (!pocet('drevKrumpac')) {
        if (!pocet(KMEN) && pocet(PRKNA) < 3 && !(pocet(PRKNA) >= 2 && pocet(KLACKY) < 2))
          return `Úkol 1: Najdi strom, ${drz} na kmeni a vytěž dřevo.`;
        if (pocet(KLACKY) < 2) return pocet(PRKNA) >= 2 ? 'Úkol 3: Ve Výrobě udělej z prken klacky.' : 'Úkol 2: Otevři Výrobu a udělej z kmene prkna.';
        if (pocet(PRKNA) < 3) return 'Úkol 2: Otevři Výrobu a udělej z kmene prkna.';
        return 'Úkol 4: Vyrob si dřevěný krumpáč.';
      }
      if (!pocet('kamKrumpac')) {
        if (pocet(KAMEN) < 3) return 'Úkol 5: Krumpáčem vytěž 3 kameny (jsou pod hlínou).';
        if (pocet(KLACKY) < 2) return 'Úkol 6: Udělej klacky a pak kamenný krumpáč.';
        return 'Úkol 6: Vyrob si kamenný krumpáč.';
      }
      return 'Výborně! Vyrob si sekeru a lopatu a stav, co tě napadne.';
    }
    function kresliHlavicku() {
      const { c, ctx, t } = hlavicka;
      pozadiPanelu(ctx, c.width, c.height);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffd36b';
      ctx.font = 'bold 46px system-ui, sans-serif';
      ctx.fillText(hra === 'tvoreni' ? 'Kostkov · Tvoření' : pohled === 'vyroba' ? 'Kostkov · Výroba' : 'Kostkov · Batoh', 30, 20);
      ctx.font = '30px system-ui, sans-serif';
      ctx.fillStyle = zprava ? (zpravaDobra ? '#7dffb0' : '#ff9f80') : '#ffffff';
      ctx.fillText(zprava || (hra === 'tvoreni' ? 'Všechny bloky bez omezení, těží se jedním stiskem.' : dalsiUkol()), 30, 84, c.width - 60);
      if (hra === 'preziti') {
        const mam = Object.keys(NASTROJE).filter((k) => pocet(k)).map((k) => NASTROJE[k].n.toLowerCase());
        ctx.fillStyle = '#9fd4ff';
        ctx.font = '28px system-ui, sans-serif';
        ctx.fillText('Nástroje: ' + (mam.join(', ') || 'jen ruce'), 30, 136, c.width - 60);
      }
      t.needsUpdate = true;
    }
    function ukazZpravu(text, dobra) {
      if (!dobra) zvuky.chyba();
      zprava = text; zpravaDobra = dobra; zpravaDo = cas + 2.5;
      kresliHlavicku();
    }

    // tlačítko slotu, které jde přepisovat (text, podtext, barva, vypnuto)
    function slot(sirka, vyska) {
      const W = 512, V = Math.round(512 * vyska / sirka);
      const c = document.createElement('canvas'); c.width = W; c.height = V;
      const ctx = c.getContext('2d'), t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sirka, vyska), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
      mesh.userData = { akce: () => mesh.userData.pri?.(), hover: false, aktivni: false, text: '', podtext: '', barva: null, vypnuto: false };
      mesh.userData.kresli = () => {
        const u = mesh.userData;
        ctx.clearRect(0, 0, W, V);
        ctx.globalAlpha = u.vypnuto ? 0.45 : 1;
        zaobleny(ctx, 4, 4, W - 8, V - 8, 22,
          u.aktivni ? '#2f6fd6' : u.hover && !u.vypnuto ? '#2a4470' : '#1c2c4a',
          u.aktivni ? '#bfe0ff' : u.hover && !u.vypnuto ? '#8fc3ff' : '#3d5a88', 5);
        let x = 28;
        if (u.barva) { ctx.fillStyle = u.barva; ctx.beginPath(); ctx.roundRect(22, 22, 14, V - 44, 7); ctx.fill(); x = 56; }
        ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        ctx.font = `bold ${u.podtext ? 60 : 72}px system-ui, sans-serif`;
        ctx.fillText(u.text, x, V / 2 - (u.podtext ? 26 : 0), W - x - 20);
        if (u.podtext) {
          ctx.fillStyle = '#9fd4ff'; ctx.font = '40px system-ui, sans-serif';
          ctx.fillText(u.podtext, x, V / 2 + 36, W - x - 20);
        }
        ctx.globalAlpha = 1;
        t.needsUpdate = true;
      };
      mesh.userData.kresli();
      return mesh;
    }

    const mrizka = Array.from({ length: 9 }, (_, i) => {
      const b = slot(0.17, 0.06);
      b.position.set((i % 3 - 1) * 0.185, 0.155 - Math.floor(i / 3) * 0.07, 0);
      paleta.add(b);
      return b;
    });

    const poradiBatohu = () => [...PORADI_BATOHU, ...vlastniIds];
    const polozitelne = () => hra === 'tvoreni' ? [...PALETA, ...vlastniIds] : poradiBatohu().filter((id) => BL[id] && pocet(id) > 0);
    function vyber(id) { vybranyPredmet = id; prekresli(); }
    function posunVyber(o) {
      const s = polozitelne(); if (!s.length) return;
      const i = s.indexOf(vybranyPredmet);
      vyber(s[(i + o + s.length) % s.length]);
    }
    const lzeVyrobit = (r) => r.potreba.every(([id, k]) => pocet(id) >= k);
    function vyrob(r) {
      if (NASTROJE[r.dava[0]] && pocet(r.dava[0])) return;
      if (!lzeVyrobit(r)) { ukazZpravu('Na ' + r.n.toLowerCase() + ' ti chybí suroviny.', false); return; }
      for (const [id, k] of r.potreba) pridej(id, -k);
      pridej(r.dava[0], r.dava[1]);
      if (vybranyPredmet === null && BL[r.dava[0]]) vybranyPredmet = r.dava[0];
      ukazZpravu('Vyrobeno: ' + r.n + (r.dava[1] > 1 ? ' ×' + r.dava[1] : ''), true);
      zvuky.vyroba();
      prekresli(); uloz();
    }

    function prekresli() {
      let polozky;
      if (hra === 'tvoreni') {
        polozky = polozitelne().map((id) => ({ text: BL[id].n, barva: BL[id].barva, pri: () => vyber(id), aktivni: vybranyPredmet === id }));
      } else if (pohled === 'batoh') {
        const mam = poradiBatohu().filter((id) => pocet(id) > 0);
        polozky = mam.length
          ? mam.map((id) => ({
              text: nazevPredmetu(id), podtext: '× ' + pocet(id) + (BL[id] ? '' : '  (na výrobu)'),
              barva: BL[id]?.barva || '#b08a50', pri: BL[id] ? () => vyber(id) : null, aktivni: vybranyPredmet === id }))
          : [{ text: 'Batoh je prázdný', podtext: 'vytěž dřevo ze stromu', vypnuto: true }];
      } else {
        polozky = RECEPTY.map((r) => {
          const uzMa = NASTROJE[r.dava[0]] && pocet(r.dava[0]) > 0;
          return {
            text: r.n + (r.dava[1] > 1 ? ' ×' + r.dava[1] : ''),
            podtext: uzMa ? 'už máš' : r.potreba.map(([id, k]) => k + ' ' + (k === 1 ? KRATCE1 : KRATCE)[id]).join(' + '),
            barva: NASTROJE[r.dava[0]] ? '#f2b544' : '#b08a50', vypnuto: uzMa || !lzeVyrobit(r), pri: () => vyrob(r) };
        });
      }
      // víc než 9 položek → stránky po 8 a deváté tlačítko „Další“
      if (polozky.length > 9) {
        const stran = Math.ceil(polozky.length / 8);
        if (stranka >= stran) stranka = 0;
        const s = stranka;
        polozky = [...polozky.slice(s * 8, s * 8 + 8),
          { text: 'Další ▸', podtext: `strana ${s + 1} z ${stran}`, barva: '#ffd36b', pri: () => { stranka = (s + 1) % stran; prekresli(); } }];
      } else stranka = 0;
      mrizka.forEach((b, i) => {
        const p = polozky[i];
        b.visible = !!p;
        if (!p) return;
        Object.assign(b.userData, { text: p.text, podtext: p.podtext || '', barva: p.barva || null, vypnuto: !!p.vypnuto, aktivni: !!p.aktivni, pri: p.pri || null });
        b.userData.kresli();
      });
      tlVyroba.visible = hra === 'preziti';
      tlVyroba.userData.text = pohled === 'vyroba' ? 'Zpět do batohu' : 'Výroba';
      tlVyroba.userData.kresli();
      tlHra.userData.text = hra === 'preziti' ? 'Přežití' : 'Tvoření';
      tlHra.userData.kresli();
      tlOvladani.userData.text = ovladani === 'pc' ? 'Hraju na PC' : 'Hraju ve VR';
      tlOvladani.userData.kresli();
      tlZvuk.userData.text = zvuky.jeZapnuto() ? 'Zvuk: ano' : 'Zvuk: ne';
      tlZvuk.userData.kresli();
      popisRezimu();
      kresliHlavicku();
    }

    const tlVyroba = vytvorTlacitko('Výroba', '', 0.17, 0.06, () => {
      pohled = pohled === 'vyroba' ? 'batoh' : 'vyroba';
      stranka = 0;
      prekresli();
    }, { pismo: 60, naStred: true });
    tlVyroba.position.set(-0.185, -0.06, 0);
    const tlDilna = vytvorTlacitko('Dílna', '', 0.17, 0.06, () => {
      if (renderer.xr.isPresenting) { ukazZpravu('Dílna je na počítači. Co tam navrhneš, uvidíš i v brýlích.', false); return; }
      otevriDilnuHry();
    }, { pismo: 64, naStred: true });
    tlDilna.position.set(0, -0.06, 0);
    const tlZvuk = vytvorTlacitko('', '', 0.17, 0.06, () => {
      zvuky.nastavZapnuto(!zvuky.jeZapnuto());
      zvuky.odemkni(); zvuky.klik();
      prekresli(); uloz();
    }, { pismo: 60, naStred: true });
    tlZvuk.position.set(0.185, -0.06, 0);
    const tlRezim = vytvorTlacitko('', '', 0.54, 0.1, () => {
      if (rezim === 'uvnitr') { nastavRezim('stul'); return; }
      if (renderer.xr.isPresenting || ovladani === 'pc') vstup();
      else ukazZpravu('Nasaď si brýle a dole stiskni ENTER VR.', false);
    }, { pismo: 34, podpismo: 22, akcent: '#f2b544' });
    tlRezim.position.set(0, -0.145, 0);
    // přepínač PC / VR (v brýlích je vždy VR)
    const tlOvladani = vytvorTlacitko('', '', 0.17, 0.06, () => {
      if (renderer.xr.isPresenting) { ukazZpravu('V brýlích se hraje vždy ve VR.', false); return; }
      ovladani = ovladani === 'pc' ? 'vr' : 'pc';
      ovladaniUlozene = true;
      if (rezim === 'uvnitr') nastavRezim('stul');
      ukazZpravu(ovladani === 'pc' ? 'Hraješ na PC: myš a klávesnice.' : 'Hraješ ve VR: nasaď brýle a stiskni ENTER VR.', true);
      prekresli(); uloz();
    }, { pismo: 60, naStred: true });
    tlOvladani.position.set(-0.185, -0.235, 0);
    const tlHra = vytvorTlacitko('', '', 0.17, 0.06, () => {
      hra = hra === 'preziti' ? 'tvoreni' : 'preziti';
      pohled = 'batoh'; stranka = 0;
      vybranyPredmet = polozitelne()[0] ?? null;
      prekresli(); uloz();
    }, { pismo: 60, naStred: true });
    tlHra.position.set(0, -0.235, 0);
    let potvrzeni = false;
    const tlNovy = vytvorTlacitko('Nový svět', '', 0.17, 0.06, () => {
      if (!potvrzeni) { potvrzeni = true; tlNovy.userData.text = 'Smazat?'; tlNovy.userData.kresli(); return; }
      potvrzeni = false; tlNovy.userData.text = 'Nový svět'; tlNovy.userData.kresli();
      seed = (Math.random() * 1e9) | 0; zmeny = new Map(); batoh = {};
      generuj(); postavVse();
      vybranyPredmet = polozitelne()[0] ?? null;
      prekresli(); uloz();
      if (rezim === 'uvnitr') { najdiZem(NX / 2, NZ / 2); H.vel.set(0, 0, 0); }
    }, { pismo: 60, naStred: true });
    tlNovy.position.set(0.185, -0.235, 0);
    paleta.add(tlVyroba, tlDilna, tlZvuk, tlRezim, tlOvladani, tlHra, tlNovy);
    const tlacitkaPalety = [...mrizka, tlVyroba, tlDilna, tlZvuk, tlRezim, tlOvladani, tlHra, tlNovy];
    koren.add(paleta);

    // ---------- těžba držením spouště ----------
    let tezba = { klic: null, postup: 0 }, bzuceni = 0;
    const prasklina = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    prasklina.visible = false; mapa.add(prasklina);
    const letajici = [];
    const vibruj = (gp, sila, ms) => { try { gp?.hapticActuators?.[0]?.pulse(sila, ms); } catch (e) {} };

    function casTezby(id) {
      const t = TEZBA[id]; if (!t) return null;
      let sila = 1, nastroj = null;
      if (t.nastroj) for (const [k, n] of Object.entries(NASTROJE))
        if (n.druh === t.nastroj && pocet(k) && n.sila > sila) { sila = n.sila; nastroj = n.n; }
      if (t.nutny && (!nastroj || sila < (t.uroven || 0))) {
        const cim = { krumpac: 'krumpáčem', sekera: 'sekerou', lopata: 'lopatou' }[t.nastroj];
        return { nelze: true, zprava: BL[id].n + ' jde vytěžit jen ' + (t.uroven >= 5 ? 'kamenným ' : '') + cim + '.' };
      }
      return { cas: t.tvrdost / sila, nastroj };
    }
    function zrusTezbu() { tezba.klic = null; tezba.postup = 0; }
    function tez(h, dt, gp) {
      if (!h) { zrusTezbu(); return; }
      const klic = h.x + ',' + h.y + ',' + h.z;
      if (tezba.klic !== klic) {
        tezba = { klic, x: h.x, y: h.y, z: h.z, postup: 0, info: casTezby(h.id) };
        if (tezba.info?.nelze) ukazZpravu(tezba.info.zprava, false);
      }
      if (!tezba.info || tezba.info.nelze) return;
      tezba.postup += dt * pravidla().tezba / tezba.info.cas;
      if ((bzuceni += dt) > 0.22) { bzuceni = 0; vibruj(gp, 0.25, 25); zvuky.tezba(zvuky.materialBloku(h.id, BL)); }
      if (tezba.postup >= 1) { dokonciTezbu(h); vibruj(gp, 0.8, 70); zrusTezbu(); }
    }
    function leticiText(text, h) {
      const naStole = rezim === 'stul';
      const s = stitek(text, { sirka: naStole ? 0.12 : 0.4, pismo: 44, vzdyViditelny: true });
      s.position.copy(mapa.localToWorld(new THREE.Vector3(h.x + .5, h.y + 1.2, h.z + .5)));
      s.material.transparent = true;
      koren.add(s);
      letajici.push({ s, zivot: 0, rychlost: naStole ? 0.06 : 0.5 });
    }
    function dokonciTezbu(h) {
      const t = TEZBA[h.id];
      let ziskal = t.dava;
      if (!ziskal && t.sance && Math.random() < t.sance[1]) ziskal = t.sance[0];
      vytez(h);
      if (!ziskal) {                                   // z listí občas padne sazenice stromu
        const druhy = dilna.stromy.filter((s) => s.listi && (BL[s.listi] ? s.listi : LISTI) === h.id);
        if (druhy.length && Math.random() < 0.12) ziskal = druhy[Math.floor(Math.random() * druhy.length)].id;
      }
      if (ziskal) {
        pridej(ziskal, 1);
        if (vybranyPredmet === null && BL[ziskal]) vybranyPredmet = ziskal;
        leticiText('+1 ' + nazevPredmetu(ziskal), h);
        setTimeout(zvuky.sebrani, 120);
      }
      prekresli(); uloz();
    }

    // ---------- Dílna: otevření a použití návrhů ve hře ----------
    let zavritDilnu = null, konec = false;
    function otevriDilnuHry() {
      if (zavritDilnu) return;
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      zavritDilnu = otevriDilnu({
        dilna,
        zakladniBloky: [KMEN, LISTI, PRKNA, KAMEN, CIHLY, SKLO, PISEK, HLINA, TRAVA].map((id) => ({ id, n: BL[id].n, barva: BL[id].barva })),
        priZavreni: (d, { novySvet }) => { zavritDilnu = null; if (konec) return; dilna = d; aplikujDilnu(novySvet); },
      });
    }
    function aplikujDilnu(novySvet) {
      registrujVlastni();
      if (novySvet) { seed = (Math.random() * 1e9) | 0; zmeny = new Map(); batoh = {}; generuj(); }
      vycistiNezname();
      postavVse();
      postavy.rozmisti(vsechnyPostavy(), seed);
      nastavVelikostHrace(); postavAvatar();
      if (rezim === 'uvnitr') while (narazi() && H.pos.y < NY) H.pos.y += 1;   // větší postava se nezasekne
      rostouci.length = 0;
      if (!polozitelne().includes(vybranyPredmet)) vybranyPredmet = polozitelne()[0] ?? null;
      stranka = 0;
      if (novySvet && rezim === 'uvnitr') { najdiZem(NX / 2, NZ / 2); H.vel.set(0, 0, 0); }
      prekresli(); uloz();
      ukazZpravu(novySvet ? 'Nový svět s tvými návrhy je hotový!' : 'Tvoje návrhy jsou ve hře.', true);
    }
    // zasazená sazenice po chvíli vyroste ve strom
    function rustSazenic() {
      for (let i = rostouci.length - 1; i >= 0; i--) {
        const r = rostouci[i];
        if (cas < r.za) continue;
        rostouci.splice(i, 1);
        if (get(r.x, r.y, r.z) !== r.id || !BL[r.id]?.sazenice) continue;
        const dotcene = new Set();
        const nastav = (X, Y, Z, id) => { setRaw(X, Y, Z, id); zmeny.set(X + ',' + Y + ',' + Z, id); dotcene.add(Math.floor(X / CH) + ',' + Math.floor(Z / CH)); };
        nastav(r.x, r.y, r.z, A);
        strom(r.x, r.y, r.z, BL[r.id].sazenice, nastav);
        for (const k of dotcene) { const [a, b] = k.split(',').map(Number); postavKus(a, b); }
        leticiText('Vyrostl strom!', r);
        zvuky.rust();
        uloz();
      }
    }

    function popisRezimu() {
      if (rezim === 'stul') {
        tlRezim.userData.text = 'Vstoupit do světa';
        tlRezim.userData.podtext = renderer.xr.isPresenting ? 'kam míříš paprskem, tam se objevíš'
          : ovladani === 'pc' ? 'chůze s myší a klávesnicí, kam míříš, tam se objevíš' : 'nasaď brýle a stiskni ENTER VR';
      } else {
        tlRezim.userData.text = 'Zpět ke stavebnici';
        tlRezim.userData.podtext = 'svět se zase zmenší na stůl';
      }
      tlRezim.userData.kresli();
    }

    // ---------- přepínání režimů ----------
    let mlha = null;
    const PC_STUL = { pozice: [0.3, 1.75, 0.85], cil: [0.25, 0.95, -0.75] };   // pohled na stůl na PC
    function nastavRezim(r) {
      const bylUvnitrPC = rezim === 'uvnitr' && !renderer.xr.isPresenting;
      rezim = r;
      if (r === 'stul') {
        svet.scale.setScalar(STUL.meritko);
        svet.position.set(0, STUL.y, STUL.z);
        svet.rotation.y = otoceniStolu;
        mapa.position.set(-NX / 2, 0, -NZ / 2);
        scene.fog = null;
        podstavec.visible = podlaha.visible = true;
        if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
        if (app.orbit) app.orbit.enabled = true;
        if (bylUvnitrPC && app.orbit) {
          camera.position.set(...PC_STUL.pozice);
          app.orbit.target.set(...PC_STUL.cil);
        }
      } else {
        svet.scale.setScalar(1);
        svet.position.set(0, 0, 0);
        podstavec.visible = podlaha.visible = false;
        mlha = mlha || new THREE.Fog(NEBE, 22, 56);
        scene.fog = mlha;
        if (!renderer.xr.isPresenting && app.orbit) app.orbit.enabled = false;   // na PC řídí pohled myš
      }
      popisRezimu();
    }
    let posledniMireni = null;   // blok, na který se naposledy mířilo
    function vstup() {
      const cil = posledniMireni;
      najdiZem(cil ? cil.x : NX / 2, cil ? cil.z : NZ / 2);
      H.vel.set(0, 0, 0);
      otoceni = 0; pc.yaw = 0; pc.pitch = -0.25; bylUvnitr = true;
      nastavRezim('uvnitr');
      if (!renderer.xr.isPresenting) zamkniMys();
    }

    // ---------- umístění palety: u stolu, u levé ruky (VR), v rohu obrazovky (PC) ----------
    let kdePaleta = '';                               // první snímek paletu umístí
    function hloubkaPalety(naObrazovce) {
      paleta.traverse((o) => { if (o.material) o.material.depthTest = !naObrazovce; o.renderOrder = naObrazovce ? 1000 : 0; });
    }
    function umistiPaletu(vVR) {
      if (rezim === 'uvnitr' && vVR) {                 // VR: paleta u levé ruky
        if (kdePaleta === 'obrazovka') hloubkaPalety(false);
        prichytPaletuKRuce();
        kdePaleta = 'ruka';
        return;
      }
      const kde = rezim === 'stul' ? 'stul' : 'obrazovka';
      if (kde !== kdePaleta) {
        paleta.parent?.remove(paleta);
        hloubkaPalety(kde === 'obrazovka');
        paleta.rotation.set(0, 0, 0);
        if (kde === 'stul') {
          koren.add(paleta);
          paleta.scale.setScalar(1);
          paleta.position.set(0.78, 1.18, -0.55);
          paleta.lookAt(0, 1.3, 0.3);
        } else {
          camera.add(paleta);
          paleta.scale.setScalar(0.36);
        }
        kdePaleta = kde;
      }
      if (kde === 'obrazovka') {                        // pravý horní roh, i když se změní velikost okna
        const v = 0.6 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        paleta.position.set(v * camera.aspect - 0.11, v - 0.135, -0.6);
      }
    }

    // ---------- míření na bloky ----------
    const rc = new THREE.Raycaster();
    const inv = new THREE.Matrix4(), tmpM = new THREE.Matrix4();
    const o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
    const paprsekOvladace = (o) => {
      tmpM.identity().extractRotation(o.matrixWorld);
      rc.ray.origin.setFromMatrixPosition(o.matrixWorld);
      rc.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
      return rc.ray;
    };
    const mys = new THREE.Vector2();
    const paprsekMysi = (x, y) => {
      const r = renderer.domElement.getBoundingClientRect();
      mys.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      rc.setFromCamera(mys, camera);
      return rc.ray;
    };
    const mirisNaPaletu = (ray) => { rc.ray.copy(ray); return rc.intersectObjects(tlacitkaPalety, false).some((z) => z.object.visible); };

    // Krokování po blocích (DDA). Vrací zasažený blok, stranu a vzdálenost ve scéně.
    function trefBlok(ray) {
      mapa.updateMatrixWorld(true);
      inv.copy(mapa.matrixWorld).invert();
      const o = o3.copy(ray.origin).applyMatrix4(inv), d = d3.copy(ray.direction).transformDirection(inv);
      const max = rezim === 'stul' ? 220 : tretiOsoba && !renderer.xr.isPresenting ? 11 : 7;
      let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
      const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
      const dx = Math.abs(1 / d.x), dy = Math.abs(1 / d.y), dz = Math.abs(1 / d.z);
      let tx = sx > 0 ? (x + 1 - o.x) * dx : (o.x - x) * dx;
      let ty = sy > 0 ? (y + 1 - o.y) * dy : (o.y - y) * dy;
      let tz = sz > 0 ? (z + 1 - o.z) * dz : (o.z - z) * dz;
      let n = [0, 0, 0], t = 0;
      while (t <= max) {
        const id = get(x, y, z);
        if (id && id !== VODA) return { x, y, z, n, id, vzdalenost: t * (rezim === 'stul' ? STUL.meritko : 1) };
        if (tx < ty && tx < tz) { x += sx; t = tx; tx += dx; n = [-sx, 0, 0]; }
        else if (ty < tz) { y += sy; t = ty; ty += dy; n = [0, -sy, 0]; }
        else { z += sz; t = tz; tz += dz; n = [0, 0, -sz]; }
      }
      return null;
    }
    function vytez(h) {
      if (!h || h.id === PODLOZI) return;
      const mokro = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, b, c]) => get(h.x + a, h.y + b, h.z + c) === VODA);
      zvuky.rozbiti(zvuky.materialBloku(h.id, BL));
      nastavBlok(h.x, h.y, h.z, mokro && h.y <= MORE ? VODA : A);
    }
    function poloz(h) {
      if (!h) return;
      const x = h.x + h.n[0], y = h.y + h.n[1], z = h.z + h.n[2];
      if (!uvnitr(x, y, z)) return;
      const ted = get(x, y, z); if (ted && ted !== VODA) return;
      if (rezim === 'uvnitr') {
        const p = H.pos;
        if (x + 1 > p.x - SIRKA && x < p.x + SIRKA && z + 1 > p.z - SIRKA && z < p.z + SIRKA && y + 1 > p.y && y < p.y + VYSKA) return;
      }
      const id = hra === 'tvoreni' ? (vybranyPredmet ?? PALETA[0]) : vybranyPredmet;
      if (hra === 'preziti' && (!BL[id] || pocet(id) < 1)) { ukazZpravu('Nemáš co položit. Nejdřív něco vytěž.', false); return; }
      nastavBlok(x, y, z, id);
      zvuky.polozeni(zvuky.materialBloku(id, BL));
      if (BL[id].sazenice) rostouci.push({ x, y, z, id, za: cas + 2.5 });
      if (hra === 'preziti') {
        pridej(id, -1);
        if (!pocet(id)) vybranyPredmet = polozitelne()[0] ?? null;
        prekresli(); uloz();
      }
    }

    // ---------- PC: myš a klávesy ----------
    //  Stavebnice: kliká se myší přímo na bloky, táhnutím se otáčí pohled.
    //  Uvnitř světa: myš je „zamčená“ (pohled z očí, míří se křížkem uprostřed),
    //  E nebo Esc myš pustí, aby šlo klikat na paletu vpravo nahoře.
    const el = renderer.domElement;
    const pc = { yaw: 0, pitch: 0, klavesy: {} };
    let OKO = 1.5;                                            // výška očí nad nohama (bloky)
    let tretiOsoba = false;                                   // V = pohled zezadu, hráč vidí svou postavu
    function nastavVelikostHrace() {
      const v = dilna.hrac.velikost;
      VYSKA = 1.6 * v; SIRKA = 0.3 * Math.min(1, v); OKO = 1.5 * v;
    }
    nastavVelikostHrace();

    // moje postava: na stole stojí tam, kde jsem byl naposledy, na PC ji vidím zezadu (klávesa V)
    let avatar = null, bylUvnitr = false, fazeKroku = 0;
    function postavAvatar() {
      if (avatar) {
        mapa.remove(avatar);
        avatar.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose(); x.dispose(); }); });
      }
      avatar = sestavPostavu(dilna.hrac);
      const jmeno = stitek(dilna.hrac.n, { sirka: 0.9, pismo: 40 });
      jmeno.position.y = avatar.userData.vyska + 0.4;
      avatar.add(jmeno);
      avatar.visible = false;
      mapa.add(avatar);
    }
    postavAvatar();
    function aktualizujAvatar(dt) {
      const ukaz = (rezim === 'stul' && bylUvnitr) || (uvnitrPC() && tretiOsoba);
      avatar.visible = ukaz;
      if (!ukaz) return;
      avatar.position.copy(H.pos);
      if (uvnitrPC()) avatar.rotation.y = pc.yaw + Math.PI;
      const rych = rezim === 'uvnitr' ? Math.hypot(H.vel.x, H.vel.z) : 0;
      fazeKroku += dt * (4 + rych * 2);
      const kyv = rych > 0.3 ? Math.sin(fazeKroku) * 0.6 : 0;
      const { nohy, ruce } = avatar.userData;
      nohy[0].rotation.x = kyv; nohy[1].rotation.x = -kyv; ruce[0].rotation.x = -kyv; ruce[1].rotation.x = kyv;
    }
    let stisk = null, mysXY = null, mysDrzi = false, zamceno = false;
    // zamekSelhal: poslední pokus o zamčení myši nevyšel (např. hned po Esc nebo ho prohlížeč nepovolí).
    // Pak se dá rozhlížet táhnutím a bloky těžit podržením tlačítka přímo na nich; další klik zkusí zamknout znovu.
    let zamekSelhal = false;
    const uvnitrPC = () => rezim === 'uvnitr' && !renderer.xr.isPresenting;
    const paprsekStred = () => { mys.set(0, 0); rc.setFromCamera(mys, camera); return rc.ray; };
    function zamkniMys() {
      if (!el.requestPointerLock) { zamekSelhal = true; return; }
      try { const p = el.requestPointerLock(); p?.catch?.(() => { zamekSelhal = true; }); } catch (e) { zamekSelhal = true; }
      setTimeout(() => { if (!zamceno && uvnitrPC()) zamekSelhal = true; }, 700);
    }
    const otocPohled = (dx, dy, citlivost) => {
      pc.yaw -= dx * citlivost;
      pc.pitch = Math.max(-1.5, Math.min(1.5, pc.pitch - dy * citlivost));
    };
    const priDolu = (e) => {
      zvuky.odemkni();
      if (uvnitrPC() && zamceno) {                            // zamčená myš: míří se křížkem uprostřed
        stisk = { b: e.button, zamceno: true };
        mysDrzi = e.button === 0;
        return;
      }
      stisk = { x: e.clientX, y: e.clientY, b: e.button, t: performance.now() };
      mysXY = [e.clientX, e.clientY];
      // uvnitř světa bez zámku se těží podržením jen tehdy, když zamčení nejde
      mysDrzi = e.button === 0 && (!uvnitrPC() || zamekSelhal);
    };
    const priNahoru = (e) => {
      mysDrzi = false;
      if (!stisk || renderer.xr.isPresenting) return;
      const b = stisk.b;
      if (stisk.zamceno) {
        stisk = null;
        const h = trefBlok(paprsekStred());
        if (b === 2) poloz(h); else if (b === 0 && hra === 'tvoreni') vytez(h);
        return;
      }
      const posun = Math.hypot(e.clientX - stisk.x, e.clientY - stisk.y);
      const kratky = performance.now() - stisk.t < 300;
      stisk = null;
      if (posun > 5) return;                                  // bylo to táhnutí
      const ray = paprsekMysi(e.clientX, e.clientY).clone();
      if (mirisNaPaletu(ray)) return;                         // tlačítka obslouží jádro
      if (uvnitrPC() && b === 0 && (kratky || !zamekSelhal)) { zamkniMys(); return; }   // klik do světa = zamknout myš
      const h = trefBlok(ray);
      if (b === 2) poloz(h); else if (b === 0 && hra === 'tvoreni') vytez(h);
    };
    // rozhlížení: se zamčenou myší stačí pohyb, jinak táhnutí se stisknutým tlačítkem
    const priPohybuMysi = (e) => {
      if (zamceno) otocPohled(e.movementX || 0, e.movementY || 0, 0.0022);
    };
    const priPohybu = (e) => {
      if (zamceno) return;
      // táhnutí uvnitř světa: pohyb se počítá z posunu kurzoru (spolehlivé ve všech prohlížečích)
      if (uvnitrPC() && stisk && e.buttons && mysXY) otocPohled(e.clientX - mysXY[0], e.clientY - mysXY[1], 0.004);
      mysXY = [e.clientX, e.clientY];
      if (stisk && Math.hypot(e.clientX - stisk.x, e.clientY - stisk.y) > 5) mysDrzi = false;   // otáčí pohledem
    };
    const priKlavese = (e) => {
      zvuky.odemkni();
      pc.klavesy[e.code] = true;
      const n = +e.key, s = polozitelne();
      if (n >= 1 && n <= 9 && s[n - 1] !== undefined) vyber(s[n - 1]);
      if (!uvnitrPC()) return;
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'KeyE') { if (zamceno) document.exitPointerLock(); else zamkniMys(); }
      if (e.code === 'KeyV') tretiOsoba = !tretiOsoba;
      if (e.code === 'KeyM') { zvuky.nastavZapnuto(!zvuky.jeZapnuto()); prekresli(); uloz(); }
    };
    const priPusteniKlavesy = (e) => { pc.klavesy[e.code] = false; };
    const priZtrateFokusu = () => { pc.klavesy = {}; mysDrzi = false; };
    const priKolecku = (e) => { if (zamceno) posunVyber(e.deltaY > 0 ? 1 : -1); };
    const priZamceni = () => {
      zamceno = document.pointerLockElement === el;
      if (zamceno) zamekSelhal = false;
      mysDrzi = false; stisk = null;
    };
    el.addEventListener('pointerdown', priDolu);
    el.addEventListener('pointerup', priNahoru);
    document.addEventListener('pointermove', priPohybu);
    document.addEventListener('mousemove', priPohybuMysi);
    window.addEventListener('keydown', priKlavese);
    window.addEventListener('keyup', priPusteniKlavesy);
    window.addEventListener('blur', priZtrateFokusu);
    el.addEventListener('wheel', priKolecku, { passive: true });
    document.addEventListener('pointerlockchange', priZamceni);

    // zaměřovací křížek a nápověda dole (jen při chůzi na PC)
    const hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:system-ui,sans-serif';
    hud.innerHTML =
      '<div style="position:absolute;left:50%;top:50%;width:20px;height:20px;transform:translate(-50%,-50%)">' +
      '<div style="position:absolute;left:9px;top:0;width:2px;height:20px;background:#fff;mix-blend-mode:difference"></div>' +
      '<div style="position:absolute;top:9px;left:0;height:2px;width:20px;background:#fff;mix-blend-mode:difference"></div></div>' +
      '<div data-rada style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);max-width:calc(100% - 32px);' +
      'background:rgba(0,0,0,.65);color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;line-height:1.4;text-align:center"></div>';
    hud.hidden = true;
    document.body.appendChild(hud);
    const hudRada = hud.querySelector('[data-rada]');
    let hudText = '';
    function aktualizujHud() {
      const ukaz = uvnitrPC();
      hud.hidden = !ukaz;
      if (!ukaz) return;
      const t = zamceno
        ? 'WASD chůze · mezerník skok · Shift běh · ' + (hra === 'preziti' ? 'drž levé tlačítko = těžit' : 'levé tlačítko = těžit') +
          ' · pravé = položit · 1–9 / kolečko = blok · E = batoh a výroba · V = vidím se'
        : zamekSelhal
          ? 'Myš se nepodařilo zamknout, klikni do světa znovu. Zatím: táhni myší = rozhlížení · WASD chůze · ' +
            'podrž levé tlačítko na bloku = těžit · pravé = položit · V = vidím se'
          : 'Klikni do světa a otáčej se myší. Táhnutím se rozhlížíš i teď. Batoh a výroba jsou na panelu vpravo nahoře.';
      if (t !== hudText) { hudText = t; hudRada.textContent = t; }
    }

    function ovladaniPC() {
      const k = pc.klavesy, fx = -Math.sin(pc.yaw), fz = -Math.cos(pc.yaw);
      let mx = 0, mz = 0;
      const ovlada = true;                                    // chodit jde i s puštěnou myší
      if (ovlada) {
        if (k.KeyW || k.ArrowUp) { mx += fx; mz += fz; }
        if (k.KeyS || k.ArrowDown) { mx -= fx; mz -= fz; }
        if (k.KeyA || k.ArrowLeft) { mx += fz; mz -= fx; }
        if (k.KeyD || k.ArrowRight) { mx -= fz; mz += fx; }
      }
      const delka = Math.hypot(mx, mz);
      const rychlost = pravidla().rychlost * (k.ShiftLeft || k.ShiftRight ? 1.7 : 1);
      if (delka) pohyb.set(mx / delka * rychlost, 0, mz / delka * rychlost); else pohyb.set(0, 0, 0);
      if (ovlada && k.Space && H.zem) { H.vel.y = pravidla().skok; zvuky.skok(); }
      // kamera stojí v očích hráče, orbit jen otočí pohled k bodu před ním
      const cp = Math.cos(pc.pitch);
      const smer = new THREE.Vector3(-Math.sin(pc.yaw) * cp, Math.sin(pc.pitch), -Math.cos(pc.yaw) * cp);
      if (tretiOsoba) {                                        // kamera 4 bloky za hlavou, dívá se na postavu
        const hlavaHrace = new THREE.Vector3(0, OKO + 0.3, 0);
        camera.position.copy(hlavaHrace).addScaledVector(smer, -4);
        app.orbit?.target.copy(hlavaHrace);
        if (!app.orbit) camera.lookAt(hlavaHrace);
      } else {
        camera.position.set(0, OKO, 0);
        app.orbit?.target.set(smer.x, OKO + smer.y, smer.z);
        if (!app.orbit) camera.lookAt(smer.x, OKO + smer.y, smer.z);
      }
    }

    // ---------- VR: ztmavení okrajů při chůzi (proti nevolnosti) ----------
    const vinetaCanvas = document.createElement('canvas'); vinetaCanvas.width = vinetaCanvas.height = 256;
    {
      const c = vinetaCanvas.getContext('2d'), g = c.createRadialGradient(128, 128, 50, 128, 128, 128);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    }
    const vineta = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(vinetaCanvas), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    vineta.position.z = -0.2; vineta.renderOrder = 999; vineta.visible = false;
    const kameraPridana = !camera.parent;
    if (kameraPridana) scene.add(camera);
    camera.add(vineta);

    // ---------- VR: ovladače ----------
    const drzeno = new Map();
    const nove = (klic, stav) => { const bylo = drzeno.get(klic); drzeno.set(klic, stav); return stav && !bylo; };
    const OSA_Y = new THREE.Vector3(0, 1, 0);
    const vpred = new THREE.Vector3(), vpravo = new THREE.Vector3(), pohyb = new THREE.Vector3(), hlava = new THREE.Vector3();
    const ovladac = (i) => renderer.xr.getController(i);

    function otoc(o) {
      // otáčí se kolem hlavy, ne kolem středu místnosti
      hlava.set(camera.position.x, 0, camera.position.z);
      const a = hlava.clone().applyAxisAngle(OSA_Y, -otoceni);
      const b = hlava.clone().applyAxisAngle(OSA_Y, -(otoceni + o));
      H.pos.add(a).sub(b);
      otoceni += o;
    }

    function ovladaniVR(dt) {
      let jdu = 0;
      for (let i = 0; i < 2; i++) {
        const zdroj = ovladac(i).userData.zdroj, gp = zdroj?.gamepad;
        if (!gp) continue;
        const ruka = zdroj.handedness, osaX = gp.axes[2] || 0, osaY = gp.axes[3] || 0;
        const tlAX = !!gp.buttons[4]?.pressed;
        if (ruka === 'left') {
          if (nove('X', tlAX)) posunVyber(-1);
          if (rezim === 'uvnitr' && Math.hypot(osaX, osaY) > 0.15) {
            camera.getWorldDirection(vpred); vpred.y = 0; vpred.normalize();
            vpravo.set(-vpred.z, 0, vpred.x);
            pohyb.copy(vpred).multiplyScalar(-osaY).addScaledVector(vpravo, osaX).applyAxisAngle(OSA_Y, -otoceni);
            const k = pravidla().rychlost * Math.min(1, Math.hypot(osaX, osaY));
            if (pohyb.lengthSq() > 0) pohyb.normalize().multiplyScalar(k);
            jdu = Math.hypot(osaX, osaY);
          } else if (rezim === 'uvnitr') pohyb.set(0, 0, 0);
        } else if (ruka === 'right') {
          if (nove('A', tlAX)) posunVyber(1);
          const doStran = Math.abs(osaX) > 0.7 ? Math.sign(osaX) : 0;
          if (nove('otoc' + doStran, doStran !== 0) && doStran) {
            if (rezim === 'uvnitr') otoc(-doStran * OTOCENI);
            else { otoceniStolu -= doStran * OTOCENI; svet.rotation.y = otoceniStolu; }
          }
          if (doStran === 0) { drzeno.set('otoc1', false); drzeno.set('otoc-1', false); }
          if (rezim === 'uvnitr' && osaY < -0.7 && H.zem) { H.vel.y = pravidla().skok; zvuky.skok(); }
        }
      }
      return jdu;
    }

    let krokuUjito = 0;
    function fyzika(dt) {
      const voda = get(Math.floor(H.pos.x), Math.floor(H.pos.y + .4), Math.floor(H.pos.z)) === VODA;
      const k = voda ? 0.55 : 1;
      const zrychleni = Math.min(1, dt * (H.zem ? 12 : 4));
      H.vel.x += (pohyb.x * k - H.vel.x) * zrychleni;
      H.vel.z += (pohyb.z * k - H.vel.z) * zrychleni;
      if (voda) { H.vel.y -= 6 * dt; H.vel.y = Math.max(H.vel.y, -2.5); }
      else { H.vel.y -= pravidla().gravitace * dt; H.vel.y = Math.max(H.vel.y, -30); }
      const predX = H.pos.x, predZ = H.pos.z, padani = H.vel.y;
      posunVodorovne('x', H.vel.x * dt);
      posunVodorovne('z', H.vel.z * dt);
      H.zem = false;
      if (posunOsa('y', H.vel.y * dt)) {
        if (H.vel.y < 0) { H.zem = true; if (padani < -9) zvuky.dopad(); }
        H.vel.y = 0;
      }
      // kroky podle toho, po čem se jde
      if (H.zem) {
        krokuUjito += Math.hypot(H.pos.x - predX, H.pos.z - predZ);
        if (krokuUjito > 1.6) {
          krokuUjito = 0;
          zvuky.krok(zvuky.materialBloku(get(Math.floor(H.pos.x), Math.floor(H.pos.y - 0.1), Math.floor(H.pos.z)), BL));
        }
      }
      if (H.pos.y < -5) najdiZem(NX / 2, NZ / 2);
    }

    function prichytPaletuKRuce() {
      for (let i = 0; i < 2; i++) {
        if (ovladac(i).userData.zdroj?.handedness !== 'left') continue;
        const grip = renderer.xr.getControllerGrip(i);
        if (paleta.parent !== grip) {
          paleta.parent?.remove(paleta);
          grip.add(paleta);
          paleta.scale.setScalar(0.42);
          paleta.position.set(0.14, 0.04, 0.05);
          paleta.rotation.set(-Math.PI / 4, 0, 0);
        }
        return;
      }
    }

    nastavRezim('stul');
    vybranyPredmet = polozitelne()[0] ?? null;
    prekresli();
    // na brýlích (prohlížeč umí VR) je výchozí ovládání VR, jinde PC
    if (!ovladaniUlozene) navigator.xr?.isSessionSupported?.('immersive-vr').then((umi) => {
      if (umi && !ovladaniUlozene) { ovladani = 'vr'; prekresli(); }
    }).catch(() => {});
    let bylVR = false, vinetaSila = 0;

    return {
      koren,
      cile: () => (zamceno ? [] : tlacitkaPalety),      // se zamčenou myší se paleta neklikne omylem
      kamera: PC_STUL,

      priPusteni(o) {                                   // Tvoření: spoušť puštěna = vytěžit
        if (!o || hra !== 'tvoreni') return;            // PC obsluhují vlastní posluchače
        const ray = paprsekOvladace(o).clone();
        if (mirisNaPaletu(ray)) return;
        vytez(trefBlok(ray));
      },
      priStisku(o) {                                    // grip = položit
        if (!o) return;
        const ray = paprsekOvladace(o).clone();
        if (mirisNaPaletu(ray)) return;
        poloz(trefBlok(ray));
      },

      aktualizuj(dt) {
        cas += dt;
        const vVR = renderer.xr.isPresenting;
        if (vVR !== bylVR) {
          bylVR = vVR;
          if (vVR) {                                     // nasazené brýle = vždy ovládání VR
            ovladani = 'vr';
            zvuky.odemkni();
            if (document.pointerLockElement === el) document.exitPointerLock();
            if (app.orbit) app.orbit.enabled = true;
          } else if (rezim === 'uvnitr') nastavRezim('stul');
          prekresli();
        }

        let jdu = 0;
        if (vVR) jdu = ovladaniVR(dt);
        if (rezim === 'uvnitr') {
          if (!vVR) ovladaniPC();
          fyzika(dt);
          svet.rotation.y = otoceni;
          mapa.position.set(-H.pos.x, -H.pos.y, -H.pos.z);
        }
        umistiPaletu(vVR);
        aktualizujHud();
        rustSazenic();
        aktualizujAvatar(dt);
        // postavičky: uvnitř světa reagují na hráče, na stole na místo, kam se ukazuje
        const kdeHrac = rezim === 'uvnitr' ? { x: H.pos.x, y: H.pos.y, z: H.pos.z }
          : posledniMireni ? { x: posledniMireni.x + .5, y: posledniMireni.y + 1, z: posledniMireni.z + .5 } : null;
        postavy.aktualizuj(dt, kdeHrac, pravidla().gravitace);

        // ztmavení okrajů jen při chůzi v brýlích
        const cil = vVR && rezim === 'uvnitr' ? Math.min(0.85, jdu * 0.85) : 0;
        vinetaSila += (cil - vinetaSila) * Math.min(1, dt * 6);
        vineta.material.opacity = vinetaSila;
        vineta.visible = vinetaSila > 0.02;

        // na který blok se míří (obrys + délka paprsku)
        let h = null;
        if (vVR) {
          for (let i = 0; i < 2; i++) {
            const o = ovladac(i);
            const z = trefBlok(paprsekOvladace(o));
            const p = o.userData.paprsek;
            if (z && p && (p.scale.z >= 5 || z.vzdalenost < p.scale.z)) p.scale.z = Math.max(0.01, z.vzdalenost);
            if (z && (o.userData.zdroj?.handedness === 'right' || !h)) h = z;
          }
        } else if (zamceno) {
          h = trefBlok(paprsekStred());
        } else if (mysXY) {
          h = trefBlok(paprsekMysi(mysXY[0], mysXY[1]));
        }
        // Přežití: těží se, dokud se drží spoušť (na PC levé tlačítko)
        let tezim = null;
        if (hra === 'preziti') {
          if (vVR) {
            for (let i = 0; i < 2 && !tezim; i++) {
              const o = ovladac(i), gp = o.userData.zdroj?.gamepad;
              if (!gp?.buttons[0]?.pressed) continue;
              const ray = paprsekOvladace(o).clone();
              if (mirisNaPaletu(ray)) continue;
              tezim = { h: trefBlok(ray), gp };
            }
          } else if (mysDrzi && zamceno) {
            tezim = { h: trefBlok(paprsekStred()), gp: null };
          } else if (mysDrzi && mysXY) {
            const ray = paprsekMysi(mysXY[0], mysXY[1]).clone();
            if (!mirisNaPaletu(ray)) tezim = { h: trefBlok(ray), gp: null };
          }
        }
        if (tezim) tez(tezim.h, dt, tezim.gp); else zrusTezbu();
        prasklina.visible = tezba.postup > 0;
        if (prasklina.visible) {
          prasklina.position.set(tezba.x + .5, tezba.y + .5, tezba.z + .5);
          prasklina.material.opacity = 0.15 + tezba.postup * 0.55;
        }
        for (let i = letajici.length - 1; i >= 0; i--) {
          const l = letajici[i];
          l.zivot += dt;
          l.s.position.y += dt * l.rychlost;
          l.s.material.opacity = Math.max(0, 1 - l.zivot / 1.3);
          if (l.zivot > 1.3) { koren.remove(l.s); l.s.material.map.dispose(); l.s.material.dispose(); letajici.splice(i, 1); }
        }
        if (zprava && cas > zpravaDo) { zprava = ''; kresliHlavicku(); }

        obrys.visible = !!h;
        if (h) obrys.position.set(h.x + .5, h.y + .5, h.z + .5);
        if (h && rezim === 'stul') posledniMireni = h;
      },

      zrus() {
        konec = true;
        zavritDilnu?.();
        el.removeEventListener('pointerdown', priDolu);
        el.removeEventListener('pointerup', priNahoru);
        document.removeEventListener('pointermove', priPohybu);
        document.removeEventListener('mousemove', priPohybuMysi);
        window.removeEventListener('keydown', priKlavese);
        window.removeEventListener('keyup', priPusteniKlavesy);
        window.removeEventListener('blur', priZtrateFokusu);
        el.removeEventListener('wheel', priKolecku);
        document.removeEventListener('pointerlockchange', priZamceni);
        if (document.pointerLockElement === el) document.exitPointerLock();
        if (app.orbit) app.orbit.enabled = true;
        hud.remove();
        scene.fog = null;
        camera.remove(vineta);
        vineta.geometry.dispose(); vineta.material.map.dispose(); vineta.material.dispose();
        if (kameraPridana) scene.remove(camera);
        if (paleta.parent && paleta.parent !== koren) {
          paleta.parent.remove(paleta);
          paleta.traverse((x) => { x.geometry?.dispose(); x.material?.map?.dispose(); x.material?.dispose(); });
        }
        clearTimeout(ulozCas);
        try { localStorage.setItem(KLIC, stav()); } catch (e) {}
      },
    };
  },
};
