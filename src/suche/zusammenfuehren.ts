import type { Angebot } from './typen';

function grundform(text: string): string {
  return text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

function aufraeumen(text: string): string {
  return text.replace(/[^a-z0-9]+/g, ' ').trim();
}

const GENDER_KLAMMER = /\((?:\s*[mwdx]\s*\/){1,3}\s*[mwdx]\s*\)/g;
const GENDER_ENDUNG = /(\*|:|_|\/-?)in(nen)?\b/g;
const PRAEFIX = /^ausbildung (zum|zur|zu|als) /;

/** Titel ohne Genderzusätze und „Ausbildung zum/zur/als“ – für den Vergleich über Quellen hinweg. */
export function normalisiereTitel(titel: string): string {
  const ohneGender = grundform(titel).replace(GENDER_KLAMMER, ' ').replace(GENDER_ENDUNG, '');
  return aufraeumen(ohneGender).replace(PRAEFIX, '');
}

const RECHTSFORMEN = new Set(['gmbh', 'mbh', 'ag', 'kg', 'kgaa', 'se', 'ohg', 'gbr', 'ug', 'co', 'haftungsbeschraenkt', 'ev']);

/** Firmenname ohne Rechtsform – „Opel Automobile GmbH“ = „OPEL Automobile“. */
export function normalisiereAnbieter(anbieter: string): string {
  const text = aufraeumen(grundform(anbieter).replace(/\be\.\s?v\.?/g, ' ev ').replace(/&/g, ' '));
  return text
    .split(' ')
    .filter((wort) => wort && !RECHTSFORMEN.has(wort))
    .join(' ');
}

function kleinere(a?: number, b?: number): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}

/**
 * Entfernt Duplikate: gleiche id immer; über Quellen hinweg, wenn Anbieter, Titel und PLZ gleich sind.
 * Innerhalb einer Quelle bleiben verschiedene ids getrennt (es kann eine echte zweite Stelle sein).
 */
export function zusammenfuehren(angebote: Angebot[]): Angebot[] {
  const ergebnis: Angebot[] = [];
  const nachId = new Map<string, Angebot>();
  const nachSchluessel = new Map<string, Angebot>();

  for (const a of angebote) {
    const gleich = nachId.get(a.id);
    if (gleich) {
      gleich.entfernungKm = kleinere(gleich.entfernungKm, a.entfernungKm);
      continue;
    }
    const schluessel = a.ort.plz ? `${normalisiereAnbieter(a.anbieter)}|${normalisiereTitel(a.titel)}|${a.ort.plz}` : null;
    const zwilling = schluessel ? nachSchluessel.get(schluessel) : undefined;
    if (zwilling && zwilling.quelle !== a.quelle && !zwilling.weitereQuellen?.some((q) => q.quelle === a.quelle)) {
      zwilling.weitereQuellen = [...(zwilling.weitereQuellen ?? []), { quelle: a.quelle, url: a.url }];
      zwilling.entfernungKm = kleinere(zwilling.entfernungKm, a.entfernungKm);
      nachId.set(a.id, zwilling);
      continue;
    }
    const kopie = { ...a };
    ergebnis.push(kopie);
    nachId.set(a.id, kopie);
    if (schluessel && !nachSchluessel.has(schluessel)) nachSchluessel.set(schluessel, kopie);
  }
  return ergebnis;
}
