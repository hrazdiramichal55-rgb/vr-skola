// =====================================================================
//  SEZNAM SEKCÍ APLIKACE
//
//  Jak přidat novou sekci:
//   1. Vytvoř soubor v této složce (např. biologie.js) podle vzoru
//      vesmir.js nebo chemie.js.
//   2. Přidej ho sem: import a jeden řádek do pole SEKCE.
//  V hlavní nabídce se pak objeví samo.
// =====================================================================
import vesmir from './vesmir.js';
import chemie from './chemie.js';

export const SEKCE = [
  vesmir,
  chemie,
];
