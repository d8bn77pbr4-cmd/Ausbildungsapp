import { expect, test } from 'vitest';
import { direktLinks } from './direktlinks';
import type { SuchAnfrage } from './typen';

const basis: SuchAnfrage = { was: 'Mechatroniker', arten: ['ausbildung'], orte: [], bundeslaender: [], sortierung: 'relevanz', seite: 1 };
const url = (a: SuchAnfrage, name: string) => direktLinks(a).find((l) => l.name === name)!.url;

test('drei Portale in fester Reihenfolge', () => {
  expect(direktLinks(basis).map((l) => l.name)).toEqual(['Indeed', 'StepStone', 'Azubiyo']);
});

test('mit Ort und Umkreis', () => {
  const a = { ...basis, orte: [{ ort: 'Frankfurt', umkreisKm: 30 }, { ort: 'Köln', umkreisKm: 10 }] };
  expect(url(a, 'Indeed')).toBe('https://de.indeed.com/jobs?q=Mechatroniker+Ausbildung&l=Frankfurt&radius=30');
  expect(url(a, 'StepStone')).toBe('https://www.stepstone.de/jobs/mechatroniker-ausbildung/in-frankfurt?radius=30');
  expect(url(a, 'Azubiyo')).toBe('https://www.azubiyo.de/stellenmarkt/?q=Mechatroniker');
});

test('mit Bundesland statt Ort', () => {
  const a = { ...basis, bundeslaender: ['BW' as const] };
  expect(url(a, 'Indeed')).toBe('https://de.indeed.com/jobs?q=Mechatroniker+Ausbildung&l=Baden-W%C3%BCrttemberg');
  expect(url(a, 'StepStone')).toBe('https://www.stepstone.de/jobs/mechatroniker-ausbildung/in-baden-wuerttemberg');
});

test('ohne Ort, ohne „Ausbildung“ bei anderen Arten, Sonderzeichen sicher', () => {
  const a = { ...basis, was: 'Kauffrau für Büro & C#', arten: ['ausbildung' as const, 'job' as const] };
  expect(url(a, 'Indeed')).toBe('https://de.indeed.com/jobs?q=Kauffrau+f%C3%BCr+B%C3%BCro+%26+C%23');
  expect(url(a, 'StepStone')).toBe('https://www.stepstone.de/jobs/kauffrau-fuer-buero-c');
});
