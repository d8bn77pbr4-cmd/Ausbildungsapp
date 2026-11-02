import { expect, test } from 'vitest';
import { angebot } from '../../../tests/hilfen/angebot';
import { formatBeginn, formatOrt, formatVerguetung, hinweisText, quellenName } from './format';

test.each([
  ['2027-08-01', 'Beginn: 01.08.2027'],
  [undefined, 'Beginn: nicht angegeben'],
  ['Auf Anfrage', 'Beginn: Auf Anfrage'],
])('formatBeginn(%s)', (eingabe, erwartet) => {
  expect(formatBeginn(eingabe)).toBe(erwartet);
});

test('formatVerguetung', () => {
  expect(formatVerguetung({ betrag: 1050, einheit: 'monat', herkunft: 'feld' })).toBe('ab 1.050 € / Monat');
  expect(formatVerguetung({ einheit: 'monat', herkunft: 'feld' })).toBeNull();
  expect(formatVerguetung(undefined)).toBeNull();
});

test('formatOrt mit und ohne Entfernung', () => {
  expect(formatOrt(angebot({ ort: { ort: 'Gießen' }, entfernungKm: 12 }))).toBe('Gießen · 12 km');
  expect(formatOrt(angebot({ ort: { ort: 'Gießen' } }))).toBe('Gießen');
  expect(formatOrt(angebot({ ort: { ort: '' } }))).toBe('Ort nicht angegeben');
});

test('Hinweistexte', () => {
  expect(hinweisText({ typ: 'quelle_nicht_erreichbar', quelle: 'ba-jobs' })).toBe('BA-Jobsuche ist gerade nicht erreichbar – du siehst die übrigen Treffer.');
  expect(hinweisText({ typ: 'veralteter_stand', quelle: 'ba-studium', stand: '2026-11-01T13:05:00.000Z' })).toBe('Stand vom 01.11.2026, 14:05 – die Quelle ist gerade nicht erreichbar.');
  expect(hinweisText({ typ: 'zu_viele_treffer' })).toBe('Sehr viele Treffer – grenze die Suche ein, um alle zu sehen.');
  expect(hinweisText({ typ: 'ort_bereinigt', eingabe: 'Frankfrut', bereinigt: 'Frankfurt (Oder)' })).toBe('Gesucht um: Frankfurt (Oder)');
  expect(hinweisText({ typ: 'ort_unbekannt', eingabe: 'Frankfrt' })).toBe('Ort nicht gefunden: Frankfrt');
});

test('Quellennamen', () => {
  expect(quellenName('ba-jobs')).toBe('Bundesagentur für Arbeit – Jobsuche');
  expect(quellenName('ba-studium')).toBe('Bundesagentur für Arbeit – Studiensuche');
});
