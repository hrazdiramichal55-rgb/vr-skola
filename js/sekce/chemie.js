// =====================================================================
//  SEKCE: Chemie – molekuly
// =====================================================================
import * as THREE from 'three';
import { canvasTextura, vytvorTlacitko, vytvorPanel, pozadiPanelu, vykresliInfo, hexCss } from '../ui.js';

// ---------- Prvky (barvy podle školních modelů, r = poloměr kuličky v Å) ----------
const PRVKY = {
  H:  { nazev: 'vodík',  barva: 0xffffff, r: 0.25 },
  C:  { nazev: 'uhlík',  barva: 0x4a4a4a, r: 0.35 },
  N:  { nazev: 'dusík',  barva: 0x3a5cff, r: 0.34 },
  O:  { nazev: 'kyslík', barva: 0xff3030, r: 0.33 },
  Cl: { nazev: 'chlor',  barva: 0x2fe02f, r: 0.45 },
  Na: { nazev: 'sodík',  barva: 0xab5cf2, r: 0.42 },
};

function mrizkaNaCl() {
  const atomy = [], vazby = [], index = {};
  const a = 2.82;                       // vzdálenost Na–Cl v Å
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    index[`${x},${y},${z}`] = atomy.length;
    atomy.push([(x + y + z + 3) % 2 ? 'Na' : 'Cl', x * a, y * a, z * a]);
  }
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const i = index[`${x},${y},${z}`];
    if (x < 1) vazby.push([i, index[`${x + 1},${y},${z}`], 0]);
    if (y < 1) vazby.push([i, index[`${x},${y + 1},${z}`], 0]);
    if (z < 1) vazby.push([i, index[`${x},${y},${z + 1}`], 0]);
  }
  return { atomy, vazby };
}

function benzen() {
  const atomy = [], vazby = [];
  for (let i = 0; i < 6; i++) {
    const u = (i / 6) * Math.PI * 2;
    atomy.push(['C', Math.cos(u) * 1.39, Math.sin(u) * 1.39, 0]);
  }
  for (let i = 0; i < 6; i++) {
    const u = (i / 6) * Math.PI * 2;
    atomy.push(['H', Math.cos(u) * 2.48, Math.sin(u) * 2.48, 0]);
  }
  for (let i = 0; i < 6; i++) {
    vazby.push([i, (i + 1) % 6, i % 2 ? 1 : 2]);   // střídání jednoduché a dvojné (Kekulého vzorec)
    vazby.push([i, i + 6, 1]);
  }
  return { atomy, vazby };
}

// ---------- Látky ----------
// atomy: [značka, x, y, z] v ångströmech; vazby: [atom, atom, řád vazby] (0 = spojnice v iontové mřížce)
const LATKY = [
  { nazev: 'Voda', vzorec: 'H₂O',
    atomy: [['O', 0, 0, 0], ['H', 0.759, 0.587, 0], ['H', -0.759, 0.587, 0]],
    vazby: [[0, 1, 1], [0, 2, 1]],
    udaje: [['Tvar molekuly', 'lomená'], ['Vazebný úhel', '104,5°'], ['Molární hmotnost', '18,02 g/mol'], ['Skupenství (20 °C)', 'kapalina'], ['Vazba', 'kovalentní polární']],
    zajimavosti: [
      'Led má menší hustotu než voda, a proto plave na hladině.',
      'Největší hustotu má voda při 4 °C.',
      'Tělo dospělého člověka tvoří zhruba z 60 % voda.',
    ] },
  { nazev: 'Oxid uhličitý', vzorec: 'CO₂',
    atomy: [['C', 0, 0, 0], ['O', 1.16, 0, 0], ['O', -1.16, 0, 0]],
    vazby: [[0, 1, 2], [0, 2, 2]],
    udaje: [['Tvar molekuly', 'lineární'], ['Vazebný úhel', '180°'], ['Molární hmotnost', '44,01 g/mol'], ['Skupenství (20 °C)', 'plyn'], ['Vazba', 'dvojná kovalentní polární']],
    zajimavosti: [
      'Molekula je nepolární, protože se polarity obou vazeb navzájem vyruší.',
      'Rostliny z něj při fotosyntéze vyrábějí cukry a uvolňují kyslík.',
      'Pevný CO₂ je „suchý led“ – při -78 °C se mění rovnou v plyn.',
    ] },
  { nazev: 'Methan', vzorec: 'CH₄',
    atomy: [['C', 0, 0, 0], ['H', 0.629, 0.629, 0.629], ['H', -0.629, -0.629, 0.629], ['H', -0.629, 0.629, -0.629], ['H', 0.629, -0.629, -0.629]],
    vazby: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    udaje: [['Tvar molekuly', 'čtyřstěn (tetraedr)'], ['Vazebný úhel', '109,5°'], ['Molární hmotnost', '16,04 g/mol'], ['Skupenství (20 °C)', 'plyn'], ['Vazba', 'kovalentní (téměř nepolární)']],
    zajimavosti: [
      'Je hlavní složkou zemního plynu, kterým se topí a vaří.',
      'Vzniká v bažinách a v trávicím traktu krav.',
      'Je to silný skleníkový plyn.',
    ] },
  { nazev: 'Amoniak', vzorec: 'NH₃',
    atomy: [['N', 0, 0.376, 0], ['H', 0.9375, 0, 0], ['H', -0.469, 0, 0.812], ['H', -0.469, 0, -0.812]],
    vazby: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
    udaje: [['Tvar molekuly', 'trojboká pyramida'], ['Vazebný úhel', '107°'], ['Molární hmotnost', '17,03 g/mol'], ['Skupenství (20 °C)', 'plyn'], ['Vazba', 'kovalentní polární']],
    zajimavosti: [
      'Tvar pyramidy způsobuje volný elektronový pár na dusíku.',
      'Má typický štiplavý zápach.',
      'Vyrábí se z něj průmyslová hnojiva.',
    ] },
  { nazev: 'Kyslík', vzorec: 'O₂',
    atomy: [['O', -0.605, 0, 0], ['O', 0.605, 0, 0]],
    vazby: [[0, 1, 2]],
    udaje: [['Tvar molekuly', 'dvouatomová'], ['Délka vazby', '0,121 nm'], ['Molární hmotnost', '32,00 g/mol'], ['Skupenství (20 °C)', 'plyn'], ['Vazba', 'dvojná kovalentní nepolární']],
    zajimavosti: [
      'Tvoří asi 21 % vzduchu.',
      'Kapalný kyslík je světle modrý a přitahuje ho magnet.',
      'Bez kyslíku nemůže nic hořet.',
    ] },
  { nazev: 'Dusík', vzorec: 'N₂',
    atomy: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]],
    vazby: [[0, 1, 3]],
    udaje: [['Tvar molekuly', 'dvouatomová'], ['Délka vazby', '0,110 nm'], ['Molární hmotnost', '28,01 g/mol'], ['Skupenství (20 °C)', 'plyn'], ['Vazba', 'trojná kovalentní nepolární']],
    zajimavosti: [
      'Tvoří asi 78 % vzduchu.',
      'Trojná vazba je velmi pevná, proto je dusík málo reaktivní.',
      'Kapalný dusík má teplotu -196 °C.',
    ] },
  { nazev: 'Chlorovodík', vzorec: 'HCl',
    atomy: [['H', -0.635, 0, 0], ['Cl', 0.635, 0, 0]],
    vazby: [[0, 1, 1]],
    udaje: [['Tvar molekuly', 'dvouatomová'], ['Délka vazby', '0,127 nm'], ['Molární hmotnost', '36,46 g/mol'], ['Skupenství (20 °C)', 'plyn'], ['Vazba', 'kovalentní polární']],
    zajimavosti: [
      'Jeho roztok ve vodě je kyselina chlorovodíková (solná).',
      'Zředěná kyselina chlorovodíková je v žaludku a pomáhá trávit.',
      'Chlor přitahuje elektrony silněji než vodík, proto je vazba polární.',
    ] },
  { nazev: 'Ethanol', vzorec: 'C₂H₅OH',
    atomy: [
      ['C', 1.188, -0.383, 0], ['C', 0, 0.553, 0], ['O', -1.187, -0.247, 0], ['H', -1.924, 0.385, 0],
      ['H', 2.109, 0.200, 0], ['H', 1.185, -1.017, 0.883], ['H', 1.185, -1.017, -0.883],
      ['H', 0.070, 1.196, 0.872], ['H', 0.070, 1.196, -0.872]],
    vazby: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1], [1, 7, 1], [1, 8, 1]],
    udaje: [['Tvar molekuly', 'řetězec, úhly asi 109,5°'], ['Molární hmotnost', '46,07 g/mol'], ['Skupenství (20 °C)', 'kapalina'], ['Teplota varu', '78 °C'], ['Vazba', 'kovalentní']],
    zajimavosti: [
      'Je to líh – je v alkoholických nápojích a v dezinfekci.',
      'Hoří téměř neviditelným modrým plamenem.',
      'Skupina –OH (hydroxylová) z něj dělá alkohol.',
    ] },
  { nazev: 'Benzen', vzorec: 'C₆H₆', ...benzen(),
    udaje: [['Tvar molekuly', 'rovinný šestiúhelník'], ['Vazebný úhel', '120°'], ['Molární hmotnost', '78,11 g/mol'], ['Skupenství (20 °C)', 'kapalina'], ['Vazba', 'kovalentní, aromatická']],
    zajimavosti: [
      'Ve skutečnosti jsou všechny vazby v kruhu stejné – elektrony jsou „rozprostřené“ po celém kruhu.',
      'Model ukazuje střídání jednoduchých a dvojných vazeb (Kekulého vzorec).',
      'Benzen je jedovatý a způsobuje rakovinu.',
    ] },
  { nazev: 'Chlorid sodný', vzorec: 'NaCl', ...mrizkaNaCl(), mrizka: true,
    udaje: [['Uspořádání', 'krychlová krystalová mřížka'], ['Úhel v mřížce', '90°'], ['Molární hmotnost', '58,44 g/mol'], ['Skupenství (20 °C)', 'pevná látka'], ['Vazba', 'iontová']],
    zajimavosti: [
      'Je to kuchyňská sůl. Netvoří molekuly, ale mřížku iontů Na⁺ a Cl⁻.',
      'Model ukazuje malý výřez krystalu – skutečný krystal má miliardy iontů.',
      'Taje až při 801 °C.',
    ] },
];

export default {
  id: 'chemie',
  nazev: 'Chemie',
  popis: 'Molekuly a krystaly',
  barva: '#ff5a5a',
  napovedaPC: 'Vlevo klikni na látku, táhnutím myši se díváš kolem, kolečkem přibližuješ. V brýlích můžeš molekulou otáčet: namiř na ni, podrž spoušť a otáčej rukou.',

  spust(app) {
    const STRED = new THREE.Vector3(0, 1.3, -0.8);   // kde se zobrazuje molekula
    const koren = new THREE.Group();
    app.scene.background = new THREE.Color(0x10151f);

    koren.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));
    const svetlo = new THREE.DirectionalLight(0xffffff, 2);
    svetlo.position.set(1, 3, 2);
    koren.add(svetlo);

    // místnost: podlaha, mřížka a stolek pod molekulou
    const podlaha = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 1 }));
    podlaha.rotation.x = -Math.PI / 2;
    koren.add(podlaha);
    const mrizka = new THREE.GridHelper(12, 24, 0x2c3d57, 0x22304a);
    mrizka.position.y = 0.002;
    koren.add(mrizka);
    const stul = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 40), new THREE.MeshStandardMaterial({ color: 0x2a3a55, roughness: 0.6 }));
    stul.position.set(STRED.x, 0.4, STRED.z);
    koren.add(stul);

    // ---------- stavba molekuly ----------
    const OSA_Y = new THREE.Vector3(0, 1, 0);
    const koule = new THREE.SphereGeometry(1, 32, 20);
    const valec = new THREE.CylinderGeometry(1, 1, 1, 14);
    const materialy = {};
    const materialPrvku = (z) => materialy[z] ??= new THREE.MeshStandardMaterial({ color: PRVKY[z].barva, roughness: 0.35, metalness: 0.05 });
    const materialSpojnice = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.5 });
    const texturyZnacek = {};
    const texturaZnacky = (znacka) => {
      if (texturyZnacek[znacka]) return texturyZnacek[znacka];
      const { ctx, t } = canvasTextura(128, 128);
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText(znacka, 64, 68);
      ctx.fillStyle = '#fff';
      ctx.fillText(znacka, 64, 68);
      return (texturyZnacek[znacka] = t);
    };

    let molekula = null, atomyMeshe = [], stitky = [];
    let zobrazitZnacky = true, otaceni = true;

    function valecMezi(a, b, polomer, material) {
      const smer = new THREE.Vector3().subVectors(b, a);
      const m = new THREE.Mesh(valec, material);
      m.position.copy(a).addScaledVector(smer, 0.5);
      m.scale.set(polomer, smer.length(), polomer);
      m.quaternion.setFromUnitVectors(OSA_Y, smer.clone().normalize());
      return m;
    }

    function postavMolekulu(latka) {
      if (molekula) koren.remove(molekula);
      molekula = new THREE.Object3D();
      atomyMeshe = []; stitky = [];

      const poz = latka.atomy.map(([, x, y, z]) => new THREE.Vector3(x, y, z));
      const tezisko = poz.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(poz.length);
      poz.forEach((p) => p.sub(tezisko));

      // měřítko: celá látka se vejde do koule o poloměru asi 22 cm
      let R = 0;
      latka.atomy.forEach(([z], i) => { R = Math.max(R, poz[i].length() + PRVKY[z].r); });
      const meritko = 0.22 / R;

      latka.atomy.forEach(([znacka], i) => {
        const a = new THREE.Mesh(koule, materialPrvku(znacka));
        a.position.copy(poz[i]);
        a.scale.setScalar(PRVKY[znacka].r * (latka.mrizka ? 1.15 : 1));
        molekula.add(a);
        atomyMeshe.push(a);

        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaZnacky(znacka), depthTest: false, depthWrite: false }));
        const velikost = 0.045 / meritko;            // asi 4,5 cm ve skutečnosti
        s.scale.set(velikost, velikost, 1);
        s.position.copy(poz[i]);
        s.visible = zobrazitZnacky;
        molekula.add(s);
        stitky.push(s);
      });

      const kolmice = new THREE.Vector3();
      for (const [i, j, rad] of latka.vazby) {
        const a = poz[i], b = poz[j];
        if (rad === 0) { molekula.add(valecMezi(a, b, 0.05, materialSpojnice)); continue; }
        const smer = new THREE.Vector3().subVectors(b, a).normalize();
        kolmice.crossVectors(smer, Math.abs(smer.z) > 0.9 ? OSA_Y : new THREE.Vector3(0, 0, 1)).normalize();
        const posuny = rad === 1 ? [0] : rad === 2 ? [-0.1, 0.1] : [-0.15, 0, 0.15];
        const tloustka = rad === 1 ? 0.08 : 0.055;
        const stred = a.clone().lerp(b, 0.5);
        for (const p of posuny) {
          const o = kolmice.clone().multiplyScalar(p);
          // vazba je napůl v barvě každého z atomů
          molekula.add(valecMezi(a.clone().add(o), stred.clone().add(o), tloustka, materialPrvku(latka.atomy[i][0])));
          molekula.add(valecMezi(stred.clone().add(o), b.clone().add(o), tloustka, materialPrvku(latka.atomy[j][0])));
        }
      }

      molekula.position.copy(STRED);
      molekula.scale.setScalar(meritko);
      molekula.rotation.set(0.25, 0, 0);
      koren.add(molekula);
    }

    // ---------- informační panel (vpravo) ----------
    const panel = vytvorPanel(0.62, 0.666);
    panel.mesh.position.set(0.72, 1.35, -0.72);
    panel.mesh.lookAt(0, 1.35, 0);
    koren.add(panel.mesh);

    // ---------- nabídka látek (vlevo) ----------
    const nabidka = new THREE.Group();
    nabidka.position.set(-0.72, 1.35, -0.72);
    nabidka.lookAt(0, 1.35, 0);
    koren.add(nabidka);
    {
      const pozadi = vytvorPanel(0.62, 0.666);
      pozadiPanelu(pozadi.ctx, pozadi.c.width, pozadi.c.height);
      pozadi.ctx.fillStyle = '#ffd36b';
      pozadi.ctx.font = 'bold 64px system-ui, sans-serif';
      pozadi.ctx.textBaseline = 'top';
      pozadi.ctx.fillText('Vyber látku', 50, 36);
      pozadi.t.needsUpdate = true;
      nabidka.add(pozadi.mesh);
    }

    const tlacitka = [];
    const pridejTlacitko = (b, x, y) => { b.position.set(x, y, 0.004); nabidka.add(b); tlacitka.push(b); return b; };

    const tlacitkaLatek = LATKY.map((latka, i) =>
      pridejTlacitko(vytvorTlacitko(latka.nazev, latka.vzorec, 0.27, 0.085, () => vyberLatku(i)),
        -0.142 + (i % 2) * 0.284, 0.2 - Math.floor(i / 2) * 0.095));

    const tlOtaceni = pridejTlacitko(vytvorTlacitko('Otáčení: zap', '', 0.27, 0.065, () => {
      otaceni = !otaceni;
      tlOtaceni.userData.text = otaceni ? 'Otáčení: zap' : 'Otáčení: vyp';
      tlOtaceni.userData.kresli();
    }), -0.142, -0.28);

    const tlZnacky = pridejTlacitko(vytvorTlacitko('Značky: zap', '', 0.27, 0.065, () => {
      zobrazitZnacky = !zobrazitZnacky;
      stitky.forEach((s) => { s.visible = zobrazitZnacky; });
      tlZnacky.userData.text = zobrazitZnacky ? 'Značky: zap' : 'Značky: vyp';
      tlZnacky.userData.kresli();
    }), 0.142, -0.28);

    function vyberLatku(i) {
      const latka = LATKY[i];
      tlacitkaLatek.forEach((b, j) => { b.userData.aktivni = j === i; b.userData.kresli(); });
      postavMolekulu(latka);
      const znacky = [...new Set(latka.atomy.map((a) => a[0]))];
      vykresliInfo(panel, {
        nadpis: latka.nazev, podnadpis: latka.vzorec, udaje: latka.udaje, zajimavosti: latka.zajimavosti, sloupec: 420,
        legenda: znacky.map((z) => ({ barva: hexCss(PRVKY[z].barva), text: `${z} – ${PRVKY[z].nazev}` })),
      });
    }
    vyberLatku(0);

    // ---------- otáčení molekuly rukou ----------
    let drziOvladac = null;
    const qStartOvladac = new THREE.Quaternion();
    const qStartMolekula = new THREE.Quaternion();
    const qPom = new THREE.Quaternion();

    return {
      koren,
      cile: () => [...tlacitka, ...atomyMeshe],
      kamera: { pozice: [0, 1.55, 0.75], cil: [STRED.x, STRED.y, STRED.z] },

      priVyberu(obj, ovladac) {
        if (!ovladac) return;                 // na PC se otáčí myší
        drziOvladac = ovladac;
        qStartOvladac.copy(ovladac.quaternion).invert();
        qStartMolekula.copy(molekula.quaternion);
      },
      priPusteni(ovladac) { if (drziOvladac === ovladac) drziOvladac = null; },
      aktualizuj(dt) {
        if (drziOvladac) {
          // molekula se otočí o tolik, o kolik se otočila ruka od chvíle chycení
          qPom.copy(drziOvladac.quaternion).multiply(qStartOvladac);
          molekula.quaternion.copy(qPom).multiply(qStartMolekula);
        } else if (otaceni) {
          molekula.rotateOnWorldAxis(OSA_Y, dt * 0.4);
        }
      },
    };
  },
};
