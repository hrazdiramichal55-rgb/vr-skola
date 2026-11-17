// =====================================================================
//  KOSTKOV – DÍLNA
//  Editor, ve kterém si děti samy navrhnou hru: bloky (i kde se ve světě
//  vyskytují a čím se těží), kytky, stromy, postavičky, zvířata, vlastní
//  postavu a pravidla. Všechno se kreslí a nastavuje myší, bez kódu.
//
//  Návrhy se ukládají v prohlížeči (localStorage) a dají se stáhnout
//  jako soubor .json a nahrát na jiném počítači.
//
//  Čísla (id) předmětů:
//    vlastní bloky 20–59, kytky 60–99, stromy (a jejich sazenice) 100–139
// =====================================================================

import * as zvuky from './kostkov-zvuky.js';

export const KLIC_DILNY = 'vr-skola-kostkov-dilna-v1';
export const ROZSAH = { bloky: [20, 59], kytky: [60, 99], stromy: [100, 139] };

// čím se blok těží a jak silný nástroj je potřeba
export const NASTROJ_TEZBY = { ruka: 'Rukou (nástroj nepotřebuje)', lopata: 'Lopatou', sekera: 'Sekerou', krumpac: 'Krumpáčem' };
export const UROVEN = { drevo: 'Stačí dřevěný', kamen: 'Musí být kamenný' };
export const SILA_UROVNE = { drevo: 2.5, kamen: 5 };
// kde se blok sám objeví ve světě
export const VYSKYT = {
  nikde: 'Nikde – jen na stavění',
  povrch: 'Na povrchu (místo trávy, v ostrůvcích)',
  podzemi: 'V podzemí (jako ruda v kameni)',
  hluboko: 'Hluboko dole u podloží (vzácné)',
};
// staré návrhy měly jen „tvrdost“ jako text
const STARA_TVRDOST = {
  mekky: { nastroj: 'lopata', nutny: false, tvrdost: 0.8 },
  drevo: { nastroj: 'sekera', nutny: false, tvrdost: 2.5 },
  tvrdy: { nastroj: 'krumpac', nutny: true, tvrdost: 6 },
};
export const TVARY = {
  koule: 'Koruna jako koule (listnatý strom)',
  smrk: 'Kužel (jehličnatý strom)',
  palma: 'Palma',
  ker: 'Keř (bez kmene)',
  kaktus: 'Kaktus (jen kmen s rameny)',
};
export const CHOVANI = {
  chodi: 'Chodí sem a tam',
  skace: 'Skáče',
  nasleduje: 'Chodí za hráčem',
  leta: 'Létá',
  stoji: 'Stojí na místě',
};
export const CHOVANI_ZVIRAT = {
  chodi: 'Chodí sem a tam (pase se)',
  skace: 'Skáče',
  utika: 'Utíká před hráčem',
  nasleduje: 'Chodí za hráčem',
  leta: 'Létá',
  stoji: 'Stojí na místě',
};
export const PRAVIDLA = {
  gravitace: { n: 'Gravitace', min: 2, max: 40, krok: 1, vychozi: 20, popis: 'Země 20 · Měsíc 3 · Jupiter 40' },
  skok:      { n: 'Výška skoku', min: 3, max: 20, krok: 0.5, vychozi: 7, popis: 'Čím víc, tím výš skočíš' },
  rychlost:  { n: 'Rychlost chůze', min: 1, max: 10, krok: 0.2, vychozi: 2.6, popis: 'Bloků za sekundu' },
  tezba:     { n: 'Rychlost těžby', min: 0.25, max: 5, krok: 0.25, vychozi: 1, popis: '1 = normální · 5 = superrychlá' },
  srdce:     { n: 'Počet srdíček (životy)', min: 0, max: 20, krok: 1, vychozi: 10, popis: 'Jen v Přežití · ubírá je pád z výšky a voda · 0 = bez životů' },
  delkaDne:  { n: 'Délka dne a noci (minuty)', min: 0, max: 20, krok: 1, vychozi: 6, popis: 'Kolik minut trvá celý den i s nocí · 0 = pořád den' },
};

// ---------- pixely (16 × 16, '' = průhledné) ----------
const nakresli = (fn) => { const px = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px.push(fn(x, y) || ''); return px; };
export const prazdne = () => Array(256).fill('');
const kruh = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

export function prumernaBarva(px, nahradni = '#888888') {
  let r = 0, g = 0, b = 0, n = 0;
  for (const c of px) if (c) { r += parseInt(c.slice(1, 3), 16); g += parseInt(c.slice(3, 5), 16); b += parseInt(c.slice(5, 7), 16); n++; }
  if (!n) return nahradni;
  const h = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

// ---------- ukázkové návrhy, aby Dílna nebyla prázdná ----------
export function vychoziDilna() {
  return {
    verze: 1,
    bloky: [
      { id: 20, n: 'Březová kůra', nastroj: 'sekera', nutny: false, uroven: 'drevo', tvrdost: 2.5, vyskyt: 'nikde', cetnost: 0, zvuk: 'drevo',
        px: nakresli((x, y) => ((y * 7 + x * 3) % 13 === 0 || (y % 6 === 2 && x % 7 < 3)) ? '#2b2b2b' : (x + y) % 5 === 0 ? '#d9d6cc' : '#eeebe3') },
      { id: 21, n: 'Lucerna', nastroj: 'ruka', nutny: false, uroven: 'drevo', tvrdost: 0.5, vyskyt: 'nikde', cetnost: 0, zvuk: 'sklo', sviti: true,
        px: nakresli((x, y) => (x < 2 || x > 13 || y < 2 || y > 13 || x === 7 || x === 8 || y === 7 || y === 8) ? '#4a3420'
          : kruh(x, y, 7.5, 7.5, 3.5) ? '#fff4b0' : '#f5c542') },
    ],
    kytky: [
      { id: 60, n: 'Mák', cetnost: 4, px: nakresli((x, y) =>
        kruh(x, y, 7.5, 5, 1.3) ? '#222222' : kruh(x, y, 7.5, 5, 3.6) ? '#d8262a'
          : (y >= 8 && (x === 7 || x === 8)) ? '#3f8a32' : (y === 12 && (x === 5 || x === 6)) || (y === 11 && (x === 9 || x === 10)) ? '#4fa03c' : '') },
      { id: 61, n: 'Pampeliška', cetnost: 5, px: nakresli((x, y) =>
        kruh(x, y, 7.5, 6, 1.4) ? '#e0a800' : kruh(x, y, 7.5, 6, 3.2) ? '#f5d21f'
          : (y >= 9 && (x === 7 || x === 8)) ? '#3f8a32' : (y === 13 && x >= 4 && x <= 6) || (y === 12 && x >= 9 && x <= 11) ? '#4fa03c' : '') },
    ],
    stromy: [
      { id: 100, n: 'Dub', kmen: 5, listi: 6, tvar: 'koule', vyska: 5, cetnost: 5 },
      { id: 101, n: 'Smrk', kmen: 5, listi: 6, tvar: 'smrk', vyska: 7, cetnost: 3 },
      { id: 102, n: 'Bříza', kmen: 20, listi: 6, tvar: 'koule', vyska: 6, cetnost: 3 },
    ],
    postavy: [
      { n: 'Robot Bob', hlava: '#9aa4b0', telo: '#5a6b80', ruce: '#9aa4b0', nohy: '#3a4452',
        velikost: 1, chovani: 'nasleduje', rychlost: 1.6, pocet: 1, hlas: 0.6, rec: 'Ahoj! Jsem Bob z kroužku robotiky.',
        oblicej: nakresli((x, y) => (y >= 5 && y <= 7 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) ? '#4de0ff'
          : (y === 11 && x >= 4 && x <= 11) ? (x % 2 ? '#333333' : '#dddddd') : (x === 0 || x === 15 || y === 0 || y === 15) ? '#6f7884' : '#9aa4b0') },
      { n: 'Skřítek Kras', hlava: '#f0c39a', telo: '#2f7d3a', ruce: '#f0c39a', nohy: '#6b4a2e',
        velikost: 0.7, chovani: 'skace', rychlost: 1.4, pocet: 3, hlas: 1.6, rec: 'Znáš propast Macochu? Je hluboká 138 metrů!',
        oblicej: nakresli((x, y) => y < 3 ? '#2f7d3a' : ((x === 5 || x === 10) && y === 6) ? '#222222'
          : ((x === 7 || x === 8) && y === 8) ? '#d9946a' : y >= 10 && x >= 2 && x <= 13 ? '#eeeeee' : '#f0c39a') },
    ],
    zvirata: [
      { n: 'Ovečka', hlava: '#e8e6df', telo: '#f4f2ea', nohy: '#3a3a3a', velikost: 1, chovani: 'chodi', rychlost: 0.9, pocet: 4, hlas: 1.3, zvuk: 'Bééé!',
        oblicej: nakresli((x, y) => (x < 3 || x > 12 || y < 3) ? '#f4f2ea' : ((x === 5 || x === 10) && y === 7) ? '#222222'
          : (y === 11 && x >= 6 && x <= 9) ? '#c48a8a' : '#e8d9c8') },
      { n: 'Prasátko', hlava: '#f2a6b4', telo: '#f2a6b4', nohy: '#d98896', velikost: 0.8, chovani: 'utika', rychlost: 1.6, pocet: 3, hlas: 0.7, zvuk: 'Chro chro!',
        oblicej: nakresli((x, y) => ((x === 4 || x === 11) && y === 5) ? '#222222' : (x >= 5 && x <= 10 && y >= 8 && y <= 12)
          ? (((x === 6 || x === 9) && y === 10) ? '#8a3a4a' : '#e88a9c') : '#f2a6b4') },
      { n: 'Netopýr z Macochy', hlava: '#5a4436', telo: '#4a362a', nohy: '#33241c', velikost: 0.5, chovani: 'leta', rychlost: 2.5, pocet: 3, hlas: 2, zvuk: 'Píp! Bydlím v jeskyni.',
        oblicej: nakresli((x, y) => (y < 3 && (x < 4 || x > 11)) ? '#33241c' : ((x === 5 || x === 10) && y === 7) ? '#ff5a3a'
          : (y === 11 && (x === 6 || x === 9)) ? '#ffffff' : '#5a4436') },
    ],
    hrac: { n: 'Já', hlava: '#f0c39a', telo: '#2f6fd6', ruce: '#f0c39a', nohy: '#333333', velikost: 1,
      oblicej: nakresli((x, y) => ((x === 5 || x === 10) && (y === 6 || y === 7)) ? '#222222'
        : (y === 11 && x >= 5 && x <= 10) || (y === 10 && (x === 4 || x === 11)) ? '#b04040' : y < 2 ? '#6b4a2e' : '#f0c39a') },
    pravidla: Object.fromEntries(Object.entries(PRAVIDLA).map(([k, p]) => [k, p.vychozi])),
  };
}

// doplní chybějící části (starší nebo ručně upravený soubor)
export function opravDilnu(d) {
  const v = vychoziDilna();
  if (!d || typeof d !== 'object') return v;
  const pole = (a) => Array.isArray(a) ? a : [];
  const px = (p) => Array.isArray(p) && p.length === 256 ? p.map((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : '') : prazdne();
  const cislo = (x, min, max, vych) => Number.isFinite(+x) ? Math.min(max, Math.max(min, +x)) : vych;
  const text = (t, vych, max = 40) => typeof t === 'string' && t.trim() ? t.slice(0, max) : vych;
  const barva = (c, vych) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : vych;
  return {
    verze: 1,
    bloky: pole(d.bloky).filter((b) => b.id >= 20 && b.id <= 59).map((b) => {
      const stara = STARA_TVRDOST[b.tvrdost];
      return { id: b.id | 0, n: text(b.n, 'Blok'), px: px(b.px),
        nastroj: NASTROJ_TEZBY[b.nastroj] ? b.nastroj : stara?.nastroj || 'ruka',
        nutny: typeof b.nutny === 'boolean' ? b.nutny : !!stara?.nutny,
        uroven: UROVEN[b.uroven] ? b.uroven : 'drevo',
        tvrdost: cislo(stara ? stara.tvrdost : b.tvrdost, 0.2, 10, 1),
        vyskyt: VYSKYT[b.vyskyt] ? b.vyskyt : 'nikde', cetnost: cislo(b.cetnost, 0, 10, 3),
        sviti: !!b.sviti,
        zvuk: zvuky.MATERIALY[b.zvuk] ? b.zvuk : ({ krumpac: 'kamen', sekera: 'drevo', lopata: 'trava' })[NASTROJ_TEZBY[b.nastroj] ? b.nastroj : stara?.nastroj] || 'kamen' };
    }),
    kytky: pole(d.kytky).filter((b) => b.id >= 60 && b.id <= 99).map((b) => ({ id: b.id | 0, n: text(b.n, 'Kytka'), cetnost: cislo(b.cetnost, 0, 10, 3), px: px(b.px) })),
    stromy: pole(d.stromy).filter((s) => s.id >= 100 && s.id <= 139).map((s) => ({
      id: s.id | 0, n: text(s.n, 'Strom'), kmen: s.kmen | 0, listi: s.listi | 0, tvar: TVARY[s.tvar] ? s.tvar : 'koule',
      vyska: cislo(s.vyska, 2, 10, 5), cetnost: cislo(s.cetnost, 0, 10, 3) })),
    postavy: pole(d.postavy).slice(0, 12).map((p) => ({
      n: text(p.n, 'Postavička'), hlava: barva(p.hlava, '#f0c39a'), telo: barva(p.telo, '#2f6fd6'), ruce: barva(p.ruce, '#f0c39a'),
      nohy: barva(p.nohy, '#333333'), velikost: cislo(p.velikost, 0.4, 2.5, 1), chovani: CHOVANI[p.chovani] ? p.chovani : 'chodi',
      rychlost: cislo(p.rychlost, 0.3, 5, 1.5), pocet: cislo(p.pocet, 0, 10, 2) | 0, hlas: cislo(p.hlas, 0.3, 2, 1), rec: typeof p.rec === 'string' ? p.rec.slice(0, 80) : '',
      oblicej: px(p.oblicej) })),
    zvirata: (Array.isArray(d.zvirata) ? d.zvirata : v.zvirata).slice(0, 12).map((p) => ({
      n: text(p.n, 'Zvíře'), hlava: barva(p.hlava, '#c08850'), telo: barva(p.telo, '#c08850'), nohy: barva(p.nohy, '#6b4a2e'),
      velikost: cislo(p.velikost, 0.3, 2.5, 1), chovani: CHOVANI_ZVIRAT[p.chovani] ? p.chovani : 'chodi',
      rychlost: cislo(p.rychlost, 0.3, 5, 1.2), pocet: cislo(p.pocet, 0, 10, 3) | 0, hlas: cislo(p.hlas, 0.3, 2, 1), zvuk: typeof p.zvuk === 'string' ? p.zvuk.slice(0, 60) : '',
      oblicej: px(p.oblicej) })),
    hrac: (() => { const h = d.hrac && typeof d.hrac === 'object' ? d.hrac : v.hrac; return {
      n: text(h.n, 'Já', 24), hlava: barva(h.hlava, '#f0c39a'), telo: barva(h.telo, '#2f6fd6'), ruce: barva(h.ruce, '#f0c39a'),
      nohy: barva(h.nohy, '#333333'), velikost: cislo(h.velikost, 0.5, 1.5, 1), oblicej: px(h.oblicej) }; })(),
    pravidla: Object.fromEntries(Object.entries(PRAVIDLA).map(([k, p]) => [k, cislo(d.pravidla?.[k], p.min, p.max, p.vychozi)])),
  };
}

export function nactiDilnu() {
  try { const t = localStorage.getItem(KLIC_DILNY); if (t) return opravDilnu(JSON.parse(t)); } catch (e) {}
  return vychoziDilna();
}
export function ulozDilnu(d) { try { localStorage.setItem(KLIC_DILNY, JSON.stringify(d)); } catch (e) {} }

// ---------- tvar stromu: seznam buněk [dx, dy, dz, 'k' = kmen | 'l' = listí] ----------
export function bunkyStromu(druh, nahoda = () => 0.5) {
  const out = [], K = (x, y, z) => out.push([x, y, z, 'k']), L = (x, y, z) => out.push([x, y, z, 'l']);
  const h = Math.round(druh.vyska) + (nahoda() < 0.5 ? 0 : 1);
  switch (druh.tvar) {
    case 'smrk': {
      for (let y = 0; y < h; y++) K(0, y, 0);
      for (let y = 2; y <= h; y++) {
        const r = Math.min(3, Math.floor((h + 1 - y) / 2));
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r && (dx || dz)) L(dx, y, dz);
      }
      L(0, h, 0); L(0, h + 1, 0);
      break;
    }
    case 'palma': {
      for (let y = 0; y < h; y++) K(0, y, 0);
      L(0, h, 0);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { L(a, h, b); L(2 * a, h, 2 * b); L(3 * a, h - 1, 3 * b); }
      for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) L(a, h, b);
      break;
    }
    case 'ker': {
      const r = h >= 5 ? 2 : 1;
      for (let y = 0; y <= r; y++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz + (y * 1.3) ** 2 > r * r + 0.8) continue;
        L(dx, y, dz);
      }
      break;
    }
    case 'kaktus': {
      for (let y = 0; y < h; y++) K(0, y, 0);
      if (h >= 4) { K(1, 2, 0); K(2, 2, 0); K(2, 3, 0); K(-1, 3, 0); K(-2, 3, 0); K(-2, 4, 0); }
      break;
    }
    default: {   // koule
      for (let y = 0; y < h; y++) K(0, y, 0);
      const r = h >= 7 ? 3 : 2;
      for (let dy = -r; dy <= 1; dy++) {
        const rr = dy >= 0 ? r - 1 : r;
        for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
          if (Math.abs(dx) === rr && Math.abs(dz) === rr && (dy === 1 || nahoda() < 0.5)) continue;
          if (!dx && !dz && dy < 0) continue;
          L(dx, h + dy, dz);
        }
      }
    }
  }
  return out;
}

// =====================================================================
//  EDITOR (HTML okno přes celou obrazovku, jen na PC)
// =====================================================================
const BARVY = ['#000000', '#3a3a3a', '#7a7a7a', '#bfbfbf', '#ffffff', '#7a4a22', '#a8742f', '#d9b07a', '#f0c39a', '#d8262a',
  '#f2742b', '#f5d21f', '#7ecf3a', '#3f8a32', '#1f5c2a', '#4de0ff', '#2f6fd6', '#1d3a8a', '#9b4dd8', '#f28ab2'];

const CSS = `
.kd{position:fixed;inset:0;z-index:50;background:rgba(6,10,20,.72);display:grid;place-items:center;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;padding:12px;box-sizing:border-box}
.kd *{box-sizing:border-box}
.kd [hidden]{display:none!important}
.kd-okno{width:min(1100px,100%);height:min(760px,100%);background:#0c162c;border:3px solid #3d5a88;border-radius:18px;display:flex;flex-direction:column;overflow:hidden}
.kd-hlava{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:2px solid #22355a;flex-wrap:wrap}
.kd-hlava h2{margin:0;font-size:24px;color:#ffd36b;margin-right:auto}
.kd button{font:inherit;font-size:15px;font-weight:600;color:#fff;background:#1c2c4a;border:2px solid #3d5a88;border-radius:10px;padding:8px 14px;cursor:pointer}
.kd button:hover{background:#2a4470;border-color:#8fc3ff}
.kd button.kd-hlavni{background:#2f6fd6;border-color:#bfe0ff}
.kd button.kd-pozor{border-color:#ff8080}
.kd button:focus-visible,.kd input:focus-visible,.kd select:focus-visible{outline:3px solid #ffd36b;outline-offset:2px}
.kd-taby{display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap}
.kd-taby button{border-radius:10px 10px 0 0;border-bottom:none;font-size:17px;padding:10px 18px}
.kd-taby button.on{background:#2f6fd6;border-color:#bfe0ff}
.kd-telo{flex:1;display:grid;grid-template-columns:230px 1fr;min-height:0;border-top:2px solid #22355a}
.kd-seznam{border-right:2px solid #22355a;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
.kd-polozka{display:flex;align-items:center;gap:10px;text-align:left;width:100%}
.kd-polozka.on{background:#2f6fd6;border-color:#bfe0ff}
.kd-polozka canvas,.kd-ikona{width:32px;height:32px;image-rendering:pixelated;border-radius:4px;flex:none;background:repeating-conic-gradient(#2a3550 0 25%,#1c2640 0 50%) 0 0/8px 8px}
.kd-editor{overflow:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;min-width:0}
.kd-radek{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
.kd-pole{display:flex;flex-direction:column;gap:6px;min-width:220px;flex:1}
.kd-pole label,.kd-nadpis{font-size:15px;color:#9fd4ff;font-weight:600}
.kd-pole small{color:#9fb3cc;font-size:13px}
.kd input[type=text],.kd select{font:inherit;font-size:16px;color:#fff;background:#08101f;border:2px solid #3d5a88;border-radius:8px;padding:8px 10px;width:100%}
.kd input[type=range]{width:100%;accent-color:#ffd36b}
.kd input[type=checkbox]{width:28px;height:28px;accent-color:#ffd36b;cursor:pointer}
.kd select:disabled,.kd input:disabled{opacity:.45;cursor:not-allowed}
.kd input[type=color]{width:56px;height:40px;border:2px solid #3d5a88;border-radius:8px;background:#08101f;padding:2px;cursor:pointer}
.kd-hodnota{color:#ffd36b;font-variant-numeric:tabular-nums;white-space:nowrap;min-width:64px}
.kd-kresleni{display:flex;gap:14px;flex-wrap:wrap}
.kd-platno{width:320px;height:320px;image-rendering:pixelated;cursor:crosshair;border:3px solid #3d5a88;border-radius:6px;touch-action:none;background:repeating-conic-gradient(#3a4560 0 25%,#2a3550 0 50%) 0 0/20px 20px;max-width:100%}
.kd-nastroje{display:flex;flex-direction:column;gap:8px;max-width:260px}
.kd-barvy{display:grid;grid-template-columns:repeat(5,40px);gap:6px}
.kd-barvy button{width:40px;height:40px;padding:0;border-radius:8px}
.kd-barvy button.on{outline:3px solid #ffd36b;outline-offset:1px}
.kd-skupina{display:flex;gap:6px;flex-wrap:wrap}
.kd-skupina button.on{background:#2f6fd6;border-color:#bfe0ff}
.kd-nahled{border:2px solid #22355a;border-radius:8px;background:#8ec5e6;image-rendering:pixelated}
.kd-tip{background:#14223f;border-left:4px solid #ffd36b;padding:10px 14px;border-radius:6px;color:#dbe8ff;font-size:15px;line-height:1.45}
.kd-pata{display:flex;gap:10px;flex-wrap:wrap;padding:12px 16px;border-top:2px solid #22355a;align-items:center}
.kd-pata .kd-zprava{margin-left:auto;color:#7dffb0;font-size:14px}
@media (max-width:760px){.kd-telo{grid-template-columns:1fr}.kd-seznam{flex-direction:row;overflow-x:auto;border-right:none;border-bottom:2px solid #22355a}.kd-polozka{width:auto;white-space:nowrap}}
`;

function ikona(px, barvaPozadi) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const ctx = c.getContext('2d');
  if (barvaPozadi) { ctx.fillStyle = barvaPozadi; ctx.fillRect(0, 0, 16, 16); }
  px.forEach((b, i) => { if (b) { ctx.fillStyle = b; ctx.fillRect(i % 16, i >> 4, 1, 1); } });
  return c;
}

// Kreslení po pixelech: štětec, guma, kyblík
function pixelEditor(px, { pruhledne, priZmene }) {
  const obal = document.createElement('div'); obal.className = 'kd-kresleni';
  const c = document.createElement('canvas'); c.width = c.height = 16; c.className = 'kd-platno';
  const ctx = c.getContext('2d');
  let barva = px.find(Boolean) || '#d8262a', nastroj = 'stetec';
  const kresli = () => { ctx.clearRect(0, 0, 16, 16); px.forEach((b, i) => { if (b) { ctx.fillStyle = b; ctx.fillRect(i % 16, i >> 4, 1, 1); } }); };
  const bod = (e) => {
    const r = c.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / r.width * 16), Math.floor((e.clientY - r.top) / r.height * 16)];
  };
  const hodnota = () => nastroj === 'guma' ? (pruhledne ? '' : '#ffffff') : barva;
  function vypln(x, y) {
    const puvodni = px[y * 16 + x], nova = hodnota();
    if (puvodni === nova) return;
    const fronta = [[x, y]];
    while (fronta.length) {
      const [a, b] = fronta.pop();
      if (a < 0 || b < 0 || a > 15 || b > 15 || px[b * 16 + a] !== puvodni) continue;
      px[b * 16 + a] = nova;
      fronta.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
  }
  let kreslim = false;
  const tah = (e) => {
    const [x, y] = bod(e); if (x < 0 || y < 0 || x > 15 || y > 15) return;
    if (nastroj === 'kyblik') vypln(x, y); else px[y * 16 + x] = hodnota();
    kresli(); priZmene();
  };
  c.addEventListener('pointerdown', (e) => { kreslim = true; c.setPointerCapture(e.pointerId); tah(e); });
  c.addEventListener('pointermove', (e) => { if (kreslim && nastroj !== 'kyblik') tah(e); });
  c.addEventListener('pointerup', () => { kreslim = false; });
  c.addEventListener('contextmenu', (e) => e.preventDefault());

  const panel = document.createElement('div'); panel.className = 'kd-nastroje';
  const nadpis = (t) => { const d = document.createElement('div'); d.className = 'kd-nadpis'; d.textContent = t; return d; };
  const nastrojeEl = document.createElement('div'); nastrojeEl.className = 'kd-skupina';
  const tlNastroje = [['stetec', 'Štětec'], ['kyblik', 'Kyblík'], ['guma', pruhledne ? 'Guma' : 'Bílá guma']].map(([k, t]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.onclick = () => { nastroj = k; tlNastroje.forEach((x) => x.classList.toggle('on', x === b)); };
    if (k === nastroj) b.classList.add('on');
    nastrojeEl.append(b); return b;
  });
  const barvyEl = document.createElement('div'); barvyEl.className = 'kd-barvy';
  const vlastni = document.createElement('input'); vlastni.type = 'color'; vlastni.value = barva; vlastni.title = 'Vlastní barva';
  const tlBarvy = BARVY.map((b) => {
    const t = document.createElement('button'); t.type = 'button'; t.style.background = b; t.title = b; t.setAttribute('aria-label', 'Barva ' + b);
    t.onclick = () => { barva = b; vlastni.value = b; oznac(); if (nastroj === 'guma') tlNastroje[0].click(); };
    barvyEl.append(t); return t;
  });
  const oznac = () => tlBarvy.forEach((t) => t.classList.toggle('on', t.title === barva));
  vlastni.oninput = () => { barva = vlastni.value; oznac(); if (nastroj === 'guma') tlNastroje[0].click(); };
  oznac();
  const radekVlastni = document.createElement('div'); radekVlastni.className = 'kd-skupina';
  radekVlastni.append(vlastni);
  const tlVymazat = document.createElement('button'); tlVymazat.type = 'button'; tlVymazat.textContent = pruhledne ? 'Vymazat vše' : 'Vybarvit vše';
  tlVymazat.onclick = () => { px.fill(pruhledne ? '' : barva); kresli(); priZmene(); };
  radekVlastni.append(tlVymazat);
  panel.append(nadpis('Nástroj'), nastrojeEl, nadpis('Barva'), barvyEl, radekVlastni);
  obal.append(c, panel);
  kresli();
  return obal;
}

// pole formuláře
function pole(popis, prvek, napoveda) {
  const p = document.createElement('div'); p.className = 'kd-pole';
  const l = document.createElement('label'); l.textContent = popis;
  const id = 'kd-' + Math.random().toString(36).slice(2, 8);
  prvek.id = id; l.htmlFor = id;
  p.append(l, prvek);
  if (napoveda) { const s = document.createElement('small'); s.textContent = napoveda; p.append(s); }
  return p;
}
function textovePole(obj, klic, max, priZmene) {
  const i = document.createElement('input'); i.type = 'text'; i.maxLength = max; i.value = obj[klic];
  i.oninput = () => { obj[klic] = i.value.slice(0, max) || ''; priZmene(); };
  return i;
}
function posuvnik(obj, klic, min, max, krok, priZmene, format = (v) => v) {
  const obal = document.createElement('div');
  const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = krok; i.value = obj[klic];
  const h = document.createElement('span'); h.className = 'kd-hodnota'; h.textContent = format(obj[klic]);
  i.oninput = () => { obj[klic] = +i.value; h.textContent = format(+i.value); priZmene(); };
  obal.append(i, h);
  obal.style.cssText = 'display:flex;gap:10px;align-items:center';
  obal.input = i;
  return obal;
}
function vyber(obj, klic, moznosti, priZmene, cislo = false) {
  const s = document.createElement('select');
  for (const [v, t] of moznosti) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); }
  s.value = obj[klic];
  s.onchange = () => { obj[klic] = cislo ? +s.value : s.value; priZmene(); };
  return s;
}
function tlacitkoPrehrat(text, akce) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = '▶ ' + text;
  b.onclick = () => { zvuky.odemkni(); setTimeout(akce, 30); };
  return b;
}
function barvaPole(obj, klic, priZmene) {
  const i = document.createElement('input'); i.type = 'color'; i.value = obj[klic];
  i.oninput = () => { obj[klic] = i.value; priZmene(); };
  return i;
}

// Otevře Dílnu. zakladniBloky = [{ id, n, barva }] bloků ze hry (pro výběr kmene a listí).
// priZavreni(dilna, { novySvet }) se zavolá po zavření.
export function otevriDilnu({ dilna, zakladniBloky, priZavreni }) {
  const root = document.createElement('div'); root.className = 'kd';
  root.innerHTML = `<style>${CSS}</style>
    <div class="kd-okno" role="dialog" aria-label="Dílna Kostkova">
      <div class="kd-hlava"><h2>Dílna Kostkova</h2>
        <button type="button" data-a="stahnout">Stáhnout soubor</button>
        <button type="button" data-a="nahrat">Nahrát soubor</button>
        <input type="file" accept=".json,application/json" hidden>
      </div>
      <div class="kd-taby"></div>
      <div class="kd-telo"><div class="kd-seznam"></div><div class="kd-editor"></div></div>
      <div class="kd-pata">
        <button type="button" class="kd-hlavni" data-a="hrat">Hrát s mými návrhy</button>
        <button type="button" data-a="novy">Vyzkoušet v novém světě</button>
        <span class="kd-zprava" aria-live="polite"></span>
      </div>
    </div>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const taby = $('.kd-taby'), seznam = $('.kd-seznam'), editor = $('.kd-editor'), zprava = $('.kd-zprava');

  const TABY = [['bloky', 'Bloky'], ['kytky', 'Kytky'], ['stromy', 'Stromy'], ['postavy', 'Postavičky'], ['zvirata', 'Zvířata'], ['ja', 'Moje postava'], ['pravidla', 'Pravidla']];
  let tab = 'bloky';
  const vybrane = { bloky: 0, kytky: 0, stromy: 0, postavy: 0, zvirata: 0 };

  let ulozCas = 0;
  const zmena = () => {
    clearTimeout(ulozCas);
    ulozCas = setTimeout(() => { ulozDilnu(dilna); zprava.textContent = 'Uloženo'; }, 300);
    obnovIkony();
  };
  const oznam = (t) => { zprava.textContent = t; };

  // ---- taby ----
  for (const [k, t] of TABY) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.tab = k;
    b.onclick = () => { tab = k; vykresli(); };
    taby.append(b);
  }

  const vsechnyBloky = () => [
    ...zakladniBloky,
    ...dilna.bloky.map((b) => ({ id: b.id, n: b.n + ' (tvůj)', barva: prumernaBarva(b.px) })),
  ];
  const barvaBloku = (id) => vsechnyBloky().find((b) => b.id === id)?.barva || '#888888';

  function noveId(druh) {
    const [od, do_] = ROZSAH[druh];
    const pouzite = new Set(dilna[druh].map((x) => x.id));
    for (let i = od; i <= do_; i++) if (!pouzite.has(i)) return i;
    return null;
  }

  function ikonaPolozky(druh, x) {
    if (druh === 'bloky') return ikona(x.px, '#ffffff');
    if (druh === 'kytky') return ikona(x.px);
    if (druh === 'postavy' || druh === 'zvirata') return ikona(x.oblicej, x.hlava);
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const ctx = c.getContext('2d');
    nakresliStrom(ctx, x, 16, 16, 1.4);
    return c;
  }
  function obnovIkony() {
    seznam.querySelectorAll('[data-i]').forEach((b) => {
      const x = dilna[tab]?.[+b.dataset.i]; if (!x) return;
      b.querySelector('canvas').replaceWith(ikonaPolozky(tab, x));
      b.querySelector('span').textContent = x.n;
    });
  }

  // boční pohled na strom (pro náhled a ikonu)
  function nakresliStrom(ctx, s, W, H, vel) {
    ctx.clearRect(0, 0, W, H);
    const bunky = bunkyStromu(s, () => 0.3).filter((b) => b[2] === 0 || b[3] === 'l');
    const k = barvaBloku(s.kmen), l = s.listi ? barvaBloku(s.listi) : null;
    const st = vel, x0 = W / 2 - st / 2, y0 = H - st;
    for (const pass of ['l', 'k']) for (const [dx, dy, , t] of bunky) {
      if (t !== pass) continue;
      if (t === 'l' && !l) continue;
      ctx.fillStyle = t === 'k' ? k : l;
      ctx.fillRect(Math.round(x0 + dx * st), Math.round(y0 - dy * st), Math.ceil(st), Math.ceil(st));
    }
  }

  function vykresli() {
    taby.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    seznam.innerHTML = ''; editor.innerHTML = '';
    if (tab === 'pravidla' || tab === 'ja') {
      seznam.hidden = true; editor.parentElement.style.gridTemplateColumns = '1fr';
      if (tab === 'pravidla') editorPravidel(); else editorPostavy(dilna.hrac, true);
      return;
    }
    seznam.hidden = false; editor.parentElement.style.gridTemplateColumns = '';
    const polozky = dilna[tab];
    if (vybrane[tab] >= polozky.length) vybrane[tab] = polozky.length - 1;
    polozky.forEach((x, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kd-polozka'; b.dataset.i = i;
      if (i === vybrane[tab]) b.classList.add('on');
      const sp = document.createElement('span'); sp.textContent = x.n;
      b.append(ikonaPolozky(tab, x), sp);
      b.onclick = () => { vybrane[tab] = i; vykresli(); };
      seznam.append(b);
    });
    const NAZVY_NOVYCH = { bloky: '+ Nový blok', kytky: '+ Nová kytka', stromy: '+ Nový strom', postavy: '+ Nová postavička', zvirata: '+ Nové zvíře' };
    const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = NAZVY_NOVYCH[tab];
    plus.onclick = () => pridej();
    seznam.append(plus);
    const x = polozky[vybrane[tab]];
    if (!x) { editor.innerHTML = '<div class="kd-tip">Zatím tu nic není. Klikni vlevo na tlačítko se znaménkem plus a navrhni první.</div>'; return; }
    ({ bloky: editorBloku, kytky: editorKytky, stromy: editorStromu, postavy: (p) => editorPostavy(p, false), zvirata: editorZvirete })[tab](x);
    editor.append(tlacitkoSmazat(x));
  }

  function pridej() {
    let nova;
    if (tab === 'postavy') {
      if (dilna.postavy.length >= 12) { oznam('Víc než 12 postaviček se nevejde.'); return; }
      nova = { n: 'Nová postavička', hlava: '#f0c39a', telo: '#2f6fd6', ruce: '#f0c39a', nohy: '#333333', velikost: 1, chovani: 'chodi', rychlost: 1.5, pocet: 2, hlas: 1, rec: '',
        oblicej: nakresli((x, y) => ((x === 5 || x === 10) && (y === 6 || y === 7)) ? '#222222' : (y === 11 && x >= 5 && x <= 10) ? '#b04040' : '#f0c39a') };
    } else if (tab === 'zvirata') {
      if (dilna.zvirata.length >= 12) { oznam('Víc než 12 zvířat se nevejde.'); return; }
      nova = { n: 'Nové zvíře', hlava: '#c08850', telo: '#c08850', nohy: '#6b4a2e', velikost: 1, chovani: 'chodi', rychlost: 1.2, pocet: 3, hlas: 1, zvuk: '',
        oblicej: nakresli((x, y) => ((x === 4 || x === 11) && y === 6) ? '#222222' : (y >= 10 && x >= 6 && x <= 9) ? '#8a5a30' : '#c08850') };
    } else {
      const id = noveId(tab);
      if (id === null) { oznam('Víc už se jich nevejde.'); return; }
      if (tab === 'bloky') nova = { id, n: 'Můj blok', nastroj: 'ruka', nutny: false, uroven: 'drevo', tvrdost: 1, vyskyt: 'nikde', cetnost: 3, zvuk: 'trava', px: Array(256).fill('#7ecf3a') };
      if (tab === 'kytky') nova = { id, n: 'Moje kytka', cetnost: 3, px: prazdne() };
      if (tab === 'stromy') nova = { id, n: 'Můj strom', kmen: 5, listi: 6, tvar: 'koule', vyska: 5, cetnost: 3 };
    }
    dilna[tab].push(nova);
    vybrane[tab] = dilna[tab].length - 1;
    zmena(); vykresli();
  }

  function tlacitkoSmazat(x) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'kd-pozor'; b.textContent = 'Smazat „' + x.n + '“';
    b.style.alignSelf = 'flex-start';
    let jiste = false;
    b.onclick = () => {
      if (!jiste) { jiste = true; b.textContent = 'Opravdu smazat? Klikni znovu'; return; }
      dilna[tab].splice(dilna[tab].indexOf(x), 1);
      zmena(); vykresli();
    };
    return b;
  }

  const tip = (t) => { const d = document.createElement('div'); d.className = 'kd-tip'; d.textContent = t; return d; };
  const radek = (...deti) => { const r = document.createElement('div'); r.className = 'kd-radek'; r.append(...deti); return r; };

  function editorBloku(b) {
    const nutny = document.createElement('input'); nutny.type = 'checkbox'; nutny.checked = b.nutny;
    const uroven = vyber(b, 'uroven', Object.entries(UROVEN), zmena);
    const cetnost = posuvnik(b, 'cetnost', 0, 10, 1, zmena, (v) => v === 0 ? 'vůbec' : v + ' z 10');
    const obnov = () => {
      const ruka = b.nastroj === 'ruka';
      nutny.disabled = ruka; if (ruka) { nutny.checked = false; b.nutny = false; }
      uroven.disabled = ruka || !b.nutny;
      cetnost.input.disabled = b.vyskyt === 'nikde';
    };
    nutny.onchange = () => { b.nutny = nutny.checked; zmena(); obnov(); };
    const sviti = document.createElement('input'); sviti.type = 'checkbox'; sviti.checked = !!b.sviti;
    sviti.onchange = () => { b.sviti = sviti.checked; zmena(); };
    editor.append(
      tip('Nakresli, jak bude blok vypadat (stejný obrázek je na všech stranách kostky). Pak vyber, čím se těží a kde se ve světě sám objeví.'),
      radek(pole('Název bloku', textovePole(b, 'n', 24, zmena)),
        pole('Kde se vyskytuje ve světě', vyber(b, 'vyskyt', Object.entries(VYSKYT), () => { zmena(); obnov(); }), 'Projeví se v novém světě'),
        pole('Jak často', cetnost)),
      radek(pole('Čím se těží', vyber(b, 'nastroj', Object.entries(NASTROJ_TEZBY), () => { zmena(); obnov(); })),
        pole('Bez toho nástroje to nejde', nutny, 'Zaškrtni, když se má těžit jen nástrojem'),
        pole('Jak silný nástroj', uroven, 'Platí, jen když bez nástroje to nejde')),
      radek(pole('Jak dlouho se těží', posuvnik(b, 'tvrdost', 0.2, 10, 0.1, zmena, (v) => v.toFixed(1).replace('.', ',') + ' s rukou'),
        'Dřevěný nástroj to zrychlí 2,5×, kamenný 5×'),
        pole('Svítí ve tmě', sviti, 'V noci zůstane jasný, třeba lucerna'),
        pole('Jaký dělá zvuk', vyber(b, 'zvuk', Object.entries(zvuky.MATERIALY), () => { zmena(); zvuky.odemkni(); setTimeout(() => zvuky.rozbiti(b.zvuk), 30); })),
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.justifyContent = 'flex-end'; d.style.minWidth = '0'; d.style.flex = '0';
          d.append(tlacitkoPrehrat('Poslechnout', () => zvuky.rozbiti(b.zvuk))); return d; })()),
      pixelEditor(b.px, { pruhledne: false, priZmene: zmena }),
    );
    obnov();
  }
  function editorKytky(k) {
    editor.append(
      tip('Nakresli kytku. Kde nic nenakreslíš, bude průhledno. Kytka vyroste na trávě sama, nebo ji zasadíš z palety.'),
      radek(pole('Název kytky', textovePole(k, 'n', 24, zmena)),
        pole('Jak často roste', posuvnik(k, 'cetnost', 0, 10, 1, zmena, (v) => v === 0 ? 'vůbec' : v + ' z 10'), 'Projeví se v novém světě')),
      pixelEditor(k.px, { pruhledne: true, priZmene: zmena }),
    );
  }
  function editorStromu(s) {
    const moznostiBloku = vsechnyBloky().map((b) => [b.id, b.n]);
    const nahled = document.createElement('canvas'); nahled.width = 220; nahled.height = 220; nahled.className = 'kd-nahled';
    const prekresli = () => { const ctx = nahled.getContext('2d'); ctx.fillStyle = '#8ec5e6'; ctx.fillRect(0, 0, 220, 220); ctx.fillStyle = '#62a043'; ctx.fillRect(0, 205, 220, 15); ctx.save(); ctx.translate(0, -15); nakresliStrom(ctx, s, 220, 220, 15); ctx.restore(); };
    const z = () => { zmena(); prekresli(); };
    editor.append(
      tip('Vyber, z čeho je kmen a listí, jaký tvar má koruna a jak je strom vysoký. Sazenici najdeš v paletě v režimu Tvoření.'),
      radek(
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.flex = '2';
          d.append(
            pole('Název stromu', textovePole(s, 'n', 24, zmena)),
            pole('Kmen', vyber(s, 'kmen', moznostiBloku, z, true)),
            pole('Listí', vyber(s, 'listi', [[0, 'Žádné listí'], ...moznostiBloku], z, true)),
            pole('Tvar', vyber(s, 'tvar', Object.entries(TVARY), z)),
            pole('Výška', posuvnik(s, 'vyska', 2, 10, 1, z, (v) => v + ' bloků')),
            pole('Jak často roste', posuvnik(s, 'cetnost', 0, 10, 1, zmena, (v) => v === 0 ? 'vůbec' : v + ' z 10'), 'Projeví se v novém světě'),
          ); return d; })(),
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.flex = '0'; const l = document.createElement('div'); l.className = 'kd-nadpis'; l.textContent = 'Náhled ze strany'; d.append(l, nahled); return d; })(),
      ),
    );
    prekresli();
  }
  function editorPostavy(p, jeHrac) {
    const nahled = document.createElement('canvas'); nahled.width = 180; nahled.height = 300; nahled.className = 'kd-nahled';
    const prekresli = () => {
      const ctx = nahled.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#8ec5e6'; ctx.fillRect(0, 0, 180, 300); ctx.fillStyle = '#62a043'; ctx.fillRect(0, 280, 180, 20);
        const s = 70 * Math.min(1.5, p.velikost) / 0.9, cx = 90, zem = 280;
      const box = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x * s), Math.round(zem - (y + h) * s), Math.round(w * s), Math.round(h * s)); };
      box(-0.25, 0, 0.23, 0.6, p.nohy); box(0.02, 0, 0.23, 0.6, p.nohy);
      box(-0.25, 0.6, 0.5, 0.65, p.telo);
      box(-0.43, 0.65, 0.18, 0.6, p.ruce); box(0.25, 0.65, 0.18, 0.6, p.ruce);
      ctx.drawImage(ikona(p.oblicej, p.hlava), Math.round(cx - 0.25 * s), Math.round(zem - 1.75 * s), Math.round(0.5 * s), Math.round(0.5 * s));
    };
    const z = () => { zmena(); prekresli(); };
    const obliceje = pixelEditor(p.oblicej, { pruhledne: false, priZmene: z });
    editor.append(
      jeHrac
        ? tip('Tohle jsi ty! Na PC se uvidíš, když ve světě stiskneš V (pohled zezadu). Na stole stojíš tam, kde jsi byl naposledy. Velikost mění i to, jak jsi vysoký: malý projde nízkou chodbou, velký dosáhne výš.')
        : tip('Nakresli obličej a vyber barvy. Postavičky se objeví ve světě a chodí po něm. Když k nim přijdeš blíž, promluví.'),
      jeHrac ? radek(pole('Moje jméno', textovePole(p, 'n', 24, zmena), 'Ukáže se nad tebou na stole'))
        : radek(pole('Jméno', textovePole(p, 'n', 24, zmena)), pole('Co říká', textovePole(p, 'rec', 80, zmena), 'Ukáže se, když k ní přijdeš blízko')),
      radek(
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.flex = '2';
          const l = document.createElement('div'); l.className = 'kd-nadpis'; l.textContent = 'Obličej (přední strana hlavy)';
          d.append(l, obliceje); return d; })(),
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.flex = '0';
          const l = document.createElement('div'); l.className = 'kd-nadpis'; l.textContent = 'Náhled'; d.append(l, nahled); return d; })(),
      ),
      radek(
        pole('Hlava', barvaPole(p, 'hlava', z)), pole('Tělo', barvaPole(p, 'telo', z)),
        pole('Ruce', barvaPole(p, 'ruce', z)), pole('Nohy', barvaPole(p, 'nohy', z)),
      ),
      ...(jeHrac ? [radek(pole('Velikost', posuvnik(p, 'velikost', 0.5, 1.5, 0.1, z, (v) => v.toFixed(1) + '×')))] : [
        radek(
          pole('Co dělá', vyber(p, 'chovani', Object.entries(CHOVANI), zmena)),
          pole('Velikost', posuvnik(p, 'velikost', 0.4, 2.5, 0.1, z, (v) => v.toFixed(1) + '×')),
        ),
        radek(
          pole('Rychlost', posuvnik(p, 'rychlost', 0.3, 5, 0.1, zmena, (v) => v.toFixed(1))),
          pole('Kolik jich bude ve světě', posuvnik(p, 'pocet', 0, 10, 1, zmena, (v) => String(v))),
        ),
        radek(
          pole('Výška hlasu', posuvnik(p, 'hlas', 0.3, 2, 0.1, zmena, (v) => v < 0.8 ? 'hluboký' : v > 1.4 ? 'pištivý' : 'normální'), 'Postavička řekne svou větu nahlas'),
          (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.justifyContent = 'flex-end';
            d.append(tlacitkoPrehrat('Poslechnout hlas', () => zvuky.rekni(p.rec || p.n, p.hlas))); return d; })(),
        )]),
    );
    editor.querySelectorAll('.kd-pole').forEach((x) => { if (x.querySelector('input[type=color]')) x.style.minWidth = '90px'; });
    prekresli();
  }
  function editorZvirete(p) {
    const nahled = document.createElement('canvas'); nahled.width = 240; nahled.height = 180; nahled.className = 'kd-nahled';
    const prekresli = () => {
      const ctx = nahled.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#8ec5e6'; ctx.fillRect(0, 0, 240, 180); ctx.fillStyle = '#62a043'; ctx.fillRect(0, 165, 240, 15);
      const s = 110 * Math.min(1.6, p.velikost), cx = 110, zem = 165;
      const box = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x * s), Math.round(zem - (y + h) * s), Math.round(w * s), Math.round(h * s)); };
      // pohled z boku: zadní a přední nohy, trup, ocásek, hlava vpravo
      box(-0.38, 0, 0.15, 0.45, p.nohy); box(0.23, 0, 0.15, 0.45, p.nohy);
      box(-0.45, 0.43, 0.9, 0.45, p.telo);
      box(-0.55, 0.7, 0.1, 0.1, p.telo);
      ctx.drawImage(ikona(p.oblicej, p.hlava), Math.round(cx + 0.38 * s), Math.round(zem - 1.05 * s), Math.round(0.4 * s), Math.round(0.4 * s));
      if (p.chovani === 'leta') { box(-0.2, 0.88, 0.4, 0.06, p.nohy); box(-0.1, 0.94, 0.2, 0.12, p.nohy); }
    };
    const z = () => { zmena(); prekresli(); };
    editor.append(
      tip('Nakresli zvířeti obličej a vyber barvy. Zvířata chodí po trávě a ozvou se, když k nim přijdeš. Létající zvíře dostane křídla.'),
      radek(pole('Jméno', textovePole(p, 'n', 24, zmena)), pole('Jaký vydává zvuk', textovePole(p, 'zvuk', 60, zmena), 'Třeba „Bú!“ nebo „Haf haf!“')),
      radek(
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.flex = '2';
          const l = document.createElement('div'); l.className = 'kd-nadpis'; l.textContent = 'Obličej (přední strana hlavy)';
          d.append(l, pixelEditor(p.oblicej, { pruhledne: false, priZmene: z })); return d; })(),
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.flex = '0';
          const l = document.createElement('div'); l.className = 'kd-nadpis'; l.textContent = 'Náhled z boku'; d.append(l, nahled); return d; })(),
      ),
      radek(pole('Hlava', barvaPole(p, 'hlava', z)), pole('Tělo', barvaPole(p, 'telo', z)), pole('Nohy (a křídla)', barvaPole(p, 'nohy', z))),
      radek(
        pole('Co dělá', vyber(p, 'chovani', Object.entries(CHOVANI_ZVIRAT), z)),
        pole('Velikost', posuvnik(p, 'velikost', 0.3, 2.5, 0.1, z, (v) => v.toFixed(1) + '×')),
      ),
      radek(
        pole('Rychlost', posuvnik(p, 'rychlost', 0.3, 5, 0.1, zmena, (v) => v.toFixed(1))),
        pole('Kolik jich bude ve světě', posuvnik(p, 'pocet', 0, 10, 1, zmena, (v) => String(v))),
      ),
      radek(
        pole('Výška hlasu', posuvnik(p, 'hlas', 0.3, 2, 0.1, zmena, (v) => v < 0.8 ? 'hluboký' : v > 1.4 ? 'pištivý' : 'normální')),
        (() => { const d = document.createElement('div'); d.className = 'kd-pole'; d.style.justifyContent = 'flex-end';
          d.append(tlacitkoPrehrat('Poslechnout zvuk', () => zvuky.rekni(p.zvuk || p.n, p.hlas))); return d; })(),
      ),
    );
    editor.querySelectorAll('.kd-pole').forEach((x) => { if (x.querySelector('input[type=color]')) x.style.minWidth = '90px'; });
    prekresli();
  }
  function editorPravidel() {
    editor.append(tip('Pravidla platí pro celou hru. Vyzkoušej třeba Měsíc: gravitace 3 a skok 4. Změny se projeví hned po návratu do hry.'));
    for (const [k, def] of Object.entries(PRAVIDLA)) {
      const pos = posuvnik(dilna.pravidla, k, def.min, def.max, def.krok, zmena, (v) => String(+(+v).toFixed(2)).replace('.', ','));
      editor.append(pole(def.n, pos, def.popis));
    }
    const zpet = document.createElement('button'); zpet.type = 'button'; zpet.textContent = 'Vrátit původní pravidla'; zpet.style.alignSelf = 'flex-start';
    zpet.onclick = () => { for (const [k, def] of Object.entries(PRAVIDLA)) dilna.pravidla[k] = def.vychozi; zmena(); vykresli(); };
    editor.append(zpet);
  }

  // ---- soubory ----
  const vstupSouboru = root.querySelector('input[type=file]');
  root.querySelector('[data-a=stahnout]').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dilna, null, 1)], { type: 'application/json' }));
    a.download = 'kostkov-dilna.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    oznam('Soubor kostkov-dilna.json je stažený.');
  };
  root.querySelector('[data-a=nahrat]').onclick = () => vstupSouboru.click();
  vstupSouboru.onchange = async () => {
    const f = vstupSouboru.files[0]; if (!f) return;
    try {
      const nova = opravDilnu(JSON.parse(await f.text()));
      Object.keys(dilna).forEach((k) => delete dilna[k]);
      Object.assign(dilna, nova);
      ulozDilnu(dilna);
      oznam('Návrhy ze souboru jsou nahrané.');
      vykresli();
    } catch (e) { oznam('Tenhle soubor neumím přečíst. Je to soubor stažený z Dílny?'); }
    vstupSouboru.value = '';
  };

  // ---- zavření ----
  let novyJiste = false;
  const zavri = (novySvet) => {
    clearTimeout(ulozCas); ulozDilnu(dilna);
    window.removeEventListener('keydown', priKlavese, true);
    root.remove();
    priZavreni(dilna, { novySvet });
  };
  root.querySelector('[data-a=hrat]').onclick = () => zavri(false);
  const tlNovy = root.querySelector('[data-a=novy]');
  tlNovy.onclick = () => {
    if (!novyJiste) { novyJiste = true; tlNovy.textContent = 'Stavby v tomto světě se smažou. Klikni znovu'; tlNovy.classList.add('kd-pozor'); return; }
    zavri(true);
  };
  // klávesy patří Dílně, ne hře (psaní názvů); Esc = zpět do hry
  const priKlavese = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) zavri(false);
  };
  window.addEventListener('keydown', priKlavese, true);

  vykresli();
  return () => zavri(false);
}
