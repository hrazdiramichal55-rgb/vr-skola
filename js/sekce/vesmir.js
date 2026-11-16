// =====================================================================
//  SEKCE: Sluneční soustava
// =====================================================================
import * as THREE from 'three';
import { stitek, vytvorPanel, vykresliInfo } from '../ui.js';

// ---------- Data (údaje lze libovolně upravit) ----------
const SLUNCE = {
  jmeno: 'Slunce',
  udaje: [
    ['Typ', 'hvězda (žlutý trpaslík)'],
    ['Průměr', '1,39 mil. km (109× Země)'],
    ['Teplota povrchu', 'asi 5 500 °C'],
    ['Teplota jádra', 'asi 15 milionů °C'],
    ['Stáří', 'asi 4,6 miliardy let'],
    ['Hmotnost', '99,86 % celé soustavy'],
  ],
  zajimavosti: [
    'Světlo ze Slunce letí k Zemi přibližně 8 minut a 20 sekund.',
    'Do Slunce by se vešlo asi 1,3 milionu Zemí.',
    'Energii vyrábí jadernou fúzí – slučuje vodík na helium.',
  ]
};

const PLANETY = [
  { jmeno: 'Merkur',  barva: 0x9e9e9e, velikost: 0.030, polomer: 0.60, rokyObehu: 0.24,
    udaje: [
      ['Typ', 'kamenná planeta'],
      ['Průměr', '4 879 km'],
      ['Vzdálenost od Slunce', '58 mil. km'],
      ['Délka roku', '88 dní'],
      ['Otočka kolem osy', '59 pozemských dní'],
      ['Teplota', '-180 °C až 430 °C'],
      ['Gravitace', '0,38× Země'],
      ['Měsíce', '0'],
    ],
    zajimavosti: [
      'Nejmenší planeta a nejblíže Slunci.',
      'Nemá téměř žádnou atmosféru, proto jsou rozdíly teplot tak obrovské.',
      'Povrch je posetý krátery podobně jako Měsíc.',
    ] },
  { jmeno: 'Venuše',  barva: 0xe8c27a, velikost: 0.050, polomer: 0.80, rokyObehu: 0.62,
    udaje: [
      ['Typ', 'kamenná planeta'],
      ['Průměr', '12 104 km'],
      ['Vzdálenost od Slunce', '108 mil. km'],
      ['Délka roku', '225 dní'],
      ['Otočka kolem osy', '243 pozemských dní'],
      ['Teplota', 'asi 465 °C'],
      ['Gravitace', '0,9× Země'],
      ['Měsíce', '0'],
    ],
    zajimavosti: [
      'Nejteplejší planeta – hustá atmosféra z CO₂ funguje jako skleník.',
      'Den je na ní delší než rok a otáčí se opačným směrem.',
      'Po Měsíci je to nejjasnější objekt noční oblohy („Večernice“).',
    ] },
  { jmeno: 'Země',    barva: 0x3a7bd5, velikost: 0.055, polomer: 1.00, rokyObehu: 1.00,
    udaje: [
      ['Typ', 'kamenná planeta'],
      ['Průměr', '12 742 km'],
      ['Vzdálenost od Slunce', '150 mil. km'],
      ['Délka roku', '365,25 dne'],
      ['Otočka kolem osy', '24 hodin'],
      ['Průměrná teplota', 'asi 15 °C'],
      ['Gravitace', '1× (to jsme my)'],
      ['Měsíce', '1 (Měsíc)'],
    ],
    zajimavosti: [
      'Jediná známá planeta, na které existuje život.',
      'Asi 71 % povrchu pokrývá voda.',
      'Magnetické pole nás chrání před slunečním větrem – vznikají tak polární záře.',
    ] },
  { jmeno: 'Mars',    barva: 0xc1440e, velikost: 0.040, polomer: 1.25, rokyObehu: 1.88,
    udaje: [
      ['Typ', 'kamenná planeta'],
      ['Průměr', '6 779 km'],
      ['Vzdálenost od Slunce', '228 mil. km'],
      ['Délka roku', '687 dní'],
      ['Otočka kolem osy', '24 h 37 min'],
      ['Průměrná teplota', 'asi -60 °C'],
      ['Gravitace', '0,38× Země'],
      ['Měsíce', '2 (Phobos a Deimos)'],
    ],
    zajimavosti: [
      'Červenou barvu mu dávají oxidy železa – je vlastně „zrezivělý“.',
      'Má nejvyšší sopku soustavy, Olympus Mons (asi 22 km).',
      'Po jeho povrchu jezdí robotická vozítka, např. Perseverance.',
    ] },
  { jmeno: 'Jupiter', barva: 0xd8a66b, velikost: 0.140, polomer: 1.65, rokyObehu: 11.9, pruhy: ['#d8b48a', '#a8754a', '#e9d6b8', '#b98757'],
    udaje: [
      ['Typ', 'plynný obr'],
      ['Průměr', '139 820 km'],
      ['Vzdálenost od Slunce', '778 mil. km'],
      ['Délka roku', '11,9 roku'],
      ['Otočka kolem osy', '9 h 56 min'],
      ['Teplota (mraky)', 'asi -110 °C'],
      ['Gravitace', '2,5× Země'],
      ['Měsíce', 'přes 90'],
    ],
    zajimavosti: [
      'Největší planeta – vešlo by se do něj přes 1 300 Zemí.',
      'Velká rudá skvrna je bouře větší než celá Země.',
      'Jeho měsíc Ganymed je větší než planeta Merkur.',
    ] },
  { jmeno: 'Saturn',  barva: 0xe3cf9a, velikost: 0.120, polomer: 2.05, rokyObehu: 29.5, pruhy: ['#e8d7a8', '#cdb57c', '#f1e4c2'], prstence: true,
    udaje: [
      ['Typ', 'plynný obr'],
      ['Průměr', '116 460 km'],
      ['Vzdálenost od Slunce', '1,43 mld. km'],
      ['Délka roku', '29,5 roku'],
      ['Otočka kolem osy', 'asi 10 h 34 min'],
      ['Teplota (mraky)', 'asi -140 °C'],
      ['Gravitace', '1,07× Země'],
      ['Měsíce', 'nejvíce ze všech planet'],
    ],
    zajimavosti: [
      'Prstence z ledu a kamenů jsou široké statisíce km, ale tenké jen desítky metrů.',
      'Má menší hustotu než voda – ve velké vaně by plaval.',
      'Měsíc Titan má hustou atmosféru a jezera z kapalného metanu.',
    ] },
  { jmeno: 'Uran',    barva: 0x9fe3e8, velikost: 0.080, polomer: 2.40, rokyObehu: 84,
    udaje: [
      ['Typ', 'ledový obr'],
      ['Průměr', '50 724 km'],
      ['Vzdálenost od Slunce', '2,87 mld. km'],
      ['Délka roku', '84 let'],
      ['Otočka kolem osy', '17 h 14 min'],
      ['Teplota', 'až -224 °C'],
      ['Gravitace', '0,9× Země'],
      ['Měsíce', '28'],
    ],
    zajimavosti: [
      'Leží „na boku“ – jeho osa je skloněná o 98°.',
      'Má nejchladnější atmosféru ze všech planet.',
      'První planeta objevená dalekohledem (W. Herschel, 1781).',
    ] },
  { jmeno: 'Neptun',  barva: 0x3f5fd8, velikost: 0.078, polomer: 2.75, rokyObehu: 165,
    udaje: [
      ['Typ', 'ledový obr'],
      ['Průměr', '49 244 km'],
      ['Vzdálenost od Slunce', '4,5 mld. km'],
      ['Délka roku', '165 let'],
      ['Otočka kolem osy', '16 h 6 min'],
      ['Teplota', 'asi -214 °C'],
      ['Gravitace', '1,14× Země'],
      ['Měsíce', '16'],
    ],
    zajimavosti: [
      'Fouká tu nejrychlejší vítr v soustavě, až 2 000 km/h.',
      'Byl objeven v roce 1846 díky matematickému výpočtu, ne náhodou.',
      'Jeho měsíc Triton obíhá opačným směrem, než se Neptun otáčí.',
    ] },
];

function texturaPruhy(barvy) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  let y = 0;
  while (y < c.height) {
    const h = 6 + Math.random() * 14;
    ctx.fillStyle = barvy[Math.floor(Math.random() * barvy.length)];
    ctx.fillRect(0, y, c.width, h);
    y += h;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default {
  id: 'vesmir',
  nazev: 'Sluneční soustava',
  popis: 'Slunce a osm planet',
  barva: '#ffb830',
  napovedaPC: 'Táhnutím myši otáčíš pohled, kolečkem přibližuješ, kliknutím na planetu zobrazíš informace.',

  spust(app) {
    const STRED = new THREE.Vector3(0, 0.9, -3);   // střed soustavy (v metrech, před hráčem)
    const koren = new THREE.Group();
    app.scene.background = new THREE.Color(0x000006);

    koren.add(new THREE.AmbientLight(0xffffff, 0.25));
    const svetloSlunce = new THREE.PointLight(0xfff2d0, 3, 0, 0);
    svetloSlunce.position.copy(STRED);
    koren.add(svetloSlunce);

    // hvězdy
    {
      const pocet = 2500, poz = new Float32Array(pocet * 3);
      for (let i = 0; i < pocet; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40);
        poz.set([v.x, v.y, v.z], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(poz, 3));
      koren.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 })));
    }

    const vybiratelne = [];

    // Slunce
    const slunce = new THREE.Mesh(new THREE.SphereGeometry(0.35, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffb830 }));
    slunce.position.copy(STRED);
    slunce.userData.info = SLUNCE;
    koren.add(slunce);
    vybiratelne.push(slunce);
    {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,200,80,0.9)'); g.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      const zare = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false }));
      zare.scale.set(1.4, 1.4, 1);
      slunce.add(zare);
      const s = stitek('Slunce');
      s.position.y = 0.45;
      slunce.add(s);
    }

    // planety
    const planety = PLANETY.map((p) => {
      const body = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        body.push(new THREE.Vector3(Math.cos(a) * p.polomer, 0, Math.sin(a) * p.polomer));
      }
      const draha = new THREE.Line(new THREE.BufferGeometry().setFromPoints(body),
        new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.6 }));
      draha.position.copy(STRED);
      koren.add(draha);

      const cep = new THREE.Object3D();          // otáčí se ve středu soustavy
      cep.position.copy(STRED);
      cep.rotation.y = Math.random() * Math.PI * 2;
      koren.add(cep);
      const drzak = new THREE.Object3D();
      drzak.position.x = p.polomer;
      cep.add(drzak);

      const koule = new THREE.Mesh(new THREE.SphereGeometry(p.velikost, 40, 24), new THREE.MeshStandardMaterial({
        color: p.pruhy ? 0xffffff : p.barva, map: p.pruhy ? texturaPruhy(p.pruhy) : null, roughness: 0.9, metalness: 0,
      }));
      koule.userData.info = p;
      drzak.add(koule);
      vybiratelne.push(koule);

      if (p.prstence) {
        const prsten = new THREE.Mesh(new THREE.RingGeometry(p.velikost * 1.3, p.velikost * 2.2, 64),
          new THREE.MeshBasicMaterial({ color: 0xd9c89a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
        prsten.rotation.x = -Math.PI / 2 + 0.45;
        drzak.add(prsten);
      }
      const s = stitek(p.jmeno);
      s.position.y = p.velikost + 0.06;
      drzak.add(s);
      return { cep, koule, rychlost: 0.55 / Math.sqrt(p.rokyObehu) };
    });

    // informační panel nad rovinou drah
    const panel = vytvorPanel(0.9, 0.76);
    panel.mesh.position.set(-1.1, 1.55, -1.6);
    panel.mesh.lookAt(0, 1.55, 0);
    koren.add(panel.mesh);
    vykresliInfo(panel, {
      nadpis: 'Vítej ve vesmíru!',
      zajimavosti: [
        'Namiř ovladačem na planetu nebo Slunce a stiskni spoušť.',
        'Boční tlačítko (grip) pozastaví nebo spustí pohyb planet.',
        'Na počítači stačí kliknout myší.',
      ],
    });

    let vybrany = null, pauza = false, najete = new Set();
    const svit = (obj, hex) => { if (obj?.material.emissive) obj.material.emissive.setHex(hex); };

    return {
      koren,
      cile: () => vybiratelne,
      kamera: { pozice: [0, 2.6, 1.2], cil: [STRED.x, STRED.y, STRED.z] },

      priVyberu(obj) {
        if (vybrany && vybrany !== obj) svit(vybrany, 0x000000);
        vybrany = obj;
        svit(vybrany, 0x444444);
        const info = obj.userData.info;
        vykresliInfo(panel, { nadpis: info.jmeno, udaje: info.udaje, zajimavosti: info.zajimavosti, sloupec: 470 });
      },
      priStisku() { pauza = !pauza; },
      priNajeti(mnozina) {
        for (const o of najete) if (!mnozina.has(o) && o !== vybrany) svit(o, 0x000000);
        for (const o of mnozina) if (o !== vybrany) svit(o, 0x222222);
        najete = mnozina;
      },
      aktualizuj(dt) {
        if (pauza) return;
        for (const p of planety) {
          p.cep.rotation.y += p.rychlost * dt * 0.4;
          p.koule.rotation.y += dt * 0.8;
        }
        slunce.rotation.y += dt * 0.05;
      },
    };
  },
};
