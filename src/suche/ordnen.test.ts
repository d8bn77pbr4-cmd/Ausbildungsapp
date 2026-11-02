import { expect, test } from 'vitest';
import { angebot } from '../../tests/hilfen/angebot';
import { filtere, reissverschluss, sortiere } from './ordnen';

const heute = new Date('2026-11-02T10:00:00Z');

test('reissverschluss', () => {
  expect(reissverschluss([[1, 2, 3], [4], [5, 6]])).toEqual([1, 4, 5, 2, 6, 3]);
  expect(reissverschluss([])).toEqual([]);
});

test('ohne Filter bleibt alles', () => {
  const liste = [angebot(), angebot()];
  expect(filtere(liste, undefined, heute)).toEqual(liste);
  expect(filtere(liste, {}, heute)).toEqual(liste);
});

test('nur mit Vergütung', () => {
  const mit = angebot({ verguetung: { betrag: 1000, einheit: 'monat', herkunft: 'feld' } });
  expect(filtere([mit, angebot()], { nurMitVerguetung: true }, heute)).toEqual([mit]);
});

test('Beginn ab: nur ISO-Datum ≥ Grenze, Freitext und fehlend fallen raus', () => {
  const spaet = angebot({ beginn: '2027-09-01' });
  const genau = angebot({ beginn: '2027-08-01' });
  const frueh = angebot({ beginn: '2027-07-31' });
  const frei = angebot({ beginn: 'Auf Anfrage' });
  expect(filtere([spaet, genau, frueh, frei, angebot()], { beginnAb: '2027-08-01' }, heute)).toEqual([spaet, genau]);
});

test('veröffentlicht seit 7 Tagen', () => {
  const neu = angebot({ veroeffentlicht: '2026-10-26' });
  const alt = angebot({ veroeffentlicht: '2026-10-25' });
  expect(filtere([neu, alt, angebot()], { veroeffentlichtSeitTagen: 7 }, heute)).toEqual([neu]);
});

test('Sortierung nach Entfernung: Unbekanntes ans Ende, stabil', () => {
  const [a, b, c, d] = [angebot({ entfernungKm: 20 }), angebot(), angebot({ entfernungKm: 5 }), angebot({ entfernungKm: 20 })];
  expect(sortiere([a, b, c, d], 'entfernung')).toEqual([c, a, d, b]);
});

test('Sortierung nach Beginn: ISO aufsteigend, Freitext und fehlend zuletzt', () => {
  const [a, b, c, d] = [angebot({ beginn: '2027-09-01' }), angebot({ beginn: 'Wintersemester' }), angebot({ beginn: '2027-08-01' }), angebot()];
  expect(sortiere([a, b, c, d], 'beginn')).toEqual([c, a, b, d]);
});

test('Sortierung „neueste“: veröffentlicht absteigend, fehlend zuletzt', () => {
  const [a, b, c] = [angebot({ veroeffentlicht: '2026-10-01' }), angebot(), angebot({ veroeffentlicht: '2026-10-30' })];
  expect(sortiere([a, b, c], 'neueste')).toEqual([c, a, b]);
});

test('Relevanz lässt die Reihenfolge unverändert und verändert die Eingabe nicht', () => {
  const liste = [angebot({ entfernungKm: 9 }), angebot({ entfernungKm: 1 })];
  const kopie = [...liste];
  expect(sortiere(liste, 'relevanz')).toEqual(kopie);
  sortiere(liste, 'entfernung');
  expect(liste).toEqual(kopie);
});
