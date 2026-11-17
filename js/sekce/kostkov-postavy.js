// =====================================================================
//  KOSTKOV – POSTAVIČKY
//  Kostičkové postavičky navržené v Dílně. Chodí po světě podle
//  zvoleného chování: chodí, skáče, chodí za hráčem, létá, stojí.
//  Všechno je v souřadnicích světa (1 = jeden blok).
// =====================================================================
import * as THREE from 'three';
import { stitek } from '../ui.js';

function texturaObliceje(px, pozadi) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = pozadi; ctx.fillRect(0, 0, 16, 16);
  px.forEach((b, i) => { if (b) { ctx.fillStyle = b; ctx.fillRect(i % 16, i >> 4, 1, 1); } });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
// barva ztmavená podle strany kostky (scéna nemá světla)
const odstin = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
function kvadr(w, h, d, barva, materialy) {
  const m = materialy || [0.8, 0.8, 1, 0.55, 0.9, 0.7].map((k) => new THREE.MeshBasicMaterial({ color: odstin(barva, k) }));
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  return mesh;
}

// Sestaví zvíře na čtyřech nohách (nebo s křídly, když létá). Dívá se ve směru +z.
export function sestavZvire(def) {
  const g = new THREE.Group();
  const telo = new THREE.Group(); g.add(telo);
  const s = def.velikost;
  telo.scale.setScalar(s);
  const noha = (x, z) => {
    const p = new THREE.Group(); p.position.set(x, 0.45, z);
    const k = kvadr(0.15, 0.45, 0.15, def.nohy); k.position.y = -0.225; p.add(k);
    telo.add(p); return p;
  };
  // pořadí: levá přední, pravá přední, levá zadní, pravá zadní
  const nohy = [noha(-0.17, 0.3), noha(0.17, 0.3), noha(-0.17, -0.3), noha(0.17, -0.3)];
  const trup = kvadr(0.5, 0.45, 0.9, def.telo); trup.position.y = 0.65; telo.add(trup);
  const ocas = kvadr(0.1, 0.1, 0.15, def.telo); ocas.position.set(0, 0.78, -0.52); telo.add(ocas);
  const tex = texturaObliceje(def.oblicej, def.hlava);
  const mHlava = [0.8, 0.8, 1, 0.55].map((k) => new THREE.MeshBasicMaterial({ color: odstin(def.hlava, k) }));
  const hlava = kvadr(0.4, 0.4, 0.4, def.hlava, [...mHlava, new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ color: odstin(def.hlava, 0.7) })]);
  hlava.position.set(0, 0.85, 0.58); telo.add(hlava);
  const kridla = [];
  if (def.chovani === 'leta') {
    for (const strana of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(0.25 * strana, 0.82, 0);
      const k = kvadr(0.6, 0.05, 0.5, def.nohy); k.position.x = 0.3 * strana; p.add(k);
      telo.add(p); kridla.push(p);
    }
  }
  g.userData = { nohy, ruce: [], kridla, hlava, vyska: 1.05 * s, zvire: true };
  return g;
}

// Sestaví postavičku. Dívá se ve směru +z.
export function sestavPostavu(def) {
  const g = new THREE.Group();
  const telo = new THREE.Group(); g.add(telo);
  const s = def.velikost;
  telo.scale.setScalar(s);
  const kloub = (x, y, w, h, barva) => {     // ruka nebo noha otáčená v rameni / kyčli
    const p = new THREE.Group(); p.position.set(x, y, 0);
    const k = kvadr(w, h, w, barva); k.position.y = -h / 2; p.add(k);
    telo.add(p); return p;
  };
  const nohy = [kloub(-0.13, 0.6, 0.23, 0.6, def.nohy), kloub(0.13, 0.6, 0.23, 0.6, def.nohy)];
  const trup = kvadr(0.5, 0.65, 0.28, def.telo); trup.position.y = 0.925; telo.add(trup);
  const ruce = [kloub(-0.34, 1.25, 0.18, 0.6, def.ruce), kloub(0.34, 1.25, 0.18, 0.6, def.ruce)];
  const tex = texturaObliceje(def.oblicej, def.hlava);
  const mHlava = [0.8, 0.8, 1, 0.55].map((k) => new THREE.MeshBasicMaterial({ color: odstin(def.hlava, k) }));
  const hlava = kvadr(0.5, 0.5, 0.5, def.hlava, [...mHlava, new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ color: odstin(def.hlava, 0.7) })]);
  hlava.position.y = 1.5; telo.add(hlava);
  g.userData = { nohy, ruce, kridla: [], hlava, vyska: 1.75 * s };
  return g;
}

// Vytvoří správce postaviček.
//  mapa      – skupina, do které se postavičky přidají (souřadnice v blocích)
//  svetInfo  – { NX, NZ, NY, get(x,y,z), pevne(x,y,z), VODA, TRAVA, hash }
export function vytvorPostavy(mapa, svetInfo) {
  const { NX, NZ, NY, get, pevne, VODA } = svetInfo;
  let seznam = [];

  // výška, na které se stojí v daném sloupci (první volné místo nad nejvyšším pevným blokem pod "y")
  function zem(x, z, odY) {
    const xi = Math.floor(x), zi = Math.floor(z);
    if (xi < 0 || zi < 0 || xi >= NX || zi >= NZ) return null;
    for (let y = Math.min(NY - 1, Math.floor(odY)); y >= 0; y--) if (pevne(xi, y, zi)) return y + 1;
    return 0;
  }
  const voda = (x, y, z) => get(Math.floor(x), Math.floor(y), Math.floor(z)) === VODA;

  function zrus() {
    for (const p of seznam) {
      mapa.remove(p.g);
      p.g.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose(); x.dispose(); }); });
      if (p.bublina) { p.bublina.material.map.dispose(); p.bublina.material.dispose(); }
    }
    seznam = [];
  }

  // rozmístí postavičky na trávu (deterministicky podle seed)
  function rozmisti(defs, seed) {
    zrus();
    let n = 0;
    defs.forEach((def, di) => {
      for (let k = 0; k < def.pocet; k++) {
        let x = NX / 2, z = NZ / 2;
        for (let pokus = 0; pokus < 40; pokus++) {
          const a = svetInfo.hash(di * 31 + k, pokus, seed + 555), b = svetInfo.hash(k * 17 + di, pokus, seed + 777);
          const tx = 4 + a * (NX - 8), tz = 4 + b * (NZ - 8);
          const y = zem(tx, tz, NY - 1);
          if (y !== null && get(Math.floor(tx), y - 1, Math.floor(tz)) === svetInfo.TRAVA) { x = tx; z = tz; break; }   // jen na trávu
        }
        const g = def.zvire ? sestavZvire(def) : sestavPostavu(def);
        mapa.add(g);
        const y = zem(x, z, NY - 1) ?? NY - 2;
        g.position.set(x, y, z);
        seznam.push({ def, g, x, y, z, smer: svetInfo.hash(n, 3, seed) * Math.PI * 2, vy: 0, naZemi: true,
          cas: 0, dalsiOtocka: 1 + k, faze: 0, jde: true, bublina: null, bublinaCas: 0, dalsiRec: 2 + k * 3 });
        n++;
      }
    });
  }

  function rekni(p) {
    if (!p.def.rec) return;
    svetInfo.priReci?.(p.def);
    if (!p.bublina) {
      p.bublina = stitek(p.def.rec, { sirka: 0.9, pismo: 36 });
      p.bublina.material.depthTest = false;
      p.bublina.renderOrder = 5;
      p.g.add(p.bublina);
    }
    p.bublina.position.y = p.g.userData.vyska + 0.6;
    p.bublina.visible = true;
    p.bublinaCas = 3.5;
  }

  // dt = čas snímku, hrac = { x, y, z } v blocích (nebo null), gravitace z pravidel
  function aktualizuj(dt, hrac, gravitace) {
    for (const p of seznam) {
      const d = p.def;
      p.cas += dt;
      let rychlost = d.rychlost;
      // --- kam jít ---
      if (d.chovani === 'stoji') {
        rychlost = 0;
        if (p.cas > p.dalsiOtocka) { p.smer += (Math.random() - 0.5) * 2; p.dalsiOtocka = p.cas + 2 + Math.random() * 3; }
      } else if (d.chovani === 'utika' && hrac && Math.hypot(hrac.x - p.x, hrac.z - p.z) < 5) {
        p.smer = Math.atan2(p.x - hrac.x, p.z - hrac.z) + Math.sin(p.cas * 3) * 0.3;   // pryč od hráče
        rychlost = d.rychlost * 1.6; p.jde = true;
      } else if (d.chovani === 'nasleduje' && hrac) {
        const dx = hrac.x - p.x, dz = hrac.z - p.z, dist = Math.hypot(dx, dz);
        p.smer = Math.atan2(dx, dz);
        if (dist < 2.2) rychlost = 0;
      } else if (p.cas > p.dalsiOtocka) {
        p.jde = Math.random() > 0.25;
        p.smer += (Math.random() - 0.5) * 2.5;
        p.dalsiOtocka = p.cas + 1.5 + Math.random() * 3;
      }
      if (!p.jde && d.chovani !== 'nasleduje') rychlost = 0;

      // --- pohyb po zemi ---
      const krok = rychlost * dt;
      if (krok > 0) {
        const nx = p.x + Math.sin(p.smer) * krok, nz = p.z + Math.cos(p.smer) * krok;
        const okraj = nx < 1 || nz < 1 || nx > NX - 1 || nz > NZ - 1;
        if (d.chovani === 'leta') {
          if (!okraj) { p.x = nx; p.z = nz; } else p.smer += Math.PI;
        } else {
          const cil = okraj ? null : zem(nx, nz, p.y + 1.01);
          if (cil === null || cil - p.y > 1.01 || voda(nx, cil, nz) || voda(nx, cil - 1, nz)) {
            p.smer += Math.PI / 2 + Math.random() * Math.PI;      // zeď, voda nebo okraj → otočit se
          } else {
            p.x = nx; p.z = nz;
            if (cil > p.y + 0.01 && p.naZemi) p.y = cil;         // vyleze na schod
          }
        }
      }

      // --- výška ---
      const podnozi = zem(p.x, p.z, p.y + 0.5) ?? 0;
      if (d.chovani === 'leta') {
        const cilY = podnozi + 3 + Math.sin(p.cas * 1.3) * 0.6;
        p.y += (cilY - p.y) * Math.min(1, dt * 2);
      } else {
        if (d.chovani === 'skace' && p.naZemi && p.cas % 1.1 < dt * 1.5) { p.vy = 5.5; p.naZemi = false; }
        p.vy -= gravitace * dt;
        p.y += p.vy * dt;
        if (p.y <= podnozi) { p.y = podnozi; p.vy = 0; p.naZemi = true; } else if (p.y > podnozi + 0.05) p.naZemi = false;
      }

      // --- vykreslení a animace ---
      p.g.position.set(p.x, p.y, p.z);
      p.g.rotation.y = p.smer;
      const pohyb = krok > 0 || d.chovani === 'leta';
      p.faze += pohyb ? dt * (4 + rychlost * 2) : 0;
      const kyv = pohyb ? Math.sin(p.faze) * 0.6 : 0;
      const { nohy, ruce, kridla } = p.g.userData;
      nohy.forEach((n, i) => { n.rotation.x = (i === 0 || i === 3 ? 1 : -1) * kyv; });   // u zvířat se střídají úhlopříčky
      ruce.forEach((r, i) => { r.rotation.x = (i ? 1 : -1) * kyv; });
      if (d.chovani === 'leta') {
        const mav = Math.sin(p.cas * 10) * 0.7;
        if (ruce.length) { ruce[0].rotation.z = -1.2 - mav * 0.5; ruce[1].rotation.z = 1.2 + mav * 0.5; }
        kridla.forEach((k, i) => { k.rotation.z = (i ? 1 : -1) * mav; });
      }

      // --- řeč, když je hráč blízko ---
      if (hrac && d.rec) {
        const dist = Math.hypot(hrac.x - p.x, hrac.z - p.z, (hrac.y - p.y) * 0.5);
        if (dist < 3.5 && p.cas > p.dalsiRec) { rekni(p); p.dalsiRec = p.cas + 9; }
      }
      if (p.bublina && p.bublinaCas > 0) {
        p.bublinaCas -= dt;
        if (p.bublinaCas <= 0) p.bublina.visible = false;
      }
    }
  }

  return { rozmisti, aktualizuj, zrus, get pocet() { return seznam.length; } };
}
