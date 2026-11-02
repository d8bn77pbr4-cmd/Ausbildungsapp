import type { Angebot, Sortierung, SuchFilter } from './typen';

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}/;

function isoDatum(wert?: string): string | undefined {
  return wert && ISO_DATUM.test(wert) ? wert.slice(0, 10) : undefined;
}

/** Abwechselnd aus allen Listen: [1,2,3],[4],[5,6] → 1,4,5,2,6,3. */
export function reissverschluss<T>(listen: T[][]): T[] {
  const ergebnis: T[] = [];
  const laenge = Math.max(0, ...listen.map((l) => l.length));
  for (let i = 0; i < laenge; i++) for (const liste of listen) if (i < liste.length) ergebnis.push(liste[i]);
  return ergebnis;
}

/** Filter zeigen nur, was nachweislich passt – Angebote ohne die geprüfte Angabe fallen heraus. */
export function filtere(angebote: Angebot[], filter: SuchFilter | undefined, heute: Date): Angebot[] {
  if (!filter) return angebote;
  const seit = filter.veroeffentlichtSeitTagen
    ? new Date(heute.getTime() - filter.veroeffentlichtSeitTagen * 86_400_000).toISOString().slice(0, 10)
    : undefined;
  return angebote.filter((a) => {
    if (filter.nurMitVerguetung && !a.verguetung) return false;
    if (filter.beginnAb) {
      const beginn = isoDatum(a.beginn);
      if (!beginn || beginn < filter.beginnAb) return false;
    }
    if (seit) {
      const veroeffentlicht = isoDatum(a.veroeffentlicht);
      if (!veroeffentlicht || veroeffentlicht < seit) return false;
    }
    return true;
  });
}

function aufsteigend<T extends string | number>(wert: (a: Angebot) => T | undefined) {
  return (a: Angebot, b: Angebot) => {
    const x = wert(a);
    const y = wert(b);
    if (x === undefined) return y === undefined ? 0 : 1;
    if (y === undefined) return -1;
    return x < y ? -1 : x > y ? 1 : 0;
  };
}

/** Stabile Sortierung; Unbekanntes kommt immer ans Ende. Verändert die Eingabe nicht. */
export function sortiere(angebote: Angebot[], nach: Sortierung): Angebot[] {
  const kopie = [...angebote];
  if (nach === 'entfernung') return kopie.sort(aufsteigend((a) => a.entfernungKm));
  if (nach === 'beginn') return kopie.sort(aufsteigend((a) => isoDatum(a.beginn)));
  if (nach === 'neueste') {
    const vergleich = aufsteigend((a) => isoDatum(a.veroeffentlicht));
    return kopie.sort((a, b) => {
      const x = isoDatum(a.veroeffentlicht);
      const y = isoDatum(b.veroeffentlicht);
      if (x === undefined || y === undefined) return vergleich(a, b);
      return -vergleich(a, b);
    });
  }
  return kopie;
}
