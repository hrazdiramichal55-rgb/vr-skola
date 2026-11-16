// =====================================================================
//  SEKCE: Kostkov – kostičkový svět, který si žáci postaví sami
//
//  Dva režimy:
//   • Stavebnice – celý svět je zmenšený na stole před hráčem.
//     Funguje v brýlích i na PC. Klidný režim pro první zkoušky.
//   • Uvnitř světa – hráč se zmenší a chodí po světě (jen v brýlích).
//
//  Ovládání v brýlích:
//   spoušť = vytěžit blok, boční tlačítko (grip) = položit blok,
//   A / X = další / předchozí blok, paleta bloků je u levé ruky.
//   Uvnitř světa: levá páčka chůze, pravá páčka do stran otáčení,
//   pravá páčka nahoru skok. Na schod vysoký jeden blok se vyleze samo.
//  Ovládání na PC (stavebnice):
//   levé tlačítko = vytěžit, pravé = položit, 1–9 = výběr bloku,
//   táhnutím myši se otáčí pohled.
//
//  Stavby se ukládají v prohlížeči (na každých brýlích zvlášť).
//  Velikost světa, rychlost chůze nebo gravitaci lze změnit níže.
// =====================================================================
import * as THREE from 'three';
import { vytvorTlacitko, vytvorPanel, pozadiPanelu } from '../ui.js';

const NX = 64, NZ = 64, NY = 32, CH = 16, NCX = NX / CH, NCZ = NZ / CH, MORE = 9;
const KLIC = 'vr-skola-kostkov-v1';
const STUL = { y: 0.78, z: -0.9, meritko: 1.2 / NX };   // stůl se světem širokým 1,2 m
const RYCHLOST = 2.6, GRAVITACE = 20, SKOK = 7, OTOCENI = Math.PI / 6;
const SIRKA = 0.3, VYSKA = 1.6;                             // hráč v blocích (1 blok = 1 m)

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
const PALETA = [TRAVA, HLINA, KAMEN, PISEK, KMEN, LISTI, PRKNA, CIHLY, SKLO];

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
const TS = 16, DLAZDIC = 16;
function vytvorAtlas() {
  const atlas = document.createElement('canvas'); atlas.width = TS * DLAZDIC; atlas.height = TS;
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
  napovedaPC: 'Kostičkový svět na stole. Levým tlačítkem blok vytěžíš, pravým položíš, klávesami 1–9 nebo v paletě vlevo vybereš blok. Táhnutím myši otáčíš pohled. Do světa se dá vstoupit jen v brýlích.',

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
    try {
      const s = JSON.parse(localStorage.getItem(KLIC) || 'null');
      if (s && s.seed) { seed = s.seed; zmeny = new Map(s.zmeny || []); } else seed = (Math.random() * 1e9) | 0;
    } catch (e) { seed = (Math.random() * 1e9) | 0; }
    let ulozCas = 0;
    const uloz = () => {
      clearTimeout(ulozCas);
      ulozCas = setTimeout(() => { try { localStorage.setItem(KLIC, JSON.stringify({ seed, zmeny: [...zmeny] })); } catch (e) {} }, 300);
    };

    function strom(x, y, z) {
      const h = 4 + Math.floor(hash(x, z, seed + 3) * 2);
      for (let i = 0; i < h; i++) setRaw(x, y + i, z, KMEN);
      const vrch = y + h;
      for (let dy = -2; dy <= 1; dy++) {
        const r = dy >= 0 ? 1 : 2;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || hash(x + dx, z + dz, seed + dy) < .5)) continue;
          if (get(x + dx, vrch + dy, z + dz) === A) setRaw(x + dx, vrch + dy, z + dz, LISTI);
        }
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
      for (let z = 3; z < NZ - 3; z++) for (let x = 3; x < NX - 3; x++) {
        const h = vysky[z * NX + x];
        if (get(x, h, z) === TRAVA && hash(x, z, seed + 7) < .016) strom(x, h + 1, z);
      }
      for (const [k, id] of zmeny) { const [x, y, z] = k.split(',').map(Number); setRaw(x, y, z, id); }
    }

    // ---------- scéna: svet (otáčení, měřítko) > mapa (posun) > kusy světa ----------
    const svet = new THREE.Group(), mapa = new THREE.Group();
    svet.add(mapa); koren.add(svet);

    const tex = new THREE.CanvasTexture(vytvorAtlas());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const matPevny = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true });
    const matPruhl = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });

    const kusy = [];
    function postavKus(cx, cz) {
      const out = [{ p: [], u: [], c: [], i: [] }, { p: [], u: [], c: [], i: [] }];
      const e = .002;
      for (let y = 0; y < NY; y++) for (let z = cz * CH; z < cz * CH + CH; z++) for (let x = cx * CH; x < cx * CH + CH; x++) {
        const id = svetData[idx(x, y, z)]; if (!id) continue;
        const def = BL[id], pr = !!def.pruhl, o = out[pr ? 1 : 0];
        for (const f of STENY) {
          const sous = get(x + f.d[0], y + f.d[1], z + f.d[2]);
          const ukaz = pr ? (!sous || (sous !== id && BL[sous].pruhl)) : (!sous || BL[sous].pruhl);
          if (!ukaz) continue;
          const t = def.t[f.k], n = o.p.length / 3, st = f.s * f.s;   // stín v lineárních barvách
          const nizsi = id === VODA && get(x, y + 1, z) !== VODA;
          for (const [px, py, pz, ux, uy] of f.c) {
            o.p.push(x + px, y + (py && nizsi ? .88 : py), z + pz);
            o.u.push((t + (ux ? 1 - e : e)) / DLAZDIC, uy ? 1 - e : e);
            o.c.push(st, st, st);
          }
          o.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
        }
      }
      const slot = kusy[cx + cz * NCX] || (kusy[cx + cz * NCX] = [null, null]);
      out.forEach((o, k) => {
        if (slot[k]) { mapa.remove(slot[k]); slot[k].geometry.dispose(); slot[k] = null; }
        if (!o.i.length) return;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
        g.setIndex(o.i); g.computeBoundingSphere();
        const m = new THREE.Mesh(g, k ? matPruhl : matPevny);
        if (k) m.renderOrder = 1;
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
    generuj(); postavVse();

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

    // ---------- paleta bloků ----------
    const paleta = new THREE.Group();
    let vybrany = 0;
    const hlavicka = vytvorPanel(0.56, 0.08, 768);
    pozadiPanelu(hlavicka.ctx, hlavicka.c.width, hlavicka.c.height);
    hlavicka.ctx.fillStyle = '#ffd36b';
    hlavicka.ctx.font = 'bold 60px system-ui, sans-serif';
    hlavicka.ctx.textBaseline = 'middle';
    hlavicka.ctx.fillText('Kostkov · vyber blok', 36, hlavicka.c.height / 2 + 2);
    hlavicka.t.needsUpdate = true;
    hlavicka.mesh.position.y = 0.22;
    paleta.add(hlavicka.mesh);

    const tlBloky = PALETA.map((id, i) => {
      const b = vytvorTlacitko(BL[id].n, '', 0.17, 0.06, () => vyberBlok(i), { pismo: 92, akcent: BL[id].barva });
      b.position.set((i % 3 - 1) * 0.185, 0.13 - Math.floor(i / 3) * 0.07, 0);
      paleta.add(b);
      return b;
    });
    function vyberBlok(i) {
      vybrany = (i + PALETA.length) % PALETA.length;
      tlBloky.forEach((b, k) => { b.userData.aktivni = k === vybrany; b.userData.kresli(); });
    }
    const tlRezim = vytvorTlacitko('', '', 0.54, 0.1, () => {
      if (rezim === 'stul') { if (renderer.xr.isPresenting) vstup(); }
      else nastavRezim('stul');
    }, { pismo: 34, podpismo: 22, akcent: '#f2b544' });
    tlRezim.position.set(0, -0.11, 0);
    let potvrzeni = false;
    const tlNovy = vytvorTlacitko('Nový svět', '', 0.54, 0.06, () => {
      if (!potvrzeni) { potvrzeni = true; tlNovy.userData.text = 'Opravdu? Stavby se smažou'; tlNovy.userData.kresli(); return; }
      potvrzeni = false; tlNovy.userData.text = 'Nový svět'; tlNovy.userData.kresli();
      seed = (Math.random() * 1e9) | 0; zmeny = new Map();
      generuj(); postavVse(); uloz();
      if (rezim === 'uvnitr') { najdiZem(NX / 2, NZ / 2); H.vel.set(0, 0, 0); }
    }, { pismo: 30, naStred: true });
    tlNovy.position.set(0, -0.205, 0);
    paleta.add(tlRezim, tlNovy);
    const tlacitkaPalety = [...tlBloky, tlRezim, tlNovy];
    koren.add(paleta);

    function popisRezimu() {
      if (rezim === 'stul') {
        tlRezim.userData.text = 'Vstoupit do světa';
        tlRezim.userData.podtext = renderer.xr.isPresenting ? 'kam míříš paprskem, tam se objevíš' : 'funguje jen v brýlích';
      } else {
        tlRezim.userData.text = 'Zpět ke stavebnici';
        tlRezim.userData.podtext = 'svět se zase zmenší na stůl';
      }
      tlRezim.userData.kresli();
    }

    // ---------- přepínání režimů ----------
    let mlha = null;
    function nastavRezim(r) {
      rezim = r;
      if (r === 'stul') {
        svet.scale.setScalar(STUL.meritko);
        svet.position.set(0, STUL.y, STUL.z);
        svet.rotation.y = otoceniStolu;
        mapa.position.set(-NX / 2, 0, -NZ / 2);
        scene.fog = null;
        podstavec.visible = podlaha.visible = true;
        if (paleta.parent !== koren) { paleta.parent?.remove(paleta); koren.add(paleta); }
        paleta.scale.setScalar(1);
        paleta.position.set(-0.75, 1.12, -0.45);
        paleta.lookAt(0, 1.3, 0.3);
      } else {
        svet.scale.setScalar(1);
        svet.position.set(0, 0, 0);
        podstavec.visible = podlaha.visible = false;
        mlha = mlha || new THREE.Fog(NEBE, 22, 56);
        scene.fog = mlha;
      }
      popisRezimu();
    }
    let posledniMireni = null;   // blok, na který se naposledy mířilo
    function vstup() {
      const cil = posledniMireni;
      najdiZem(cil ? cil.x : NX / 2, cil ? cil.z : NZ / 2);
      H.vel.set(0, 0, 0);
      otoceni = 0;
      nastavRezim('uvnitr');
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
      const max = rezim === 'stul' ? 220 : 7;
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
      nastavBlok(x, y, z, PALETA[vybrany]);
    }

    // ---------- PC: myš a klávesy ----------
    const el = renderer.domElement;
    let stisk = null, mysXY = null;
    const priDolu = (e) => { stisk = { x: e.clientX, y: e.clientY, b: e.button }; };
    const priNahoru = (e) => {
      if (!stisk || renderer.xr.isPresenting) return;
      const b = stisk.b, posun = Math.hypot(e.clientX - stisk.x, e.clientY - stisk.y);
      stisk = null;
      if (posun > 5) return;                                  // bylo to táhnutí
      const ray = paprsekMysi(e.clientX, e.clientY).clone();
      if (mirisNaPaletu(ray)) return;                         // tlačítka obslouží jádro
      const h = trefBlok(ray);
      if (b === 2) poloz(h); else if (b === 0) vytez(h);
    };
    const priPohybu = (e) => { mysXY = [e.clientX, e.clientY]; };
    const priKlavese = (e) => { const n = +e.key; if (n >= 1 && n <= 9) vyberBlok(n - 1); };
    el.addEventListener('pointerdown', priDolu);
    el.addEventListener('pointerup', priNahoru);
    el.addEventListener('pointermove', priPohybu);
    window.addEventListener('keydown', priKlavese);

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
          if (nove('X', tlAX)) vyberBlok(vybrany - 1);
          if (rezim === 'uvnitr' && Math.hypot(osaX, osaY) > 0.15) {
            camera.getWorldDirection(vpred); vpred.y = 0; vpred.normalize();
            vpravo.set(-vpred.z, 0, vpred.x);
            pohyb.copy(vpred).multiplyScalar(-osaY).addScaledVector(vpravo, osaX).applyAxisAngle(OSA_Y, -otoceni);
            const k = RYCHLOST * Math.min(1, Math.hypot(osaX, osaY));
            if (pohyb.lengthSq() > 0) pohyb.normalize().multiplyScalar(k);
            jdu = Math.hypot(osaX, osaY);
          } else if (rezim === 'uvnitr') pohyb.set(0, 0, 0);
        } else if (ruka === 'right') {
          if (nove('A', tlAX)) vyberBlok(vybrany + 1);
          const doStran = Math.abs(osaX) > 0.7 ? Math.sign(osaX) : 0;
          if (nove('otoc' + doStran, doStran !== 0) && doStran) {
            if (rezim === 'uvnitr') otoc(-doStran * OTOCENI);
            else { otoceniStolu -= doStran * OTOCENI; svet.rotation.y = otoceniStolu; }
          }
          if (doStran === 0) { drzeno.set('otoc1', false); drzeno.set('otoc-1', false); }
          if (rezim === 'uvnitr' && osaY < -0.7 && H.zem) H.vel.y = SKOK;
        }
      }
      return jdu;
    }

    function fyzika(dt) {
      const voda = get(Math.floor(H.pos.x), Math.floor(H.pos.y + .4), Math.floor(H.pos.z)) === VODA;
      const k = voda ? 0.55 : 1;
      const zrychleni = Math.min(1, dt * (H.zem ? 12 : 4));
      H.vel.x += (pohyb.x * k - H.vel.x) * zrychleni;
      H.vel.z += (pohyb.z * k - H.vel.z) * zrychleni;
      if (voda) { H.vel.y -= 6 * dt; H.vel.y = Math.max(H.vel.y, -2.5); }
      else { H.vel.y -= GRAVITACE * dt; H.vel.y = Math.max(H.vel.y, -30); }
      posunVodorovne('x', H.vel.x * dt);
      posunVodorovne('z', H.vel.z * dt);
      H.zem = false;
      if (posunOsa('y', H.vel.y * dt)) { if (H.vel.y < 0) H.zem = true; H.vel.y = 0; }
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
    vyberBlok(0);
    let bylVR = false, vinetaSila = 0;

    return {
      koren,
      cile: () => tlacitkaPalety,
      kamera: { pozice: [0.3, 1.9, 0.9], cil: [0, 0.85, -0.9] },

      priPusteni(o) {                                   // spoušť puštěna = vytěžit
        if (!o) return;                                 // PC obsluhují vlastní posluchače
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
        const vVR = renderer.xr.isPresenting;
        if (vVR !== bylVR) { bylVR = vVR; if (!vVR && rezim === 'uvnitr') nastavRezim('stul'); else popisRezimu(); }

        let jdu = 0;
        if (vVR) jdu = ovladaniVR(dt);
        if (rezim === 'uvnitr') {
          fyzika(dt);
          prichytPaletuKRuce();
          svet.rotation.y = otoceni;
          mapa.position.set(-H.pos.x, -H.pos.y, -H.pos.z);
        }

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
        } else if (mysXY) {
          h = trefBlok(paprsekMysi(mysXY[0], mysXY[1]));
        }
        obrys.visible = !!h;
        if (h) obrys.position.set(h.x + .5, h.y + .5, h.z + .5);
        if (h && rezim === 'stul') posledniMireni = h;
      },

      zrus() {
        el.removeEventListener('pointerdown', priDolu);
        el.removeEventListener('pointerup', priNahoru);
        el.removeEventListener('pointermove', priPohybu);
        window.removeEventListener('keydown', priKlavese);
        scene.fog = null;
        camera.remove(vineta);
        vineta.geometry.dispose(); vineta.material.map.dispose(); vineta.material.dispose();
        if (kameraPridana) scene.remove(camera);
        if (paleta.parent && paleta.parent !== koren) {
          paleta.parent.remove(paleta);
          paleta.traverse((x) => { x.geometry?.dispose(); x.material?.map?.dispose(); x.material?.dispose(); });
        }
        try { localStorage.setItem(KLIC, JSON.stringify({ seed, zmeny: [...zmeny] })); } catch (e) {}
      },
    };
  },
};
