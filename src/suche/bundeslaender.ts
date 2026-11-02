import type { Bundesland } from './typen';

export const BUNDESLAENDER: Record<Bundesland, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
};

const ALIASE: Record<string, Bundesland> = {
  nrw: 'NW',
  bawue: 'BW',
  badenwuertemberg: 'BW',
  rlp: 'RP',
  meckpomm: 'MV',
  mecklenburg: 'MV',
  vorpommern: 'MV',
};

const BA_REGIONEN: Record<string, Bundesland> = {
  BADEN_WUERTTEMBERG: 'BW',
  BAYERN: 'BY',
  BERLIN: 'BE',
  BRANDENBURG: 'BB',
  BREMEN: 'HB',
  HAMBURG: 'HH',
  HESSEN: 'HE',
  MECKLENBURG_VORPOMMERN: 'MV',
  NIEDERSACHSEN: 'NI',
  NORDRHEIN_WESTFALEN: 'NW',
  RHEINLAND_PFALZ: 'RP',
  SAARLAND: 'SL',
  SACHSEN: 'SN',
  SACHSEN_ANHALT: 'ST',
  SCHLESWIG_HOLSTEIN: 'SH',
  THUERINGEN: 'TH',
};

function normalisiere(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[\s\-_.]/g, '');
}

const NACH_NORMALFORM = new Map<string, Bundesland>();
for (const [code, name] of Object.entries(BUNDESLAENDER) as [Bundesland, string][]) {
  NACH_NORMALFORM.set(normalisiere(name), code);
  NACH_NORMALFORM.set(normalisiere(code), code);
}
for (const [alias, code] of Object.entries(ALIASE)) NACH_NORMALFORM.set(alias, code);

/** Erkennt nur exakte Bundesland-Namen, -Codes und gängige Abkürzungen – „Hessen bei Halberstadt“ bleibt ein Ort. */
export function erkenneBundesland(text: string): Bundesland | null {
  return NACH_NORMALFORM.get(normalisiere(text)) ?? null;
}

export function ausBaRegion(region: string | undefined): Bundesland | undefined {
  return region ? BA_REGIONEN[region] : undefined;
}

export function istBundesland(wert: string): wert is Bundesland {
  return wert in BUNDESLAENDER;
}
