// =====================================================================
//  JÁDRO APLIKACE „VR škola“
//  Stará se o: vykreslování, VR ovladače, myš na PC, hlavní nabídku
//  a přepínání sekcí. Obsah jednotlivých sekcí je ve složce sekce/.
//
//  Co musí sekce vrátit z funkce spust(app):
//   koren        – Object3D se vším, co sekce zobrazuje
//   cile()       – pole objektů, na které jde ukázat paprskem / myší
//   kamera       – { pozice: [x,y,z], cil: [x,y,z] } pohled na PC
//   priVyberu(objekt, ovladac)  – stisk spouště / kliknutí na objekt
//   priPusteni(ovladac)         – puštění spouště (nepovinné)
//   priStisku(ovladac)          – boční tlačítko grip (nepovinné)
//   priNajeti(mnozina)          – objekty, na které se právě ukazuje (nepovinné)
//   aktualizuj(dt)              – volá se každý snímek (nepovinné)
//  Objekty s userData.akce (tlačítka) obslouží jádro samo.
// =====================================================================
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SEKCE } from './sekce/seznam.js';
import { vytvorTlacitko, vytvorPanel, pozadiPanelu } from './ui.js';

const SKOLA = 'ZŠ a MŠ Ostrov u Macochy';

// ---------- Základ ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 200);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

const app = { scene, camera, renderer };

// ---------- Přepínání sekcí ----------
let koren = null;          // co je právě zobrazené (nabídka nebo sekce)
let aktivni = null;        // instance běžící sekce
let cile = () => [];

const htmlMenu = document.getElementById('tlacitkoMenu');
const htmlNapoveda = document.getElementById('napovedaSekce');

function uvolni(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => { mm.map?.dispose(); mm.dispose(); });
  });
}

function zrusAktualni() {
  if (koren) { scene.remove(koren); uvolni(koren); }
  aktivni?.zrus?.();
  koren = null; aktivni = null; cile = () => [];
}

function nastavKameru({ pozice, cil }) {
  camera.position.set(...pozice);
  orbit.target.set(...cil);
  orbit.update();
}

function spustSekci(def) {
  zrusAktualni();
  aktivni = def.spust(app);
  koren = aktivni.koren;
  scene.add(koren);
  cile = aktivni.cile;
  nastavKameru(aktivni.kamera);
  menuTlacitko.visible = true;
  htmlMenu.hidden = false;
  htmlNapoveda.innerHTML = `<b>${def.nazev}</b><br>${def.napovedaPC || ''}`;
  history.replaceState(null, '', '#' + def.id);
}

// ---------- Hlavní nabídka ----------
function ukazNabidku() {
  zrusAktualni();
  koren = new THREE.Group();
  scene.background = new THREE.Color(0x10151f);

  koren.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.5));
  const podlaha = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 1 }));
  podlaha.rotation.x = -Math.PI / 2;
  koren.add(podlaha);
  const mrizka = new THREE.GridHelper(16, 32, 0x2c3d57, 0x22304a);
  mrizka.position.y = 0.002;
  koren.add(mrizka);

  // nadpis
  const nadpis = vytvorPanel(1.0, 0.32);
  pozadiPanelu(nadpis.ctx, nadpis.c.width, nadpis.c.height);
  nadpis.ctx.textBaseline = 'top';
  nadpis.ctx.fillStyle = '#ffd36b';
  nadpis.ctx.font = 'bold 84px system-ui, sans-serif';
  nadpis.ctx.fillText('VR škola', 50, 26);
  nadpis.ctx.fillStyle = '#8fd0ff';
  nadpis.ctx.font = 'bold 46px system-ui, sans-serif';
  nadpis.ctx.fillText(SKOLA, 50, 128);
  nadpis.ctx.fillStyle = '#ffffff';
  nadpis.ctx.font = '32px system-ui, sans-serif';
  nadpis.ctx.fillText('Vyber, co chceš prozkoumat. Zpět se dostaneš tlačítkem', 50, 204);
  nadpis.ctx.fillText('Menu na levém ovladači nebo tlačítkem Y / B.', 50, 246);
  nadpis.t.needsUpdate = true;
  nadpis.mesh.position.set(0, 1.88, -1.4);
  nadpis.mesh.lookAt(0, 1.6, 0);
  koren.add(nadpis.mesh);

  // dlaždice sekcí – v oblouku kolem hráče, po čtyřech v řadě
  const vRade = 4;
  const dlazdice = SEKCE.map((def, i) => {
    const rada = Math.floor(i / vRade);
    const vTetoRade = Math.min(vRade, SEKCE.length - rada * vRade);
    const poradi = i % vRade - (vTetoRade - 1) / 2;
    const uhel = poradi * 0.34;
    const b = vytvorTlacitko(def.nazev, def.popis, 0.44, 0.2, () => spustSekci(def), { pismo: 52, podpismo: 32, akcent: def.barva });
    const y = 1.4 - rada * 0.25;
    b.position.set(Math.sin(uhel) * 1.4, y, -Math.cos(uhel) * 1.4);
    b.lookAt(0, y, 0);
    koren.add(b);
    return b;
  });

  scene.add(koren);
  cile = () => dlazdice;
  nastavKameru({ pozice: [0, 1.6, 0.4], cil: [0, 1.5, -1.4] });
  menuTlacitko.visible = false;
  htmlMenu.hidden = true;
  htmlNapoveda.innerHTML = `<b>VR škola · ${SKOLA}</b><br>Klikni na sekci, kterou chceš otevřít.`;
  history.replaceState(null, '', location.pathname);
}

htmlMenu.addEventListener('click', ukazNabidku);

// ---------- Tlačítko Menu na levém ovladači ----------
const menuTlacitko = vytvorTlacitko('Menu', '', 0.12, 0.05, ukazNabidku, { pismo: 110, naStred: true });
menuTlacitko.position.set(0, 0.05, 0.07);
menuTlacitko.rotation.x = -Math.PI / 4;     // natočené nahoru k obličeji
menuTlacitko.visible = false;

// ---------- VR ovladače ----------
const raycaster = new THREE.Raycaster();
const tmpMatice = new THREE.Matrix4();
const factory = new XRControllerModelFactory();
const ovladace = [];

function aktualniCile() {
  const seznam = [...cile()];
  if (menuTlacitko.visible && menuTlacitko.parent) seznam.push(menuTlacitko);
  return seznam;
}

function zasahOvladace(ovladac) {
  tmpMatice.identity().extractRotation(ovladac.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(ovladac.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMatice);
  return raycaster.intersectObjects(aktualniCile(), false).find((z) => z.object.visible) || null;
}

function vyber(objekt, ovladac) {
  if (objekt.userData.akce) objekt.userData.akce();
  else aktivni?.priVyberu?.(objekt, ovladac);
}

for (let i = 0; i < 2; i++) {
  const ovladac = renderer.xr.getController(i);
  const paprsek = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0x88ccff })
  );
  paprsek.scale.z = 5;
  ovladac.add(paprsek);
  ovladac.userData.paprsek = paprsek;

  ovladac.addEventListener('selectstart', () => {
    const zasah = zasahOvladace(ovladac);
    if (zasah) vyber(zasah.object, ovladac);
  });
  ovladac.addEventListener('selectend', () => aktivni?.priPusteni?.(ovladac));
  ovladac.addEventListener('squeezestart', () => aktivni?.priStisku?.(ovladac));
  scene.add(ovladac);
  ovladace.push(ovladac);

  const grip = renderer.xr.getControllerGrip(i);
  grip.add(factory.createControllerModel(grip));
  grip.addEventListener('connected', (e) => {
    ovladac.userData.zdroj = e.data;
    if (e.data.handedness === 'left') grip.add(menuTlacitko);
  });
  grip.addEventListener('disconnected', () => {
    if (menuTlacitko.parent === grip) grip.remove(menuTlacitko);
    ovladac.userData.zdroj = null;
  });
  scene.add(grip);
}

// Tlačítka Y (levý) a B (pravý) = návrat do nabídky
const drzeno = new Map();
function kontrolaTlacitekYB() {
  for (const o of ovladace) {
    const tl = o.userData.zdroj?.gamepad?.buttons?.[5];
    const stisknuto = !!tl?.pressed;
    if (stisknuto && !drzeno.get(o) && aktivni) ukazNabidku();
    drzeno.set(o, stisknuto);
  }
}

// ---------- Myš na PC ----------
const mys = new THREE.Vector2();
let stisk = null;
function zasahMysi(e) {
  mys.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mys, camera);
  return raycaster.intersectObjects(cile(), false).find((z) => z.object.visible) || null;
}
renderer.domElement.addEventListener('pointerdown', (e) => { stisk = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!stisk || Math.hypot(e.clientX - stisk.x, e.clientY - stisk.y) > 5) return;  // bylo to táhnutí
  const zasah = zasahMysi(e);
  if (zasah) { vyber(zasah.object, null); aktivni?.priPusteni?.(null); }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (renderer.xr.isPresenting) return;
  const zasah = zasahMysi(e);
  nastavNajeti(zasah ? new Set([zasah.object]) : new Set());
  renderer.domElement.style.cursor = zasah ? 'pointer' : '';
});

let najete = new Set();
function nastavNajeti(mnozina) {
  for (const obj of new Set([...najete, ...mnozina])) {
    if (!obj.userData.kresli) continue;
    const h = mnozina.has(obj);
    if (obj.userData.hover !== h) { obj.userData.hover = h; obj.userData.kresli(); }
  }
  najete = mnozina;
  aktivni?.priNajeti?.(new Set([...mnozina].filter((o) => !o.userData.akce)));
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Hlavní smyčka ----------
const hodiny = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(hodiny.getDelta(), 0.1);
  const vVR = renderer.xr.isPresenting;

  for (const o of ovladace) o.visible = vVR;   // paprsky jen v brýlích
  if (vVR) {
    const mnozina = new Set();
    for (const o of ovladace) {
      const zasah = zasahOvladace(o);
      o.userData.paprsek.scale.z = zasah ? zasah.distance : 5;
      if (zasah) mnozina.add(zasah.object);
    }
    nastavNajeti(mnozina);
    kontrolaTlacitekYB();
  }

  aktivni?.aktualizuj?.(dt);
  orbit.update();
  renderer.render(scene, camera);
});

// ---------- Start: sekce z adresy (#chemie) nebo hlavní nabídka ----------
const zAdresy = SEKCE.find((s) => '#' + s.id === location.hash);
if (zAdresy) spustSekci(zAdresy); else ukazNabidku();
