// =====================================================================
//  SEKCE: Úniková jeskyně (Moravský kras – Ostrov u Macochy)
//
//  Hráč stojí uprostřed jeskyně a svítí si čelovkou (kam se podívá,
//  tam svítí). Kolem něj je šest stanovišť s různými typy úkolů:
//    ▲ krápníkové varhany (zopakovat melodii)
//    ● výpočet stáří krápníku (změřit pravítkem a spočítat)
//    ■ horniny (položit správný kámen do misky)
//    ★ legenda o Macoše (seřadit části pověsti)
//    ♦ netopýři (spočítat je – i mláďata)
//    ✚ propast Macocha (dvě otázky za sebou)
//  Každé vyřešené stanoviště prozradí svůj SYMBOL a ČÍSLO. Zámek u východu
//  ukazuje jen symboly v jiném pořadí – hráč musí čísla správně přiřadit.
//  Za chybu je trest +30 s, za nápovědu +60 s. Na konci se hodnotí čas.
//
//  Texty, čísla a pořadí lze upravit v datech níže.
// =====================================================================
import * as THREE from 'three';
import { vytvorTlacitko, vytvorPanel, pozadiPanelu, zalom, stitek } from '../ui.js';

const SKOLA = 'ZŠ a MŠ Ostrov u Macochy';
const TREST_CHYBA = 30, TREST_NAPOVEDA = 60;

// ---------- Data stanovišť ----------
const VARHANY = { uhel: -50, symbol: 'trojuhelnik', cislo: 7, melodie: [0, 2, 4, 1, 3],
  napoveda: 'Melodie má pět tónů. Krápníky jsou seřazené zleva doprava od nejhlubšího tónu po nejvyšší.' };

const VYPOCET = { uhel: 50, symbol: 'kruh', cislo: 4, vyskaKrapniku: 0.40,
  otazka: 'Představ si, že krápník vpravo za tabulí roste rychlostí 1 cm za 100 let. Změř ho pravítkem, které stojí vedle něj. Kolik TISÍC let rostl?',
  odpovedi: ['0,4', '4', '40', '400'], spravna: 1,
  napoveda: 'Krápník měří 40 cm. Každý centimetr = 100 let. Tisíc let = 1 000 let.' };

const HORNINY = { uhel: 100, symbol: 'ctverec', cislo: 1,
  kameny: [
    { nazev: 'Žula', barva: 0xb59a94, spravny: false },
    { nazev: 'Vápenec', barva: 0xe6e0cf, spravny: true },
    { nazev: 'Čedič', barva: 0x3b3b3e, spravny: false },
    { nazev: 'Pískovec', barva: 0xd9b27c, spravny: false },
  ],
  napoveda: 'Jeskyně vznikají tam, kde voda pomalu rozpouští horninu. Z této horniny se pálí vápno.' };

const LEGENDA = { uhel: -100, symbol: 'hvezda', cislo: 9,
  // ve správném pořadí; na stanovišti se zobrazí zamíchané
  casti: [
    ['Vdovec se znovu oženil.', 'Měl syna z prvního manželství.'],
    ['Macecha nenáviděla svého', 'nevlastního syna.'],
    ['Shodila chlapce do propasti,', 'ten se ale zachytil o strom.'],
    ['Lidé chlapce zachránili', 'a macechu za trest svrhli dolů.'],
  ],
  zamichane: [2, 0, 3, 1],
  napoveda: 'Pověst začíná svatbou a končí trestem pro macechu. Proto se propast jmenuje Macocha.' };

// Netopýři: [úhel ve stupních, výška v metrech, velikost (mládě je menší)]
const NETOPYRI = [[25, 2.7, 1], [78, 1.05, 0.6], [138, 2.9, 1], [200, 2.35, 1], [235, 1.2, 0.6], [322, 2.6, 1]];
const NETOPYRI_ST = { uhel: -150, symbol: 'kosoctverec', cislo: NETOPYRI.length,
  napoveda: 'Dva netopýři jsou mláďata – jsou menší a visí nízko u země. Rozhlédni se dokola i nahoru.' };

const MACOCHA = { uhel: 150, symbol: 'kriz', cislo: 8,
  otazky: [
    { otazka: 'Jak hluboká je propast Macocha?', odpovedi: ['asi 98 m', 'asi 138 m', 'asi 238 m'], spravna: 1 },
    { otazka: 'Co protéká dnem Macochy?', odpovedi: ['Svitava', 'Punkva', 'nic, je suchá'], spravna: 1 },
  ],
  napoveda: 'Macocha je hlubší než 100 metrů. Řeka na dně pokračuje do Punkevních jeskyní, kde se jezdí na lodičkách.' };

// pořadí symbolů na zámku u východu
const PORADI_ZAMKU = ['hvezda', 'trojuhelnik', 'ctverec', 'kosoctverec', 'kruh', 'kriz'];
const BARVY_SYMBOLU = { trojuhelnik: '#ff9f43', kruh: '#4dd0e1', ctverec: '#7dffb0', hvezda: '#ffd36b', kosoctverec: '#ff6b9a', kriz: '#b58cff' };
const KOD = PORADI_ZAMKU.map((s) => [VARHANY, VYPOCET, HORNINY, LEGENDA, NETOPYRI_ST, MACOCHA].find((st) => st.symbol === s).cislo);

// ---------- pomocné funkce ----------
let seed = 7;
const nahoda = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sum = (x, y, z) =>
  0.55 * Math.sin(2.1 * x + 1.3) * Math.sin(1.7 * y + 0.4) * Math.sin(2.3 * z + 2.1) +
  0.30 * Math.sin(5.3 * x + 0.7) * Math.sin(4.1 * y + 1.9) * Math.sin(4.7 * z + 0.3) +
  0.15 * Math.sin(11 * x) * Math.sin(9 * y + 1) * Math.sin(10 * z + 2);

const R_JESKYNE = 4.3, ZPLOSTENI = 0.62, STRED_Y = 1.2;
const strop = (r) => STRED_Y + ZPLOSTENI * Math.sqrt(Math.max(0, R_JESKYNE * R_JESKYNE - r * r));
const bod = (uhel, d, y) => {
  const a = uhel * Math.PI / 180;
  return new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);
};
const minSek = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function kresliSymbol(ctx, typ, cx, cy, r, barva = BARVY_SYMBOLU[typ]) {
  ctx.fillStyle = barva;
  ctx.beginPath();
  if (typ === 'trojuhelnik') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.95, cy + r * 0.75); ctx.lineTo(cx - r * 0.95, cy + r * 0.75); }
  else if (typ === 'kruh') ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  else if (typ === 'ctverec') ctx.rect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
  else if (typ === 'kosoctverec') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.75, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.75, cy); }
  else if (typ === 'hvezda') {
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
  } else if (typ === 'kriz') { const w = r * 0.35; ctx.rect(cx - w, cy - r, 2 * w, 2 * r); ctx.rect(cx - r, cy - w, 2 * r, 2 * w); }
  ctx.closePath();
  ctx.fill();
}

// ---------- zvuk (krápníkové varhany) ----------
let audio = null;
const TONY = [523.25, 587.33, 659.25, 783.99, 880.0];   // pentatonika C–D–E–G–A
function zahrajTon(i) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    for (const [nasobek, hlasitost] of [[1, 0.35], [2.76, 0.08], [5.4, 0.04]]) {   // zvonivý tón
      const osc = audio.createOscillator(), zesil = audio.createGain();
      osc.frequency.value = TONY[i] * nasobek;
      zesil.gain.setValueAtTime(hlasitost, t);
      zesil.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(zesil).connect(audio.destination);
      osc.start(t); osc.stop(t + 1.25);
    }
  } catch { /* zvuk není dostupný – hra jde i bez něj */ }
}

export default {
  id: 'unikovka',
  nazev: 'Úniková jeskyně',
  popis: 'Najdi cestu ven z krasu',
  barva: '#b58cff',
  napovedaPC: 'Táhnutím myši se rozhlížíš po jeskyni. Kolem tebe je šest stanovišť – každé prozradí symbol a číslo. Kód zadáš u východu před sebou. Za chybu je trest +30 s, za nápovědu +60 s.',

  spust(app) {
    seed = 7;
    const koren = new THREE.Group();
    const tlacitka = [];          // objekty s akcí (tlačítka)
    const dalsiCile = [];         // krápníky varhan, kameny
    const resety = [];            // funkce, které vrátí stanoviště do začátku
    let cas = 0, startCas = 0, trest = 0, vyhra = false, otevirani = 0, posledniSekunda = -1;
    app.scene.background = new THREE.Color(0x000000);

    // ---------- světla: slabé rozptýlené + čelovka ----------
    koren.add(new THREE.HemisphereLight(0x8899aa, 0x221a12, 0.35));
    const celovka = new THREE.SpotLight(0xfff1d6, 18, 9, 0.5, 0.55, 1.4);
    celovka.target.position.set(0, 0, -1);
    app.scene.add(app.camera);              // kamera musí být ve scéně, aby svítila i čelovka na ní
    app.camera.add(celovka, celovka.target);

    // ---------- jeskyně ----------
    {
      const geo = new THREE.IcosahedronGeometry(1, 14);
      const poz = geo.attributes.position;
      const barvy = new Float32Array(poz.count * 3);
      const n = new THREE.Vector3();
      for (let i = 0; i < poz.count; i++) {
        n.fromBufferAttribute(poz, i).normalize();
        const s = sum(n.x * 2, n.y * 2, n.z * 2);
        const r = R_JESKYNE + 0.4 * s;
        let y = n.y * r * ZPLOSTENI + STRED_Y;
        const podlaha = y < 0;
        if (podlaha) y = 0.02 * s;
        poz.setXYZ(i, n.x * r, y, n.z * r);
        const svetlost = podlaha ? 0.22 + 0.05 * s : 0.36 + 0.1 * s;
        barvy.set([svetlost * 1.25, svetlost, svetlost * 0.75], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(barvy, 3));
      geo.computeVertexNormals();
      koren.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.BackSide, flatShading: true, roughness: 0.95 })));
    }

    // krápníky na ozdobu – mimo stanoviště a východ
    const krapMat = new THREE.MeshStandardMaterial({ color: 0xcdb89a, roughness: 0.7, flatShading: true });
    const volneUhly = [0, VARHANY.uhel, VYPOCET.uhel, HORNINY.uhel, LEGENDA.uhel, NETOPYRI_ST.uhel, MACOCHA.uhel];
    const blizko = (a, stred, sirka) => Math.abs(((a * 180 / Math.PI - stred + 540) % 360) - 180) < sirka;
    for (let i = 0; i < 60; i++) {
      const a = nahoda() * Math.PI * 2, r = 2.4 + nahoda() * 1.1;
      const delka = 0.15 + nahoda() * 0.55, sirka = 0.03 + nahoda() * 0.06;
      if (volneUhly.some((u) => blizko(a, u, 19))) continue;
      const k = new THREE.Mesh(new THREE.ConeGeometry(sirka, delka, 7), krapMat);
      const x = Math.sin(a) * r, z = -Math.cos(a) * r;
      if (i % 3 === 0) k.position.set(x, delka / 2, z);
      else { k.rotation.x = Math.PI; k.position.set(x, strop(r) + 0.2 - delka / 2, z); }
      koren.add(k);
    }

    // ---------- společná kostra stanoviště ----------
    function trestej(sekundy) { trest += sekundy; kresliZamek(); }

    function vytvorStanoviste({ uhel, nazev, text, symbol, cislo, napoveda, vyskaPanelu = 0.42 }) {
      const g = new THREE.Group();
      g.position.copy(bod(uhel, 1.7, 1.35));
      g.lookAt(0, 1.35, 0);
      koren.add(g);
      const panel = vytvorPanel(0.62, vyskaPanelu);
      panel.mesh.position.y = 0.08;
      g.add(panel.mesh);
      const st = { g, panel, nazev, text, symbol, cislo, napoveda, vyreseno: false, zprava: '', barvaZpravy: '#cfe3ff', napovedaUkazana: false, vzdyUkazSymbol: false };
      st.kresli = () => {
        const { c, ctx, t } = panel;
        const W = c.width, H = c.height;
        pozadiPanelu(ctx, W, H);
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd36b';
        ctx.font = 'bold 58px system-ui, sans-serif';
        ctx.fillText(st.nazev, 46, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '38px system-ui, sans-serif';
        let y = 112;
        for (const r of zalom(ctx, st.text, W - 92)) { ctx.fillText(r, 46, y); y += 47; }
        y += 10;
        if (st.vyreseno || st.vzdyUkazSymbol) {
          ctx.fillStyle = st.vyreseno ? '#7dffb0' : '#cfe3ff';
          ctx.font = 'bold 42px system-ui, sans-serif';
          const uvod = st.vyreseno ? 'Vyřešeno! Tvůj symbol:' : 'Tvůj symbol:';
          ctx.fillText(uvod, 46, y);
          const x = 46 + ctx.measureText(uvod).width + 46;
          kresliSymbol(ctx, st.symbol, x, y + 22, 26);
          ctx.fillStyle = st.vyreseno ? '#7dffb0' : '#cfe3ff';
          ctx.fillText(st.vyreseno ? `= číslo ${st.cislo}` : '= počet netopýrů', x + 46, y);
          y += 60;
        } else if (st.zprava) {
          ctx.fillStyle = st.barvaZpravy;
          ctx.font = 'bold 40px system-ui, sans-serif';
          for (const r of zalom(ctx, st.zprava, W - 92)) { ctx.fillText(r, 46, y); y += 48; }
          y += 6;
        }
        if (st.napovedaUkazana && !st.vyreseno) {
          ctx.fillStyle = '#ffe9a8';
          ctx.font = 'italic 32px system-ui, sans-serif';
          for (const r of zalom(ctx, 'Nápověda: ' + st.napoveda, W - 92)) { if (y < H - 44) { ctx.fillText(r, 46, y); y += 38; } }
        }
        // symbol stanoviště v rohu – nevyřešené ukazuje jen otazník
        if (!st.vyreseno && !st.vzdyUkazSymbol) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.font = 'bold 70px system-ui, sans-serif';
          ctx.fillText('?', W - 90, 26);
        } else kresliSymbol(ctx, st.symbol, W - 70, 66, 34);
        t.needsUpdate = true;
      };
      st.tlNapoveda = vytvorTlacitko('Nápověda', `+${TREST_NAPOVEDA} s`, 0.15, 0.06, () => {
        if (st.napovedaUkazana || st.vyreseno || vyhra) return;
        st.napovedaUkazana = true;
        trestej(TREST_NAPOVEDA);
        st.kresli();
      }, { pismo: 70, podpismo: 56 });
      st.tlNapoveda.position.set(0.235, 0.08 + vyskaPanelu / 2 + 0.04, 0.004);
      g.add(st.tlNapoveda);
      tlacitka.push(st.tlNapoveda);
      st.vyres = () => { st.vyreseno = true; st.zprava = ''; st.kresli(); };
      st.chyba = (text) => { st.zprava = `${text} (trest +${TREST_CHYBA} s)`; st.barvaZpravy = '#ff8080'; trestej(TREST_CHYBA); st.kresli(); };
      resety.push(() => { st.vyreseno = false; st.zprava = ''; st.napovedaUkazana = false; });
      return st;
    }

    // tlačítka s odpověďmi pod panelem
    function radaOdpovedi(st, odpovedi, akce, y = -0.19) {
      const n = odpovedi.length, sirka = n > 3 ? 0.14 : 0.19, krok = sirka + 0.015;
      return odpovedi.map((text, i) => {
        const b = vytvorTlacitko(text, '', sirka, 0.07, () => akce(i), { pismo: text.length > 9 ? 50 : 72, naStred: true });
        b.position.set((i - (n - 1) / 2) * krok, y, 0.004);
        st.g.add(b);
        tlacitka.push(b);
        return b;
      });
    }

    // =================================================================
    //  ▲ KRÁPNÍKOVÉ VARHANY
    // =================================================================
    const varhany = vytvorStanoviste({
      uhel: VARHANY.uhel, nazev: 'Krápníkové varhany', symbol: VARHANY.symbol, cislo: VARHANY.cislo, napoveda: VARHANY.napoveda,
      text: 'Krápníky nad touto tabulí znějí jako varhany. Stiskni Přehrát, poslouchej a dívej se. Potom melodii zahraj ťukáním na krápníky.',
    });
    const pistaly = [0, 1, 2, 3, 4].map((i) => {
      const p = bod(VARHANY.uhel + (i - 2) * 7, 2.3, 0);
      const spodek = 1.72 + i * 0.09, vrch = strop(2.3) + 0.2;
      const mat = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.5, emissive: 0x000000 });
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.075, vrch - spodek, 10), mat);
      m.rotation.x = Math.PI;
      m.position.set(p.x, (vrch + spodek) / 2, p.z);
      m.userData.ton = i;
      m.userData.zhasni = 0;
      koren.add(m);
      dalsiCile.push(m);
      return m;
    });
    let prehravani = null, zahrano = [];
    function rozsvit(i) { pistaly[i].material.emissive.setHex(0xffb347); pistaly[i].userData.zhasni = 0.35; zahrajTon(i); }
    const tlPrehrat = vytvorTlacitko('Přehrát melodii', '', 0.3, 0.07, () => {
      if (varhany.vyreseno || vyhra) return;
      zahrano = []; prehravani = { krok: 0, cas: 0.4 };
      varhany.zprava = 'Poslouchej…'; varhany.barvaZpravy = '#cfe3ff'; varhany.kresli();
    }, { pismo: 60, naStred: true, akcent: '#ff9f43' });
    tlPrehrat.position.set(0, -0.19, 0.004);
    varhany.g.add(tlPrehrat);
    tlacitka.push(tlPrehrat);

    function tukniNaPistalu(i) {
      rozsvit(i);
      if (varhany.vyreseno || prehravani || vyhra) return;
      zahrano.push(i);
      const k = zahrano.length - 1;
      if (zahrano[k] !== VARHANY.melodie[k]) {
        zahrano = [];
        varhany.chyba('Špatný tón! Pusť si melodii znovu.');
      } else if (zahrano.length === VARHANY.melodie.length) {
        varhany.vyres();
      } else {
        varhany.zprava = `Správně, ${zahrano.length} z ${VARHANY.melodie.length} tónů…`; varhany.barvaZpravy = '#9fd4ff'; varhany.kresli();
      }
    }
    function aktualizujVarhany(dt) {
      for (const p of pistaly) {
        if (p.userData.zhasni > 0 && (p.userData.zhasni -= dt) <= 0) p.material.emissive.setHex(0x000000);
      }
      if (!prehravani) return;
      prehravani.cas -= dt;
      if (prehravani.cas > 0) return;
      if (prehravani.krok < VARHANY.melodie.length) {
        rozsvit(VARHANY.melodie[prehravani.krok++]);
        prehravani.cas = 0.65;
      } else {
        prehravani = null;
        varhany.zprava = 'Teď to zahraj ty – ťukej na krápníky.'; varhany.barvaZpravy = '#cfe3ff'; varhany.kresli();
      }
    }
    resety.push(() => { prehravani = null; zahrano = []; });

    // =================================================================
    //  ● VÝPOČET STÁŘÍ KRÁPNÍKU
    // =================================================================
    const vypocet = vytvorStanoviste({
      uhel: VYPOCET.uhel, nazev: 'Jak starý je krápník?', symbol: VYPOCET.symbol, cislo: VYPOCET.cislo, napoveda: VYPOCET.napoveda,
      text: VYPOCET.otazka, vyskaPanelu: 0.46,
    });
    {
      const g = new THREE.Group();
      g.position.copy(bod(VYPOCET.uhel + 19, 2.0, 0));
      g.lookAt(0, 0, 0);
      koren.add(g);
      const h = VYPOCET.vyskaKrapniku;
      const k = new THREE.Mesh(new THREE.ConeGeometry(0.08, h, 12), krapMat);
      k.position.y = h / 2;
      g.add(k);
      const drevo = new THREE.MeshStandardMaterial({ color: 0xe8c56a, roughness: 0.6 });
      const pravitko = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.01), drevo);
      pravitko.position.set(0.15, 0.31, 0);
      g.add(pravitko);
      const ryska = new THREE.MeshBasicMaterial({ color: 0x111111 });
      for (let cm = 0; cm <= 60; cm += 5) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(cm % 10 ? 0.012 : 0.024, 0.003, 0.002), ryska);
        r.position.set(0.15 - 0.015 + (cm % 10 ? 0.006 : 0.012), cm / 100, 0.006);
        g.add(r);
        if (cm % 10 === 0) {
          const s = stitek(`${cm} cm`, { sirka: 0.13, pismo: 40 });
          s.position.set(0.27, cm / 100, 0);
          g.add(s);
        }
      }
    }
    radaOdpovedi(vypocet, VYPOCET.odpovedi, (i) => {
      if (vypocet.vyreseno || vyhra) return;
      if (i === VYPOCET.spravna) vypocet.vyres();
      else vypocet.chyba('To nesedí. Změř krápník ještě jednou.');
    }, -0.21);

    // =================================================================
    //  ■ HORNINY – položit správný kámen do misky
    // =================================================================
    const horniny = vytvorStanoviste({
      uhel: HORNINY.uhel, nazev: 'Z čeho je kras?', symbol: HORNINY.symbol, cislo: HORNINY.cislo, napoveda: HORNINY.napoveda,
      text: 'Na poličce pod tabulí leží čtyři horniny. Polož do misky tu, ze které vznikl Moravský kras a jeho jeskyně. (V brýlích kámen chyť spouští, na počítači na něj klikni.)',
      vyskaPanelu: 0.46,
    });
    const policka = new THREE.Group();
    policka.position.copy(bod(HORNINY.uhel, 1.4, 0.82));
    policka.lookAt(0, 0.82, 0);
    koren.add(policka);
    {
      const deska = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.2), new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.8 }));
      deska.position.y = -0.02;
      policka.add(deska);
      const noha = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), new THREE.MeshStandardMaterial({ color: 0x5a422c }));
      noha.position.y = -0.42;
      policka.add(noha);
    }
    const miska = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.06, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.7, side: THREE.DoubleSide }));
    miska.position.set(0.33, 0.03, 0);
    policka.add(miska);
    {
      const s = stitek('Miska', { sirka: 0.16, pismo: 40 });
      s.position.set(0.33, 0.15, 0);
      policka.add(s);
    }
    policka.updateMatrixWorld(true);
    const miskaSvet = policka.localToWorld(new THREE.Vector3(0.33, 0.06, 0));
    const kameny = HORNINY.kameny.map((kamen, i) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: kamen.barva, roughness: 0.9, flatShading: true }));
      m.scale.set(1.2, 0.8, 1);
      const domov = policka.localToWorld(new THREE.Vector3(-0.33 + i * 0.15, 0.04, 0));
      m.position.copy(domov);
      koren.add(m);
      const s = stitek(kamen.nazev, { sirka: 0.15, pismo: 40 });
      s.position.copy(domov).add(new THREE.Vector3(0, 0.1, 0));
      koren.add(s);
      const k = { mesh: m, domov, drzi: null, ...kamen };
      m.userData.kamen = k;
      dalsiCile.push(m);
      return k;
    });
    function polozDoMisky(k) {
      if (horniny.vyreseno || vyhra) { k.mesh.position.copy(k.domov); return; }
      if (k.spravny) {
        k.mesh.position.copy(miskaSvet);
        horniny.vyres();
      } else {
        k.mesh.position.copy(k.domov);
        horniny.chyba(`${k.nazev} to není.`);
      }
    }
    resety.push(() => kameny.forEach((k) => { k.mesh.position.copy(k.domov); k.drzi = null; }));

    // =================================================================
    //  ★ LEGENDA O MACOŠE – seřadit části pověsti
    // =================================================================
    const legenda = vytvorStanoviste({
      uhel: LEGENDA.uhel, nazev: 'Legenda o Macoše', symbol: LEGENDA.symbol, cislo: LEGENDA.cislo, napoveda: LEGENDA.napoveda,
      text: 'Pověst o tom, jak propast dostala jméno, se rozsypala. Klikej na její části ve správném pořadí.',
      vyskaPanelu: 0.36,
    });
    let poradiLegendy = [];
    const karty = LEGENDA.zamichane.map((index, i) => {
      const [r1, r2] = LEGENDA.casti[index];
      const b = vytvorTlacitko(r1, r2, 0.3, 0.1, () => klikniNaKartu(index, b), { pismo: 34, podpismo: 34 });
      b.userData.puvodni = r1;
      b.position.set((i % 2 ? 0.158 : -0.158), -0.16 - Math.floor(i / 2) * 0.11, 0.004);
      legenda.g.add(b);
      tlacitka.push(b);
      return b;
    });
    function klikniNaKartu(index, b) {
      if (legenda.vyreseno || vyhra || b.userData.aktivni) return;
      if (index !== poradiLegendy.length) {
        poradiLegendy = [];
        karty.forEach((k) => { k.userData.aktivni = false; k.userData.text = k.userData.puvodni; k.userData.kresli(); });
        legenda.chyba('Tahle část ještě nepřišla na řadu.');
        return;
      }
      poradiLegendy.push(index);
      b.userData.aktivni = true;
      b.userData.text = `${poradiLegendy.length}. ${b.userData.puvodni}`;
      b.userData.kresli();
      if (poradiLegendy.length === LEGENDA.casti.length) legenda.vyres();
      else { legenda.zprava = ''; legenda.kresli(); }
    }
    resety.push(() => {
      poradiLegendy = [];
      karty.forEach((k) => { k.userData.aktivni = false; k.userData.text = k.userData.puvodni; k.userData.kresli(); });
    });

    // =================================================================
    //  ♦ NETOPÝŘI
    // =================================================================
    const netopyriSt = vytvorStanoviste({
      uhel: NETOPYRI_ST.uhel, nazev: 'Netopýři', symbol: NETOPYRI_ST.symbol, cislo: NETOPYRI_ST.cislo, napoveda: NETOPYRI_ST.napoveda,
      text: 'V jeskyni přezimují netopýři. Posviť si čelovkou na stěny i strop a spočítej VŠECHNY – i mláďata. Nebudíme je!',
      vyskaPanelu: 0.36,
    });
    netopyriSt.vzdyUkazSymbol = true;
    const netopyri = [];
    {
      const telo = new THREE.MeshStandardMaterial({ color: 0x4a362a, roughness: 0.9 });
      const kridlo = new THREE.MeshStandardMaterial({ color: 0x33241c, roughness: 0.9, side: THREE.DoubleSide });
      const tvar = new THREE.Shape();
      tvar.moveTo(0, 0); tvar.lineTo(0.11, 0.03); tvar.lineTo(0.08, -0.03);
      tvar.lineTo(0.05, -0.01); tvar.lineTo(0.03, -0.05); tvar.lineTo(0, -0.06);
      const geoKridla = new THREE.ShapeGeometry(tvar);
      for (const [uhel, y, velikost] of NETOPYRI) {
        const r = R_JESKYNE * Math.sqrt(Math.max(0, 1 - ((y - STRED_Y) / (R_JESKYNE * ZPLOSTENI)) ** 2)) * 0.82;
        const n = new THREE.Group();
        n.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.07, 4, 8), telo));
        for (const strana of [-1, 1]) {
          const k = new THREE.Mesh(geoKridla, kridlo);
          k.scale.x = strana;
          k.position.set(0.01 * strana, 0.03, 0.01);
          k.rotation.y = -0.6 * strana;
          k.userData.strana = strana;
          n.add(k);
          const ucho = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 5), telo);
          ucho.position.set(0.015 * strana, -0.07, 0);
          ucho.rotation.x = Math.PI;
          n.add(ucho);
        }
        n.scale.setScalar(velikost);
        n.position.copy(bod(uhel, r, y));
        n.lookAt(0, y, 0);
        koren.add(n);
        netopyri.push(n);
      }
    }

    // =================================================================
    //  ✚ PROPAST MACOCHA – dvě otázky za sebou
    // =================================================================
    const macocha = vytvorStanoviste({
      uhel: MACOCHA.uhel, nazev: 'Propast Macocha', symbol: MACOCHA.symbol, cislo: MACOCHA.cislo, napoveda: MACOCHA.napoveda,
      text: '', vyskaPanelu: 0.42,
    });
    let otazkaMacocha = 0;
    const tlMacocha = radaOdpovedi(macocha, MACOCHA.otazky[0].odpovedi, (i) => {
      if (macocha.vyreseno || vyhra) return;
      if (i !== MACOCHA.otazky[otazkaMacocha].spravna) {
        otazkaMacocha = 0;
        nastavOtazkuMacocha();
        macocha.chyba('Špatně – začni znovu od první otázky.');
        return;
      }
      otazkaMacocha++;
      if (otazkaMacocha === MACOCHA.otazky.length) {
        macocha.text = 'Obě odpovědi jsou správně.';
        macocha.vyres();
      } else {
        nastavOtazkuMacocha();
        macocha.zprava = 'Správně! A teď druhá otázka.'; macocha.barvaZpravy = '#7dffb0';
        macocha.kresli();
      }
    });
    function nastavOtazkuMacocha() {
      const o = MACOCHA.otazky[otazkaMacocha];
      macocha.text = `Otázka ${otazkaMacocha + 1} ze ${MACOCHA.otazky.length}: ${o.otazka}`;
      tlMacocha.forEach((b, i) => { b.userData.text = o.odpovedi[i]; b.userData.kresli(); });
    }
    resety.push(() => { otazkaMacocha = 0; nastavOtazkuMacocha(); });

    const stanoviste = [varhany, vypocet, horniny, legenda, netopyriSt, macocha];

    // =================================================================
    //  VÝCHOD S MŘÍŽÍ
    // =================================================================
    const skalaMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 1, flatShading: true });
    const vychod = new THREE.Group();
    vychod.position.set(0, 0, -3.3);
    koren.add(vychod);
    for (const x of [-0.95, 0.95]) {
      const sloup = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), skalaMat);
      sloup.scale.set(0.42, 1.35, 0.4);
      sloup.position.set(x, 1.1, 0);
      vychod.add(sloup);
    }
    {
      const preklad = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), skalaMat);
      preklad.scale.set(1.3, 0.35, 0.4);
      preklad.position.set(0, 2.35, 0);
      vychod.add(preklad);
      const napis = stitek('VÝCHOD', { sirka: 0.5, pismo: 48 });
      napis.position.set(0, 2.85, 0.3);
      vychod.add(napis);
    }
    const svetloVen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    svetloVen.position.set(0, 1.1, -0.15);
    vychod.add(svetloVen);
    const denniSvetlo = new THREE.PointLight(0xfff3d6, 0, 8, 1.2);
    denniSvetlo.position.set(0, 1.3, 0.3);
    vychod.add(denniSvetlo);
    const mriz = new THREE.Group();
    {
      const kov = new THREE.MeshStandardMaterial({ color: 0x3d3d40, roughness: 0.5, metalness: 0.7 });
      for (let x = -0.54; x <= 0.541; x += 0.12) {
        const tyc = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.2, 8), kov);
        tyc.position.set(x, 1.1, 0.05);
        mriz.add(tyc);
      }
      for (const y of [0.4, 1.1, 1.8]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.03), kov);
        p.position.set(0, y, 0.05);
        mriz.add(p);
      }
      const zamek = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.3 }));
      zamek.position.set(0.3, 1.05, 0.08);
      mriz.add(zamek);
    }
    vychod.add(mriz);

    // =================================================================
    //  ZÁMEK S KÓDEM (před hráčem)
    // =================================================================
    const zamekG = new THREE.Group();
    zamekG.position.set(0, 1.3, -1.5);
    zamekG.lookAt(0, 1.45, 0);
    koren.add(zamekG);
    const zamekPanel = vytvorPanel(0.74, 0.5);
    zamekPanel.mesh.position.y = 0.26;
    zamekG.add(zamekPanel.mesh);

    let zadano = [], zprava = 'Zadej kód a stiskni Odemknout.', barvaZpravy = '#cfe3ff';
    const uplynulo = () => cas - startCas;

    function kresliZamek() {
      const { c, ctx, t } = zamekPanel;
      const W = c.width;
      pozadiPanelu(ctx, W, c.height);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffd36b';
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.fillText('Východ z jeskyně', 46, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = '31px system-ui, sans-serif';
      let y = 98;
      for (const r of zalom(ctx, 'Zabloudil jsi v krasu u Ostrova u Macochy. Každé stanoviště kolem tebe prozradí symbol a číslo. Zámek ale chce čísla v pořadí podle symbolů níže.', W - 92)) {
        ctx.fillText(r, 46, y); y += 39;
      }
      ctx.fillStyle = '#9fd4ff';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText(`Čas: ${minSek(uplynulo())}    Trest: +${minSek(trest)}`, 46, y + 8);
      const sirka = 118, mezera = 22, x0 = (W - (KOD.length * sirka + (KOD.length - 1) * mezera)) / 2, yBox = y + 64;
      for (let i = 0; i < KOD.length; i++) {
        const x = x0 + i * (sirka + mezera);
        ctx.fillStyle = '#0b1324'; ctx.strokeStyle = '#8fc3ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(x, yBox, sirka, 112, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
        ctx.font = 'bold 80px system-ui, sans-serif';
        ctx.fillText(zadano[i] ?? '', x + sirka / 2, yBox + 14);
        ctx.textAlign = 'left';
        kresliSymbol(ctx, PORADI_ZAMKU[i], x + sirka / 2, yBox + 150, 26);
      }
      ctx.fillStyle = barvaZpravy;
      ctx.font = 'bold 38px system-ui, sans-serif';
      ctx.fillText(zprava, 46, yBox + 200);
      ctx.fillStyle = '#9fb3cc';
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillText(`Chyba +${TREST_CHYBA} s · nápověda +${TREST_NAPOVEDA} s · ${SKOLA}`, 46, yBox + 252);
      t.needsUpdate = true;
    }

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((cislice, i) => {
      const b = vytvorTlacitko(String(cislice), '', 0.1, 0.07, () => {
        if (vyhra || zadano.length >= KOD.length) return;
        zadano.push(cislice);
        zprava = 'Zadej kód a stiskni Odemknout.'; barvaZpravy = '#cfe3ff';
        kresliZamek();
      }, { pismo: 200, naStred: true });
      b.position.set(((i % 5) - 2) * 0.11, -0.06 - Math.floor(i / 5) * 0.08, 0.004);
      zamekG.add(b);
      tlacitka.push(b);
    });
    const tlSmazat = vytvorTlacitko('Smazat', '', 0.2, 0.07, () => {
      if (vyhra) return;
      zadano = []; zprava = 'Zadej kód a stiskni Odemknout.'; barvaZpravy = '#cfe3ff';
      kresliZamek();
    }, { pismo: 100, naStred: true });
    tlSmazat.position.set(-0.13, -0.23, 0.004);
    const tlOdemknout = vytvorTlacitko('Odemknout', '', 0.26, 0.07, () => {
      if (vyhra) return;
      if (zadano.length === KOD.length && zadano.every((c, i) => c === KOD[i])) {
        vyhraj();
      } else if (zadano.length < KOD.length) {
        zprava = `Kód má ${KOD.length} čísel.`; barvaZpravy = '#ff8080';
      } else {
        zprava = `Špatný kód! Trest +${TREST_CHYBA} s.`; barvaZpravy = '#ff8080';
        zadano = [];
        trest += TREST_CHYBA;
      }
      kresliZamek();
    }, { pismo: 70, akcent: '#7dffb0' });
    tlOdemknout.position.set(0.13, -0.23, 0.004);
    zamekG.add(tlSmazat, tlOdemknout);
    tlacitka.push(tlSmazat, tlOdemknout);

    // =================================================================
    //  VÝHRA
    // =================================================================
    const vyhraG = new THREE.Group();
    vyhraG.position.set(0, 2.1, -2.0);
    vyhraG.lookAt(0, 1.6, 0);
    vyhraG.visible = false;
    koren.add(vyhraG);
    const vyhraPanel = vytvorPanel(0.8, 0.4);
    vyhraG.add(vyhraPanel.mesh);
    const tlZnovu = vytvorTlacitko('Hrát znovu', '', 0.26, 0.07, () => resetHry(), { pismo: 70, naStred: true });
    tlZnovu.position.set(0, -0.26, 0.004);
    vyhraG.add(tlZnovu);

    function vyhraj() {
      vyhra = true;
      otevirani = 0;
      zprava = 'Odemčeno!'; barvaZpravy = '#7dffb0';
      const celkem = uplynulo() + trest;
      const [titul, barva] = celkem < 6 * 60 ? ['Zlatý jeskyňář', '#ffd36b'] : celkem < 10 * 60 ? ['Stříbrný jeskyňář', '#dfe6ee'] : ['Bronzový jeskyňář', '#e0a26b'];
      const { c, ctx, t } = vyhraPanel;
      pozadiPanelu(ctx, c.width, c.height);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = '#7dffb0';
      ctx.font = 'bold 76px system-ui, sans-serif';
      ctx.fillText('Hurá, jsi venku!', c.width / 2, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = '40px system-ui, sans-serif';
      ctx.fillText(`Čas ${minSek(uplynulo())} + trest ${minSek(trest)} = ${minSek(celkem)}`, c.width / 2, 140);
      ctx.fillStyle = barva;
      ctx.font = 'bold 60px system-ui, sans-serif';
      ctx.fillText(titul, c.width / 2, 210);
      ctx.fillStyle = '#9fd4ff';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText(SKOLA, c.width / 2, 300);
      ctx.textAlign = 'left';
      t.needsUpdate = true;
      vyhraG.visible = true;
      if (!tlacitka.includes(tlZnovu)) tlacitka.push(tlZnovu);
    }

    function resetHry() {
      vyhra = false; otevirani = 0; startCas = cas; trest = 0; posledniSekunda = -1;
      zadano = []; zprava = 'Zadej kód a stiskni Odemknout.'; barvaZpravy = '#cfe3ff';
      mriz.position.y = 0;
      svetloVen.material.color.setHex(0x050505);
      denniSvetlo.intensity = 0;
      vyhraG.visible = false;
      const i = tlacitka.indexOf(tlZnovu);
      if (i >= 0) tlacitka.splice(i, 1);
      resety.forEach((f) => f());
      stanoviste.forEach((st) => st.kresli());
      kresliZamek();
    }
    resetHry();

    // =================================================================
    const dopredu = new THREE.Vector3();
    return {
      koren,
      cile: () => [...tlacitka, ...dalsiCile],
      kamera: { pozice: [0, 1.6, 0.25], cil: [0, 1.55, 0] },   // na PC se otáčí kolem místa, kde stojí hráč

      priVyberu(obj, ovladac) {
        if (obj.userData.ton !== undefined) { tukniNaPistalu(obj.userData.ton); return; }
        const k = obj.userData.kamen;
        if (!k) return;
        if (ovladac) { kameny.forEach((j) => { if (j.drzi === ovladac) j.drzi = null; }); k.drzi = ovladac; }
        else polozDoMisky(k);                              // na PC kliknutím rovnou do misky
      },
      priPusteni(ovladac) {
        for (const k of kameny) {
          if (!ovladac || k.drzi !== ovladac) continue;
          k.drzi = null;
          if (k.mesh.position.distanceTo(miskaSvet) < 0.25) polozDoMisky(k);
          else k.mesh.position.copy(k.domov);              // puštěný kámen se vrátí na poličku
        }
      },
      aktualizuj(dt) {
        cas += dt;
        aktualizujVarhany(dt);
        for (const k of kameny) {
          if (!k.drzi) continue;
          dopredu.set(0, 0, -0.07).applyQuaternion(k.drzi.quaternion);
          k.mesh.position.copy(k.drzi.position).add(dopredu);
        }
        netopyri.forEach((n, i) => {
          const pohyb = Math.max(0, Math.sin(cas * 0.7 + i * 2.1) - 0.9) * 3;
          n.children.forEach((k) => { if (k.userData.strana) k.rotation.y = -(0.6 - pohyb * 0.5) * k.userData.strana; });
        });
        if (!vyhra && Math.floor(uplynulo()) !== posledniSekunda) { posledniSekunda = Math.floor(uplynulo()); kresliZamek(); }
        if (vyhra && otevirani < 1) {
          otevirani = Math.min(1, otevirani + dt / 2.5);
          mriz.position.y = otevirani * 2.4;
          svetloVen.material.color.setRGB(0.02 + otevirani, 0.02 + otevirani * 0.96, 0.02 + otevirani * 0.86);
          denniSvetlo.intensity = otevirani * 25;
        }
      },
      zrus() {
        app.camera.remove(celovka, celovka.target);
        celovka.dispose();
        app.scene.remove(app.camera);
        try { audio?.close(); } catch { /* nic */ }
        audio = null;
      },
    };
  },
};
