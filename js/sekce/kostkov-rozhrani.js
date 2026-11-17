// =====================================================================
//  KOSTKOV – ROZHRANÍ NA PC
//  Dole srdíčka a lišta s 9 políčky, nahoře hodiny a úkol.
//  Klávesa E otevře batoh s výrobou z ruky. Pravé tlačítko na truhlárně
//  nebo peci otevře jejich výrobu. Vše je obyčejné HTML přes 3D scénu.
//
//  Hra předá objekt "api" s funkcemi, které rozhraní volá
//  (viz vytvorRozhrani níže); rozhraní samo nic nepočítá.
// =====================================================================

const CSS = `
.kr{position:fixed;inset:0;pointer-events:none;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;z-index:20}
.kr *{box-sizing:border-box}
.kr [hidden],.kr[hidden]{display:none!important}
.kr-horni{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;max-width:calc(100% - 32px)}
.kr-hodiny{font-weight:700;font-size:15px;background:rgba(0,0,0,.55);padding:3px 12px;border-radius:8px}
.kr-ukol{font-size:15px;background:rgba(0,0,0,.55);padding:6px 14px;border-radius:8px;text-align:center;line-height:1.35}
.kr-ukol.spatne{color:#ff9f80}.kr-ukol.dobre{color:#7dffb0}
.kr-dole{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px}
.kr-srdce{font-size:22px;letter-spacing:1px;text-shadow:0 1px 3px #000;white-space:nowrap;min-height:26px}
.kr-lista{display:flex;gap:4px;padding:5px;background:rgba(0,0,0,.45);border:2px solid rgba(0,0,0,.6);border-radius:6px}
.kr-slot{width:52px;height:52px;position:relative;border:2px solid rgba(255,255,255,.22);border-radius:4px;background:rgba(40,46,60,.55);display:grid;place-items:center}
.kr-slot.on{border-color:#ffd36b;box-shadow:0 0 0 2px #7a4a12 inset;background:rgba(80,70,40,.6)}
.kr-slot img{width:34px;height:34px;image-rendering:pixelated}
.kr-slot .c{position:absolute;right:3px;bottom:1px;font-size:13px;font-weight:700;text-shadow:1px 1px 0 #000}
.kr-slot .n{position:absolute;left:3px;top:0;font-size:10px;color:rgba(255,255,255,.6)}
.kr-nazev{font-size:14px;font-weight:600;text-shadow:0 1px 3px #000;min-height:18px;transition:opacity .4s}
.kr-kriz{position:absolute;left:50%;top:50%;width:20px;height:20px;transform:translate(-50%,-50%)}
.kr-kriz::before,.kr-kriz::after{content:"";position:absolute;background:#fff;mix-blend-mode:difference}
.kr-kriz::before{left:9px;top:0;width:2px;height:20px}.kr-kriz::after{top:9px;left:0;height:2px;width:20px}
.kr-zablesk{position:absolute;inset:0;background:radial-gradient(transparent 35%,rgba(220,0,0,.65));opacity:0}
.kr-okno{position:absolute;inset:0;background:rgba(5,8,16,.6);display:grid;place-items:center;pointer-events:auto;padding:12px}
.kr-panel{width:min(980px,100%);max-height:100%;overflow:auto;background:#1b2233;border:3px solid #4a5a78;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:flex;flex-direction:column}
.kr-menu{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-bottom:2px solid #2c3850;align-items:center}
.kr-menu h2{margin:0 auto 0 0;font-size:22px;color:#ffd36b}
.kr button{font:inherit;font-size:14px;font-weight:600;color:#fff;background:#2a3550;border:2px solid #4a5a78;border-radius:8px;padding:7px 12px;cursor:pointer}
.kr button:hover:not(:disabled){background:#35466a;border-color:#8fc3ff}
.kr button:focus-visible{outline:3px solid #ffd36b;outline-offset:2px}
.kr button:disabled{opacity:.45;cursor:not-allowed}
.kr button.hl{background:#2f6fd6;border-color:#bfe0ff}
.kr-telo{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;padding:14px;min-height:0}
.kr-sloupec{display:flex;flex-direction:column;gap:10px;min-width:0}
.kr-sloupec h3{margin:0;font-size:16px;color:#9fd4ff}
.kr-mrizka{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:6px}
.kr-mrizka .kr-slot{width:auto;aspect-ratio:1;height:auto;pointer-events:auto;cursor:pointer}
.kr-mrizka .kr-slot:hover{border-color:#8fc3ff}
.kr-recepty{display:flex;flex-direction:column;gap:6px}
.kr-recept{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;background:#232c42;border:2px solid #34405a;border-radius:10px;padding:6px 8px}
.kr-recept img{width:36px;height:36px;image-rendering:pixelated}
.kr-recept b{display:block;font-size:15px}
.kr-recept small{color:#9fb3cc;font-size:13px}
.kr-recept.ne{opacity:.6}
.kr-tip{color:#9fb3cc;font-size:13px;line-height:1.4}
.kr-mala{display:flex;gap:4px;flex-wrap:wrap}
.kr-mala .kr-slot{pointer-events:auto;cursor:pointer;width:48px;height:48px}
@media (max-width:760px){.kr-telo{grid-template-columns:1fr}.kr-slot{width:40px;height:40px}.kr-slot img{width:26px;height:26px}}
`;

const NAZVY_STANIC = { batoh: 'Batoh', truhlarna: 'Truhlárna', pec: 'Pec' };

export function vytvorRozhrani(api) {
  const root = document.createElement('div');
  root.className = 'kr';
  root.innerHTML = `<style>${CSS}</style>
    <div class="kr-zablesk"></div>
    <div class="kr-kriz"></div>
    <div class="kr-horni"><div class="kr-hodiny"></div><div class="kr-ukol"></div></div>
    <div class="kr-dole"><div class="kr-nazev"></div><div class="kr-srdce"></div><div class="kr-lista"></div></div>
    <div class="kr-okno" hidden></div>`;
  root.hidden = true;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const lista = $('.kr-lista'), srdce = $('.kr-srdce'), hodiny = $('.kr-hodiny'), ukol = $('.kr-ukol'),
    okno = $('.kr-okno'), zablesk = $('.kr-zablesk'), nazev = $('.kr-nazev'), kriz = $('.kr-kriz');

  const sloty = Array.from({ length: 9 }, (_, i) => {
    const s = document.createElement('div'); s.className = 'kr-slot';
    s.innerHTML = `<span class="n">${i + 1}</span><img alt=""><span class="c"></span>`;
    lista.append(s); return s;
  });
  const naplnSlot = (el, id, pocet) => {
    const img = el.querySelector('img'), c = el.querySelector('.c');
    if (id == null) { img.removeAttribute('src'); img.style.visibility = 'hidden'; c.textContent = ''; el.title = ''; return; }
    img.src = api.ikona(id); img.style.visibility = 'visible';
    c.textContent = pocet > 1 ? pocet : '';
    el.title = api.nazev(id);
  };

  let posledni = '', posledniOkno = '', nazevCas = 0, stanice = null, oznacenySlot = null;

  // --- každý snímek: lišta, srdíčka, hodiny, úkol ---
  function aktualizuj(viditelne) {
    root.hidden = !viditelne;
    if (!viditelne) return;
    const s = api.stav();
    zablesk.style.opacity = s.zablesk.toFixed(2);
    kriz.hidden = !!stanice;
    const klic = JSON.stringify([s.lista, s.vybranySlot, s.lista.map((id) => (id == null ? 0 : api.pocet(id))), s.zivoty, s.maxZivotu, s.hodiny, s.text, s.textTrida, s.tvoreni]);
    if (klic === posledni) return;
    posledni = klic;
    s.lista.forEach((id, i) => { naplnSlot(sloty[i], id, s.tvoreni ? 0 : api.pocet(id)); sloty[i].classList.toggle('on', i === s.vybranySlot); });
    srdce.innerHTML = s.maxZivotu ? Array.from({ length: s.maxZivotu }, (_, i) =>
      `<span style="color:${i < s.zivoty ? '#ff4a5a' : 'rgba(255,255,255,.3)'}">♥</span>`).join('') : '';
    hodiny.textContent = s.hodiny;
    ukol.textContent = s.text;
    ukol.className = 'kr-ukol ' + (s.textTrida || '');
    // okno se překreslí jen při změně věcí, ne kvůli hodinám nebo úkolu
    const klicOkna = JSON.stringify([s.lista, s.vybranySlot, api.polozkyBatohu(), s.tvoreni, s.zvuk]);
    if (stanice && klicOkna !== posledniOkno) { posledniOkno = klicOkna; vykresliOkno(); }
  }
  function ukazNazev(t) {
    nazev.textContent = t; nazev.style.opacity = 1;
    clearTimeout(nazevCas); nazevCas = setTimeout(() => { nazev.style.opacity = 0; }, 1600);
  }

  // --- okno batohu / truhlárny / pece ---
  function otevri(kde) { stanice = kde; oznacenySlot = null; okno.hidden = false; posledni = ''; vykresliOkno(); api.priOtevreni?.(); }
  function zavri() { if (!stanice) return; stanice = null; okno.hidden = true; okno.innerHTML = ''; api.priZavreni?.(); }
  const tl = (text, akce, trida) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    if (trida) b.className = trida;
    b.onclick = (e) => { e.stopPropagation(); akce(b); };
    return b;
  };
  let jisteNovy = false;
  function vykresliOkno() {
    const s = api.stav();
    const scrollRecepty = okno.querySelector('.kr-recepty')?.parentElement?.scrollTop;
    okno.innerHTML = '';
    const panel = document.createElement('div'); panel.className = 'kr-panel';
    panel.onclick = (e) => e.stopPropagation();
    okno.onclick = () => zavri();

    // horní menu
    const menu = document.createElement('div'); menu.className = 'kr-menu';
    const h = document.createElement('h2'); h.textContent = NAZVY_STANIC[stanice];
    menu.append(h,
      tl('Dílna', () => { zavri(); api.akce.dilna(); }),
      tl(s.tvoreni ? 'Hra: Tvoření' : 'Hra: Přežití', () => api.akce.prepniHru()),
      tl(s.zvuk ? 'Zvuk: ano' : 'Zvuk: ne', () => api.akce.zvuk()),
      tl('Zpět ke stolu', () => { zavri(); api.akce.stul(); }),
      tl(jisteNovy ? 'Opravdu? Klikni znovu' : 'Nový svět', () => {
        if (!jisteNovy) { jisteNovy = true; vykresliOkno(); return; }
        jisteNovy = false; zavri(); api.akce.novySvet();
      }),
      tl('Zavřít (E)', () => zavri(), 'hl'));
    panel.append(menu);

    const telo = document.createElement('div'); telo.className = 'kr-telo';
    // levý sloupec: věci v batohu + lišta
    const vlevo = document.createElement('div'); vlevo.className = 'kr-sloupec';
    const h3 = document.createElement('h3'); h3.textContent = s.tvoreni ? 'Všechny bloky' : 'Věci v batohu';
    const tip = document.createElement('div'); tip.className = 'kr-tip';
    tip.textContent = oznacenySlot === null
      ? 'Klikni na věc a dá se do vybraného políčka lišty (dole). Políčko vybereš klávesou 1–9 nebo kliknutím níže.'
      : `Teď klikni na věc, která patří do políčka ${oznacenySlot + 1}.`;
    const mrizka = document.createElement('div'); mrizka.className = 'kr-mrizka';
    const polozky = api.polozkyBatohu();
    if (!polozky.length) { const p = document.createElement('div'); p.className = 'kr-tip'; p.textContent = 'Batoh je prázdný. Vytěž něco ze světa.'; mrizka.append(p); }
    for (const { id, pocet } of polozky) {
      const el = document.createElement('div'); el.className = 'kr-slot';
      el.innerHTML = '<img alt=""><span class="c"></span>';
      naplnSlot(el, id, pocet);
      el.onclick = () => { api.priradSlot(oznacenySlot ?? s.vybranySlot, id); oznacenySlot = null; posledni = ''; vykresliOkno(); };
      mrizka.append(el);
    }
    const h3b = document.createElement('h3'); h3b.textContent = 'Lišta';
    const mala = document.createElement('div'); mala.className = 'kr-mala';
    s.lista.forEach((id, i) => {
      const el = document.createElement('div'); el.className = 'kr-slot' + (i === (oznacenySlot ?? s.vybranySlot) ? ' on' : '');
      el.innerHTML = `<span class="n">${i + 1}</span><img alt=""><span class="c"></span>`;
      naplnSlot(el, id, s.tvoreni ? 0 : api.pocet(id));
      el.onclick = () => { oznacenySlot = i; api.vyberSlot(i); vykresliOkno(); };
      mala.append(el);
    });
    vlevo.append(h3, tip, mrizka, h3b, mala);

    // pravý sloupec: výroba
    const vpravo = document.createElement('div'); vpravo.className = 'kr-sloupec';
    const h3c = document.createElement('h3');
    h3c.textContent = stanice === 'batoh' ? 'Výroba z ruky' : stanice === 'truhlarna' ? 'Výroba na truhlárně' : 'Tavení v peci';
    vpravo.append(h3c);
    if (s.tvoreni) {
      const t = document.createElement('div'); t.className = 'kr-tip'; t.textContent = 'V Tvoření se nic vyrábět nemusí, všechny bloky máš vlevo.'; vpravo.append(t);
    } else {
      const sez = document.createElement('div'); sez.className = 'kr-recepty';
      for (const { r, lze, uzMa, popis } of api.recepty(stanice)) {
        const radek = document.createElement('div'); radek.className = 'kr-recept' + (lze && !uzMa ? '' : ' ne');
        const img = document.createElement('img'); img.src = api.ikona(r.dava[0]); img.alt = '';
        const txt = document.createElement('div');
        txt.innerHTML = `<b></b><small></small>`;
        txt.querySelector('b').textContent = r.n + (r.dava[1] > 1 ? ' ×' + r.dava[1] : '');
        txt.querySelector('small').textContent = uzMa ? 'už máš' : popis;
        const b = tl('Vyrobit', () => { api.vyrob(r); posledni = ''; vykresliOkno(); });
        b.disabled = !lze || uzMa;
        radek.append(img, txt, b);
        sez.append(radek);
      }
      vpravo.append(sez);
      const t = document.createElement('div'); t.className = 'kr-tip';
      t.textContent = stanice === 'batoh'
        ? 'Nástroje, postel a pec se dělají na truhlárně: polož ji a klikni na ni pravým tlačítkem. Železo se taví v peci.'
        : stanice === 'truhlarna' ? 'Prkna, klacky a pochodně si uděláš i v batohu (E).' : 'Na železo potřebuješ železnou rudu a uhlí.';
      vpravo.append(t);
    }
    const ovl = document.createElement('div'); ovl.className = 'kr-tip';
    ovl.textContent = 'Ovládání: WASD chůze · mezerník skok · Shift běh · levé tlačítko těžit · pravé položit (na truhlárně a peci otevřít) · 1–9 / kolečko lišta · E batoh · V vidím se · N čas · M zvuk';
    vpravo.append(ovl);
    telo.append(vlevo, vpravo);
    panel.append(telo);
    okno.append(panel);
    if (scrollRecepty) panel.scrollTop = scrollRecepty;
  }

  return {
    aktualizuj, otevri, zavri, ukazNazev,
    jeOtevreno: () => !!stanice,
    zrus() { clearTimeout(nazevCas); root.remove(); },
  };
}
