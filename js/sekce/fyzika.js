// =====================================================================
//  SEKCE: Fyzika – gravitační laboratoř
//   1. pádová věž (pád z 2 m na různých tělesech)
//   2. kyvadlo (doba kmitu podle délky a gravitace)
//   3. házení míčků (se zvolenou gravitací)
// =====================================================================
import * as THREE from 'three';
import { canvasTextura, vytvorTlacitko, vytvorPanel, pozadiPanelu, vykresliInfo, zaobleny, stitek } from '../ui.js';

const f = (x, d = 2) => x.toFixed(d).replace('.', ',');

// ---------- Místa, kde můžeme pokusy dělat (přepínač vpravo) ----------
const MISTA = [
  { nazev: 'Země', g: 9.81, nebe: 0x6f9fd0, podlaha: 0x4a6b3a,
    zajimavosti: [
      'Bez odporu vzduchu by všechna tělesa padala stejně rychle – pírko i kladivo.',
      'Na Zemi pírko padá pomaleji jen kvůli vzduchu, ne kvůli gravitaci.',
    ] },
  { nazev: 'Měsíc', g: 1.62, nebe: 0x05060a, podlaha: 0x8a8a8a,
    zajimavosti: [
      'Astronaut David Scott (Apollo 15) pustil na Měsíci kladivo a pírko – dopadly současně.',
      'Na Měsíci bys vyskočil asi šestkrát výš než na Zemi.',
    ] },
  { nazev: 'Mars', g: 3.71, nebe: 0xc9a27e, podlaha: 0xa0522d,
    zajimavosti: [
      'Člověk, kterého Země přitahuje jako 50 kg, by na Marsu „vážil“ jako 19 kg.',
      'Hozený míček tu doletí asi 2,6× dál než na Zemi.',
    ] },
  { nazev: 'Jupiter', g: 24.79, nebe: 0x8a6a4a, podlaha: 0xd8b48a,
    zajimavosti: [
      'Jupiter nemá pevný povrch – hodnota g platí pro horní vrstvu mraků.',
      'Kyvadlo tu kmitá asi 1,6× rychleji než na Zemi.',
    ] },
  { nazev: 'Beztíže', g: 0, nebe: 0x020308, podlaha: 0x1b2433,
    zajimavosti: [
      'Hozený míček letí rovně stálou rychlostí – to je 1. Newtonův zákon (setrvačnost).',
      'Na vesmírné stanici gravitace nechybí: astronauti i stanice padají kolem Země společně.',
    ] },
];

// ---------- Tělesa v pádové věži ----------
const VEZ = [
  { nazev: 'Jupiter', g: 24.79, barva: 0xd8a66b },
  { nazev: 'Země',    g: 9.81,  barva: 0x3a7bd5 },
  { nazev: 'Mars',    g: 3.71,  barva: 0xc1440e },
  { nazev: 'Měsíc',   g: 1.62,  barva: 0xbbbbbb },
  { nazev: 'Pluto',   g: 0.62,  barva: 0xe0c9b0 },
];

// Popisek se dvěma řádky, který jde přepisovat.
function textovyStitek(sirkaM, r1, r2) {
  const { c, ctx, t } = canvasTextura(512, 256);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(sirkaM, sirkaM / 2, 1);
  let posledni = '';
  s.userData.nastav = (a, b, barva = '#ffd36b') => {
    const klic = a + '|' + b + '|' + barva;
    if (klic === posledni) return;
    posledni = klic;
    ctx.clearRect(0, 0, c.width, c.height);
    zaobleny(ctx, 4, 4, 504, 248, 30, 'rgba(12,22,44,0.88)', 'rgba(120,170,255,0.7)', 4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = barva;
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText(a, 256, 88);
    ctx.fillStyle = '#ffffff';
    ctx.font = '60px system-ui, sans-serif';
    ctx.fillText(b, 256, 178);
    t.needsUpdate = true;
  };
  s.userData.nastav(r1, r2);
  return s;
}

export default {
  id: 'fyzika',
  nazev: 'Fyzika',
  popis: 'Gravitace, pád a kyvadlo',
  barva: '#4cc38a',
  napovedaPC: 'Uprostřed je pádová věž, vlevo kyvadlo, vpravo volba místa (Země, Měsíc…) a stolek s míčky. Kliknutím na míček ho vyhodíš. V brýlích míček chytíš spouští a hodíš ho pohybem ruky.',

  spust(app) {
    const koren = new THREE.Group();
    const tlacitka = [];
    let misto = MISTA[0];
    let cas = 0;

    koren.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.3));
    const svetlo = new THREE.DirectionalLight(0xffffff, 1.6);
    svetlo.position.set(2, 4, 2);
    koren.add(svetlo);

    const podlahaMat = new THREE.MeshStandardMaterial({ color: misto.podlaha, roughness: 1 });
    const podlaha = new THREE.Mesh(new THREE.CircleGeometry(12, 64), podlahaMat);
    podlaha.rotation.x = -Math.PI / 2;
    koren.add(podlaha);
    const mrizka = new THREE.GridHelper(24, 48, 0x000000, 0x000000);
    mrizka.material.transparent = true; mrizka.material.opacity = 0.18;
    mrizka.position.y = 0.002;
    koren.add(mrizka);

    const kovMat = new THREE.MeshStandardMaterial({ color: 0x8a96a8, roughness: 0.4, metalness: 0.6 });

    // =================================================================
    //  1. PÁDOVÁ VĚŽ
    // =================================================================
    const VYSKA = 2, R_K = 0.045, Y0 = VYSKA + R_K;
    const vez = new THREE.Group();
    vez.position.set(0, 0, -1.75);
    koren.add(vez);
    const sklo = new THREE.MeshStandardMaterial({ color: 0x99ccff, transparent: true, opacity: 0.13, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });

    const kulicky = VEZ.map((teleso, i) => {
      const x = (i - 2) * 0.32;
      const trubka = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, VYSKA + 0.15, 24, 1, true), sklo);
      trubka.position.set(x, (VYSKA + 0.15) / 2, 0);
      vez.add(trubka);
      const podstavec = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), kovMat);
      podstavec.position.set(x, 0.01, 0);
      vez.add(podstavec);

      const koule = new THREE.Mesh(new THREE.SphereGeometry(R_K, 24, 16), new THREE.MeshStandardMaterial({ color: teleso.barva, roughness: 0.5 }));
      koule.position.set(x, Y0, 0);
      vez.add(koule);

      const nahore = textovyStitek(0.28, teleso.nazev, `g = ${f(teleso.g)}`);
      nahore.position.set(x, VYSKA + 0.32, 0);
      vez.add(nahore);
      const dole = textovyStitek(0.28, 'čas pádu', '– s');
      dole.position.set(x, 0.2, 0.16);
      vez.add(dole);
      return { teleso, koule, dole, dopadl: false };
    });

    // pravítko s výškou
    {
      const body = [new THREE.Vector3(-0.85, 0, 0), new THREE.Vector3(-0.85, VYSKA, 0)];
      for (let h = 0; h <= VYSKA + 0.001; h += 0.5) body.push(new THREE.Vector3(-0.85, h, 0), new THREE.Vector3(-0.8, h, 0));
      vez.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(body), new THREE.LineBasicMaterial({ color: 0xffffff })));
      for (const h of [0, 1, 2]) {
        const s = stitek(`${h} m`, { sirka: 0.22 });
        s.position.set(-0.98, h, 0);
        vez.add(s);
      }
    }

    let vezBezi = false, vezCas = 0;
    function vratitVez() {
      vezBezi = false;
      for (const k of kulicky) { k.koule.position.y = Y0; k.dopadl = false; k.dole.userData.nastav('čas pádu', '– s'); }
    }
    function pustitVez() { vratitVez(); vezBezi = true; vezCas = 0; }

    const tlPustit = vytvorTlacitko('Pustit kuličky', 'pád z výšky 2 m', 0.3, 0.09, pustitVez, { akcent: '#4cc38a' });
    tlPustit.position.set(-0.17, 1.0, -1.25);
    tlPustit.lookAt(-0.17, 1.6, 0);
    const tlVratit = vytvorTlacitko('Vrátit nahoru', '', 0.3, 0.09, vratitVez);
    tlVratit.position.set(0.17, 1.0, -1.25);
    tlVratit.lookAt(0.17, 1.6, 0);
    koren.add(tlPustit, tlVratit);
    tlacitka.push(tlPustit, tlVratit);

    function aktualizujVez(dt) {
      if (!vezBezi) return;
      vezCas += dt;
      for (const k of kulicky) {
        if (k.dopadl) continue;
        const y = Y0 - 0.5 * k.teleso.g * vezCas * vezCas;
        if (y <= R_K) {
          k.koule.position.y = R_K;
          k.dopadl = true;
          k.dole.userData.nastav('dopadla za', `${f(Math.sqrt(2 * VYSKA / k.teleso.g))} s`, '#7dffb0');
        } else {
          k.koule.position.y = y;
          k.dole.userData.nastav('padá…', `${f(vezCas)} s`);
        }
      }
      if (kulicky.every((k) => k.dopadl)) vezBezi = false;
    }

    // =================================================================
    //  2. KYVADLO (vlevo)
    // =================================================================
    const kyv = new THREE.Group();
    kyv.position.set(-1.1, 0, -1.0);
    kyv.lookAt(0, 0, 0);
    koren.add(kyv);
    for (const x of [-0.32, 0.32]) {
      const sloup = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.95, 0.03), kovMat);
      sloup.position.set(x, 0.975, 0);
      kyv.add(sloup);
    }
    {
      const pricka = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.03), kovMat);
      pricka.position.y = 1.95;
      const zaklad = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.3), kovMat);
      zaklad.position.y = 0.015;
      kyv.add(pricka, zaklad);
    }
    const cep = new THREE.Object3D();
    cep.position.set(0, 1.93, 0);
    kyv.add(cep);
    const tyc = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    const zavazi = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: 0.3, metalness: 0.5 }));
    cep.add(tyc, zavazi);

    let delka = 1, theta = 0, omega = 0, posledniPruchod = null, zmereno = null;

    const kyvPanel = vytvorPanel(0.52, 0.3);
    kyvPanel.mesh.position.set(-0.72, 1.62, 0);
    kyv.add(kyvPanel.mesh);
    function vykresliKyvadlo() {
      const { c, ctx, t } = kyvPanel;
      pozadiPanelu(ctx, c.width, c.height);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffd36b';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillText('Kyvadlo', 46, 34);
      ctx.font = '40px system-ui, sans-serif';
      const radky = [
        ['Délka', `${f(delka, delka === 1 ? 0 : 2)} m`],
        ['Změřená doba kmitu', zmereno ? `${f(zmereno)} s` : misto.g ? 'měřím…' : 'nekmitá'],
        ['Vzorec  T = 2π·√(l/g)', misto.g ? `${f(2 * Math.PI * Math.sqrt(delka / misto.g))} s` : '—'],
      ];
      let y = 140;
      for (const [a, b] of radky) {
        ctx.fillStyle = '#8fb8ff'; ctx.fillText(a, 46, y);
        ctx.fillStyle = '#ffffff'; ctx.fillText(b, 640, y);
        y += 62;
      }
      ctx.fillStyle = '#9fb3cc';
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillText('Doba kmitu = čas jednoho kyvu tam a zpět.', 46, y + 14);
      t.needsUpdate = true;
    }

    const tlDelky = [0.25, 0.5, 1].map((l, i) => {
      const b = vytvorTlacitko(`${f(l, l === 1 ? 0 : 2)} m`, '', 0.16, 0.07, () => nastavDelku(l), { pismo: 80, naStred: true });
      b.position.set(-0.89 + i * 0.17, 1.39, 0.004);
      kyv.add(b);
      tlacitka.push(b);
      return { l, b };
    });
    const tlRozkyvat = vytvorTlacitko('Rozkývat', 'vychýlí kyvadlo o 20°', 0.5, 0.08, () => rozkyvat(), { akcent: '#ffc94a' });
    tlRozkyvat.position.set(-0.72, 1.29, 0.004);
    kyv.add(tlRozkyvat);
    tlacitka.push(tlRozkyvat);

    function nastavDelku(l) {
      delka = l;
      tyc.scale.y = l; tyc.position.y = -l / 2;
      zavazi.position.y = -l;
      theta = 0; omega = 0; zmereno = null; posledniPruchod = null;
      tlDelky.forEach(({ l: x, b }) => { b.userData.aktivni = x === l; b.userData.kresli(); });
      vykresliKyvadlo();
    }
    function rozkyvat() {
      theta = 20 * Math.PI / 180; omega = 0; zmereno = null; posledniPruchod = null;
      vykresliKyvadlo();
    }
    function aktualizujKyvadlo(dt) {
      const kroky = 8, h = dt / kroky;
      for (let i = 0; i < kroky; i++) {
        const predtim = theta;
        omega += -(misto.g / delka) * Math.sin(theta) * h;
        theta += omega * h;
        if (predtim < 0 && theta >= 0) {                 // průchod středem zleva doprava
          const tPruchodu = cas + i * h;
          if (posledniPruchod !== null) { zmereno = tPruchodu - posledniPruchod; vykresliKyvadlo(); }
          posledniPruchod = tPruchodu;
        }
      }
      cep.rotation.z = theta;
    }

    // =================================================================
    //  3. HÁZENÍ MÍČKŮ (vpravo na stolku)
    // =================================================================
    const STUL = new THREE.Vector3(0.75, 0.8, -0.55), STUL_R = 0.25, MIC_R = 0.04;
    const stul = new THREE.Mesh(new THREE.CylinderGeometry(STUL_R, STUL_R + 0.03, STUL.y, 40), new THREE.MeshStandardMaterial({ color: 0x2a3a55, roughness: 0.6 }));
    stul.position.set(STUL.x, STUL.y / 2, STUL.z);
    koren.add(stul);
    {
      const s = stitek('Chyť míček a hoď!', { sirka: 0.4, pismo: 34 });
      s.position.set(STUL.x, STUL.y + 0.2, STUL.z);
      koren.add(s);
    }

    const micky = [0xff6b6b, 0x6bff9e, 0x6bb5ff].map((barva, i) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(MIC_R, 24, 16), new THREE.MeshStandardMaterial({ color: barva, roughness: 0.45 }));
      koren.add(mesh);
      const m = { mesh, domov: new THREE.Vector3(STUL.x + (i - 1) * 0.1, STUL.y + MIC_R, STUL.z), vel: new THREE.Vector3(), drzi: null, historie: [] };
      mesh.userData.mic = m;
      return m;
    });
    function vratitMicky() {
      for (const m of micky) { m.mesh.position.copy(m.domov); m.vel.set(0, 0, 0); m.drzi = null; m.historie = []; }
    }
    vratitMicky();

    const dopredu = new THREE.Vector3();
    function aktualizujMicky(dt) {
      for (const m of micky) {
        const p = m.mesh.position;
        if (m.drzi) {
          // míček je v ruce – sleduje ovladač a pamatuje si, kudy se ruka pohybovala
          dopredu.set(0, 0, -0.07).applyQuaternion(m.drzi.quaternion);
          p.copy(m.drzi.position).add(dopredu);
          m.historie.push({ p: p.clone(), t: cas });
          while (m.historie.length > 2 && m.historie[0].t < cas - 0.12) m.historie.shift();
          continue;
        }
        const kroky = 4, h = dt / kroky;
        for (let i = 0; i < kroky; i++) {
          m.vel.y -= misto.g * h;
          p.addScaledVector(m.vel, h);
          let naPovrchu = false;
          const dx = p.x - STUL.x, dz = p.z - STUL.z;
          if (dx * dx + dz * dz < STUL_R * STUL_R && p.y < STUL.y + MIC_R && p.y > STUL.y - 0.08 && m.vel.y <= 0) {
            p.y = STUL.y + MIC_R; naPovrchu = true;
          } else if (p.y < MIC_R) {
            p.y = MIC_R; naPovrchu = true;
          }
          if (naPovrchu) {
            m.vel.y = -m.vel.y * 0.6;                      // odraz
            if (Math.abs(m.vel.y) < 0.3) m.vel.y = 0;
            const treni = Math.max(0, 1 - 2.5 * h);         // tření o podlahu
            m.vel.x *= treni; m.vel.z *= treni;
          }
        }
      }
    }

    // =================================================================
    //  PŘEPÍNAČ MÍSTA + INFORMACE (vpravo)
    // =================================================================
    const ovl = new THREE.Group();
    ovl.position.set(1.1, 1.28, -1.1);
    ovl.lookAt(0, 1.28, 0);
    koren.add(ovl);
    const infoPanel = vytvorPanel(0.62, 0.62);
    ovl.add(infoPanel.mesh);

    const tlMista = MISTA.map((m, i) => {
      const rada = i < 3 ? 0 : 1, vRade = rada === 0 ? 3 : 2, poradi = rada === 0 ? i : i - 3;
      const b = vytvorTlacitko(m.nazev, '', 0.19, 0.06, () => vyberMisto(i), { pismo: 58 });
      b.position.set((poradi - (vRade - 1) / 2) * 0.205, 0.43 - rada * 0.07, 0.004);
      ovl.add(b);
      tlacitka.push(b);
      return b;
    });
    {
      const nadpis = stitek('Kde jsme?', { sirka: 0.3, pismo: 40 });
      nadpis.position.set(0, 0.52, 0);
      ovl.add(nadpis);
    }
    const tlMicky = vytvorTlacitko('Vrátit míčky', '', 0.3, 0.06, vratitMicky, { pismo: 58 });
    tlMicky.position.set(0, -0.36, 0.004);
    ovl.add(tlMicky);
    tlacitka.push(tlMicky);

    function vyberMisto(i) {
      misto = MISTA[i];
      tlMista.forEach((b, j) => { b.userData.aktivni = j === i; b.userData.kresli(); });
      app.scene.background = new THREE.Color(misto.nebe);
      podlahaMat.color.setHex(misto.podlaha);
      const g = misto.g;
      vykresliInfo(infoPanel, {
        nadpis: misto.nazev,
        podnadpis: `g = ${f(g)} m/s²`,
        udaje: [
          ['Proti Zemi', g ? `${f(g / 9.81)}×` : '0×'],
          ['Pád z výšky 2 m', g ? `${f(Math.sqrt(2 * VYSKA / g))} s` : 'nikdy nedopadne'],
          ['Kyvadlo 1 m – kmit', g ? `${f(2 * Math.PI * Math.sqrt(1 / g))} s` : 'nekmitá'],
        ],
        zajimavosti: misto.zajimavosti,
        sloupec: 470,
      });
      zmereno = null; posledniPruchod = null;
      vykresliKyvadlo();
    }

    nastavDelku(1);
    vyberMisto(0);
    rozkyvat();

    // =================================================================
    return {
      koren,
      cile: () => [...tlacitka, ...micky.map((m) => m.mesh)],
      kamera: { pozice: [0, 2.0, 2.1], cil: [0, 1.1, -1.0] },

      priVyberu(obj, ovladac) {
        const m = obj.userData.mic;
        if (!m) return;
        if (ovladac) {                                   // VR: chytit míček do ruky
          for (const jiny of micky) if (jiny.drzi === ovladac) jiny.drzi = null;
          m.drzi = ovladac; m.historie = []; m.vel.set(0, 0, 0);
        } else {                                         // PC: vyhodit míček do prostoru
          m.vel.set(-1.0, 3.2, -1.3);
        }
      },
      priPusteni(ovladac) {
        for (const m of micky) {
          if (!ovladac || m.drzi !== ovladac) continue;
          m.drzi = null;
          const prvni = m.historie[0], posledni = m.historie[m.historie.length - 1];
          const dt = posledni && prvni ? posledni.t - prvni.t : 0;
          if (dt > 0.01) m.vel.subVectors(posledni.p, prvni.p).divideScalar(dt);   // rychlost ruky = rychlost hodu
          else m.vel.set(0, 0, 0);
        }
      },
      aktualizuj(dt) {
        cas += dt;
        aktualizujVez(dt);
        aktualizujKyvadlo(dt);
        aktualizujMicky(dt);
      },
    };
  },
};
