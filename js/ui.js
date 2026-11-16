// Společné kreslicí pomůcky: tlačítka, panely s textem, štítky.
import * as THREE from 'three';

export function canvasTextura(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx: c.getContext('2d'), t };
}

export function zaobleny(ctx, x, y, w, h, r, vypln, okraj, sirkaOkraje = 4) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (vypln) { ctx.fillStyle = vypln; ctx.fill(); }
  if (okraj) { ctx.strokeStyle = okraj; ctx.lineWidth = sirkaOkraje; ctx.stroke(); }
}

export function zalom(ctx, text, maxSirka) {
  const slova = text.split(' '), radky = [];
  let r = '';
  for (const s of slova) {
    const zkus = r ? r + ' ' + s : s;
    if (ctx.measureText(zkus).width > maxSirka && r) { radky.push(r); r = s; } else r = zkus;
  }
  if (r) radky.push(r);
  return radky;
}

export function hexCss(cislo) { return '#' + cislo.toString(16).padStart(6, '0'); }

// Popisek, který se vždy natáčí k divákovi.
//  sirka = šířka v metrech pro krátký text; delší text se úměrně rozšíří.
export function stitek(text, { sirka = 0.28, pismo = 40, vzdyViditelny = false } = {}) {
  const font = `bold ${pismo}px system-ui, sans-serif`;
  const mereni = document.createElement('canvas').getContext('2d');
  mereni.font = font;
  const W = Math.max(256, Math.ceil(mereni.measureText(text).width) + 24);
  const { ctx, t } = canvasTextura(W, 64);
  ctx.font = font;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.strokeText(text, W / 2, 32);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, W / 2, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, depthTest: !vzdyViditelny }));
  s.scale.set(sirka * W / 256, sirka / 4, 1);
  return s;
}

// Tlačítko v prostoru. Na kliknutí / spoušť zavolá `akce`.
export function vytvorTlacitko(text, podtext, sirka, vyska, akce, { pismo = 44, podpismo = 36, akcent = null, naStred = false } = {}) {
  const { c, ctx, t } = canvasTextura(512, Math.round(512 * vyska / sirka));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sirka, vyska), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  mesh.userData = { akce, hover: false, aktivni: false, text, podtext };
  mesh.userData.kresli = () => {
    const { hover, aktivni } = mesh.userData;
    ctx.clearRect(0, 0, c.width, c.height);
    zaobleny(ctx, 4, 4, c.width - 8, c.height - 8, 22,
      aktivni ? '#2f6fd6' : hover ? '#2a4470' : '#1c2c4a',
      aktivni ? '#bfe0ff' : hover ? '#8fc3ff' : '#3d5a88', 5);
    let x = 28;
    if (akcent) {
      ctx.fillStyle = akcent;
      ctx.beginPath(); ctx.roundRect(22, 22, 14, c.height - 44, 7); ctx.fill();
      x = 56;
    }
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = naStred ? 'center' : 'left';
    if (naStred) x = c.width / 2;
    ctx.font = `bold ${pismo}px system-ui, sans-serif`;
    const pt = mesh.userData.podtext;
    ctx.fillText(mesh.userData.text, x, c.height / 2 - (pt ? pismo * 0.45 : 0));
    if (pt) {
      ctx.fillStyle = '#9fd4ff';
      ctx.font = `${podpismo}px system-ui, sans-serif`;
      ctx.fillText(pt, x, c.height / 2 + podpismo * 0.75);
    }
    t.needsUpdate = true;
  };
  mesh.userData.kresli();
  return mesh;
}

// Plocha s texturou z canvasu (pro informační panely).
export function vytvorPanel(sirkaM, vyskaM, sirkaPx = 1024) {
  const vyskaPx = Math.round(sirkaPx * vyskaM / sirkaM);
  const tex = canvasTextura(sirkaPx, vyskaPx);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sirkaM, vyskaM), new THREE.MeshBasicMaterial({ map: tex.t, transparent: true }));
  return { mesh, ...tex };
}

export function pozadiPanelu(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  zaobleny(ctx, 3, 3, W - 6, H - 6, 36, 'rgba(12,22,44,0.92)', 'rgba(120,170,255,0.8)', 6);
}

// Vykreslí informační panel:
//  nadpis, podnadpis (např. vzorec), udaje = [[popis, hodnota]], legenda = [{barva, text}], zajimavosti = [věty]
export function vykresliInfo(panel, { nadpis, podnadpis, udaje = [], legenda = [], zajimavosti = [], sloupec = 450 }) {
  const { c, ctx, t } = panel;
  const W = c.width, H = c.height;
  pozadiPanelu(ctx, W, H);
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#ffd36b';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(nadpis, 50, 36);
  let y = 140;
  if (podnadpis) {
    ctx.fillStyle = '#8fd0ff';
    ctx.font = 'bold 60px system-ui, sans-serif';
    ctx.fillText(podnadpis, 50, 120);
    y = 215;
  }

  ctx.font = '36px system-ui, sans-serif';
  for (const [popis, hodnota] of udaje) {
    ctx.fillStyle = '#8fb8ff'; ctx.fillText(popis, 50, y);
    ctx.fillStyle = '#ffffff'; ctx.fillText(hodnota, sloupec, y);
    y += 49;
  }

  if (legenda.length) {
    y += 12;
    ctx.fillStyle = '#8fb8ff'; ctx.fillText('Atomy', 50, y);
    let x = sloupec;
    for (const { barva, text } of legenda) {
      const sirka = 44 + ctx.measureText(text).width + 30;
      if (x + sirka > W - 30) { x = sloupec; y += 50; }
      ctx.beginPath(); ctx.arc(x + 16, y + 20, 16, 0, Math.PI * 2);
      ctx.fillStyle = barva; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillText(text, x + 44, y);
      x += sirka;
    }
    y += 50;
  }

  if (udaje.length || legenda.length) {
    y += 14;
    ctx.strokeStyle = 'rgba(120,170,255,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 50, y); ctx.stroke();
    y += 26;
  }

  ctx.font = '36px system-ui, sans-serif';
  for (const veta of zajimavosti) {
    ctx.fillStyle = '#ffd36b'; ctx.fillText('•', 50, y);
    ctx.fillStyle = '#ffffff';
    for (const kus of zalom(ctx, veta, W - 150)) { ctx.fillText(kus, 85, y); y += 46; }
    y += 12;
  }
  t.needsUpdate = true;
}
